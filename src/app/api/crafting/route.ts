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

// Rarity values for crafting/dismantling
const CRAFT_COSTS: Record<string, { dismantle: number; craft: number }> = {
  common: { dismantle: 10, craft: 50 },
  rare: { dismantle: 25, craft: 150 },
  epic: { dismantle: 50, craft: 500 },
  legendary: { dismantle: 100, craft: 2000 },
  mythic: { dismantle: 200, craft: 5000 },
}

// GET — return user's political capital balance and crafting log
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getAdminClient()

  const [{ data: profile }, { data: log }] = await Promise.all([
    admin.from('profiles').select('political_capital').eq('id', user.id).single(),
    admin.from('crafting_log').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
  ])

  return NextResponse.json({
    success: true,
    politicalCapital: profile?.political_capital || 0,
    craftCosts: CRAFT_COSTS,
    log: log || [],
  })
}

// POST — craft or dismantle
export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { action, userCardId, cardId } = body // userCardId for dismantle, cardId for craft

  const admin = getAdminClient()

  // Get user profile
  const { data: profile } = await admin.from('profiles').select('political_capital').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  let currentPC = profile.political_capital || 0

  if (action === 'dismantle') {
    // Get the user_card to dismantle
    const { data: userCard } = await admin
      .from('user_cards')
      .select('id, card_id, card_name')
      .eq('id', userCardId)
      .eq('user_id', user.id)
      .single()

    if (!userCard) return NextResponse.json({ error: 'Card not found or not yours' }, { status: 404 })

    // Get card rarity
    const { data: card } = await admin.from('cards').select('rarity').eq('id', userCard.card_id).single()
    if (!card) return NextResponse.json({ error: 'Card definition not found' }, { status: 404 })

    const rarity = card.rarity
    const value = CRAFT_COSTS[rarity]?.dismantle || 10

    // Delete the user card
    const { error: delErr } = await admin.from('user_cards').delete().eq('id', userCardId).eq('user_id', user.id)
    if (delErr) return NextResponse.json({ error: 'Failed to dismantle: ' + delErr.message }, { status: 500 })

    // Add political capital
    const newPC = currentPC + value
    const { error: updErr } = await admin.from('profiles').update({ political_capital: newPC }).eq('id', user.id)
    if (updErr) return NextResponse.json({ error: 'Failed to update balance: ' + updErr.message }, { status: 500 })

    // Log
    await admin.from('crafting_log').insert({
      user_id: user.id,
      action: 'dismantle',
      card_id: userCard.card_id,
      card_name: userCard.card_name,
      rarity,
      amount: value,
    })

    return NextResponse.json({ success: true, politicalCapital: newPC, gained: value, action: 'dismantle' })
  }

  if (action === 'craft') {
    // Get target card definition
    const { data: card } = await admin.from('cards').select('*').eq('id', cardId).single()
    if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 })

    const rarity = card.rarity
    const cost = CRAFT_COSTS[rarity]?.craft || 100

    if (currentPC < cost) {
      return NextResponse.json({ error: `Not enough Political Capital. Need ${cost}, have ${currentPC}` }, { status: 400 })
    }

    // Deduct PC
    const newPC = currentPC - cost
    const { error: updErr } = await admin.from('profiles').update({ political_capital: newPC }).eq('id', user.id)
    if (updErr) return NextResponse.json({ error: 'Failed to update balance: ' + updErr.message }, { status: 500 })

    // Insert new card
    const { error: insErr } = await admin.from('user_cards').insert({
      user_id: user.id,
      card_id: card.id,
      card_name: card.name,
      pack_id: 'crafted',
      obtained_at: new Date().toISOString(),
    })
    if (insErr) {
      // Rollback PC
      await admin.from('profiles').update({ political_capital: currentPC }).eq('id', user.id)
      return NextResponse.json({ error: 'Failed to craft card: ' + insErr.message }, { status: 500 })
    }

    // Log
    await admin.from('crafting_log').insert({
      user_id: user.id,
      action: 'craft',
      card_id: card.id,
      card_name: card.name,
      rarity,
      amount: cost,
    })

    return NextResponse.json({
      success: true,
      politicalCapital: newPC,
      spent: cost,
      action: 'craft',
      card: { id: card.id, name: card.name, rarity: card.rarity },
    })
  }

  return NextResponse.json({ error: 'Invalid action. Use "dismantle" or "craft"' }, { status: 400 })
}
