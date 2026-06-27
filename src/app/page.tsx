import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="w-full pt-20 pb-16">
        <div className="text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-rose-500/20 text-rose-300 text-sm font-medium mb-6">
            🎴 Political Satire Card Game
          </span>
          <h1 className="text-5xl sm:text-6xl font-bold mb-6">
            <span className="gradient-text">PoliClash PH</span>
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto mb-8">
            Outsmart the trapos. Build your political dynasty. Conquer the board.
            A satirical tactical card game parodying Philippine politics.
          </p>
          <div className="flex justify-center items-center gap-4 mb-8">
            <Link href="/campaign" className="px-6 py-3 rounded-lg btn-gradient text-white font-medium text-base">
              🎮 Play Now
            </Link>
            <Link href="/shop" className="px-6 py-3 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium transition">
              🛒 Shop Packs
            </Link>
          </div>
          <div className="flex justify-center items-center gap-6 text-sm text-white/40">
            <span>🎴 50+ Parody Cards</span>
            <span>🏆 6 Factions</span>
            <span>⚡ 11 Special Abilities</span>
            <span>💰 GCash Payments</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="w-full py-16">
        <h2 className="text-3xl font-bold text-center mx-auto mb-4">Game Features</h2>
        <p className="text-white/50 max-w-xl mx-auto text-center mb-10">
          Everything you need for a complete political card game experience.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-center">
          {[
            { icon: '🎴', title: 'Parody Card System', desc: 'Collect cards like "Mayor Budots" and "Senador Grandstander" — each with unique abilities and satirical flavor text.' },
            { icon: '⚔️', title: 'Tactical Combat', desc: 'Charisma, Machinery, Budget, and Influence stats. Use abilities like Privilege Speech and Pork Barrel to outmaneuver opponents.' },
            { icon: '🏛️', title: '6 Factions', desc: 'Trapo, Reformer, Showbiz, Dynasty, Activist, and Warlord — each with distinct playstyles and strategies.' },
            { icon: '🛒', title: 'Premium Shop', desc: 'Buy packs via GCash. Send exactly ₱50.24, upload your receipt, and get your packs after admin approval.' },
            { icon: '🎴', title: 'Pack Opening', desc: 'Open packs with weighted rarity drops. Chase the Legendary Probinsiyano Strongman card.' },
            { icon: '🔐', title: 'Secure & Fair', desc: 'Supabase RLS protects your data. Admin dashboard for manual transaction verification.' },
          ].map((f, i) => (
            <div key={i} className="glass-card p-6">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold text-amber-300 mb-2">{f.title}</h3>
              <p className="text-white/60 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How to Play */}
      <section className="w-full py-16">
        <div className="glass-card-lg p-8 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mx-auto mb-4">How to Play</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-10">
            {[
              { step: '1', title: 'Build Your Deck', desc: 'Choose cards from your collection. Each card costs Budget to play.' },
              { step: '2', title: 'Play Cards', desc: 'Spend your Budget pool to place cards on the 5-slot board.' },
              { step: '3', title: 'Use Abilities', desc: 'Activate special abilities — from Vote Buying to Blackmail.' },
              { step: '4', title: 'Attack & Win', desc: 'Attack enemy cards or go direct. Reduce opponent health to 0 to win.' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-full btn-gradient text-white font-bold text-lg flex items-center justify-center mx-auto mb-3">
                  {s.step}
                </div>
                <h3 className="font-semibold text-amber-300 mb-1">{s.title}</h3>
                <p className="text-sm text-white/50">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/campaign" className="px-6 py-3 rounded-lg btn-gradient text-white font-medium inline-block">
              Start Playing →
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="w-full py-14">
        <div className="glass-card p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { label: 'Parody Cards', value: '10+' },
              { label: 'Factions', value: '6' },
              { label: 'Abilities', value: '11' },
              { label: 'Rarity Tiers', value: '5' },
            ].map((s, i) => (
              <div key={i}>
                <div className="text-3xl font-bold gradient-text mb-1">{s.value}</div>
                <div className="text-sm text-white/50">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}