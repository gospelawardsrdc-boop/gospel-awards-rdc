'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { logoutAction } from '@/actions/auth'

interface HeaderProps {
  user?: { name: string; role: string } | null
}

export default function Header({ user }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { href: '/', label: 'Accueil' },
    { href: '/edition', label: 'Édition' },
    { href: '/categories', label: 'Catégories' },
    { href: '/artistes', label: 'Artistes' },
    { href: '/classements', label: 'Classements' },
  ]

  const getDashboardLink = () => {
    if (!user) return null
    switch (user.role) {
      case 'ADMIN': return '/admin'
      case 'ARTIST': return '/artiste'
      default: return '/dashboard'
    }
  }

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-[#060912]/90 backdrop-blur-2xl border-b border-white/[0.04] shadow-2xl shadow-black/20'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg gold-gradient flex items-center justify-center text-[#0A0E1A] font-black text-sm">
                GA
              </div>
              <div className="hidden sm:block">
                <span className="text-sm font-bold tracking-wide gold-text">GOSPEL AWARDS</span>
                <span className="text-[10px] block text-gray-500 tracking-[0.2em] -mt-0.5">RÉPUBLIQUE DÉM. DU CONGO</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={true}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    pathname === link.href
                      ? 'text-gold bg-gold/[0.08]'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/voter"
                prefetch={true}
                className="ml-2 btn-primary text-sm !py-2 !px-5"
              >
                Voter
              </Link>
            </nav>

            {/* Right side */}
            <div className="hidden lg:flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-2">
                  <Link
                    href={getDashboardLink()!}
                    prefetch={true}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/[0.04] transition-all"
                  >
                    <div className="w-7 h-7 rounded-full bg-surface-light border border-border flex items-center justify-center text-xs font-bold text-gold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{user.name}</span>
                  </Link>
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      title="Se déconnecter"
                      className="text-xs text-gray-400 hover:text-rose-400 transition-colors p-2 rounded-lg hover:bg-white/[0.04]"
                    >
                      🚪
                    </button>
                  </form>
                </div>
              ) : (
                <>
                  <Link
                    href="/connexion"
                    className="text-sm font-medium text-gray-400 hover:text-white transition-colors px-4 py-2"
                  >
                    Connexion
                  </Link>
                  <Link
                    href="/inscription"
                    className="text-sm font-semibold text-gold border border-gold/30 px-5 py-2 rounded-full hover:bg-gold/[0.08] transition-all"
                  >
                    Créer un compte
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 -mr-2 text-gray-400 hover:text-white"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 top-16 bg-[#060912]/98 backdrop-blur-2xl z-40 animate-fade-in">
            <div className="px-6 py-8 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block text-lg font-medium py-3 px-4 rounded-xl transition-all ${
                    pathname === link.href
                      ? 'text-gold bg-gold/[0.06]'
                      : 'text-gray-300 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/voter"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-lg font-bold py-3 px-4 rounded-xl text-gold"
              >
                ⭐ Voter
              </Link>

              <div className="border-t border-white/[0.06] mt-6 pt-6">
                {user ? (
                  <div className="space-y-2">
                    <Link
                      href={getDashboardLink()!}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 py-3 px-4 text-gray-300 hover:text-white rounded-xl hover:bg-white/[0.03] transition-all"
                    >
                      <div className="w-8 h-8 rounded-full bg-surface-light border border-border flex items-center justify-center text-sm font-bold text-gold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span>Mon espace ({user.name})</span>
                    </Link>
                    <form action={logoutAction}>
                      <button
                        type="submit"
                        className="w-full flex items-center gap-3 py-2.5 px-4 text-sm text-rose-400/90 hover:text-rose-300 hover:bg-rose-500/[0.08] rounded-xl transition-all text-left"
                      >
                        <span>🚪</span>
                        <span>Se déconnecter</span>
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Link
                      href="/connexion"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-center py-3 text-gray-300 font-medium"
                    >
                      Connexion
                    </Link>
                    <Link
                      href="/inscription"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-center btn-primary w-full"
                    >
                      Créer un compte
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="bottom-nav lg:hidden">
        <div className="flex items-center justify-around py-2 px-2">
          {[
            { href: '/', label: 'Accueil', icon: '🏠' },
            { href: '/categories', label: 'Catégories', icon: '🏷️' },
            { href: '/classements', label: 'Classements', icon: '🏆' },
            { href: '/voter', label: 'Voter', icon: '⭐', highlight: true },
            { href: user ? getDashboardLink()! : '/connexion', label: 'Compte', icon: '👤' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl text-[10px] font-medium transition-all ${
                pathname === item.href
                  ? 'text-gold'
                  : item.highlight
                  ? 'text-gold'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <span className={`text-lg ${item.highlight ? 'bg-gold/10 rounded-full w-10 h-10 flex items-center justify-center -mt-4 border border-gold/20' : ''}`}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}
