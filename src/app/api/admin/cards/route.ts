import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// GET — list all cards
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify admin
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getAdminClient()
  const { data, error } = await admin.from('cards').select('*').order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ cards: data || [] })
}

// PATCH — update a card (only base stats, not user_cards)
export async function PATCH(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { id, ...updates } = body as { id: string; [key: string]: any }

  if (!id) return NextResponse.json({ error: 'Card ID required' }, { status: 400 })

  // Allowed fields to update
  const allowed = ['name', 'title', 'faction', 'rarity', 'stats', 'ability', 'cost', 'flavor_text', 'pack_source', 'art_url']
  const filtered: Record<string, any> = {}
  for (const key of allowed) {
    if (updates[key] !== undefined) filtered[key] = updates[key]
  }

  if (Object.keys(filtered).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const admin = getAdminClient()
  const { error } = await admin.from('cards').update(filtered).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// POST — create a new card
export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { name, title, faction, rarity, stats, ability, cost, pack_source, flavor_text } = body

  if (!name || !faction || !rarity) {
    return NextResponse.json({ error: 'Name, faction, and rarity are required' }, { status: 400 })
  }

  const admin = getAdminClient()
  const { data, error } = await admin.from('cards').insert({
    name,
    title: title || '',
    faction,
    rarity,
    stats: stats || { charisma: 5, machinery: 5, budget: 5, influence: 5 },
    ability: ability || null,
    cost: cost || 3,
    pack_source: pack_source || 'custom',
    flavor_text: flavor_text || '',
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, id: data.id })
}

// DELETE — delete a card (cleans up user_cards refs first)
export async function DELETE(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Card ID required' }, { status: 400 })

  const admin = getAdminClient()

  // Delete user_cards referencing this card first (FK constraint)
  const { error: ucardErr } = await admin.from('user_cards').delete().eq('card_id', id)
  if (ucardErr) return NextResponse.json({ error: 'Failed to clean up user cards: ' + ucardErr.message }, { status: 500 })

  // Now delete the card itself
  const { error } = await admin.from('cards').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
