import Link from 'next/link'

export default function RankPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-32 text-center">
      <div className="glass-card-lg p-12">
        <div className="text-8xl mb-6">🏆</div>
        <h1 className="text-3xl font-bold text-white/40 mb-3">Rank Game</h1>
        <div className="inline-block px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-400 text-sm font-medium mb-6">
          Coming Soon
        </div>
        <p className="text-white/30 mb-4 max-w-md mx-auto">
          Battle other players in competitive ranked matches. Build your ELO, climb the leaderboard, and prove you're the ultimate politiko.
        </p>
        <div className="flex items-center justify-center gap-4 text-sm text-white/15 mb-8">
          <span>🏅 Seasonal rankings</span>
          <span>•</span>
          <span>⚔️ PvP battles</span>
          <span>•</span>
          <span>📊 Leaderboards</span>
        </div>
        <Link
          href="/campaign"
          className="px-6 py-3 rounded-xl btn-gradient text-white font-medium inline-block"
        >
          Play Campaign Instead →
        </Link>
      </div>
    </div>
  )
}
