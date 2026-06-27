// ============================================================
// PoliClash PH — Static Card & Pack Data (for offline/training)
// ============================================================
import type { GameCard, ShopPack, CardRarity, CardStats, CardAbility, CardFaction } from './types'

// ---- Rarity Colors (for UI) ----
export const RARITY_COLORS: Record<CardRarity, string> = {
  common: '#94a3b8',
  rare: '#3b82f6',
  epic: '#a855f7',
  mythic: '#ec4899',
  legendary: '#f59e0b',
}

// ---- Faction Colors & Icons (for UI) ----
export const FACTION_COLORS: Record<CardFaction, string> = {
  trapo: '#dc2626',
  reformer: '#16a34a',
  showbiz: '#facc15',
  dynasty: '#7c3aed',
  activist: '#0891b2',
  warlord: '#4a1d1d',
}

export const FACTION_ICONS: Record<CardFaction, string> = {
  trapo: '🎩',
  reformer: '⚖️',
  showbiz: '🎬',
  dynasty: '👑',
  activist: ' megaphone',
  warlord: '⚔️',
}

// ---- Abilities ----
const ab = (
  id: string, name: string, type: CardAbility['type'],
  description: string, power = 0, cooldown = 0, trigger: CardAbility['trigger'] = 'active'
): CardAbility => ({ id, name, type, description, power, cooldown, trigger })

// ---- Starter Cards (always available, used in training) ----
export const STARTER_CARDS: GameCard[] = [
  {
    id: 'starter-budots',
    name: 'Mayor Budots',
    title: 'Mayor of Talisay',
    faction: 'trapo',
    rarity: 'common',
    stats: { charisma: 6, machinery: 4, budget: 7, influence: 2 },
    ability: ab('vote_buy', 'Vote Buying', 'vote_buy', 'Add +1 to all stats this turn.', 1, 2),
    art_url: 'https://crjhmqrctfsbbffnasqc.supabase.co/storage/v1/object/public/card-art/common-24-1782534376436.png',
    flavor_text: 'Every vote has a price tag.',
    cost: 4,
    pack_source: 'starter',
  },
  {
    id: 'starter-grandstander',
    name: 'Senador Grandstander',
    title: 'Senator-At-Large',
    faction: 'trapo',
    rarity: 'rare',
    stats: { charisma: 8, machinery: 6, budget: 5, influence: 3 },
    ability: ab('privilege_speech', 'Privilege Speech', 'break_defense', 'Break enemy defenses — next attack ignores defense stats.', 0, 3),
    art_url: '',
    flavor_text: 'Insert privilege speech here.',
    cost: 5,
    pack_source: 'starter',
  },
  {
    id: 'starter-dynasty',
    name: 'Kongresista Dynasty III',
    title: 'Representative 3rd District',
    faction: 'dynasty',
    rarity: 'epic',
    stats: { charisma: 5, machinery: 9, budget: 6, influence: 4 },
    ability: ab('legacy', 'Family Legacy', 'legacy', 'When destroyed, adjacent allies gain +2 Influence.', 2, 0, 'on_destroy'),
    art_url: '',
    flavor_text: 'My father was congressman. His father was congressman. I am congressman.',
    cost: 6,
    pack_source: 'starter',
  },
  {
    id: 'starter-activista',
    name: 'Konsehala Activista',
    title: 'City Councilor',
    faction: 'activist',
    rarity: 'rare',
    stats: { charisma: 6, machinery: 3, budget: 3, influence: 4 },
    ability: ab('investigate', 'Investigate', 'investigate', 'Reveal all enemy face-down cards.', 0, 2),
    art_url: '',
    flavor_text: 'Fighting the good fight since 1998.',
    cost: 3,
    pack_source: 'starter',
  },
  {
    id: 'starter-barangay',
    name: 'Barangay Captain Trapo',
    title: 'Barangay Captain',
    faction: 'trapo',
    rarity: 'common',
    stats: { charisma: 4, machinery: 3, budget: 4, influence: 1 },
    ability: null,
    art_url: 'https://crjhmqrctfsbbffnasqc.supabase.co/storage/v1/object/public/card-art/common-01-1782534358842.png',
    flavor_text: 'Small-time corruption, small-time dreams.',
    cost: 2,
    pack_source: 'starter',
  },
  {
    id: 'starter-reformist',
    name: 'Bise Presidente Reformist',
    title: 'Vice President',
    faction: 'reformer',
    rarity: 'epic',
    stats: { charisma: 7, machinery: 4, budget: 5, influence: 2 },
    ability: ab('pardon', 'Executive Pardon', 'pardon', 'Revive a destroyed ally from graveyard.', 1, 4),
    art_url: '',
    flavor_text: 'Change is coming... eventually.',
    cost: 6,
    pack_source: 'starter',
  },
  {
    id: 'starter-lobbyista',
    name: 'Lobbyista Hidden',
    title: 'Chief of Staff',
    faction: 'trapo',
    rarity: 'rare',
    stats: { charisma: 3, machinery: 7, budget: 9, influence: 3 },
    ability: ab('pork_barrel', 'Pork Barrel', 'pork_barrel', 'Generate +3 Budget pool immediately.', 3, 2, 'on_play'),
    art_url: '',
    flavor_text: "Where there's a project, there's a kickback.",
    cost: 4,
    pack_source: 'starter',
  },
  {
    id: 'presgood',
    name: 'Prezidensiable Showbiz',
    title: 'Presidential Candidate',
    faction: 'showbiz',
    rarity: 'mythic',
    stats: { charisma: 10, machinery: 5, budget: 7, influence: 5 },
    ability: ab('rally_support', 'Mega Campaign Rally', 'rally_support', '+3 Charisma to all allies on board.', 3, 2),
    art_url: '',
    flavor_text: 'From noontime show to noontime inauguration.',
    cost: 8,
    pack_source: 'mythic-trapo',
  },
  {
    id: 'presgood-warlord',
    name: 'Governor Warlord',
    title: 'Provincial Governor',
    faction: 'warlord',
    rarity: 'epic',
    stats: { charisma: 4, machinery: 7, budget: 8, influence: 7 },
    ability: ab('blackmail', 'Blackmail', 'blackmail', 'Destroy enemy card with lowest Influence.', 1, 3),
    art_url: '',
    flavor_text: 'Peace and order... my way.',
    cost: 7,
    pack_source: 'mythic-trapo',
  },
  {
    id: 'presgood-strongman',
    name: 'Probinsiyano Strongman',
    title: 'Mayor of disthan town',
    faction: 'warlord',
    rarity: 'legendary',
    stats: { charisma: 7, machinery: 10, budget: 9, influence: 8 },
    ability: ab('immunity', 'Political Immunity', 'immunity', 'Cannot be targeted for 2 turns.', 2, 3),
    art_url: '',
    flavor_text: 'Untouchable. Untraceable. Unfortunately real.',
    cost: 9,
    pack_source: 'mythic-trapo',
  },
]

// ---- Premium Packs ----
export const SHOP_PACKS: ShopPack[] = [
  {
    id: 'starter-trapo-pack',
    name: 'Starter Trapo Pack',
    description: 'Signed in by the barangay captain himself. 5 cards, at least 1 Rare.',
    price: 25,
    card_count: 5,
    guaranteed_rarity: 'rare',
    rarity_weights: { common: 60, rare: 25, epic: 10, mythic: 4, legendary: 1 },
    art_url: '',
    featured_cards: ['Mayor Budots', 'Konsehala Activista'],
  },
  {
    id: 'mythic-trapo-pack',
    name: 'Mythic Trapo Pack',
    description: 'Where the real trapos play. 5 cards, guaranteed Epic or higher. Chance for Mythic and Legendary!',
    price: 50,
    card_count: 5,
    guaranteed_rarity: 'epic',
    rarity_weights: { common: 30, rare: 30, epic: 25, mythic: 10, legendary: 5 },
    art_url: '',
    featured_cards: ['Prezidensiable Showbiz', 'Lobbyista Hidden'],
  },
  {
    id: 'reformers-pack',
    name: "Reformer's Dilemma Pack",
    description: 'A pack for the idealists. 5 cards featuring the rare Reformist faction.',
    price: 40,
    card_count: 5,
    guaranteed_rarity: 'rare',
    rarity_weights: { common: 50, rare: 30, epic: 15, mythic: 4, legendary: 1 },
    art_url: '',
    featured_cards: ['Bise Presidente Reformist'],
  },
  {
    id: 'legendary-dynasty',
    name: 'Legendary Dynasty Pack',
    description: 'Blood is thicker than water — and politics. 3 cards, with a shot at the one and only Legendary card.',
    price: 100,
    card_count: 3,
    guaranteed_rarity: 'mythic',
    rarity_weights: { common: 10, rare: 20, epic: 30, mythic: 25, legendary: 15 },
    art_url: '',
    featured_cards: ['Probinsiyano Strongman', 'Kongresista Dynasty III'],
  },
]

// ---- Generate Unique Transaction Amount (centavo trick) ----
export function generateCentavoAmount(basePrice: number): number {
  const centavos = Math.floor(Math.random() * 99) + 1 // 1-99 centavos
  return +(basePrice + centavos / 100).toFixed(2)
}

// ---- Weak Opponent Deck (for training) ----
export const AI_OPPONENT_DECKS: Record<string, GameCard[]> = {
  easy: [STARTER_CARDS[0], STARTER_CARDS[2], STARTER_CARDS[4], STARTER_CARDS[3], STARTER_CARDS[6], STARTER_CARDS[4], STARTER_CARDS[0]],
  medium: [STARTER_CARDS[1], STARTER_CARDS[5], STARTER_CARDS[7], STARTER_CARDS[6], STARTER_CARDS[8], STARTER_CARDS[3], STARTER_CARDS[0], STARTER_CARDS[2]],
  hard: [STARTER_CARDS[8], STARTER_CARDS[7], STARTER_CARDS[9], STARTER_CARDS[1], STARTER_CARDS[5], STARTER_CARDS[6], STARTER_CARDS[2], STARTER_CARDS[8], STARTER_CARDS[9]],
}

 // ---- Rarity Weights for Pack Opening ----
export const RARITY_ORDER: CardRarity[] = ['common', 'rare', 'epic', 'legendary', 'mythic']

export function rollRarity(weights: Record<CardRarity, number>): CardRarity {
  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  let roll = Math.random() * total
  for (const r of RARITY_ORDER) {
    roll -= weights[r]
    if (roll <= 0) return r
  }
  return 'common'
}

// ---- Open a Pack (client-side logic) ----
export function openPack(
  pack: ShopPack,
  availableCards: GameCard[]
): GameCard[] {
  const result: GameCard[] = []
  const cardsByRarity: Record<CardRarity, GameCard[]> = {
    common: [], rare: [], epic: [], mythic: [], legendary: []
  }

  availableCards.forEach((c) => {
    cardsByRarity[c.rarity].push(c)
  })

  for (let i = 0; i < pack.card_count; i++) {
    const rarity = rollRarity(pack.rarity_weights)
    const pool = cardsByRarity[rarity].length > 0
      ? cardsByRarity[rarity]
      : cardsByRarity.common
    if (pool.length > 0) {
      result.push(pool[Math.floor(Math.random() * pool.length)])
    }
  }

  // Guarantee at least one card of guaranteed_rarity
  const hasGuaranteed = result.some((c) =>
    RARITY_ORDER.indexOf(c.rarity) >= RARITY_ORDER.indexOf(pack.guaranteed_rarity)
  )
  if (!hasGuaranteed && cardsByRarity[pack.guaranteed_rarity].length > 0) {
    const guaranteedCard = cardsByRarity[pack.guaranteed_rarity][0]
    result[0] = guaranteedCard
  }

  return result
}