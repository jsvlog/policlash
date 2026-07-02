'use client'

import { useState, useEffect } from 'react'
import { RARITY_COLORS } from '@/lib/card-data'

interface BattleAnalytics {
  totalBattles: number
  winRate: number
  avgTurns: number
  regionStats: { region: number; name: string; battles: number; wins: number; winRate: number }[]
  difficultyCurve: { map: number; battles: number; winRate: number; avgTurns: number }[]
  topCards: { name: string; count: number; wins: number; winRate: number }[]
  hardestMonsters: { name: string; battles: number; defeatRate: number }[]
  recentBattles: { mapId: number; stageId: number; result: string; turns: number; cards: string; monster: string; time: string }[]
  message?: string
}

export default function BattleAnalyticsTab() {
  const [data, setData] = useState<BattleAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/battle-analytics')
      const json = await res.json()
      if (json.success) setData(json.analytics)
      else setError(json.error || 'Failed to load')
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  if (loading) return <div className="text-white/40 text-sm animate-pulse">Loading battle analytics...</div>
  if (error) return (
    <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4">
      <p className="text-rose-300 text-sm">{error}</p>
      <button onClick={fetchData} className="mt-2 text-xs text-amber-400 hover:underline">Retry</button>
    </div>
  )
  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">{data.totalBattles.toLocaleString()}</div>
          <div className="text-xs text-white/40 mt-1">Total Battles</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className={`text-2xl font-bold ${data.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>{data.winRate}%</div>
          <div className="text-xs text-white/40 mt-1">Win Rate</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{data.avgTurns}</div>
          <div className="text-xs text-white/40 mt-1">Avg Turns/Battle</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">
            {data.totalBattles > 0 ? Math.round(data.totalBattles * data.winRate / 100) : 0}
          </div>
          <div className="text-xs text-white/40 mt-1">Total Victories</div>
        </div>
      </div>

      {/* Region Win Rates */}
      <div className="glass-card-lg p-4">
        <h3 className="text-sm font-bold text-amber-300 mb-3">🗺️ Win Rate by Region</h3>
        <div className="space-y-2">
          {data.regionStats.map((r) => (
            <div key={r.region} className="flex items-center gap-3">
              <div className="w-32 text-xs text-white/60 truncate">{r.name}</div>
              <div className="flex-1 h-5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all flex items-center justify-end pr-2"
                  style={{
                    width: `${Math.max(2, r.winRate)}%`,
                    background: r.winRate >= 70 ? '#22c55e' : r.winRate >= 40 ? '#f59e0b' : '#ef4444',
                  }}
                >
                  {r.battles > 0 && (
                    <span className="text-[9px] font-bold text-black/70">{r.winRate}%</span>
                  )}
                </div>
              </div>
              <div className="text-[10px] text-white/30 w-12 text-right">{r.battles} battles</div>
            </div>
          ))}
        </div>
      </div>

      {/* Difficulty Curve — win rate drops */}
      <div className="glass-card-lg p-4">
        <h3 className="text-sm font-bold text-amber-300 mb-3">📉 Difficulty Curve (Win Rate per Map)</h3>
        {data.difficultyCurve.length === 0 ? (
          <p className="text-xs text-white/30">No data yet</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex gap-0.5 items-end" style={{ minWidth: '600px', height: '100px' }}>
              {data.difficultyCurve.map((m) => (
                <div key={m.map} className="flex flex-col items-center group relative" style={{ flex: '1 0 auto' }}>
                  <div
                    className="w-full rounded-t transition-all hover:opacity-80"
                    style={{
                      height: `${Math.max(4, m.winRate)}px`,
                      background: m.winRate >= 70 ? '#22c55e' : m.winRate >= 40 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                  {data.difficultyCurve.length <= 20 && (
                    <div className="text-[8px] text-white/20 mt-0.5 rotate-45 origin-left">{m.map}</div>
                  )}
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-1 hidden group-hover:block bg-black/90 text-[10px] text-white px-2 py-1 rounded whitespace-nowrap z-10">
                    Map {m.map}: {m.winRate}% win ({m.battles}b)
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Top Cards + Hardest Monsters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Cards */}
        <div className="glass-card-lg p-4">
          <h3 className="text-sm font-bold text-amber-300 mb-3">🏆 Most Used Cards (Top 10)</h3>
          {data.topCards.length === 0 ? (
            <p className="text-xs text-white/30">No data yet</p>
          ) : (
            <div className="space-y-1.5">
              {data.topCards.slice(0, 10).map((c, i) => (
                <div key={c.name} className="flex items-center gap-2 text-xs">
                  <span className="text-white/20 w-5">#{i + 1}</span>
                  <span className="flex-1 text-white/70 truncate">{c.name}</span>
                  <span className="text-white/30 w-12 text-right">{c.count}x</span>
                  <span className={`w-12 text-right ${c.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                    {c.winRate}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hardest Monsters */}
        <div className="glass-card-lg p-4">
          <h3 className="text-sm font-bold text-amber-300 mb-3">💀 Hardest Monsters (by defeat rate)</h3>
          {data.hardestMonsters.length === 0 ? (
            <p className="text-xs text-white/30">No data yet</p>
          ) : (
            <div className="space-y-1.5">
              {data.hardestMonsters.map((m, i) => (
                <div key={m.name} className="flex items-center gap-2 text-xs">
                  <span className="text-white/20 w-5">#{i + 1}</span>
                  <span className="flex-1 text-white/70 truncate">{m.name}</span>
                  <span className="text-white/30 w-12 text-right">{m.battles}b</span>
                  <span className={`w-12 text-right font-bold ${m.defeatRate >= 50 ? 'text-red-400' : 'text-amber-400'}`}>
                    {m.defeatRate}% L
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Battles */}
      <div className="glass-card-lg p-4">
        <h3 className="text-sm font-bold text-amber-300 mb-3">🕐 Recent Battles</h3>
        {data.recentBattles.length === 0 ? (
          <p className="text-xs text-white/30">No battles recorded yet</p>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {data.recentBattles.map((b, i) => (
              <div key={i} className="flex items-center gap-3 text-xs py-1.5 border-b border-white/5">
                <span className={b.result === 'victory' ? 'text-green-400' : 'text-red-400'}>{b.result === 'victory' ? '✅' : '❌'}</span>
                <span className="text-white/50">M{b.mapId}S{b.stageId}</span>
                <span className="text-white/30">{b.turns}t</span>
                <span className="text-white/40 truncate flex-1">{b.cards}</span>
                <span className="text-white/20 flex-shrink-0">{new Date(b.time).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Refresh */}
      <div className="text-center">
        <button onClick={fetchData} className="px-4 py-2 rounded-lg bg-white/5 text-white/50 text-xs hover:text-white hover:bg-white/10 transition">
          🔄 Refresh Data
        </button>
      </div>
    </div>
  )
}
