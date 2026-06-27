'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RARITY_COLORS, FACTION_ICONS, FACTION_COLORS } from '@/lib/card-data'
import type { CardRarity, CardFaction } from '@/lib/types'

type SortKey = 'name' | 'rarity' | 'faction' | 'cost'
type FilterRarity = 'all' | CardRarity
type FilterFaction = 'all' | CardFaction

const RARITY_ORDER: Record<string, number> = {
  mythic: 0, legendary: 1, epic: 2, rare: 3, common: 4,
}

const RARITY_LABEL: Record<string, string> = {
  common: 'Common', rare: 'Rare', epic: 'Epic', mythic: 'Mythic', legendary: 'Legendary',
}

export default function CardsPage() {
  const [allCards, setAllCards] = useState<any[]>([])
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortKey>('rarity')
  const [filterRarity, setFilterRarity] = useState<FilterRarity>('all')
  const [filterFaction, setFilterFaction] = useState<FilterFaction>('all')
  const [filterOwned, setFilterOwned] = useState<'all' | 'owned' | 'missing'>('all')
  const [selectedCard, setSelectedCard] = useState<any | null>(null)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('cards').select('*').order('name'),
      supabase.auth.getUser().then(async ({ data }) => {
        if (!data.user) return []
        const { data: userCards } = await supabase
          .from('user_cards')
          .select('card_id')
          .eq('user_id', data.user.id)
        return userCards || []
      }),
    ]).then(([cardsRes, userCards]) => {
      if (cardsRes.data) setAllCards(cardsRes.data)
      setOwnedIds(new Set(userCards.map((uc: any) => uc.card_id)))
      setLoading(false)
    })
  }, [])

  const sortedAndFiltered = useMemo(() => {
    let result = [...allCards]

    // Filter
    if (filterRarity !== 'all') result = result.filter(c => c.rarity === filterRarity)
    if (filterFaction !== 'all') result = result.filter(c => c.faction === filterFaction)
    if (filterOwned === 'owned') result = result.filter(c => ownedIds.has(c.id))
    if (filterOwned === 'missing') result = result.filter(c => !ownedIds.has(c.id))

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name)
        case 'rarity': return (RARITY_ORDER[a.rarity] || 9) - (RARITY_ORDER[b.rarity] || 9)
        case 'faction': return a.faction.localeCompare(b.faction)
        case 'cost': return a.cost - b.cost
        default: return 0
      }
    })

    return result
  }, [allCards, filterRarity, filterFaction, filterOwned, sortBy, ownedIds])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="w-full aspect-[2/3] bg-white/5 rounded-lg mb-3" />
              <div className="h-4 w-3/4 bg-white/10 rounded mx-auto" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold gradient-text">🎴 Card Collection</h1>
          <p className="text-white/40 text-sm mt-1">
            {allCards.length} cards total • {ownedIds.size} collected
          </p>
        </div>
      </div>

      {/* Filters + Sort bar */}
      <div className="glass-card p-4 mb-6 flex flex-wrap items-center gap-3">
        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30">Sort:</span>
          {(['name', 'rarity', 'faction', 'cost'] as SortKey[]).map(key => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-3 py-1 rounded-lg text-xs transition ${
                sortBy === key ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-white/40 hover:bg-white/10'
              }`}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-white/10" />

        {/* Rarity filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30">Rarity:</span>
          <button onClick={() => setFilterRarity('all')}
            className={`px-2 py-1 rounded-lg text-xs transition ${filterRarity === 'all' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}>All</button>
          {(Object.keys(RARITY_COLORS) as CardRarity[]).map(r => (
            <button key={r} onClick={() => setFilterRarity(r)}
              className="px-2 py-1 rounded-lg text-xs transition"
              style={{
                backgroundColor: filterRarity === r ? RARITY_COLORS[r] + '30' : 'transparent',
                color: filterRarity === r ? RARITY_COLORS[r] : undefined,
              }}>
              {RARITY_LABEL[r]}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-white/10" />

        {/* Faction filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30">Faction:</span>
          <button onClick={() => setFilterFaction('all')}
            className={`px-2 py-1 rounded-lg text-xs transition ${filterFaction === 'all' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}>All</button>
          {(Object.keys(FACTION_ICONS) as CardFaction[]).map(f => (
            <button key={f} onClick={() => setFilterFaction(f)}
              className={`px-2 py-1 rounded-lg text-xs transition ${
                filterFaction === f ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'
              }`}>
              {FACTION_ICONS[f]} {f}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-white/10" />

        {/* Owned filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30">Owned:</span>
          {(['all', 'owned', 'missing'] as const).map(o => (
            <button key={o} onClick={() => setFilterOwned(o)}
              className={`px-3 py-1 rounded-lg text-xs transition ${
                filterOwned === o ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'
              }`}>
              {o === 'all' ? 'All' : o === 'owned' ? '✅ Owned' : '❓ Missing'}
            </button>
          ))}
        </div>
      </div>

      {/* Card Grid — image-first design */}
      {sortedAndFiltered.length === 0 ? (
        <div className="glass-card-lg p-12 text-center">
          <div className="text-5xl mb-3">🔍</div>
          <p className="text-white/40">No cards match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {sortedAndFiltered.map((card: any) => {
            const rarity = (card.rarity || 'common') as CardRarity
            const rarityColor = RARITY_COLORS[rarity] || '#94a3b8'
            const factionIcon = FACTION_ICONS[card.faction as CardFaction] || ''
            const isOwned = ownedIds.has(card.id)
            const stats = card.stats || {}

            return (
              <button
                key={card.id}
                onClick={() => setSelectedCard(card)}
                className={`group relative rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.04] hover:z-10 ${
                  !isOwned ? 'opacity-50 hover:opacity-80' : ''
                }`}
                style={{
                  boxShadow: `0 4px 20px ${rarityColor}20, 0 0 0 1px ${rarityColor}30`,
                }}
              >
                {/* Card image — 80% of card */}
                <div className="aspect-[2/3] bg-white/5 relative">
                  {card.art_url ? (
                    <img
                      src={card.art_url}
                      alt={card.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl opacity-30">
                      {factionIcon}
                    </div>
                  )}

                  {/* Rarity glow overlay */}
                  <div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                      background: `linear-gradient(180deg, ${rarityColor}40 0%, transparent 50%, ${rarityColor}20 100%)`,
                    }}
                  />

                  {/* Owned badge */}
                  {isOwned && (
                    <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-green-500/80 flex items-center justify-center text-sm">
                      ✅
                    </div>
                  )}
                  {!isOwned && (
                    <div className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-black/50 text-white/50">
                      ❓
                    </div>
                  )}

                  {/* Name + rarity at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="text-xs font-bold text-white truncate">{card.name}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[9px]" style={{ color: rarityColor }}>
                        {RARITY_LABEL[rarity]}
                      </span>
                      <span className="text-[9px] text-white/30">{factionIcon}</span>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* CARD DETAIL MODAL — image-first */}
      {selectedCard && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4" onClick={() => setSelectedCard(null)}>
          <div className="flex flex-col md:flex-row gap-6 max-w-3xl w-full max-h-[90vh]" onClick={e => e.stopPropagation()}>
            {/* Left: Card image (large) */}
            <div className="flex-shrink-0 flex items-center justify-center">
              <div
                className="w-64 md:w-72 rounded-2xl overflow-hidden"
                style={{ boxShadow: `0 0 40px ${RARITY_COLORS[selectedCard.rarity as CardRarity] || '#94a3b8'}30` }}
              >
                {selectedCard.art_url ? (
                  <img src={selectedCard.art_url} alt={selectedCard.name} className="w-full aspect-[2/3] object-cover" />
                ) : (
                  <div className="w-full aspect-[2/3] bg-white/5 flex items-center justify-center text-7xl opacity-30">
                    {FACTION_ICONS[selectedCard.faction as CardFaction] || '🃏'}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Card info */}
            <div className="glass-card-lg p-6 flex-1 overflow-y-auto">
              <button onClick={() => setSelectedCard(null)}
                className="float-right text-white/30 hover:text-white/80 text-xl">✕</button>

              <h2 className="text-2xl font-bold text-white mb-1">{selectedCard.name}</h2>
              <p className="text-white/40 text-sm mb-4">{selectedCard.title}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-xs px-3 py-1 rounded-full font-medium"
                  style={{ backgroundColor: (RARITY_COLORS[selectedCard.rarity as CardRarity] || '#94a3b8') + '20', color: RARITY_COLORS[selectedCard.rarity as CardRarity] }}>
                  {RARITY_LABEL[selectedCard.rarity]?.toUpperCase()}
                </span>
                <span className="text-xs px-3 py-1 rounded-full bg-white/10 text-white/60">
                  {FACTION_ICONS[selectedCard.faction as CardFaction]} {selectedCard.faction}
                </span>
                <span className="text-xs px-3 py-1 rounded-full bg-white/10 text-white/60">
                  Cost: ₱{selectedCard.cost}
                </span>
                {ownedIds.has(selectedCard.id) ? (
                  <span className="text-xs px-3 py-1 rounded-full bg-green-500/20 text-green-400">✅ Owned</span>
                ) : (
                  <span className="text-xs px-3 py-1 rounded-full bg-white/5 text-white/30">❓ Not owned</span>
                )}
              </div>

              {/* Stats */}
              <h3 className="text-sm font-bold text-amber-300 mb-2">Stats</h3>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {['charisma', 'machinery', 'budget', 'influence'].map(key => (
                  <div key={key} className="glass-card p-2 text-center">
                    <div className="text-[9px] text-white/30 capitalize">{key.slice(0, 4)}</div>
                    <div className="text-lg font-bold text-white">{selectedCard.stats?.[key] || 0}</div>
                  </div>
                ))}
              </div>

              {/* Ability */}
              {selectedCard.ability && (
                <div className="glass-card p-3 mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span>⚡</span>
                    <span className="text-sm font-bold text-amber-300">{selectedCard.ability.name}</span>
                  </div>
                  <p className="text-xs text-white/50">{selectedCard.ability.description}</p>
                </div>
              )}

              {/* Flavor */}
              {selectedCard.flavor_text && (
                <p className="text-xs text-white/20 italic">&ldquo;{selectedCard.flavor_text}&rdquo;</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
