'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Navbar() {
  const [user, setUser] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data }) => setUser(data.user))
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
        setUser(session?.user ?? null)
      })
      return () => subscription.unsubscribe()
    } catch {
      // env vars missing during build — safe to ignore
    }
  }, [])

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#1a1033]/80 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🏛️</span>
          <span className="text-xl font-bold gradient-text">PoliClash PH</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/campaign" className="text-white/70 hover:text-amber-400 transition">Campaign</Link>
          <Link href="/rank" className="text-white/70 hover:text-amber-400 transition">Rank Game</Link>
          <Link href="/cards" className="text-white/70 hover:text-amber-400 transition">Cards</Link>
          <Link href="/shop" className="text-white/70 hover:text-amber-400 transition">Shop</Link>
          <Link href="/dashboard" className="text-white/70 hover:text-amber-400 transition">Dashboard</Link>
          {mounted && user ? (
            <form action="/api/auth/signout" method="post">
              <button type="submit" className="text-white/50 hover:text-rose-400 transition">Sign out</button>
            </form>
          ) : (
            <Link href="/login" className="px-4 py-1.5 rounded-lg btn-gradient text-white font-medium">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}