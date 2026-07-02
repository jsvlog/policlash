import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import type { GameCard, CardRarity } from '@/lib/types'

const RARITY_ORDER: CardRarity[] = ['common', 'rare', 'epic', 'legendary', 'mythic']

function rollRarity(weights: Record<string, number>): CardRarity {
  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  let roll = Math.random() * total
  for (const r of RARITY_ORDER) {
    roll -= weights[r] || 0
    if (roll <= 0) return r
  }
  return 'common'
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(request: Request) {
  // 1. Authenticate user
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse request
  const body = await request.json()
  const { userPackId } = body as { userPackId: string }
  if (!userPackId) {
    return NextResponse.json({ error: 'userPackId required' }, { status: 400 })
  }

  const admin = getAdminClient()

  // 3. Fetch the user_pack row and verify ownership
  const { data: userPack, error: packErr } = await admin
    .from('user_packs')
    .select('*')
    .eq('id', userPackId)
    .eq('user_id', user.id)
    .single()

  if (packErr || !userPack) {
    return NextResponse.json({ error: 'Pack not found or not yours' }, { status: 404 })
  }
  if (userPack.status !== 'unopened') {
    return NextResponse.json({ error: 'Pack already opened' }, { status: 400 })
  }

  // 4. Get pack definition from shop_packs
  const { data: packDef, error: defErr } = await admin
    .from('shop_packs')
    .select('*')
    .eq('id', userPack.pack_id)
    .single()

  if (defErr || !packDef) {
    return NextResponse.json({ error: 'Pack definition not found: ' + (defErr?.message || 'unknown') }, { status: 500 })
  }

  // 5. Get available cards from card library
  const { data: allCards, error: cardsErr } = await admin
    .from('cards')
    .select('*')

  if (cardsErr) {
    return NextResponse.json({ error: 'Failed to fetch card library: ' + cardsErr.message }, { status: 500 })
  }

  const cardPool = (allCards || []) as any[]

  if (cardPool.length === 0) {
    return NextResponse.json({ error: 'No cards in library — seed the cards table first' }, { status: 500 })
  }

  // 6. Group cards by rarity
  const cardsByRarity: Record<string, any[]> = {}
  for (const r of RARITY_ORDER) cardsByRarity[r] = []
  for (const card of cardPool) {
    if (cardsByRarity[card.rarity]) {
      cardsByRarity[card.rarity].push(card)
    } else {
      cardsByRarity.common.push(card)
    }
  }

  // 7. Generate cards based on pack rarity weights
  const weights = packDef.rarity_weights as Record<string, number>
  const guaranteedRarity = packDef.guaranteed_rarity as string
  const cardCount = packDef.card_count as number
  const result: any[] = []

  for (let i = 0; i < cardCount; i++) {
    const rarity = rollRarity(weights)
    const pool = cardsByRarity[rarity]
    if (pool && pool.length > 0) {
      result.push(pool[Math.floor(Math.random() * pool.length)])
    } else {
      // Fallback to common
      if (cardsByRarity.common.length > 0) {
        result.push(cardsByRarity.common[Math.floor(Math.random() * cardsByRarity.common.length)])
      }
    }
  }

  // Guarantee at least one card of guaranteed rarity or better
  const guaranteedIdx = RARITY_ORDER.indexOf(guaranteedRarity as CardRarity)
  const hasGuaranteed = result.some(
    (c) => RARITY_ORDER.indexOf(c.rarity as CardRarity) >= guaranteedIdx
  )
  if (!hasGuaranteed && cardsByRarity[guaranteedRarity]?.length > 0) {
    const guaranteedCard = cardsByRarity[guaranteedRarity][0]
    result[0] = guaranteedCard
  }

  // 8. Insert cards into user_cards
  const inserts = result.map((card) => ({
    user_id: user.id,
    card_id: card.id,
    card_name: card.name,
    pack_id: userPack.pack_id,
    obtained_at: new Date().toISOString(),
  }))

  const { error: insertErr } = await admin
    .from('user_cards')
    .insert(inserts)

  if (insertErr) {
    return NextResponse.json({ error: 'Failed to save cards: ' + insertErr.message }, { status: 500 })
  }

  // 9. Mark pack as opened
  const { error: updateErr } = await admin
    .from('user_packs')
    .update({ status: 'opened' })
    .eq('id', userPackId)

  if (updateErr) {
    // Cards were saved but pack status update failed — log it
    console.error('Failed to mark pack as opened:', updateErr.message)
  }

  // 10. Return the opened cards
  return NextResponse.json({
    success: true,
    cards: result.map((c) => ({
      id: c.id,
      name: c.name,
      title: c.title,
      faction: c.faction,
      rarity: c.rarity,
      stats: c.stats,
      ability: c.ability,
      art_url: c.art_url,
      flavor_text: c.flavor_text,
      cost: c.cost,
      pack_source: c.pack_source,
    })),
  })
}
