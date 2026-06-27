import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// GET — load user's campaign progress
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getAdminClient()
  const { data, error } = await admin
    .from('campaign_progress')
    .select('*')
    .eq('user_id', user.id)
    .order('map_id', { ascending: true })
    .order('stage_id', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Determine current map/stage (first uncompleted stage)
  const completed = new Set(
    (data || []).filter((r: any) => r.completed).map((r: any) => `${r.map_id}-${r.stage_id}`)
  )

  let currentMap = 1
  let currentStage = 1
  for (let map = 1; map <= 100; map++) {
    let found = false
    for (let stage = 1; stage <= 10; stage++) {
      if (!completed.has(`${map}-${stage}`)) {
        currentMap = map
        currentStage = stage
        found = true
        break
      }
    }
    if (found) break
  }

  return NextResponse.json({
    completed: data?.filter((r: any) => r.completed).length || 0,
    total: 1000,
    currentMap,
    currentStage,
    records: data || [],
  })
}

// POST — save stage completion
export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { mapId, stageId, stars } = body as { mapId: number; stageId: number; stars?: number }

  if (!mapId || !stageId) {
    return NextResponse.json({ error: 'mapId and stageId required' }, { status: 400 })
  }

  const admin = getAdminClient()

  // Upsert progress
  const { error } = await admin
    .from('campaign_progress')
    .upsert({
      user_id: user.id,
      map_id: mapId,
      stage_id: stageId,
      completed: true,
      stars: stars || 1,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,map_id,stage_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
