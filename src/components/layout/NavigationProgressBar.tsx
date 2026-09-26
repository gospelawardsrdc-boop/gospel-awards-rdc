'use client'

import { useEffect, useState, useRef, useTransition } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export default function NavigationProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Stop progress on route change
  useEffect(() => {
    if (loading) {
      setProgress(100)
      if (timerRef.current) clearInterval(timerRef.current)

      resetTimerRef.current = setTimeout(() => {
        setVisible(false)
        setLoading(false)
        setProgress(0)
      }, 250)
    }

    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    }
  }, [pathname, searchParams])

  // Intercept click on internal links
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Don't intercept if modified click (Ctrl, Cmd, Shift, Alt)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.defaultPrevented) return

      // Find closest <a> element
      const target = e.target as HTMLElement | null
      const anchor = target?.closest('a')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      if (!href) return

      // Ignore external links, downloads, new tabs, and hashes
      if (
        anchor.target === '_blank' ||
        anchor.hasAttribute('download') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('#')
      ) {
        return
      }

      try {
        const url = new URL(href, window.location.href)
        // Only internal links on same origin
        if (url.origin === window.location.origin) {
          const currentUrl = new URL(window.location.href)
          // Only trigger if destination is different from current location
          if (url.pathname !== currentUrl.pathname || url.search !== currentUrl.search) {
            startProgress()
          }
        }
      } catch {}
    }

    const startProgress = () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
      if (timerRef.current) clearInterval(timerRef.current)

      setVisible(true)
      setLoading(true)
      setProgress(15)

      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev < 60) return prev + Math.random() * 18
          if (prev < 85) return prev + Math.random() * 8
          if (prev < 95) return prev + Math.random() * 2
          return prev
        })
      }, 180)
    }

    document.addEventListener('click', handleDocumentClick, { capture: true })

    return () => {
      document.removeEventListener('click', handleDocumentClick, { capture: true })
      if (timerRef.current) clearInterval(timerRef.current)
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none transition-opacity duration-200"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {/* Top Gold Progress Bar */}
      <div
        className="h-[3px] bg-gradient-to-r from-amber-400 via-gold to-yellow-300 shadow-[0_0_12px_rgba(212,175,55,0.85)] transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />

      {/* Discrete Top-Right Mini Spinner */}
      <div className="absolute top-3.5 right-4 flex items-center gap-2 bg-[#060912]/80 backdrop-blur-md px-3 py-1 rounded-full border border-gold/30 shadow-lg text-[11px] font-semibold text-gold animate-fade-in">
        <div className="w-3 h-3 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        <span>Chargement...</span>
      </div>
    </div>
  )
}
