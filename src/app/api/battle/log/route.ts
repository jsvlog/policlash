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

// POST — log a battle result
export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { mapId, stageId, result, turns, cardsUsed, cardIds, monsterLevel, monsterName } = body

  if (!result || !mapId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = getAdminClient()
  const { error } = await admin.from('battle_logs').insert({
    user_id: user.id,
    map_id: mapId,
    stage_id: stageId || 1,
    result,
    turns: turns || 0,
    cards_used: cardsUsed || [],
    card_ids: cardIds || [],
    monster_level: monsterLevel || 1,
    monster_name: monsterName || 'Unknown',
  })

  if (error) {
    console.error('Battle log error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
