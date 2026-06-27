'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCampaignMap, getCampaignStages, generateMonster } from '@/lib/campaign-data'

export default function MapDetailPage() {
  const params = useParams()
  const mapId = parseInt(params.mapId as string)
  const router = useRouter()
  const [progress, setProgress] = useState<Set<string>>(new Set())
  const [user, setUser] = useState<any>(null)

  const map = getCampaignMap(mapId)
  const stages = getCampaignStages(mapId)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.push('/login')
        return
      }
      setUser(data.user)
      try {
        const res = await fetch('/api/campaign/progress')
        if (res.ok) {
          const p = await res.json()
          const completed = new Set(
            p.records?.filter((r: any) => r.completed).map((r: any) => `${r.map_id}-${r.stage_id}`) || []
          )
          setProgress(completed)
        }
      } catch (e) {}
    })
  }, [router, mapId])

  if (!map) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Map not found</h1>
        <Link href="/campaign" className="text-amber-400 hover:underline">← Back to Campaign</Link>
      </div>
    )
  }

  const allStagesCompleted = Array.from({ length: 10 }, (_, i) => i + 1).every(
    (s) => progress.has(`${mapId}-${s}`)
  )

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <Link href="/campaign" className="text-white/40 hover:text-white/80 transition mb-4 inline-flex items-center gap-1">
        ← Back to Maps
      </Link>

      <div className="glass-card-lg p-6 mb-8">
        <div className="flex items-center gap-4 mb-2">
          <span className="text-5xl">{map.emoji}</span>
          <div>
            <h1 className="text-2xl font-bold gradient-text">{map.name}</h1>
            <p className="text-white/50 text-sm">{map.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/50">
            {map.theme.toUpperCase()}
          </span>
          <span className="text-xs text-white/30">
            Map {mapId} of 100
          </span>
          {allStagesCompleted && (
            <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
              ✅ Complete
            </span>
          )}
        </div>
      </div>

      {/* Stage nodes — vertical path */}
      <div className="relative">
        {/* Connecting line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-white/10" style={{ left: '2rem' }} />

        <div className="space-y-4">
          {stages.map((stage, idx) => {
            const isCompleted = progress.has(`${mapId}-${stage.stageId}`)
            const isUnlocked = idx === 0 || progress.has(`${mapId}-${idx}`) // need previous stage completed
            const isBoss = stage.stageId === 10
            const monster = stage.monster

            return (
              <div key={stage.stageId} className="flex items-center gap-6 relative">
                {/* Node circle */}
                <div
                  className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center text-2xl border-2 transition-all flex-shrink-0 ${
                    isCompleted
                      ? 'bg-green-500/20 border-green-500 text-green-400'
                      : isUnlocked
                      ? 'bg-white/10 border-amber-500/50 text-white hover:scale-110 cursor-pointer'
                      : 'bg-white/5 border-white/10 text-white/20'
                  }`}
                  onClick={() => {
                    if (isUnlocked && user) {
                      router.push(`/campaign/${mapId}/${stage.stageId}`)
                    }
                  }}
                  style={isBoss && isUnlocked ? { borderColor: '#ef4444', boxShadow: '0 0 20px rgba(239,68,68,0.3)' } : {}}
                >
                  {isCompleted ? '✅' : isBoss ? '👑' : monster.emoji}
                </div>

                {/* Stage info */}
                <div
                  className={`glass-card p-4 flex-1 transition-all ${
                    isUnlocked ? 'cursor-pointer hover:border-amber-500/30' : 'opacity-40'
                  } ${isBoss && isUnlocked ? 'border-red-500/30' : ''}`}
                  onClick={() => {
                    if (isUnlocked && user) {
                      router.push(`/campaign/${mapId}/${stage.stageId}`)
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`font-bold ${isBoss ? 'text-red-400' : 'text-white'}`}>
                        Stage {stage.stageId}: {monster.name}
                        {isBoss && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full ml-2">BOSS</span>}
                      </h3>
                      <p className="text-xs text-white/40 mt-0.5">
                        Lv.{monster.level} • HP {monster.hp} • ATK {monster.attack} • DEF {monster.defense}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-amber-400/60">Reward</div>
                      <div className="text-sm font-bold text-amber-400">{stage.rewardCoins} 🪙</div>
                    </div>
                  </div>
                  {monster.special && (
                    <div className="mt-2 text-[11px] text-red-400/70">
                      ⚡ {monster.special.name}: {monster.special.description}
                    </div>
                  )}
                  {!isUnlocked && (
                    <div className="mt-2 text-xs text-white/20">🔒 Complete Stage {idx} first</div>
                  )}
                </div>

                {/* Stage number badge */}
                <div className="absolute -left-1 top-0 text-[10px] text-white/20 font-mono">
                  #{stage.stageId}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-10">
        <Link
          href={mapId > 1 ? `/campaign/${mapId - 1}` : '/campaign'}
          className="px-4 py-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/15 transition"
        >
          ← Previous Map
        </Link>
        <Link
          href={mapId < 100 ? `/campaign/${mapId + 1}` : '/campaign'}
          className="px-4 py-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/15 transition"
        >
          Next Map →
        </Link>
      </div>
    </div>
  )
}
