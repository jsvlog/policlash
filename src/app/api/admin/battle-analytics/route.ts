import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function GET() {
  const admin = getAdminClient()

  try {
    // Fetch all battle logs
    const { data: logs, error } = await admin
      .from('battle_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10000)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const battles = logs || []

    if (battles.length === 0) {
      return NextResponse.json({
        success: true,
        analytics: {
          totalBattles: 0,
          winRate: 0,
          avgTurns: 0,
          regionStats: [],
          difficultyCurve: [],
          topCards: [],
          message: 'No battle data yet. Play some campaign battles to populate analytics.',
        },
      })
    }

    // Overall stats
    const wins = battles.filter((b: any) => b.result === 'victory').length
    const totalTurns = battles.reduce((sum: number, b: any) => sum + (b.turns || 0), 0)

    // Region stats (10 maps per region)
    const regionNames = [
      'Barangay Battlegrounds', 'City Hall Chaos', 'Provincial Politics',
      'Congress Arena', 'Senate Showdown', 'Malacañang Gates',
      'Media Wars', 'Dynasty Dominance', 'Reformer Uprising', 'Final Campaign',
    ]
    const regionStats: any[] = []
    for (let r = 0; r < 10; r++) {
      const startMap = r * 10 + 1
      const endMap = startMap + 9
      const regionBattles = battles.filter((b: any) => b.map_id >= startMap && b.map_id <= endMap)
      const regionWins = regionBattles.filter((b: any) => b.result === 'victory').length
      regionStats.push({
        region: r + 1,
        name: regionNames[r] || `Region ${r + 1}`,
        battles: regionBattles.length,
        wins: regionWins,
        winRate: regionBattles.length > 0 ? Math.round((regionWins / regionBattles.length) * 100) : 0,
      })
    }

    // Difficulty curve — win rate by map
    const difficultyCurve: any[] = []
    for (let m = 1; m <= 100; m++) {
      const mapBattles = battles.filter((b: any) => b.map_id === m)
      if (mapBattles.length === 0) continue
      const mapWins = mapBattles.filter((b: any) => b.result === 'victory').length
      difficultyCurve.push({
        map: m,
        battles: mapBattles.length,
        winRate: Math.round((mapWins / mapBattles.length) * 100),
        avgTurns: Math.round(mapBattles.reduce((s: number, b: any) => s + (b.turns || 0), 0) / mapBattles.length),
      })
    }

    // Most used cards in victories
    const victoryBattles = battles.filter((b: any) => b.result === 'victory')
    const cardUsage: Record<string, { name: string; count: number; wins: number }> = {}
    for (const b of battles) {
      const names = b.cards_used || []
      for (const name of names) {
        if (!cardUsage[name]) cardUsage[name] = { name, count: 0, wins: 0 }
        cardUsage[name].count++
        if (b.result === 'victory') cardUsage[name].wins++
      }
    }

    const topCards = Object.values(cardUsage)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map(c => ({
        ...c,
        winRate: c.count > 0 ? Math.round((c.wins / c.count) * 100) : 0,
      }))

    // Monster difficulty — hardest monsters by player defeat rate
    const monsterStats: Record<string, { name: string; battles: number; defeats: number }> = {}
    for (const b of battles) {
      const key = b.monster_name
      if (!monsterStats[key]) monsterStats[key] = { name: key, battles: 0, defeats: 0 }
      monsterStats[key].battles++
      if (b.result === 'defeat') monsterStats[key].defeats++
    }

    const hardestMonsters = Object.values(monsterStats)
      .filter(m => m.battles >= 3)
      .sort((a, b) => (b.defeats / b.battles) - (a.defeats / a.battles))
      .slice(0, 10)
      .map(m => ({
        name: m.name,
        battles: m.battles,
        defeatRate: Math.round((m.defeats / m.battles) * 100),
      }))

    // Recent battles
    const recentBattles = battles.slice(0, 20).map((b: any) => ({
      mapId: b.map_id,
      stageId: b.stage_id,
      result: b.result,
      turns: b.turns,
      cards: b.cards_used?.join(', ') || 'Unknown',
      monster: b.monster_name,
      time: b.created_at,
    }))

    return NextResponse.json({
      success: true,
      analytics: {
        totalBattles: battles.length,
        winRate: battles.length > 0 ? Math.round((wins / battles.length) * 100) : 0,
        avgTurns: battles.length > 0 ? Math.round(totalTurns / battles.length) : 0,
        regionStats,
        difficultyCurve,
        topCards,
        hardestMonsters,
        recentBattles,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
