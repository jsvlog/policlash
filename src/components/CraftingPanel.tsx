'use client'

import { useState, useEffect } from 'react'
import { RARITY_COLORS } from '@/lib/card-data'

interface CraftingStatus {
  politicalCapital: number
  craftCosts: Record<string, { dismantle: number; craft: number }>
  log: any[]
}

export default function CraftingPanel({ userId, onRefresh }: { userId: string; onRefresh: () => void }) {
  const [status, setStatus] = useState<CraftingStatus | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCraft, setShowCraft] = useState(false)
  const [selectedRarity, setSelectedRarity] = useState('common')
  const [availableCards, setAvailableCards] = useState<any[]>([])
  const [craftingCardId, setCraftingCardId] = useState('')
  const [dismantlingId, setDismantlingId] = useState<string | null>(null)

  const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary', 'mythic']

  const loadStatus = async () => {
    try {
      const res = await fetch('/api/crafting')
      const data = await res.json()
      if (data.success) setStatus(data)
      else setError(data.error)
    } catch (err: any) {
      setError(err.message)
    }
  }

  useEffect(() => { loadStatus() }, [])

  const handleDismantle = async (userCardId: string) => {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const res = await fetch('/api/crafting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismantle', userCardId }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage(`Dismantled! +${data.gained} Political Capital`)
        loadStatus()
        onRefresh()
      } else {
        setError(data.error)
      }
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false); setDismantlingId(null) }
  }

  const handleCraft = async () => {
    if (!craftingCardId) return
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const res = await fetch('/api/crafting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'craft', cardId: craftingCardId }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage(`Crafted ${data.card.name}! -${data.spent} PC`)
        loadStatus()
        onRefresh()
        setShowCraft(false)
      } else {
        setError(data.error)
      }
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  const fetchCardsByRarity = async (rarity: string) => {
    try {
      const res = await fetch(`/api/admin/cards?rarity=${rarity}`)
      const data = await res.json()
      if (data.cards) setAvailableCards(data.cards)
    } catch (e) {}
  }

  if (!status) return <div className="text-white/40 text-sm">Loading crafting...</div>

  const pc = status.politicalCapital

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold text-amber-300 mb-4">🔧 Card Crafting</h2>

      {/* Political Capital Display */}
      <div className="glass-card-lg p-4 mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm text-white/50">Political Capital</div>
          <div className="text-3xl font-bold text-amber-400">{pc.toLocaleString()} PC</div>
        </div>
        <button
          onClick={() => { setShowCraft(!showCraft); if (!showCraft) fetchCardsByRarity(selectedRarity) }}
          className="px-4 py-2 rounded-lg btn-gradient text-white text-sm font-medium"
        >
          {showCraft ? 'Cancel' : 'Craft Card'}
        </button>
      </div>

      {message && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 mb-4 text-sm text-green-300">{message}</div>
      )}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 mb-4 text-sm text-rose-300">{error}</div>
      )}

      {/* Craft Section */}
      {showCraft && (
        <div className="glass-card-lg p-4 mb-4">
          <h3 className="text-sm font-bold text-amber-300 mb-3">Craft a Card</h3>
          <div className="flex gap-2 mb-3 flex-wrap">
            {RARITY_ORDER.map(r => {
              const cost = status.craftCosts[r]?.craft || 0
              const canAfford = pc >= cost
              return (
                <button
                  key={r}
                  onClick={() => { setSelectedRarity(r); fetchCardsByRarity(r) }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition ${
                    selectedRarity === r
                      ? 'border-white/30 bg-white/10 text-white'
                      : 'border-white/10 text-white/50 hover:text-white'
                  } ${!canAfford ? 'opacity-40' : ''}`}
                >
                  {r.toUpperCase()} ({cost} PC)
                </button>
              )
            })}
          </div>
          {availableCards.length > 0 && (
            <select
              value={craftingCardId}
              onChange={e => setCraftingCardId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm mb-3"
            >
              <option value="">Select a card...</option>
              {availableCards.map((c: any) => {
                const cost = status.craftCosts[c.rarity]?.craft || 0
                return (
                  <option key={c.id} value={c.id} disabled={pc < cost}>
                    {c.name} ({c.rarity}) — {cost} PC
                  </option>
                )
              })}
            </select>
          )}
          <button
            onClick={handleCraft}
            disabled={loading || !craftingCardId}
            className="w-full px-4 py-2 rounded-lg btn-gradient text-white text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Crafting...' : 'Craft Selected Card'}
          </button>
        </div>
      )}

      {/* Crafting Costs Reference */}
      <div className="glass-card-lg p-4 mb-4">
        <h3 className="text-sm font-bold text-white/70 mb-2">Crafting Costs</h3>
        <div className="grid grid-cols-5 gap-2 text-center text-xs">
          {RARITY_ORDER.map(r => (
            <div key={r}>
              <div className="text-white/40">{r.toUpperCase()}</div>
              <div className="text-amber-400 font-bold">{status.craftCosts[r]?.craft} PC</div>
              <div className="text-white/30 text-[10px]">to craft</div>
              <div className="text-green-400">{status.craftCosts[r]?.dismantle} PC</div>
              <div className="text-white/30 text-[10px]">dismantle</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Crafting Log */}
      {status.log && status.log.length > 0 && (
        <div className="glass-card-lg p-4">
          <h3 className="text-sm font-bold text-white/70 mb-2">Recent Activity</h3>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {status.log.map((entry: any) => (
              <div key={entry.id} className="flex justify-between text-xs text-white/50">
                <span>
                  {entry.action === 'dismantle' ? '🗑️ Dismantled' : '🔨 Crafted'}{' '}
                  {entry.card_name}
                </span>
                <span className={entry.action === 'dismantle' ? 'text-green-400' : 'text-rose-400'}>
                  {entry.action === 'dismantle' ? '+' : '-'}{entry.amount} PC
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
