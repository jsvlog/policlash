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
    // Run all queries in parallel
    const [
      { data: transactions },
      { data: userPacks },
      { data: userCards },
      { data: allCards },
      { count: userCount },
      { data: revenueData },
    ] = await Promise.all([
      admin.from('transactions').select('*'),
      admin.from('user_packs').select('*'),
      admin.from('user_cards').select('*'),
      admin.from('cards').select('rarity'),
      admin.from('profiles').select('*', { count: 'exact', head: true }),
      admin.from('transactions').select('amount').eq('status', 'approved'),
    ])

    // Pack sales analytics
    const packSales: Record<string, number> = {}
    const packRevenue: Record<string, number> = {}
    for (const tx of transactions || []) {
      if (tx.pack_id) {
        packSales[tx.pack_id] = (packSales[tx.pack_id] || 0) + 1
        packRevenue[tx.pack_id] = (packRevenue[tx.pack_id] || 0) + (tx.amount || 0)
      }
    }

    // Transaction status breakdown
    const txStatus: Record<string, number> = { pending: 0, approved: 0, rejected: 0 }
    for (const tx of transactions || []) {
      txStatus[tx.status] = (txStatus[tx.status] || 0) + 1
    }

    // Card ownership distribution
    const cardOwnership: Record<string, number> = {}
    for (const uc of userCards || []) {
      cardOwnership[uc.card_id] = (cardOwnership[uc.card_id] || 0) + 1
    }

    // Most owned cards (top 10)
    const mostOwned = Object.entries(cardOwnership)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)

    // Rarity distribution across all cards
    const rarityDist: Record<string, number> = {}
    for (const c of allCards || []) {
      rarityDist[c.rarity] = (rarityDist[c.rarity] || 0) + 1
    }

    // Pack open rate
    const packStats = { total: (userPacks || []).length, opened: 0, unopened: 0 }
    for (const up of userPacks || []) {
      if (up.status === 'opened') packStats.opened++
      else packStats.unopened++
    }

    // Total revenue
    const totalRevenue = (revenueData || []).reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0)

    // Recent transactions (last 7 days)
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const recentTxs = (transactions || []).filter(
      (tx: any) => tx.created_at && tx.created_at > weekAgo
    )

    return NextResponse.json({
      success: true,
      analytics: {
        userCount: userCount || 0,
        totalCards: (userCards || []).length,
        totalTransactions: (transactions || []).length,
        recentTransactions: recentTxs.length,
        txStatus,
        packSales,
        packRevenue,
        totalRevenue,
        packStats,
        mostOwnedCards: mostOwned,
        rarityDistribution: rarityDist,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
