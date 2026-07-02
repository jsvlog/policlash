'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { fetchUserPacks, fetchUserCards, fetchMyTransactions } from '@/lib/shop-service'
import { RARITY_COLORS, FACTION_COLORS, FACTION_ICONS } from '@/lib/card-data'
import { xpToNextLevel, xpForLevel, RARITY_LEVEL_MULT } from '@/lib/campaign-engine'
import CraftingPanel from '@/components/CraftingPanel'
import type { CardRarity } from '@/lib/types'

const RARITY_LABELS: Record<string, string> = {
  common: 'Common', rare: 'Rare', epic: 'Epic', mythic: 'Mythic', legendary: 'Legendary',
}

const STAT_LABELS: Record<string, string> = {
  charisma: 'Charisma', machinery: 'Machinery', budget: 'Budget', influence: 'Influence',
}

const STAT_EMOJI: Record<string, string> = {
  charisma: '🎤', machinery: '⚙️', budget: '💰', influence: '🤝',
}

export default function DashboardClient() {
  const [user, setUser] = useState<any>(null)
  const [packs, setPacks] = useState<any[]>([])
  const [cards, setCards] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [packNameMap, setPackNameMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [openingResult, setOpeningResult] = useState<any[] | null>(null)
  const [duplicateResults, setDuplicateResults] = useState<any[] | null>(null)
  const [opening, setOpening] = useState(false)
  const [selectedCard, setSelectedCard] = useState<any | null>(null)
  const router = useRouter()

  const loadData = useCallback(async (userId: string) => {
    try {
      const supabase = createClient()

      // Fetch packs, cards, transactions, and pack name map in parallel
      const [userPacks, userCardRows, txResult] = await Promise.all([
        fetchUserPacks(userId),
        supabase
          .from('user_cards')
          .select('id, card_id, card_name, level, xp, obtained_at')
          .eq('user_id', userId)
          .order('obtained_at', { ascending: false }),
        fetchMyTransactions(),
      ])
      setPacks(userPacks)
      setTransactions(txResult)

      const rows = userCardRows.data || []
      if (rows.length === 0) { setCards([]); return }

      // Fetch full card details from cards table
      const cardIds = [...new Set(rows.map((r: any) => r.card_id).filter(Boolean))]
      const { data: cardDetails } = await supabase
        .from('cards')
        .select('*')
        .in('id', cardIds)

      const cardMap = new Map((cardDetails || []).map((c: any) => [c.id, c]))

      // Merge user_cards with card details (preserve user_cards.id as key)
      const enriched = rows.map((uc: any) => {
        const detail = cardMap.get(uc.card_id)
        const merged = detail
          ? { ...detail, ...uc, card_detail_id: detail.id }
          : { ...uc }
        return merged
      })

      setCards(enriched)

      // Fetch pack names for transaction display
      const { data: packs } = await supabase.from('shop_packs').select('id, name')
      if (packs) {
        const map: Record<string, string> = {}
        for (const p of packs) map[p.id] = p.name
        setPackNameMap(map)
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err)
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)
      await loadData(data.user.id)
      setLoading(false)
    })
  }, [router, loadData])

  const handleOpenPack = async (userPackId: string) => {
    setOpening(true)
    try {
      const res = await fetch('/api/packs/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPackId }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Failed to open pack'); return }
      setOpeningResult(data.cards)
      if (data.duplicates?.length > 0) setDuplicateResults(data.duplicates)
      if (user) await loadData(user.id)
    } catch (err: any) {
      alert('Error opening pack: ' + (err.message || 'Unknown error'))
    } finally { setOpening(false) }
  }

  // XP helpers
  const getCurrentLevelXp = (totalXp: number, level: number) => totalXp - xpForLevel(level)
  const getXpProgress = (totalXp: number, level: number) => {
    if (level >= 100) return 100
    const current = getCurrentLevelXp(totalXp, level)
    const needed = xpToNextLevel(level)
    return Math.min(100, Math.round((current / needed) * 100))
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-card p-6 animate-pulse">
              <div className="h-6 w-48 bg-white/10 rounded-lg mb-4" />
              <div className="h-4 w-full bg-white/5 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold gradient-text mb-2">Dashboard</h1>
      <p className="text-white/50 mb-8">Welcome back, {user?.email}</p>

      {/* Pack Inventory */}
      <div className="glass-card-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-amber-300 mb-4">📦 Your Packs ({packs.length})</h2>
        {packs.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">📦</div>
            <p className="text-white/50 mb-4">No packs yet. Visit the shop to buy some!</p>
            <Link href="/shop" className="px-6 py-2 rounded-lg btn-gradient text-white font-medium inline-block">
              Go to Shop
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packs.map((p: any) => (
              <div key={p.id} className="glass-card p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">{p.pack_name}</div>
                  <div className="text-xs text-white/40">{new Date(p.obtained_at).toLocaleDateString()}</div>
                </div>
                {p.status === 'unopened' ? (
                  <button
                    onClick={() => handleOpenPack(p.id)}
                    disabled={opening}
                    className="px-4 py-2 rounded-lg btn-gradient text-white text-sm font-medium disabled:opacity-50"
                  >
                    {opening ? 'Opening...' : 'Open'}
                  </button>
                ) : (
                  <span className="text-xs text-white/30">Opened</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Purchase History */}
      <div className="glass-card-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-amber-300 mb-4">🧾 Your Purchases ({transactions.length})</h2>
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">🧾</div>
            <p className="text-white/50">No purchases yet. Visit the shop to buy packs!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx: any) => {
              const statusStyles: Record<string, string> = {
                pending: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
                approved: 'bg-green-500/15 text-green-300 border-green-500/30',
                rejected: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
              }
              const statusLabels: Record<string, string> = {
                pending: '⏳ Pending Review',
                approved: '✅ Approved',
                rejected: '❌ Rejected',
              }
              const packName = packNameMap[tx.pack_id] || tx.pack_id?.replace(/-/g, ' ') || 'Unknown Pack'
              return (
                <div key={tx.reference_number} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-white text-sm truncate">{packName}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusStyles[tx.status] || statusStyles.pending}`}>
                        {statusLabels[tx.status] || tx.status}
                      </span>
                    </div>
                    <div className="text-xs text-white/40 space-x-3">
                      <span>₱{Number(tx.amount).toFixed(2)}</span>
                      <span>Ref: {tx.reference_number}</span>
                      <span>{new Date(tx.created_at).toLocaleDateString('en-PH', {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}</span>
                    </div>
                  </div>
                  {tx.status === 'rejected' && (
                    <div className="text-xs text-rose-300/70 shrink-0">
                      Payment was not verified. Please contact support or try again.
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Card Collection */}
      <div className="glass-card-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-amber-300 mb-4">🎴 Your Cards ({cards.length})</h2>
        {cards.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">🎴</div>
            <p className="text-white/50">No cards collected yet. Open a pack to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {cards.map((c: any) => {
              const rarity = (c.rarity || 'common') as CardRarity
              const rarityColor = RARITY_COLORS[rarity] || '#94a3b8'
              const factionIcon = FACTION_ICONS[c.faction as keyof typeof FACTION_ICONS] || ''
              const xpPct = getXpProgress(c.xp || 0, c.level || 1)

              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCard(c)}
                  className="group relative rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.05] hover:z-10"
                  style={{ boxShadow: `0 4px 16px ${rarityColor}15, 0 0 0 1px ${rarityColor}25` }}
                >
                  {/* Card image — ~80% of the card */}
                  <div className="aspect-[2/3] bg-white/5 relative">
                    {c.art_url ? (
                      <img src={c.art_url} alt={c.name || c.card_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">
                        {factionIcon}
                      </div>
                    )}

                    {/* Rarity glow */}
                    <div className="absolute inset-0 pointer-events-none"
                      style={{ background: `linear-gradient(180deg, ${rarityColor}20 0%, transparent 50%, ${rarityColor}10 100%)` }} />

                    {/* Level badge */}
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 text-[10px] font-bold text-amber-400">
                      Lv.{c.level || 1}
                    </div>

                    {/* XP mini bar at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                      <div className="h-full transition-all" style={{ width: `${xpPct}%`, backgroundColor: rarityColor }} />
                    </div>

                    {/* Name overlay */}
                    <div className="absolute bottom-1 left-0 right-0 px-2 pb-1 bg-gradient-to-t from-black/70 to-transparent pt-4">
                      <div className="text-[11px] font-bold text-white truncate leading-tight">
                        {factionIcon} {c.name || c.card_name}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Card Crafting */}
      {user && <CraftingPanel userId={user.id} onRefresh={() => loadData(user.id)} />}

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/campaign" className="glass-card p-6 text-center hover:scale-[1.02] transition">
          <div className="text-3xl mb-2">🗺️</div>
          <div className="font-bold text-amber-300">Campaign</div>
          <div className="text-sm text-white/50 mt-1">Conquer 100 maps</div>
        </Link>
        <Link href="/shop" className="glass-card p-6 text-center hover:scale-[1.02] transition">
          <div className="text-3xl mb-2">🛒</div>
          <div className="font-bold text-amber-300">Shop</div>
          <div className="text-sm text-white/50 mt-1">Buy new packs</div>
        </Link>
        <Link href="/admin-dashboard" className="glass-card p-6 text-center hover:scale-[1.02] transition">
          <div className="text-3xl mb-2">🔐</div>
          <div className="font-bold text-amber-300">Admin</div>
          <div className="text-sm text-white/50 mt-1">Verify transactions</div>
        </Link>
      </div>

      {/* Pack Opening Modal */}
      {openingResult && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setOpeningResult(null)}>
          <div className="glass-card-lg p-8 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-amber-300 text-center mb-6">🎴 Pack Opened!</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {openingResult.map((card, i) => (
                <div
                  key={i}
                  className="game-card p-3 flex flex-col"
                  style={{ borderColor: RARITY_COLORS[card.rarity as CardRarity], width: '100%', minHeight: '160px' }}
                >
                  <div className="text-sm font-bold text-center text-white truncate">{card.name}</div>
                  <div className="text-[10px] text-white/40 text-center mb-1 truncate">{card.title}</div>
                  <div className="text-xs text-center" style={{ color: RARITY_COLORS[card.rarity as CardRarity] }}>
                    {card.rarity?.toUpperCase()}
                  </div>
                  <div className="text-[10px] text-white/40 mt-1 text-center">{card.faction}</div>
                  {card.ability && (
                    <div className="mt-1 text-[9px] text-amber-300/70 text-center">⚡ {card.ability.name}</div>
                  )}
                </div>
              ))}
            </div>
            {duplicateResults && duplicateResults.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4">
                <div className="text-sm font-bold text-amber-300 mb-2">🔄 Duplicate Bonus XP</div>
                {duplicateResults.map((dup: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm text-white/70">
                    <span>{dup.name}</span>
                    <span className="text-amber-400">+{dup.xpGained} XP</span>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => { setOpeningResult(null); setDuplicateResults(null) }}
              className="w-full px-6 py-3 rounded-xl btn-gradient text-white font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* CARD DETAIL MODAL */}
      {selectedCard && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="glass-card-lg p-0 max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const c = selectedCard
              const rarity = (c.rarity || 'common') as CardRarity
              const rarityColor = RARITY_COLORS[rarity] || '#94a3b8'
              const levelMult = RARITY_LEVEL_MULT[rarity] || 0.015
              const factionIcon = FACTION_ICONS[c.faction as keyof typeof FACTION_ICONS] || ''
              const factionColor = FACTION_COLORS[c.faction as keyof typeof FACTION_COLORS] || '#fff'
              const level = c.level || 1
              const totalXp = c.xp || 0
              const currentLevelXp = getCurrentLevelXp(totalXp, level)
              const neededXp = xpToNextLevel(level)
              const xpPct = getXpProgress(totalXp, level)
              const stats = c.stats || { charisma: 5, machinery: 5, budget: 5, influence: 5 }

              return (
                <>
                  {/* Header with rarity color */}
                  <div className="p-6" style={{ background: `linear-gradient(135deg, ${rarityColor}20, transparent 60%)` }}>
                    {/* Card art */}
                    {c.art_url && (
                      <div className="flex justify-center mb-4">
                        <img
                          src={c.art_url}
                          alt={c.name}
                          className="w-40 h-56 object-cover rounded-xl border-2"
                          style={{ borderColor: rarityColor + '60' }}
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{factionIcon}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: factionColor + '30', color: factionColor }}>
                          {c.faction?.toUpperCase()}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedCard(null)}
                        className="text-white/30 hover:text-white/80 text-xl leading-none"
                      >
                        ✕
                      </button>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-1">{c.name || c.card_name}</h2>
                    <p className="text-white/40 text-sm mb-3">{c.title || 'No title'}</p>

                    {/* Rarity + Level badges */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ backgroundColor: rarityColor + '30', color: rarityColor }}>
                        {RARITY_LABELS[rarity]?.toUpperCase()}
                      </span>
                      <span className="text-xs px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 font-medium">
                        Lv.{level}
                      </span>
                      <span className="text-xs text-white/20">
                        +{Math.round((level - 1) * levelMult * 100)}% stats
                      </span>
                    </div>

                    {/* XP Progress Bar */}
                    <div className="mb-1">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-white/40">XP</span>
                        <span className="text-white/60">
                          {level >= 100
                            ? 'MAX LEVEL'
                            : `${currentLevelXp.toLocaleString()} / ${neededXp.toLocaleString()} XP`}
                        </span>
                      </div>
                      <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${level >= 100 ? 100 : xpPct}%`,
                            background: `linear-gradient(90deg, ${rarityColor}, ${rarityColor}cc)`,
                          }}
                        />
                      </div>
                      {level < 100 && (
                        <div className="text-[10px] text-white/20 mt-0.5 text-right">
                          {xpPct}% to Level {level + 1}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="p-6 pt-4">
                    <h3 className="text-sm font-bold text-amber-300 mb-3">📊 Combat Stats</h3>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {Object.entries(STAT_LABELS).map(([key, label]) => {
                        const baseVal = stats[key as keyof typeof stats] || 0
                        const scaledVal = Math.floor(baseVal * (1 + (level - 1) * levelMult))
                        const increase = scaledVal - baseVal
                        return (
                          <div key={key} className="glass-card p-3">
                            <div className="text-[10px] text-white/30 mb-1">
                              {STAT_EMOJI[key]} {label}
                            </div>
                            <div className="text-lg font-bold text-white">
                              {scaledVal}
                              {increase > 0 && (
                                <span className="text-xs text-green-400 ml-1">+{increase}</span>
                              )}
                            </div>
                            <div className="text-[9px] text-white/20">Base: {baseVal}</div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Ability */}
                    {c.ability && (
                      <div className="glass-card p-4 mb-4" style={{ borderColor: rarityColor + '40' }}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm">⚡</span>
                          <span className="text-sm font-bold text-amber-300">{c.ability.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/30">
                            {c.ability.type?.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-white/50">{c.ability.description}</p>
                        <div className="flex gap-3 mt-2 text-[10px] text-white/30">
                          {c.ability.power > 0 && <span>Power: {c.ability.power}</span>}
                          {c.ability.cooldown > 0 && <span>Cooldown: {c.ability.cooldown} turns</span>}
                          <span>Trigger: {c.ability.trigger}</span>
                        </div>
                      </div>
                    )}

                    {/* Flavor text */}
                    {c.flavor_text && (
                      <p className="text-xs text-white/20 italic text-center mb-3">
                        &ldquo;{c.flavor_text}&rdquo;
                      </p>
                    )}

                    {/* Level scaling info */}
                    {level < 100 && (
                      <div className="text-center text-[10px] text-white/20">
                        Next level at {xpForLevel(level + 1).toLocaleString()} total XP
                        {' • '}Lv.100 bonus: +{Math.round(99 * levelMult * 100)}% all stats
                      </div>
                    )}
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
