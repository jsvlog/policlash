import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// POST — give a card to a user
export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { user_id, card_id } = body

  if (!user_id || !card_id) {
    return NextResponse.json({ error: 'user_id and card_id required' }, { status: 400 })
  }

  const admin = getAdminClient()

  // Look up card name
  const { data: card } = await admin.from('cards').select('name, rarity').eq('id', card_id).single()

  // Insert into user_cards
  const { error } = await admin.from('user_cards').insert({
    user_id,
    card_id,
    card_name: card?.name || 'Unknown Card',
    level: 1,
    xp: 0,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, card_name: card?.name, rarity: card?.rarity })
}
