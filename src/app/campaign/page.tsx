'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CAMPAIGN_MAPS } from '@/lib/campaign-data'

interface CampaignProgress {
  completed: number
  total: number
  currentMap: number
  currentStage: number
  records: any[]
}

const REGIONS = [
  { name: 'Barangay', range: [1, 10], emoji: '🏘️', color: '#22c55e' },
  { name: 'City Hall', range: [11, 20], emoji: '🏛️', color: '#f97316' },
  { name: 'Provincial', range: [21, 30], emoji: '⛩️', color: '#8b5cf6' },
  { name: 'Congress', range: [31, 40], emoji: '🏛️', color: '#06b6d4' },
  { name: 'Senate', range: [41, 50], emoji: '🏯', color: '#ec4899' },
  { name: 'Malacanang', range: [51, 60], emoji: '🏰', color: '#fbbf24' },
  { name: 'Supreme Court', range: [61, 70], emoji: '⚖️', color: '#64748b' },
  { name: 'Comelec', range: [71, 80], emoji: '🗳️', color: '#14b8a6' },
  { name: 'Ombudsman', range: [81, 90], emoji: '🔍', color: '#ef4444' },
  { name: 'Impeachment', range: [91, 100], emoji: '⚖️', color: '#dc2626' },
]

export default function CampaignPage() {
  const [mode, setMode] = useState<'lobby' | 'maps'>('lobby')
  const [progress, setProgress] = useState<CampaignProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedRegion, setSelectedRegion] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      try {
        const res = await fetch('/api/campaign/progress')
        if (res.ok) {
          const p = await res.json()
          setProgress(p)
          // Find current region
          const regionIdx = REGIONS.findIndex(
            (r) => p.currentMap >= r.range[0] && p.currentMap <= r.range[1]
          )
          if (regionIdx >= 0) setSelectedRegion(regionIdx)
        }
      } catch (e) { console.error('Failed to load progress:', e) }
      setLoading(false)
    })
  }, [router])

  const completedSet = new Set(
    progress?.records?.filter((r: any) => r.completed).map((r: any) => `${r.map_id}-${r.stage_id}`) || []
  )

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-card p-6 animate-pulse">
              <div className="h-6 w-48 bg-white/10 rounded-lg mb-2" />
              <div className="h-4 w-full bg-white/5 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ============================================================
  // LOBBY — Campaign entry point
  // ============================================================
  if (mode === 'lobby') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold gradient-text text-center mb-2">⚔️ Campaign Mode</h1>
        <p className="text-white/40 text-center mb-10">100 maps. 1000 stages. Conquer Philippine politics.</p>

        <button
          onClick={() => setMode('maps')}
          className="w-full glass-card-lg p-8 text-left hover:scale-[1.01] transition-all duration-200 cursor-pointer border-2 border-amber-500/30 hover:border-amber-500"
        >
          <div className="flex items-center gap-5">
            <span className="text-6xl">🗺️</span>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-amber-300 mb-1">Start Campaign</h2>
              <p className="text-white/50 text-sm mb-3">
                From Barangay halls to Malacañang Palace — fight through 100 unique maps.
              </p>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-amber-400 font-medium">
                  {progress ? `${progress.completed} / ${progress.total} stages` : 'Loading...'}
                </span>
                {progress && progress.completed > 0 && (
                  <span className="text-white/30">
                    Next: Map {progress.currentMap} • Stage {progress.currentStage}
                  </span>
                )}
              </div>
              <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden max-w-md">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
                  style={{ width: progress ? `${(progress.completed / progress.total) * 100}%` : '0%' }}
                />
              </div>
            </div>
            <span className="text-3xl text-amber-500/50">→</span>
          </div>
        </button>
      </div>
    )
  }

  // ============================================================
  // MAPS — Connected chain view (default) or grid
  // ============================================================
  const currentRegion = REGIONS[selectedRegion]
  const regionMaps = CAMPAIGN_MAPS.filter(
    (m) => m.id >= currentRegion.range[0] && m.id <= currentRegion.range[1]
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => setMode('lobby')}
            className="text-white/40 hover:text-white/80 transition mb-1 inline-flex items-center gap-1 text-sm"
          >
            ← Modes
          </button>
          <h1 className="text-3xl font-bold gradient-text">🗺️ Campaign</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xl font-bold text-amber-300">
              {progress?.completed || 0}<span className="text-white/20 text-base">/1000</span>
            </div>
            <div className="text-[10px] text-white/30">stages</div>
          </div>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="glass-card p-3 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40">Progress</span>
          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 via-amber-500 to-red-500 rounded-full transition-all"
              style={{ width: `${((progress?.completed || 0) / 1000) * 100}%` }}
            />
          </div>
          <span className="text-xs text-amber-300 font-medium">
            {Math.round(((progress?.completed || 0) / 1000) * 100)}%
          </span>
        </div>
      </div>

      {/* Region tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {REGIONS.map((region, i) => {
          const regionStart = region.range[0]
          const isUnlocked = !progress || progress.currentMap >= regionStart
          const isCurrent = progress && progress.currentMap >= region.range[0] && progress.currentMap <= region.range[1]
          return (
            <button
              key={region.name}
              onClick={() => setSelectedRegion(i)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap flex-shrink-0 ${
                selectedRegion === i
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : isCurrent
                  ? 'bg-white/10 text-white border border-amber-500/20'
                  : isUnlocked
                  ? 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/5'
                  : 'bg-white/5 text-white/20 border border-white/5 opacity-50'
              }`}
            >
              <span>{region.emoji}</span>
              {region.name}
              {!isUnlocked && <span className="text-[10px]">🔒</span>}
              {isCurrent && selectedRegion !== i && <span className="text-amber-400">📍</span>}
            </button>
          )
        })}
      </div>

      {/* Region header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{currentRegion.emoji}</span>
        <div>
          <h2 className="text-lg font-bold text-white">{currentRegion.name}</h2>
          <p className="text-xs text-white/40">
            Maps {currentRegion.range[0]}–{currentRegion.range[1]}
          </p>
        </div>
      </div>

      {/* Map Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {regionMaps.map((map) => {
          const mapCompleted = Array.from({ length: 10 }, (_, i) => i + 1).filter(
            (s) => completedSet.has(`${map.id}-${s}`)
          ).length
          const isUnlocked = !progress || map.id <= progress.currentMap
          const isCurrent = progress && map.id === progress.currentMap

          return (
            <button
              key={map.id}
              onClick={() => isUnlocked && router.push(`/campaign/${map.id}`)}
              disabled={!isUnlocked}
              className={`glass-card p-3 text-center transition-all ${
                isUnlocked ? 'hover:scale-[1.05] cursor-pointer' : 'opacity-40 cursor-not-allowed'
              } ${isCurrent ? 'ring-2 ring-amber-500/60' : ''}`}
            >
              <div className="text-2xl mb-1">{map.emoji}</div>
              <div className="text-[11px] font-bold text-white truncate">{map.name}</div>
              <div className="flex justify-center gap-0.5 mt-1.5">
                {Array.from({ length: 10 }, (_, i) => (
                  <div
                    key={i}
                    className={`w-1 h-1 rounded-full ${
                      completedSet.has(`${map.id}-${i + 1}`) ? 'bg-green-400' : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>
              <div className="text-[9px] text-white/30 mt-1">
                {mapCompleted}/10
              </div>
            </button>
          )
        })}
      </div>

      {/* Region navigation */}
      <div className="flex justify-between mt-6">
        <button
          onClick={() => setSelectedRegion(Math.max(0, selectedRegion - 1))}
          disabled={selectedRegion === 0}
          className="px-4 py-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/15 transition disabled:opacity-30 text-sm"
        >
          ← Previous Region
        </button>
        <span className="text-xs text-white/20 self-center">
          Region {selectedRegion + 1} of {REGIONS.length}
        </span>
        <button
          onClick={() => setSelectedRegion(Math.min(REGIONS.length - 1, selectedRegion + 1))}
          disabled={selectedRegion === REGIONS.length - 1}
          className="px-4 py-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/15 transition disabled:opacity-30 text-sm"
        >
          Next Region →
        </button>
      </div>
    </div>
  )
}
