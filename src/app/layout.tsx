import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: {
    default: 'PoliClash PH — Political Card Game',
    template: '%s — PoliClash PH',
  },
  description: 'A satirical tactical card game parodying Philippine politics. Build your deck, outsmart the trapos, and conquer the board.',
  keywords: ['policlash', 'card game', 'philippine politics', 'parody', 'tactical'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="floating-orb" style={{ width: '400px', height: '400px', background: '#ff6b6b', top: '-100px', left: '-100px' }} />
        <div className="floating-orb" style={{ width: '350px', height: '350px', background: '#ffa94d', bottom: '-80px', right: '-80px' }} />
        <div className="relative z-10 min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <footer className="text-center py-6 text-sm text-white/30 border-t border-white/5">
            PoliClash PH — A satirical card game. All cards are parody. No real politicians were harmed.
          </footer>
        </div>
      </body>
    </html>
  )
}