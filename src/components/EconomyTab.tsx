'use client'

import { useState, useEffect } from 'react'
import { RARITY_COLORS } from '@/lib/card-data'
import type { CardRarity } from '@/lib/types'

interface AnalyticsData {
  userCount: number
  totalCards: number
  totalTransactions: number
  recentTransactions: any[]
  txStatus: {
    pending: number
    approved: number
    rejected: number
  }
  packSales: Record<string, number>
  packRevenue: Record<string, number>
  totalRevenue: number
  packStats: {
    total: number
    opened: number
    unopened: number
  }
  mostOwnedCards: [string, number][]
  rarityDistribution: Record<string, number>
}

const RARITY_ORDER: CardRarity[] = ['common', 'rare', 'epic', 'mythic', 'legendary']

export default function EconomyTab() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadAnalytics = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/analytics')
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to load analytics')
      }
      const json = await res.json()
      setData(json.analytics)
    } catch (err: any) {
      console.error('Analytics load error:', err)
      setError(err.message || 'Failed to load analytics')
    }
    setLoading(false)
  }

  useEffect(() => { loadAnalytics() }, [])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card p-6">
              <div className="h-8 w-16 bg-white/10 rounded-lg mb-2" />
              <div className="h-4 w-24 bg-white/5 rounded-md" />
            </div>
          ))}
        </div>
        <div className="h-48 bg-white/5 rounded-xl" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="glass-card-lg p-12 text-center">
        <div className="text-5xl mb-3">📊</div>
        <h2 className="text-xl font-bold text-rose-400 mb-2">Could not load analytics</h2>
        <p className="text-white/40 mb-4">{error || 'No data available'}</p>
        <button onClick={loadAnalytics} className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm transition">
          🔄 Retry
        </button>
      </div>
    )
  }

  // Helper: format PHP
  const formatPHP = (amount: number) => `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

  // Transaction pie data
  const txTotal = data.txStatus.pending + data.txStatus.approved + data.txStatus.rejected
  const txPieParts = txTotal > 0 ? [
    { label: 'Approved', value: data.txStatus.approved, color: '#22c55e', pct: Math.round(data.txStatus.approved / txTotal * 100) },
    { label: 'Pending', value: data.txStatus.pending, color: '#f59e0b', pct: Math.round(data.txStatus.pending / txTotal * 100) },
    { label: 'Rejected', value: data.txStatus.rejected, color: '#ef4444', pct: Math.round(data.txStatus.rejected / txTotal * 100) },
  ] : []

  // Pack sales bar
  const packNames: Record<string, string> = {
    'elite-power-pack': 'Elite Power Pack',
    'standard-pack': 'Standard Pack',
    'budget-pack': 'Budget Pack',
  }

  // Find max for scaling bars
  const packSalesMax = Math.max(1, ...Object.values(data.packSales || {}))
  const rarityMax = Math.max(1, ...Object.values(data.rarityDistribution || {}))

  return (
    <div className="space-y-6">
      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-6">
          <div className="text-3xl font-bold text-amber-400">{data.userCount.toLocaleString()}</div>
          <div className="text-sm text-white/50 mt-1">Total Users</div>
        </div>
        <div className="glass-card p-6">
          <div className="text-3xl font-bold text-blue-400">{data.totalCards.toLocaleString()}</div>
          <div className="text-sm text-white/50 mt-1">Total Cards</div>
        </div>
        <div className="glass-card p-6">
          <div className="text-3xl font-bold text-green-400">{data.totalTransactions.toLocaleString()}</div>
          <div className="text-sm text-white/50 mt-1">Total Transactions</div>
        </div>
        <div className="glass-card p-6">
          <div className="text-3xl font-bold text-purple-400">{formatPHP(data.totalRevenue)}</div>
          <div className="text-sm text-white/50 mt-1">Total Revenue</div>
        </div>
      </div>

      {/* Two-column layout: Tx Breakdown + Pack Sales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Transaction Breakdown */}
        <div className="glass-card-lg p-6">
          <h2 className="text-lg font-bold text-amber-400 mb-4">💳 Transaction Breakdown</h2>
          {txTotal === 0 ? (
            <p className="text-sm text-white/40 py-4 text-center">No transactions recorded yet.</p>
          ) : (
            <>
              {/* Pie-like visual */}
              <div className="flex items-center justify-center mb-4">
                <div className="relative w-40 h-40">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {(() => {
                      let offset = 0
                      const parts: { label: string; pct: number; color: string }[] = []
                      let cumulative = 0
                      for (const p of txPieParts) {
                        if (p.value === 0) continue
                        parts.push({ label: p.label, pct: p.pct, color: p.color })
                      }
                      // If only one sector exists, we need a full circle
                      if (parts.length === 1) {
                        return (
                          <circle cx="50" cy="50" r="35" fill="none" stroke={parts[0].color} strokeWidth="12"
                            strokeDasharray={`${100} 0`} />
                        )
                      }
                      return parts.map((p, i) => {
                        const dashOffset = cumulative * 2.2  // circumference ≈ 220 for r=35 with strokeWidth
                        const dashLen = p.pct * 2.2
                        cumulative += p.pct
                        return (
                          <circle key={i} cx="50" cy="50" r="35" fill="none" stroke={p.color} strokeWidth="12"
                            strokeDasharray={`${dashLen} ${220 - dashLen}`}
                            strokeDashoffset={-dashOffset}
                          />
                        )
                      })
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">{txTotal}</span>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex justify-center gap-4 mb-4">
                {txPieParts.filter(p => p.value > 0).map(p => (
                  <div key={p.label} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: p.color }} />
                    <span className="text-xs text-white/60">{p.label}</span>
                    <span className="text-xs font-bold text-white/80">{p.value}</span>
                  </div>
                ))}
              </div>

              {/* Horizontal bar instead of pie legend */}
              <div className="space-y-2">
                {txPieParts.filter(p => p.pct > 0).map(p => (
                  <div key={p.label} className="flex items-center gap-2">
                    <span className="text-xs text-white/50 w-16 text-right">{p.label}</span>
                    <div className="flex-1 bg-white/5 rounded-full h-4 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${p.pct}%`,
                        backgroundColor: p.color,
                      }} />
                    </div>
                    <span className="text-xs font-bold text-white/70 w-12">{p.value}</span>
                    <span className="text-xs text-white/30 w-10">{p.pct}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pack Sales */}
        <div className="glass-card-lg p-6">
          <h2 className="text-lg font-bold text-amber-400 mb-4">🎁 Pack Sales</h2>
          {Object.keys(data.packSales || {}).length === 0 ? (
            <p className="text-sm text-white/40 py-4 text-center">No pack sales recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(data.packSales).map(([packId, count]) => {
                const label = packNames[packId] || packId
                const revenue = data.packRevenue?.[packId] || 0
                const barPct = (count / packSalesMax) * 100
                return (
                  <div key={packId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white/70">{label}</span>
                      <span className="text-xs text-white/40">
                        {count} sold · {formatPHP(revenue)}
                      </span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500/60 to-blue-400/80 flex items-center justify-end pr-2 transition-all"
                        style={{ width: `${Math.max(barPct, 2)}%`, minWidth: barPct > 0 ? '2%' : 0 }}
                      >
                        {barPct > 15 && (
                          <span className="text-[10px] font-bold text-white">{count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Two-column: Rarity Distribution + Pack Open Rate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card Rarity Distribution */}
        <div className="glass-card-lg p-6">
          <h2 className="text-lg font-bold text-amber-400 mb-4">🃏 Card Rarity Distribution</h2>
          {Object.keys(data.rarityDistribution || {}).length === 0 ? (
            <p className="text-sm text-white/40 py-4 text-center">No card data yet.</p>
          ) : (
            <div className="space-y-3">
              {RARITY_ORDER.map(rarity => {
                const count = data.rarityDistribution[rarity] || 0
                const color = RARITY_COLORS[rarity]
                const barPct = (count / rarityMax) * 100
                return (
                  <div key={rarity}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold capitalize" style={{ color }}>{rarity}</span>
                      <span className="text-xs text-white/40">{count.toLocaleString()} cards</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-5 overflow-hidden">
                      <div
                        className="h-full rounded-full flex items-center justify-end pr-2 transition-all"
                        style={{
                          width: `${Math.max(barPct, count > 0 ? 2 : 0)}%`,
                          minWidth: count > 0 ? '2%' : 0,
                          backgroundColor: color + '80',
                        }}
                      >
                        {barPct > 20 && (
                          <span className="text-[10px] font-bold text-white">{count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pack Open Rate */}
        <div className="glass-card-lg p-6">
          <h2 className="text-lg font-bold text-amber-400 mb-4">📦 Pack Open Rate</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="glass-card p-4 text-center">
                <div className="text-2xl font-bold text-white">{data.packStats.total.toLocaleString()}</div>
                <div className="text-[10px] text-white/40 mt-0.5">Total Packs</div>
              </div>
              <div className="glass-card p-4 text-center border border-green-500/10">
                <div className="text-2xl font-bold text-green-400">{data.packStats.opened.toLocaleString()}</div>
                <div className="text-[10px] text-white/40 mt-0.5">Opened</div>
              </div>
              <div className="glass-card p-4 text-center border border-amber-500/10">
                <div className="text-2xl font-bold text-amber-400">{data.packStats.unopened.toLocaleString()}</div>
                <div className="text-[10px] text-white/40 mt-0.5">Unopened</div>
              </div>
            </div>

            {/* Combined bar */}
            {data.packStats.total > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white/50">Open Rate</span>
                  <span className="text-xs text-white/60">
                    {Math.round(data.packStats.opened / data.packStats.total * 100)}%
                  </span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-6 overflow-hidden flex">
                  <div
                    className="h-full bg-green-500/70 flex items-center justify-center transition-all"
                    style={{ width: `${(data.packStats.opened / data.packStats.total) * 100}%` }}
                  >
                    {data.packStats.opened / data.packStats.total > 0.2 && (
                      <span className="text-[10px] font-bold text-white/90">Opened</span>
                    )}
                  </div>
                  <div
                    className="h-full bg-amber-500/40 flex items-center justify-center transition-all"
                    style={{ width: `${(data.packStats.unopened / data.packStats.total) * 100}%` }}
                  >
                    {data.packStats.unopened / data.packStats.total > 0.2 && (
                      <span className="text-[10px] font-bold text-white/70">Unopened</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Most Owned Cards */}
      {data.mostOwnedCards && data.mostOwnedCards.length > 0 && (
        <div className="glass-card-lg p-6">
          <h2 className="text-lg font-bold text-amber-400 mb-4">🏆 Most Owned Cards</h2>
          <div className="space-y-1.5">
            {data.mostOwnedCards.slice(0, 10).map(([cardId, count], idx) => (
              <div key={cardId} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/30 w-5 text-right">{idx + 1}.</span>
                  <span className="text-sm text-white/80 font-mono text-[11px]">{cardId}</span>
                </div>
                <span className="text-xs font-bold text-amber-400">{count} owned</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refresh button at bottom */}
      <div className="text-center">
        <button
          onClick={loadAnalytics}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition"
        >
          🔄 Refresh Analytics
        </button>
      </div>
    </div>
  )
}
