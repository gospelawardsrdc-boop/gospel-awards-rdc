'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Props {
  artistId: string
  artistName: string
  isSelf: boolean
  canVote?: boolean
  editionName?: string
  targetElementId?: string
}

export default function StickyVoteButton({
  artistId,
  artistName,
  isSelf,
  canVote = true,
  editionName,
  targetElementId = 'main-vote-cta',
}: Props) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Si l'utilisateur est le candidat lui-même ou si le vote n'est pas ouvert, aucun sticky n'est actif
    if (isSelf || !canVote) return

    const target = document.getElementById(targetElementId)
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Affiche la barre sticky uniquement lorsque le CTA principal est hors du viewport
        setIsVisible(!entry.isIntersecting)
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0,
      }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [isSelf, canVote, targetElementId])

  // Règle de sécurité et état de vote : aucun rendu si auto-vote ou vote fermé
  if (isSelf || !canVote) return null

  return (
    <div
      className={`md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#060912]/95 backdrop-blur-xl border-t border-gold/30 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.7)] transition-all duration-300 ease-in-out pb-[max(0.75rem,env(safe-area-inset-bottom))] ${
        isVisible
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : 'translate-y-full opacity-0 pointer-events-none'
      }`}
      aria-hidden={!isVisible}
    >
      <div className="max-w-md mx-auto flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] uppercase font-bold text-gold tracking-wider block truncate">
            {editionName || 'Gospel Awards RDC'}
          </span>
          <h4 className="text-sm font-black text-white truncate">
            {artistName}
          </h4>
        </div>
        <Link
          href={`/voter?artist=${artistId}`}
          prefetch={true}
          tabIndex={isVisible ? 0 : -1}
          className="btn-primary !py-2.5 !px-5 text-xs font-black tracking-wide shadow-lg flex items-center gap-1.5 flex-shrink-0 animate-pulse-vote"
          aria-label={`Voter pour ${artistName}`}
        >
          <span>⭐</span>
          <span>Voter</span>
        </Link>
      </div>
    </div>
  )
}
