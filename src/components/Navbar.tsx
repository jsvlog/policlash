'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Navbar() {
  const [user, setUser] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

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

  // Lock body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const navLinks = [
    { href: '/campaign', label: 'Campaign' },
    { href: '/rank', label: 'Rank Game' },
    { href: '/cards', label: 'Cards' },
    { href: '/shop', label: 'Shop' },
    { href: '/dashboard', label: 'Dashboard' },
  ]

  return (
    <>
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#1a1033]/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <span className="text-2xl">🏛️</span>
            <span className="text-xl font-bold gradient-text">PoliClash PH</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-4 text-sm">
            {navLinks.map(link => (
              <Link key={link.href} href={link.href} className="text-white/70 hover:text-amber-400 transition">
                {link.label}
              </Link>
            ))}
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

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 transition"
            aria-label="Toggle menu"
          >
            <div className="flex flex-col gap-1.5">
              <span className={`block w-5 h-0.5 bg-white/70 transition-all ${menuOpen ? 'rotate-45 translate-y-1' : ''}`} />
              <span className={`block w-5 h-0.5 bg-white/70 transition-all ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-0.5 bg-white/70 transition-all ${menuOpen ? '-rotate-45 -translate-y-1' : ''}`} />
            </div>
          </button>
        </div>
      </nav>

      {/* Mobile drawer overlay */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 md:hidden ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />

        {/* Drawer */}
        <div
          className={`absolute top-0 right-0 h-full w-64 bg-[#1a1033] border-l border-white/5 shadow-2xl transition-transform duration-300 ${
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex flex-col p-6 pt-20 gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="px-4 py-3 rounded-xl text-white/80 hover:bg-white/10 hover:text-amber-400 transition text-base font-medium"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-4 pt-4 border-t border-white/5">
              {mounted && user ? (
                <form action="/api/auth/signout" method="post">
                  <button
                    type="submit"
                    className="w-full px-4 py-3 rounded-xl text-left text-white/50 hover:bg-white/10 hover:text-rose-400 transition text-base"
                  >
                    Sign out
                  </button>
                </form>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 rounded-xl text-center btn-gradient text-white font-medium"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
