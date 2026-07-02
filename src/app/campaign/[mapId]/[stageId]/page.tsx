'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { fetchUserCards } from '@/lib/shop-service'
import { generateMonster, getCampaignMap } from '@/lib/campaign-data'
import {
  startBattle, playerAttack, playerAbility, monsterTurn, clearEvents, awardXp,
  xpFromBattle, xpToNextLevel, levelFromXp,
  type BattleState, type BattleCard
} from '@/lib/campaign-engine'
import { RARITY_COLORS, FACTION_ICONS } from '@/lib/card-data'
import type { GameCard } from '@/lib/types'

type Screen = 'select' | 'battle' | 'victory' | 'defeat'

export default function CampaignBattlePage() {
  const params = useParams()
  const mapId = parseInt(params.mapId as string)
  const stageId = parseInt(params.stageId as string)
  const router = useRouter()

  const [screen, setScreen] = useState<Screen>('select')
  const [userCards, setUserCards] = useState<any[]>([])
  const [selectedCards, setSelectedCards] = useState<any[]>([])
  const [battle, setBattle] = useState<BattleState | null>(null)
  const [animating, setAnimating] = useState(false)
  const [attackAnim, setAttackAnim] = useState<{ cardIndex: number; target: 'monster' | 'card' } | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showCardInfo, setShowCardInfo] = useState<number | null>(null)
  const [metaState, setMetaState] = useState<any>(null)
  const battleLogRef = useRef<HTMLDivElement>(null)
  const battleRef = useRef<BattleState | null>(null)

  const map = getCampaignMap(mapId)
  const monster = generateMonster(mapId, stageId)

  // Keep battleRef in sync
  useEffect(() => { battleRef.current = battle }, [battle])

  // Fetch active meta buffs for card stat modifications
  useEffect(() => {
    fetch('/api/admin/meta')
      .then(r => r.json())
      .then(d => { if (d.success) setMetaState(d.meta) })
      .catch(() => {})
  }, [])

  // Log battle result for analytics (silent - won't block gameplay)
  const logBattle = (result: 'victory' | 'defeat', turns: number, cards: any[]) => {
    if (!userId) return
    fetch('/api/battle/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mapId, stageId, result, turns,
        cardsUsed: cards.map((c: any) => c.name || c.card_name || 'Unknown'),
        cardIds: cards.map((c: any) => c.card_id || c.id),
        monsterName: monster.name,
        monsterLevel: monster.level,
      }),
    }).catch(() => {})
  }

  // Load user's cards with full card details
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.push('/login')
        return
      }
      setUserId(data.user.id)
      
      // Fetch user's card inventory with card details
      const { data: userCardRows, error: ucErr } = await supabase
        .from('user_cards')
        .select('id, card_id, card_name, level, xp, obtained_at')
        .eq('user_id', data.user.id)
        .order('obtained_at', { ascending: false })

      if (ucErr || !userCardRows) {
        setUserCards([])
        return
      }

      // Get unique card_ids and fetch full card data
      const cardIds = [...new Set(userCardRows.map((uc: any) => uc.card_id).filter(Boolean))]
      
      if (cardIds.length === 0) {
        // No card_ids — use name-only cards (fallback)
        setUserCards(userCardRows)
        return
      }

      const { data: cardDetails } = await supabase
        .from('cards')
        .select('*')
        .in('id', cardIds)

      const cardMap = new Map((cardDetails || []).map((c: any) => [c.id, c]))

      // Merge user_cards with card details
      const enriched = userCardRows.map((uc: any) => {
        const detail = cardMap.get(uc.card_id)
        if (detail) {
          return {
            ...uc,
            name: detail.name,
            title: detail.title,
            faction: detail.faction,
            rarity: detail.rarity,
            stats: detail.stats,
            ability: detail.ability,
            cost: detail.cost,
            art_url: detail.art_url,
            flavor_text: detail.flavor_text,
          }
        }
        return uc
      })

      setUserCards(enriched)
    })
  }, [router])

  // Scroll battle log to bottom
  useEffect(() => {
    if (battleLogRef.current) {
      battleLogRef.current.scrollTop = battleLogRef.current.scrollHeight
    }
  }, [battle?.battleLog])

  // Toggle card selection (max 3)
  const toggleCard = (card: any) => {
    setSelectedCards((prev) => {
      const exists = prev.find((c) => c.id === card.id)
      if (exists) return prev.filter((c) => c.id !== card.id)
      if (prev.length >= 3) return prev // max 3
      return [...prev, card]
    })
  }

  // Apply active meta buffs to card stats
  const applyBuffs = (cardId: string, baseStats: any) => {
    if (!metaState?.activeBuffs) return baseStats
    const buffs = metaState.activeBuffs.filter((b: any) => b.cardId === cardId)
    if (buffs.length === 0) return baseStats
    let modified = { ...baseStats }
    for (const buff of buffs) {
      const mult = buff.type === 'debuff' ? -1 : 1
      for (const key of ['charisma', 'machinery', 'budget', 'influence']) {
        if (buff.statModifier?.[key]) {
          modified[key] = Math.max(0, Math.floor(modified[key] * (1 + mult * buff.statModifier[key] / 100)))
        }
      }
    }
    return modified
  }

  // Start battle
  const handleStartBattle = () => {
    if (selectedCards.length === 0) return
    // Convert enriched user_cards rows to GameCard format with real stats and levels
    const cards = selectedCards.map((uc: any) => ({
      card: {
        id: uc.card_id || uc.id,
        name: uc.name || uc.card_name || 'Unknown',
        title: uc.title || '',
        faction: uc.faction || 'trapo',
        rarity: uc.rarity || 'common',
        stats: applyBuffs(uc.card_id || uc.id, uc.stats || { charisma: 5, machinery: 5, budget: 5, influence: 5 }),
        ability: uc.ability || null,
        cost: uc.cost || 3,
        pack_source: 'starter',
        art_url: uc.art_url || '',
        flavor_text: uc.flavor_text || '',
      } as GameCard,
      level: uc.level || 1,
    }))

    const state = startBattle(cards, monster)
    setBattle(state)
    setScreen('battle')
  }

  // Handle player action
  const doAction = useCallback((type: 'attack' | 'ability', cardIndex: number) => {
    const current = battleRef.current
    if (!current || animating || current.turn !== 'player' || current.status !== 'fighting') return
    if (current.cards[cardIndex].defeated || current.cards[cardIndex].stunned) return

    setAnimating(true)

    // Small delay for animation feel
    setTimeout(() => {
      const state = battleRef.current!
      let newState: BattleState
      if (type === 'attack') {
        newState = playerAttack(state, cardIndex)
      } else {
        newState = playerAbility(state, cardIndex)
      }

      // Trigger attack animation
      setAttackAnim({ cardIndex, target: 'monster' })
      setBattle(newState)

      setTimeout(() => {
        setAttackAnim(null)

        // Check for victory
        if (newState.status === 'victory') {
          setAnimating(false)
          return
        }

        // Monster's turn
        setTimeout(() => {
          const monsterState = monsterTurn(clearEvents(newState))
          setAttackAnim({ cardIndex: monsterState.events[0]?.cardIndex ?? 0, target: 'card' })
          setBattle(monsterState)

          setTimeout(() => {
            setAttackAnim(null)
            setBattle((prev) => prev ? clearEvents(prev) : prev)
            setAnimating(false)
          }, 600)
        }, 500)
      }, 600)
    }, 100)
  }, [animating])

  // Save progress + card XP on victory
  const saveProgress = async () => {
    if (!userId || !battle || battle.status !== 'victory') return
    setSaving(true)
    try {
      // Save campaign progress
      await fetch('/api/campaign/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapId, stageId, stars: 1 }),
      })

      // Save XP for surviving cards
      const supabase = createClient()
      for (const bc of battle.cards) {
        if (bc.defeated || bc.xpGained <= 0) continue
        const ucId = selectedCards.find((sc: any) =>
          (sc.card_id || sc.id) === bc.card.id
        )?.id
        if (!ucId) continue

        // Get current XP/level from DB first
        const { data: current } = await supabase
          .from('user_cards')
          .select('xp, level')
          .eq('id', ucId)
          .single()

        const currentXp = (current?.xp || 0) + bc.xpGained
        const newLevel = levelFromXp(currentXp)

        await supabase
          .from('user_cards')
          .update({ xp: currentXp, level: newLevel })
          .eq('id', ucId)
      }
    } catch (e) { console.error('Save error:', e) }
    setSaving(false)
  }

  useEffect(() => {
    if (screen === 'victory') saveProgress()
  }, [screen])

  // Watch for battle end + log analytics
  useEffect(() => {
    if (battle && (battle.status === 'victory' || battle.status === 'defeat')) {
      // Log battle to analytics
      if (!battle.xpAwarded) {
        logBattle(battle.status, battle.turnNumber, selectedCards)
      }
    }
    if (battle && battle.status === 'victory') {
      const withXp = awardXp(battle)
      setBattle(withXp)
      setTimeout(() => setScreen('victory'), 1200)
    } else if (battle && battle.status === 'defeat') {
      setTimeout(() => setScreen('defeat'), 800)
    }
  }, [battle?.status])

  // ---- CARD SELECTION SCREEN ----
  if (screen === 'select') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Link href={`/campaign/${mapId}`} className="text-white/40 hover:text-white/80 transition mb-4 inline-flex items-center gap-1">
          ← Back to Map {mapId}
        </Link>

        <div className="glass-card-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            <span className="text-5xl">{monster.emoji}</span>
            <div>
              <h1 className="text-2xl font-bold text-white">{monster.name}</h1>
              <p className="text-white/50 text-sm">{monster.title}</p>
              <div className="flex gap-3 mt-2 text-xs">
                <span className="text-red-400">❤️ {monster.hp} HP</span>
                <span className="text-orange-400">⚔️ {monster.attack} ATK</span>
                <span className="text-blue-400">🛡️ {monster.defense} DEF</span>
              </div>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold text-amber-300 mb-3">
          Select 1-3 Cards ({selectedCards.length}/3)
        </h2>

        {userCards.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <div className="text-5xl mb-3">📦</div>
            <p className="text-white/50 mb-4">You have no cards! Open packs from the shop first.</p>
            <Link href="/dashboard" className="px-6 py-2 rounded-lg btn-gradient text-white font-medium">
              Open Packs
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
            {userCards.map((card: any) => {
              const isSelected = selectedCards.some((c) => c.id === card.id)
              const rarityColor = RARITY_COLORS[card.rarity as CardRarity] || '#94a3b8'
              const factionIcon = FACTION_ICONS[card.faction as keyof typeof FACTION_ICONS] || ''
              return (
                <button
                  key={card.id}
                  onClick={() => toggleCard(card)}
                  className={`group relative rounded-xl overflow-hidden transition-all duration-200 ${
                    isSelected
                      ? 'scale-[1.05] z-10 ring-2 ring-amber-500'
                      : 'hover:scale-[1.03]'
                  }`}
                  style={{ boxShadow: `0 4px 16px ${rarityColor}15, 0 0 0 1px ${rarityColor}30` }}
                >
                  {/* Card image */}
                  <div className="aspect-[2/3] bg-white/5 relative">
                    {card.art_url ? (
                      <img src={card.art_url} alt={card.name || card.card_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">
                        {factionIcon}
                      </div>
                    )}

                    {/* Rarity glow */}
                    <div className="absolute inset-0 pointer-events-none"
                      style={{ background: `linear-gradient(180deg, ${rarityColor}20 0%, transparent 50%, ${rarityColor}10 100%)` }} />

                    {/* Selected overlay */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-amber-500/80 flex items-center justify-center text-2xl">
                          ✓
                        </div>
                      </div>
                    )}

                    {/* Level + XP */}
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 text-[10px] font-bold text-amber-400">
                      Lv.{card.level || 1}
                    </div>

                    {/* Name at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 px-2 pb-2 pt-6 bg-gradient-to-t from-black/80 to-transparent">
                      <div className="text-[11px] font-bold text-white truncate leading-tight">
                        {factionIcon} {card.name || card.card_name}
                      </div>
                      <div className="text-[9px] mt-0.5" style={{ color: rarityColor }}>
                        {card.rarity?.toUpperCase()}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {selectedCards.length > 0 && (
          <button
            onClick={handleStartBattle}
            className="w-full px-6 py-4 rounded-xl btn-gradient text-white font-bold text-lg hover:scale-[1.02] transition"
          >
            ⚔️ Start Battle ({selectedCards.length} cards)
          </button>
        )}
      </div>
    )
  }

  // ---- BATTLE SCREEN (Axie-style arena) ----
  if (screen === 'battle' && battle) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #1a0a2e 0%, #0d0618 40%, #1a1033 100%)' }}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/20">
          <Link href={`/campaign/${mapId}`} className="text-white/30 hover:text-white/60 text-sm transition">
            ← Flee
          </Link>
          <div className="text-sm text-white/50 font-medium">
            {battle.turn === 'player' ? '⚔️ Your Turn' : '⏳ Enemy Turn'} • Turn {battle.turnNumber}
          </div>
          <div className="text-xs text-white/20">
            Map {mapId} • Stage {stageId}
          </div>
        </div>

        {/* ARENA */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 sm:gap-5 px-2 sm:px-4 py-3 relative overflow-hidden">
          {/* Arena floor */}
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-amber-900/10 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

          {/* MONSTER — top on mobile */}
          <div className={`z-10 w-full max-w-xs sm:max-w-sm transition-all duration-300 ${
            attackAnim?.target === 'monster' ? 'animate-shake scale-95' : ''
          }`}>
            <div className="glass-card-lg p-5 sm:p-8 text-center relative overflow-hidden">
              {/* Monster aura */}
              <div className="absolute inset-0 opacity-20"
                style={{
                  background: monster.special
                    ? 'radial-gradient(circle at 50% 30%, #ef4444, transparent 60%)'
                    : 'radial-gradient(circle at 50% 30%, #f59e0b, transparent 60%)',
                }}
              />

              <div className={`text-6xl sm:text-8xl mb-3 sm:mb-4 transition-all duration-300 relative z-10 ${
                attackAnim?.target === 'monster' ? 'scale-110' : ''
              }`}>
                {attackAnim?.target === 'monster' ? '💥' : monster.emoji}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 relative z-10">
                {monster.name}
              </h2>
              {monster.special && (
                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full relative z-10">
                  BOSS
                </span>
              )}
              <p className="text-xs text-white/30 mt-1 relative z-10">{monster.title}</p>

              {/* HP bar */}
              <div className="mt-3 sm:mt-4 relative z-10">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-red-400 font-medium">HP</span>
                  <span className="text-white/60 font-mono">{battle.monster.hp} / {battle.monster.maxHp}</span>
                </div>
                <div className="h-3 sm:h-4 bg-white/10 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(battle.monster.hp / battle.monster.maxHp) * 100}%`,
                      background: 'linear-gradient(90deg, #ef4444, #f59e0b, #ef4444)',
                      backgroundSize: '200% 100%',
                      animation: 'hpPulse 2s ease-in-out infinite',
                    }}
                  />
                </div>
              </div>

              {/* Stats row */}
              <div className="flex justify-center gap-4 sm:gap-6 mt-3 sm:mt-4 text-sm text-white/50 relative z-10">
                <div className="flex items-center gap-1">
                  <span className="text-orange-400">⚔️</span>
                  <span className="font-mono">{monster.attack}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-blue-400">🛡️</span>
                  <span className="font-mono">{monster.defense}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-purple-400">📊</span>
                  <span className="font-mono">Lv.{monster.level}</span>
                </div>
              </div>

              {/* Boss special indicator */}
              {monster.special && (
                <div className={`mt-2 sm:mt-3 text-xs relative z-10 ${
                  battle.monster.specialCooldown <= 0 ? 'text-red-400' : 'text-white/20'
                }`}>
                  {battle.monster.specialCooldown <= 0
                    ? `⚡ ${monster.special.name} READY`
                    : `⏳ ${monster.special.name} (${battle.monster.specialCooldown}t)`}
                </div>
              )}
            </div>
          </div>

          {/* PLAYER CARDS — bottom on mobile */}
          <div className="flex gap-2 sm:gap-3 z-10 flex-wrap justify-center">
            {battle.cards.map((bc, i) => {
              const isAttacking = attackAnim?.target === 'monster' && attackAnim?.cardIndex === i
              const isHit = attackAnim?.target === 'card' && attackAnim?.cardIndex === i
              const hpPct = (bc.hp / bc.maxHp) * 100
              const rarityColor = RARITY_COLORS[bc.card.rarity as CardRarity] || '#94a3b8'

              return (
                <div
                  key={i}
                  className={`relative transition-all duration-700 w-24 sm:w-32 md:w-40 flex-shrink-0 ${
                    isAttacking ? 'scale-110 z-20' : ''
                  } ${isHit ? 'animate-shake' : ''}`}
                >
                  {/* Card */}
                  <div
                    onClick={() => {
                      if (battle.turn === 'player' && !bc.defeated && !bc.stunned && !animating) {
                        doAction('attack', i)
                      }
                    }}
                    role="button"
                    tabIndex={bc.defeated || bc.stunned ? -1 : 0}
                    className={`w-full rounded-xl overflow-hidden transition-all duration-200 ${
                      bc.defeated ? 'opacity-30 grayscale' : ''
                    } ${
                      battle.turn === 'player' && !bc.defeated && !bc.stunned && !animating
                        ? 'hover:scale-[1.05] cursor-pointer'
                        : ''
                    }`}
                    style={{ boxShadow: `0 4px 20px ${rarityColor}20, 0 0 0 1px ${rarityColor}40` }}
                  >
                    {/* Card image — dominant */}
                    <div className="aspect-[2/3] bg-white/5 relative">
                      {bc.card.art_url ? (
                        <img src={bc.card.art_url} alt={bc.card.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl sm:text-6xl opacity-20">
                          {FACTION_ICONS[bc.card.faction as keyof typeof FACTION_ICONS] || '🃏'}
                        </div>
                      )}

                      {/* Status overlay */}
                      {bc.defeated && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-3xl sm:text-4xl">💀</div>
                      )}
                      {bc.stunned && (
                        <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center text-2xl sm:text-3xl">😵</div>
                      )}

                      {/* HP bar — thin at top */}
                      {!bc.defeated && (
                        <div className="absolute top-0 left-0 right-0 h-1 sm:h-1.5 bg-black/50">
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${hpPct}%`,
                              background: hpPct > 50 ? '#22c55e' : hpPct > 25 ? '#f59e0b' : '#ef4444',
                            }}
                          />
                        </div>
                      )}

                      {/* Level badge */}
                      <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 px-1 py-0.5 rounded-md bg-black/60 text-[8px] sm:text-[10px] font-bold text-amber-400">
                        Lv.{bc.level}
                      </div>

                      {/* Name + stats at bottom */}
                      <div className="absolute bottom-0 left-0 right-0 px-1.5 sm:px-2 pb-1 sm:pb-1.5 pt-6 sm:pt-8 bg-gradient-to-t from-black/85 to-transparent">
                        <div className="text-[9px] sm:text-[11px] font-bold text-white truncate leading-tight">
                          {bc.card.name}
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[7px] sm:text-[9px] text-white/50">
                            {bc.hp}/{bc.maxHp}
                          </span>
                          <span className="text-[7px] sm:text-[9px] text-white/30">
                            ⚔{bc.attack + bc.debuffAttack}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Ability button — outside the card image */}
                    {bc.card.ability && !bc.defeated && !bc.stunned && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (battle.turn === 'player' && !animating) doAction('ability', i)
                        }}
                        disabled={animating || bc.abilityCooldown > 0}
                        className={`w-full mt-0.5 sm:mt-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg text-[8px] sm:text-[10px] font-medium transition ${
                          bc.abilityCooldown > 0
                            ? 'bg-white/5 text-white/15'
                            : 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'
                        }`}
                      >
                        {bc.abilityCooldown > 0
                          ? `⏳ ${bc.card.ability.name} (${bc.abilityCooldown})`
                          : `⚡ ${bc.card.ability.name}`}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom — Battle log + hint */}
        <div className="px-4 py-3 border-t border-white/5 bg-black/20">
          <div className="flex items-center gap-3">
            {battle.turn === 'player' && !animating && battle.status === 'fighting' && (
              <span className="text-xs text-amber-400/70 animate-pulse">
                👆 Click a card to attack or use its ability
              </span>
            )}
            {battle.turn === 'monster' && !animating && (
              <span className="text-xs text-white/30">⏳ Enemy is attacking...</span>
            )}
            <div className="flex-1" />
            <div className="text-xs text-white/30 truncate max-w-xs">
              {battle.battleLog[battle.battleLog.length - 1]}
            </div>
          </div>
        </div>

        <style jsx global>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
            20%, 40%, 60%, 80% { transform: translateX(6px); }
          }
          @keyframes hpPulse {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          @keyframes flyAttack {
            0% { transform: translateX(0) scale(1); }
            40% { transform: translateX(calc(50vw - 12rem)) scale(1.1); }
            60% { transform: translateX(calc(50vw - 12rem)) scale(1.05); }
            100% { transform: translateX(0) scale(1); }
          }
          .animate-shake {
            animation: shake 0.5s ease-in-out;
          }
        `}</style>
      </div>
    )
  }

  // ---- VICTORY SCREEN ----
  if (screen === 'victory') {
    const xpPerCard = battle ? xpFromBattle(battle.monster.monster.level) : 0
    const survivors = battle?.cards.filter(c => !c.defeated) || []
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="glass-card-lg p-10">
          <div className="text-8xl mb-6">🏆</div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Victory!</h1>
          <p className="text-white/50 mb-1">You defeated {monster.name}!</p>
          <p className="text-amber-400 mb-6">
            Map {mapId} • Stage {stageId} complete
          </p>

          {/* XP summary */}
          {survivors.length > 0 && (
            <div className="glass-card p-4 mb-6 text-left">
              <h3 className="text-sm font-bold text-amber-300 mb-3">📊 XP Earned</h3>
              <div className="space-y-2">
                {survivors.map((bc, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-white">{bc.card.name}</span>
                      <span className="text-white/30 ml-2 text-xs">Lv.{bc.level}</span>
                    </div>
                    <span className="text-green-400 font-medium">+{xpPerCard} XP</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Link
              href={`/campaign/${mapId}`}
              className="px-6 py-3 rounded-xl btn-gradient text-white font-bold"
            >
              Continue Map {mapId}
            </Link>
            <Link
              href="/campaign"
              className="px-6 py-3 rounded-xl bg-white/10 text-white/60 hover:bg-white/15 transition"
            >
              Back to Campaign
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ---- DEFEAT SCREEN ----
  if (screen === 'defeat') {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="glass-card-lg p-10">
          <div className="text-8xl mb-6">💀</div>
          <h1 className="text-3xl font-bold text-red-400 mb-2">Defeated!</h1>
          <p className="text-white/50 mb-8">{monster.name} was too strong.</p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setScreen('select')
                setBattle(null)
                setSelectedCards([])
              }}
              className="px-6 py-3 rounded-xl btn-gradient text-white font-bold"
            >
              🔄 Try Again
            </button>
            <Link
              href="/campaign"
              className="px-6 py-3 rounded-xl bg-white/10 text-white/60 hover:bg-white/15 transition"
            >
              Back to Campaign
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return null
}
