'use client'

import { useState, useEffect } from 'react'

interface Props {
  artistName: string
  artistSlug: string
  competitionName?: string
  competitionYear?: number | string
}

export default function ArtistShareButtons({
  artistName,
  artistSlug,
  competitionName,
  competitionYear,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [hasNativeShare, setHasNativeShare] = useState(false)
  const [currentUrl, setCurrentUrl] = useState('')

  const compName = competitionName || 'Gospel Awards RDC'
  const compYear = competitionYear || new Date().getFullYear()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/artistes/${artistSlug}`
      setCurrentUrl(url)
      setHasNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
    }
  }, [artistSlug])

  const shareText = `🏆 Soutenez ${artistName} aux ${compName} ! Votez ici : ${currentUrl}`

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentUrl)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = currentUrl
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      setCopied(false)
    }
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${compName} — ${artistName}`,
          text: `🏆 Soutenez ${artistName} aux ${compName} ! Votez pour lui/elle sur le site officiel :`,
          url: currentUrl,
        })
      } catch (err) {
        // Ignorer l'annulation utilisateur
      }
    } else {
      handleCopyLink()
    }
  }

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`

  return (
    <div className="premium-card p-5 sm:p-6 border border-gold/30 bg-gradient-to-r from-gold/[0.05] via-[#0A0E1A] to-gold/[0.02] shadow-xl relative overflow-hidden">
      {/* Decorative ambient glow */}
      <div className="absolute right-0 top-0 w-32 h-32 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-base">📣</span>
            <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
              Mobilisez vos fans · Partage Officiel
            </h3>
            <span className="text-[10px] bg-gold/10 text-gold font-bold px-2 py-0.5 rounded-full border border-gold/20 hidden sm:inline">
              {competitionName || `Campagne ${compYear}`}
            </span>
          </div>
          <p className="text-xs text-gray-400 max-w-xl leading-relaxed">
            Partagez la page officielle de <strong className="text-gold">{artistName}</strong> pour inviter votre communauté à voter en un clic.
          </p>
        </div>

        {/* Share Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Native Web Share Button (Mobile/Supported devices) */}
          {hasNativeShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="flex-1 sm:flex-initial btn-primary !py-2.5 !px-4 text-xs font-black flex items-center justify-center gap-2 shadow-lg"
              title="Partager via les applications de votre appareil"
            >
              <span>📲</span>
              <span>Partager</span>
            </button>
          )}

          {/* WhatsApp Direct Share */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 text-[#25D366] text-xs font-bold transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            title="Partager directement sur WhatsApp"
          >
            <span className="text-sm">💬</span>
            <span>WhatsApp</span>
          </a>

          {/* Facebook Direct Share */}
          <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-[#1877F2]/15 hover:bg-[#1877F2]/25 border border-[#1877F2]/40 text-[#1877F2] text-xs font-bold transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            title="Partager sur Facebook"
          >
            <span className="text-sm">📘</span>
            <span>Facebook</span>
          </a>

          {/* Copy Public Link Button */}
          <button
            type="button"
            onClick={handleCopyLink}
            className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
              copied
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-white/[0.04] border-white/[0.1] text-gray-200 hover:border-gold/40 hover:text-gold hover:bg-white/[0.06]'
            }`}
            title="Copier le lien direct de vote"
          >
            <span>{copied ? '✓' : '🔗'}</span>
            <span>{copied ? 'Lien copié !' : 'Copier le lien'}</span>
          </button>
        </div>
      </div>

      {/* Copy Confirmation Banner */}
      {copied && (
        <div className="mt-3 pt-2.5 border-t border-emerald-500/20 text-xs font-semibold text-emerald-400 flex items-center gap-2 animate-fade-in">
          <span>✓</span>
          <span>Lien de vote officiel copié dans le presse-papier. Vous pouvez maintenant le coller et le partager !</span>
        </div>
      )}
    </div>
  )
}
