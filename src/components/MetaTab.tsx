'use client'

import { useState, useEffect } from 'react'
import { RARITY_COLORS, FACTION_COLORS, FACTION_ICONS } from '@/lib/card-data'
import type { CardRarity, CardFaction } from '@/lib/types'

const RARITY_OPTIONS: CardRarity[] = ['common', 'rare', 'epic', 'mythic', 'legendary']
const FACTION_OPTIONS: CardFaction[] = ['trapo', 'reformer', 'showbiz', 'dynasty', 'activist', 'warlord']
const STAT_KEYS = ['charisma', 'machinery', 'budget', 'influence'] as const

interface Buff {
  id: string
  cardId: string
  cardName: string
  type: 'buff' | 'debuff'
  statModifier: Record<string, number>
  reason: string
  expiresAt: string
  duration?: string
  createdAt?: string
}

interface RarityOverride {
  cardId: string
  cardName: string
  oldRarity: string
  newRarity: string
  reason?: string
  appliedAt?: string
}

interface Season {
  name: string
  description: string
  factionBuffs: Record<string, number>
}

interface MetaData {
  activeBuffs: Buff[]
  rarityOverrides: RarityOverride[]
  currentSeason: Season | null
  history: any[]
}

interface MetaTabProps {
  cards: any[]
  loadCards: () => Promise<void>
}

export default function MetaTab({ cards, loadCards }: MetaTabProps) {
  const [meta, setMeta] = useState<MetaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  // Buff/Debuff form
  const [buffCardId, setBuffCardId] = useState('')
  const [buffType, setBuffType] = useState<'buff' | 'debuff'>('buff')
  const [buffStats, setBuffStats] = useState<Record<string, number>>({
    charisma: 0, machinery: 0, budget: 0, influence: 0,
  })
  const [buffReason, setBuffReason] = useState('')
  const [buffDuration, setBuffDuration] = useState('24')
  const [buffDurationUnit, setBuffDurationUnit] = useState<'hours' | 'days'>('hours')

  // Rarity override form
  const [overrideCardId, setOverrideCardId] = useState('')
  const [overrideNewRarity, setOverrideNewRarity] = useState<CardRarity>('common')
  const [overrideReason, setOverrideReason] = useState('')

  // Season form
  const [seasonName, setSeasonName] = useState('')
  const [seasonDescription, setSeasonDescription] = useState('')
  const [seasonFactionBuffs, setSeasonFactionBuffs] = useState<Record<string, { enabled: boolean; value: number }>>(
    Object.fromEntries(FACTION_OPTIONS.map(f => [f, { enabled: false, value: 10 }]))
  )

  // Clear confirm
  const [clearConfirm, setClearConfirm] = useState(false)

  const loadMeta = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/meta')
      if (res.ok) {
        const data = await res.json()
        if (data.meta) {
          setMeta(data.meta)
          // Populate season form if exists
          if (data.meta.currentSeason) {
            const s = data.meta.currentSeason
            setSeasonName(s.name || '')
            setSeasonDescription(s.description || '')
            const fb: Record<string, { enabled: boolean; value: number }> = {}
            FACTION_OPTIONS.forEach(f => {
              fb[f] = {
                enabled: typeof s.factionBuffs?.[f] === 'number',
                value: s.factionBuffs?.[f] ?? 10,
              }
            })
            setSeasonFactionBuffs(fb)
          }
        }
      }
    } catch (err) { console.error('Failed to load meta:', err) }
    setLoading(false)
  }

  useEffect(() => { loadMeta() }, [])

  const postMeta = async (payload: any) => {
    const res = await fetch('/api/admin/meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Request failed')
    }
    return res.json()
  }

  const showMsg = (text: string) => {
    setMessage(text)
    setTimeout(() => setMessage(''), 4000)
  }

  // --- Buff/Debuff actions ---
  const handleAddBuff = async () => {
    if (!buffCardId) { showMsg('Select a card first'); return }
    const card = cards.find(c => c.id === buffCardId)
    if (!card) { showMsg('Card not found'); return }
    setActionLoading('addBuff')
    try {
      // Calculate expiresAt from duration
      const hours = buffDurationUnit === 'days' ? parseInt(buffDuration) * 24 : parseInt(buffDuration)
      const expiresAt = new Date(Date.now() + hours * 3600000).toISOString()

      await postMeta({
        action: 'addBuff',
        payload: {
          cardId: buffCardId,
          cardName: card.name,
          type: buffType,
          statModifier: buffStats,
          reason: buffReason,
          expiresAt,
          duration: `${buffDuration} ${buffDurationUnit}`,
        },
      })
      showMsg(`${buffType === 'buff' ? 'Buff' : 'Debuff'} added to ${card.name}`)
      // Reset form
      setBuffCardId('')
      setBuffReason('')
      setBuffStats({ charisma: 0, machinery: 0, budget: 0, influence: 0 })
      await loadMeta()
    } catch (err: any) { showMsg(`Error: ${err.message}`) }
    setActionLoading(null)
  }

  const handleRemoveBuff = async (id: string) => {
    setActionLoading(id)
    try {
      await postMeta({ action: 'removeBuff', payload: { id } })
      showMsg('Buff removed')
      await loadMeta()
      await loadCards()
    } catch (err: any) { showMsg(`Error: ${err.message}`) }
    setActionLoading(null)
  }

  // --- Rarity override actions ---
  const handleSetRarityOverride = async () => {
    if (!overrideCardId) { showMsg('Select a card first'); return }
    const card = cards.find(c => c.id === overrideCardId)
    if (!card) { showMsg('Card not found'); return }
    setActionLoading('overrideRarity')
    try {
      await postMeta({
        action: 'setRarityOverride',
        payload: {
          cardId: overrideCardId,
          cardName: card.name,
          oldRarity: card.rarity,
          newRarity: overrideNewRarity,
          reason: overrideReason,
        },
      })
      showMsg(`${card.name} rarity overridden to ${overrideNewRarity.toUpperCase()}`)
      setOverrideCardId('')
      setOverrideReason('')
      await loadMeta()
      await loadCards()
    } catch (err: any) { showMsg(`Error: ${err.message}`) }
    setActionLoading(null)
  }

  const handleRemoveRarityOverride = async (cardId: string) => {
    setActionLoading(cardId)
    try {
      await postMeta({ action: 'removeRarityOverride', payload: { cardId } })
      showMsg('Rarity override removed')
      await loadMeta()
      await loadCards()
    } catch (err: any) { showMsg(`Error: ${err.message}`) }
    setActionLoading(null)
  }

  // --- Season actions ---
  const handleSetSeason = async () => {
    if (!seasonName.trim()) { showMsg('Enter a season name'); return }
    setActionLoading('setSeason')
    try {
      const factionBuffs: Record<string, number> = {}
      FACTION_OPTIONS.forEach(f => {
        if (seasonFactionBuffs[f]?.enabled) {
          factionBuffs[f] = seasonFactionBuffs[f].value
        }
      })
      await postMeta({
        action: 'setSeason',
        payload: {
          name: seasonName,
          description: seasonDescription,
          factionBuffs,
        },
      })
      showMsg(`Season "${seasonName}" is now active!`)
      await loadMeta()
    } catch (err: any) { showMsg(`Error: ${err.message}`) }
    setActionLoading(null)
  }

  const handleClearSeason = async () => {
    setActionLoading('clearSeason')
    try {
      await postMeta({ action: 'clearSeason' })
      setSeasonName('')
      setSeasonDescription('')
      setSeasonFactionBuffs(Object.fromEntries(FACTION_OPTIONS.map(f => [f, { enabled: false, value: 10 }])))
      showMsg('Season cleared')
      await loadMeta()
    } catch (err: any) { showMsg(`Error: ${err.message}`) }
    setActionLoading(null)
  }

  // --- Clear all ---
  const handleClearAll = async () => {
    if (!clearConfirm) { setClearConfirm(true); return }
    setActionLoading('clearAll')
    try {
      await postMeta({ action: 'clearAll' })
      showMsg('All meta data cleared!')
      setClearConfirm(false)
      await loadMeta()
      await loadCards()
    } catch (err: any) { showMsg(`Error: ${err.message}`) }
    setActionLoading(null)
  }

  // Sort cards for dropdowns
  const sortedCards = [...cards].sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-white/5 rounded-xl" />
        <div className="h-32 bg-white/5 rounded-xl" />
        <div className="h-32 bg-white/5 rounded-xl" />
      </div>
    )
  }

  const selectedCard = cards.find(c => c.id === buffCardId)

  return (
    <div className="space-y-6">
      {/* Message toast */}
      {message && (
        <div className="fixed top-4 right-4 z-50 px-5 py-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm font-medium shadow-lg">
          {message}
        </div>
      )}

      {/* Section 1: Card Buff/Debuff */}
      <div className="glass-card-lg p-6">
        <h2 className="text-lg font-bold text-amber-400 mb-4">⚡ Card Buff / Debuff</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Card selection */}
          <div>
            <label className="text-[10px] text-white/40 block mb-1">Select Card</label>
            <select
              value={buffCardId}
              onChange={(e) => setBuffCardId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm focus:border-amber-500/50 outline-none"
            >
              <option value="" className="bg-[#1a1033]">-- Select card --</option>
              {sortedCards.map(card => (
                <option key={card.id} value={card.id} className="bg-[#1a1033]">
                  {card.name} ({card.rarity})
                </option>
              ))}
            </select>
          </div>

          {/* Buff/Debuff type */}
          <div>
            <label className="text-[10px] text-white/40 block mb-1">Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setBuffType('buff')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  buffType === 'buff'
                    ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                    : 'bg-white/5 border border-white/5 text-white/40 hover:bg-white/10'
                }`}
              >
                ↑ Buff
              </button>
              <button
                onClick={() => setBuffType('debuff')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  buffType === 'debuff'
                    ? 'bg-rose-500/20 border border-rose-500/30 text-rose-400'
                    : 'bg-white/5 border border-white/5 text-white/40 hover:bg-white/10'
                }`}
              >
                ↓ Debuff
              </button>
            </div>
          </div>
        </div>

        {/* Stat modifiers */}
        <div className="mb-4">
          <label className="text-[10px] text-white/40 block mb-2">Stat Modifiers (%)</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {STAT_KEYS.map(key => (
              <div key={key} className="bg-white/5 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white/50 capitalize">{key}</span>
                  <span className={`text-xs font-bold ${buffStats[key] >= 0 ? 'text-green-400' : 'text-rose-400'}`}>
                    {buffStats[key] > 0 ? '+' : ''}{buffStats[key]}%
                  </span>
                </div>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={buffStats[key]}
                  onChange={(e) => setBuffStats(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                  className="w-full accent-amber-500"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Reason & Duration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[10px] text-white/40 block mb-1">Reason</label>
            <input
              value={buffReason}
              onChange={(e) => setBuffReason(e.target.value)}
              placeholder="e.g. Weekend event bonus"
              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm focus:border-amber-500/50 outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-white/40 block mb-1">Duration</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={buffDuration}
                onChange={(e) => setBuffDuration(e.target.value)}
                min={1}
                className="w-20 px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm focus:border-amber-500/50 outline-none"
              />
              <select
                value={buffDurationUnit}
                onChange={(e) => setBuffDurationUnit(e.target.value as 'hours' | 'days')}
                className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm focus:border-amber-500/50 outline-none"
              >
                <option value="hours" className="bg-[#1a1033]">Hours</option>
                <option value="days" className="bg-[#1a1033]">Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Preview */}
        {selectedCard && (
          <div className="mb-4 p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="text-xs text-white/40 mb-1">Effect Preview</div>
            <div className="flex flex-wrap gap-2">
              {STAT_KEYS.map(key => {
                if (buffStats[key] === 0) return null
                return (
                  <span key={key} className={`px-2 py-0.5 rounded text-xs font-medium ${
                    buffStats[key] > 0 ? 'bg-green-500/10 text-green-400' : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {key}: {buffStats[key] > 0 ? '+' : ''}{buffStats[key]}%
                  </span>
                )
              })}
              {STAT_KEYS.every(k => buffStats[k] === 0) && (
                <span className="text-xs text-white/30">No modifiers set</span>
              )}
            </div>
          </div>
        )}

        <button
          onClick={handleAddBuff}
          disabled={actionLoading === 'addBuff' || !buffCardId}
          className="px-5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-sm font-bold transition disabled:opacity-30"
        >
          {actionLoading === 'addBuff' ? 'Adding...' : '⚡ Apply Buff/Debuff'}
        </button>
      </div>

      {/* Section 2: Active Buffs List */}
      <div className="glass-card-lg p-6">
        <h2 className="text-lg font-bold text-amber-400 mb-4">📋 Active Buffs</h2>
        {(!meta?.activeBuffs || meta.activeBuffs.length === 0) ? (
          <p className="text-sm text-white/40">No active buffs or debuffs.</p>
        ) : (
          <div className="space-y-2">
            {meta.activeBuffs.map(buff => {
              const card = cards.find(c => c.id === buff.cardId)
              const isBuff = buff.type === 'buff'
              return (
                <div key={buff.id} className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${isBuff ? 'bg-green-500/10 text-green-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {isBuff ? 'BUFF' : 'DEBUFF'}
                      </span>
                      <span className="text-sm font-medium text-white">{buff.cardName}</span>
                      {card && (
                        <span className="text-xs" style={{ color: RARITY_COLORS[card.rarity as CardRarity] }}>
                          {card.rarity?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mb-1">
                      {STAT_KEYS.map(key => {
                        const val = buff.statModifier?.[key]
                        if (!val) return null
                        return (
                          <span key={key} className={`text-[10px] px-1.5 py-0.5 rounded ${val > 0 ? 'bg-green-500/5 text-green-300' : 'bg-rose-500/5 text-rose-300'}`}>
                            {key}: {val > 0 ? '+' : ''}{val}%
                          </span>
                        )
                      })}
                    </div>
                    <div className="flex gap-3 text-[10px] text-white/30">
                      {buff.reason && <span>📝 {buff.reason}</span>}
                      {buff.expiresAt && <span>⏰ Expires: {new Date(buff.expiresAt).toLocaleString()}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveBuff(buff.id)}
                    disabled={actionLoading === buff.id}
                    className="ml-3 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs transition disabled:opacity-50 flex-shrink-0"
                  >
                    {actionLoading === buff.id ? '...' : '🗑'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Section 3: Rarity Override */}
      <div className="glass-card-lg p-6">
        <h2 className="text-lg font-bold text-amber-400 mb-4">⭐ Rarity Override</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-[10px] text-white/40 block mb-1">Select Card</label>
            <select
              value={overrideCardId}
              onChange={(e) => setOverrideCardId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm focus:border-amber-500/50 outline-none"
            >
              <option value="" className="bg-[#1a1033]">-- Select card --</option>
              {sortedCards.map(card => (
                <option key={card.id} value={card.id} className="bg-[#1a1033]">
                  {card.name} (current: {card.rarity?.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-white/40 block mb-1">New Rarity</label>
            <select
              value={overrideNewRarity}
              onChange={(e) => setOverrideNewRarity(e.target.value as CardRarity)}
              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm focus:border-amber-500/50 outline-none"
            >
              {RARITY_OPTIONS.map(r => (
                <option key={r} value={r} className="bg-[#1a1033]" style={{ color: RARITY_COLORS[r] }}>
                  {r.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-white/40 block mb-1">Reason</label>
            <input
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="e.g. Event promo"
              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm focus:border-amber-500/50 outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleSetRarityOverride}
          disabled={actionLoading === 'overrideRarity' || !overrideCardId}
          className="px-5 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-sm font-bold transition disabled:opacity-30"
        >
          {actionLoading === 'overrideRarity' ? 'Applying...' : '⭐ Apply Rarity Override'}
        </button>

        {/* Current overrides list */}
        <div className="mt-4">
          <h3 className="text-sm font-medium text-white/60 mb-2">Current Overrides</h3>
          {(!meta?.rarityOverrides || meta.rarityOverrides.length === 0) ? (
            <p className="text-xs text-white/30">No rarity overrides set.</p>
          ) : (
            <div className="space-y-2">
              {meta.rarityOverrides.map(ov => (
                <div key={ov.cardId} className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-white font-medium">{ov.cardName}</span>
                    <span className="text-white/30" style={{ color: RARITY_COLORS[ov.oldRarity as CardRarity] || undefined }}>
                      {ov.oldRarity?.toUpperCase()}
                    </span>
                    <span className="text-white/20">→</span>
                    <span className="font-bold" style={{ color: RARITY_COLORS[ov.newRarity as CardRarity] || '#f59e0b' }}>
                      {ov.newRarity?.toUpperCase()}
                    </span>
                    {ov.reason && <span className="text-[10px] text-white/30">({ov.reason})</span>}
                  </div>
                  <button
                    onClick={() => handleRemoveRarityOverride(ov.cardId)}
                    disabled={actionLoading === ov.cardId}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs transition disabled:opacity-50"
                  >
                    {actionLoading === ov.cardId ? '...' : '🗑 Remove'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section 4: Season Management */}
      <div className="glass-card-lg p-6">
        <h2 className="text-lg font-bold text-amber-400 mb-4">📅 Season Management</h2>

        {meta?.currentSeason && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="text-xs text-amber-300/60 mb-1">Active Season</div>
            <div className="text-sm font-bold text-amber-300">{meta.currentSeason.name}</div>
            <div className="text-xs text-white/40 mt-0.5">{meta.currentSeason.description}</div>
            {meta.currentSeason.factionBuffs && Object.keys(meta.currentSeason.factionBuffs).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {Object.entries(meta.currentSeason.factionBuffs).map(([faction, pct]) => (
                  <span key={faction} className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400">
                    {FACTION_ICONS[faction as CardFaction] || ''} {faction}: +{pct}%
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[10px] text-white/40 block mb-1">Season Name</label>
            <input
              value={seasonName}
              onChange={(e) => setSeasonName(e.target.value)}
              placeholder="e.g. Election Season 2025"
              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm focus:border-amber-500/50 outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-white/40 block mb-1">Description</label>
            <input
              value={seasonDescription}
              onChange={(e) => setSeasonDescription(e.target.value)}
              placeholder="e.g. All dynasties get +20% stats"
              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm focus:border-amber-500/50 outline-none"
            />
          </div>
        </div>

        {/* Faction buffs */}
        <div className="mb-4">
          <label className="text-[10px] text-white/40 block mb-2">Faction Buffs (%)</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {FACTION_OPTIONS.map(faction => {
              const fb = seasonFactionBuffs[faction]
              return (
                <div key={faction} className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <label className="flex items-center gap-2 mb-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fb.enabled}
                      onChange={(e) => setSeasonFactionBuffs(prev => ({
                        ...prev,
                        [faction]: { ...prev[faction], enabled: e.target.checked }
                      }))}
                      className="accent-amber-500"
                    />
                    <span className="text-xs text-white/70">
                      {FACTION_ICONS[faction as CardFaction]} {faction}
                    </span>
                  </label>
                  {fb.enabled && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={fb.value}
                        onChange={(e) => setSeasonFactionBuffs(prev => ({
                          ...prev,
                          [faction]: { ...prev[faction], value: parseInt(e.target.value) || 0 }
                        }))}
                        min={0}
                        max={100}
                        className="w-16 px-2 py-1 rounded-lg bg-white/10 border border-white/10 text-white text-xs focus:border-amber-500/50 outline-none text-center"
                      />
                      <span className="text-xs text-white/30">%</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSetSeason}
            disabled={actionLoading === 'setSeason' || !seasonName.trim()}
            className="px-5 py-2.5 rounded-xl btn-gradient text-white font-bold text-sm disabled:opacity-30"
          >
            {actionLoading === 'setSeason' ? 'Setting...' : '📅 Set Season'}
          </button>
          <button
            onClick={handleClearSeason}
            disabled={actionLoading === 'clearSeason'}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white/60 text-sm transition disabled:opacity-30"
          >
            {actionLoading === 'clearSeason' ? 'Clearing...' : '🗑 Clear Season'}
          </button>
        </div>
      </div>

      {/* Section 5: Clear All (Danger Zone) */}
      <div className="glass-card-lg p-6 border border-red-500/10">
        <h2 className="text-lg font-bold text-rose-400 mb-3">⚠️ Danger Zone</h2>
        <p className="text-sm text-white/40 mb-4">
          This will clear ALL active buffs, rarity overrides, and the current season. This action cannot be undone.
        </p>
        {clearConfirm ? (
          <div className="flex items-center gap-3">
            <button
              onClick={handleClearAll}
              disabled={actionLoading === 'clearAll'}
              className="px-5 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-bold text-sm transition disabled:opacity-50"
            >
              {actionLoading === 'clearAll' ? 'Clearing...' : '⚠️ Confirm Clear All'}
            </button>
            <button
              onClick={() => setClearConfirm(false)}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/60 text-sm transition"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={handleClearAll}
            className="px-5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-sm font-medium transition"
          >
            🗑 Clear All Meta
          </button>
        )}
      </div>
    </div>
  )
}
