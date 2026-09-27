'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { logoutAction } from '@/actions/auth'

interface SidebarItem {
  label: string
  href: string
  icon: string
}

interface SidebarProps {
  items: SidebarItem[]
  title: string
}

export default function Sidebar({ items, title }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="lg:hidden fixed bottom-16 right-4 z-50 btn-primary !p-3 !rounded-full shadow-2xl"
      >
        <span className="text-xl">{collapsed ? '✕' : '☰'}</span>
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-[#0A0E1A] border-r border-white/[0.06] transform transition-transform duration-300 lg:transform-none ${
          collapsed ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full pt-16 lg:pt-6">
          <div className="px-5 mb-6">
            <span className="text-[10px] font-bold text-gold uppercase tracking-[0.2em] block mb-1">
              Gospel Awards RDC
            </span>
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              {title}
            </h2>
          </div>

          <nav className="flex-1 px-3 space-y-1.5">
            {items.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  onClick={() => setCollapsed(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-gold/[0.12] text-gold border border-gold/30 shadow-sm'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t border-white/[0.06] space-y-2">
            <Link
              href="/"
              prefetch={true}
              className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-gold transition-colors py-1.5 px-2 rounded-lg hover:bg-white/[0.02]"
            >
              <span>←</span>
              <span>Retour au site public</span>
            </Link>

            <form action={logoutAction}>
              <button
                type="submit"
                className="w-full flex items-center gap-2 text-xs font-medium text-rose-400/90 hover:text-rose-300 hover:bg-rose-500/[0.08] transition-all py-1.5 px-2 rounded-lg text-left"
              >
                <span>🚪</span>
                <span>Se déconnecter</span>
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  )
}
