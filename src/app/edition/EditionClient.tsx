'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { formatPoints, formatDate, getRankEmoji } from '@/lib/utils'

function formatKinshasaDate(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '—'
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Africa/Kinshasa',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d)
  } catch {
    return '—'
  }
}

function formatKinshasaDateTime(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '—'
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Africa/Kinshasa',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return '—'
  }
}

export interface EditionCompetition {
  id: string
  name: string
  year: number | null
  theme: string | null
  description: string | null
  bannerImage: string | null
  status: string | null
  startDate: string
  endDate: string
  isActive: boolean
}

export interface EditionCategory {
  id: string
  number: number
  name: string
  slug: string
  icon: string | null
  description: string | null
  artistCount: number
  totalPoints: number
  leader: {
    stageName: string
    points: number
    profileImage: string | null
    slug: string
  } | null
}

export interface EditionArtist {
  id: string
  stageName: string
  slug: string
  profileImage: string | null
  coverImage: string | null
  categories: { id: string; name: string; slug: string }[]
  totalPoints: number
}

export interface EditionStats {
  totalCategories: number
  totalArtists: number
  totalPoints: number
  totalVotes: number
  uniqueVoters: number
}

interface EditionClientProps {
  competition: EditionCompetition | null
  categories: EditionCategory[]
  artists: EditionArtist[]
  topArtists: EditionArtist[]
  stats: EditionStats
}

const STATUS_MAP: Record<string, { label: string; badgeClass: string; icon: string; subtitle: string }> = {
  DRAFT: {
    label: 'En préparation',
    badgeClass: 'bg-gray-500/20 text-gray-300 border-gray-500/40',
    icon: '📝',
    subtitle: 'Édition en cours de préparation',
  },
  UPCOMING: {
    label: 'À venir',
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    icon: '⏳',
    subtitle: 'Ouverture imminente des votes',
  },
  ACTIVE: {
    label: 'Votes En Cours',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.25)]',
    icon: '🔥',
    subtitle: 'Période officielle de vote ouverte',
  },
  CLOSED: {
    label: 'Votes Clôturés',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: '🔒',
    subtitle: 'Calcul et audit final des classements',
  },
  GALA: {
    label: 'Soirée de Gala',
    badgeClass: 'bg-gold/20 text-gold border-gold/40 shadow-[0_0_20px_rgba(197,168,128,0.3)]',
    icon: '✨',
    subtitle: 'Cérémonie officielle et remise des distinctions',
  },
}

export default function EditionClient({
  competition,
  categories,
  artists,
  topArtists,
  stats,
}: EditionClientProps) {
  const [mounted, setMounted] = useState(false)
  const [copied, setCopied] = useState(false)
  const [hasNativeShare, setHasNativeShare] = useState(false)
  const [currentUrl, setCurrentUrl] = useState('')

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
    isTargetReached: boolean
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isTargetReached: false,
  })

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/edition`
      setCurrentUrl(url)
      setHasNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
    }
  }, [])

  // Timer calculation
  useEffect(() => {
    if (!competition) return

    const computeTimeLeft = () => {
      const now = new Date().getTime()
      const targetTime =
        competition.status === 'UPCOMING'
          ? new Date(competition.startDate).getTime()
          : new Date(competition.endDate).getTime()

      const diff = targetTime - now

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isTargetReached: true })
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        setTimeLeft({ days, hours, minutes, seconds, isTargetReached: false })
      }
    }

    computeTimeLeft()
    const timerInterval = setInterval(computeTimeLeft, 1000)
    return () => clearInterval(timerInterval)
  }, [competition])

  // Share handlers
  const shareTitle = competition
    ? `🏆 ${competition.name} — Gospel Awards RDC`
    : '🏆 Gospel Awards RDC — Célébrons l\'Excellence du Gospel'
  const shareText = competition
    ? `🏆 Découvrez l'édition officielle ${competition.name} aux Gospel Awards RDC ! Soutenez vos artistes favoris ici : ${currentUrl}`
    : `🏆 Découvrez la prestigieuse compétition Gospel Awards RDC ! Votez pour vos artistes favoris : ${currentUrl}`

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
          title: shareTitle,
          text: shareText,
          url: currentUrl,
        })
      } catch {
        // Ignorer l'annulation
      }
    } else {
      handleCopyLink()
    }
  }

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`

  // ==========================================
  // ÉTAT SANS ÉDITION CONFIGURÉE
  // ==========================================
  if (!competition) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-16">
        <div className="text-center max-w-3xl mx-auto premium-card p-10 sm:p-16 border-gold/20 glow-gold relative overflow-hidden">
          <div className="w-20 h-20 mx-auto rounded-2xl gold-gradient flex items-center justify-center text-[#0A0E1A] text-4xl font-black mb-6 shadow-2xl shadow-gold/20">
            🏆
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Aucune édition configurée pour le moment
          </h1>
          <p className="text-gray-300 text-sm sm:text-base mt-4 max-w-xl mx-auto leading-relaxed">
            La prochaine édition de <strong className="text-gold">Gospel Awards RDC</strong> sera bientôt annoncée.
            Restez connectés pour découvrir les dates officielles, le thème et les artistes en compétition.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <Link href="/categories" className="btn-primary !py-3.5 !px-8 text-sm">
              Découvrir les Catégories
            </Link>
            <Link href="/artistes" className="btn-secondary !py-3.5 !px-8 text-sm">
              Explorer les Artistes
            </Link>
          </div>
        </div>

        {/* 16 Catégories permanentes */}
        {categories.length > 0 && (
          <div className="space-y-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-bold text-gold uppercase tracking-[0.2em] block mb-1">
                Distinctions Officielles
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Les 16 Catégories de Gospel Awards RDC
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/categories/${cat.slug}`}
                  className="premium-card p-5 border-white/[0.06] hover:border-gold/30 hover:scale-[1.01] transition-all group block"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{cat.icon || '🏆'}</span>
                    <span className="text-xs font-bold text-gold">#{cat.number}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-gold transition-colors line-clamp-2">
                    {cat.name}
                  </h3>
                  <div className="mt-3 pt-3 border-t border-white/[0.04] text-[11px] text-gray-400">
                    {cat.artistCount} artiste{cat.artistCount > 1 ? 's' : ''} en lice
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ==========================================
  // ÉTAT AVEC ÉDITION ACTIVE OU RÉCENTE
  // ==========================================
  const currentStatus = STATUS_MAP[competition.status || 'ACTIVE'] || STATUS_MAP.ACTIVE

  return (
    <div className="space-y-16 sm:space-y-24 pb-20">
      {/* ==================================================== */}
      {/* SECTION A : HERO OFFICIEL DE L'ÉDITION               */}
      {/* ==================================================== */}
      <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-24 overflow-hidden border-b border-white/[0.06]">
        {/* Background Banner Image or Ambient Gradient */}
        {competition.bannerImage ? (
          <div className="absolute inset-0 z-0">
            <Image
              src={competition.bannerImage}
              alt={competition.name}
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-25 filter blur-[1px]"
              unoptimized={competition.bannerImage.includes('supabase.co')}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#060912]/80 via-[#060912]/90 to-[#060912]" />
          </div>
        ) : (
          <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold/10 via-[#060912] to-[#060912]" />
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            {/* Status & Year Badge */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="px-4 py-1.5 rounded-full bg-gold/10 border border-gold/30 text-gold text-xs font-black uppercase tracking-[0.2em]">
                🏆 Édition {competition.year || new Date().getFullYear()}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border ${currentStatus.badgeClass}`}
              >
                <span>{currentStatus.icon}</span>
                <span>{currentStatus.label}</span>
              </span>
            </div>

            {/* Edition Name */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
              {competition.name}
            </h1>

            {/* Official Theme */}
            {competition.theme && (
              <p className="text-base sm:text-xl font-bold gold-text max-w-2xl mx-auto leading-relaxed">
                « {competition.theme} »
              </p>
            )}

            {/* Dates range & Heure exacte de clôture (Fuseau Kinshasa) */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs sm:text-sm text-gray-300 font-medium">
                <span>📅</span>
                <span>
                  Du <strong className="text-white">{formatKinshasaDate(competition.startDate)}</strong> au{' '}
                  <strong className="text-white">{formatKinshasaDate(competition.endDate)}</strong>
                </span>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold/10 border border-gold/30 text-xs sm:text-sm text-gold font-medium">
                <span>⏰</span>
                <span>
                  Clôture : <strong className="text-white">{formatKinshasaDateTime(competition.endDate)}</strong> (Heure de Kinshasa)
                </span>
              </div>
            </div>

            {/* Editorial Description */}
            {competition.description && (
              <p className="text-gray-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
                {competition.description}
              </p>
            )}

            {/* Action CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Link href="/voter" className="btn-primary !py-4 !px-8 text-sm font-black shadow-xl shadow-gold/20">
                🗳️ Voter Maintenant
              </Link>
              <a href="#categories" className="btn-secondary !py-4 !px-8 text-sm font-bold">
                🏷️ Voir les 16 Catégories
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 sm:space-y-24">
        {/* ==================================================== */}
        {/* SECTION B : COMPTE À REBOURS / STATUS BOARD          */}
        {/* ==================================================== */}
        <section className="max-w-4xl mx-auto">
          <div className="premium-card p-6 sm:p-10 border-gold/20 glow-gold text-center relative overflow-hidden">
            <div className="space-y-2 mb-6">
              <span className="text-xs font-bold text-gold uppercase tracking-[0.2em] block">
                {currentStatus.subtitle}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {competition.status === 'UPCOMING'
                  ? 'Compte à Rebours avant le Début des Votes'
                  : competition.status === 'ACTIVE'
                  ? 'Temps Restant pour Voter'
                  : competition.status === 'GALA'
                  ? 'Soirée de Célébration & Remise des Trophées'
                  : 'Statut de la Compétition'}
              </h2>
            </div>

            {/* Countdown Grid (rendered safely after mount to prevent hydration mismatch) */}
            {mounted && (competition.status === 'ACTIVE' || competition.status === 'UPCOMING') && !timeLeft.isTargetReached ? (
              <div className="grid grid-cols-4 gap-3 sm:gap-6 max-w-lg mx-auto">
                <div className="p-3 sm:p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                  <div className="text-2xl sm:text-4xl font-black text-gold">{timeLeft.days}</div>
                  <div className="text-[10px] sm:text-xs text-gray-400 font-semibold uppercase mt-1">Jours</div>
                </div>
                <div className="p-3 sm:p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                  <div className="text-2xl sm:text-4xl font-black text-gold">{String(timeLeft.hours).padStart(2, '0')}</div>
                  <div className="text-[10px] sm:text-xs text-gray-400 font-semibold uppercase mt-1">Heures</div>
                </div>
                <div className="p-3 sm:p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                  <div className="text-2xl sm:text-4xl font-black text-gold">{String(timeLeft.minutes).padStart(2, '0')}</div>
                  <div className="text-[10px] sm:text-xs text-gray-400 font-semibold uppercase mt-1">Minutes</div>
                </div>
                <div className="p-3 sm:p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                  <div className="text-2xl sm:text-4xl font-black text-gold">{String(timeLeft.seconds).padStart(2, '0')}</div>
                  <div className="text-[10px] sm:text-xs text-gray-400 font-semibold uppercase mt-1">Secondes</div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-sm text-gray-300 font-medium inline-block">
                {competition.status === 'CLOSED' && '🔒 Les votes pour cette édition sont officiellement clos.'}
                {competition.status === 'GALA' && '✨ Soirée de Gala en cours — Rendez-vous pour le palmarès officiel !'}
                {competition.status === 'DRAFT' && '📝 Cette édition est actuellement en cours de configuration par le comité.'}
                {(competition.status === 'ACTIVE' || competition.status === 'UPCOMING') && timeLeft.isTargetReached && (
                  '⌛ Période de transition de l\'événement en cours.'
                )}
              </div>
            )}
          </div>
        </section>

        {/* ==================================================== */}
        {/* SECTION C : CHIFFRES CLÉS DE L'ÉDITION               */}
        {/* ==================================================== */}
        <section className="space-y-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold text-gold uppercase tracking-[0.2em] block mb-1">
              Statistiques Officielles
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Les Chiffres Clés de l'Édition
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="premium-card p-6 border-white/[0.08] text-center">
              <span className="text-3xl sm:text-4xl font-black text-gold block">
                {stats.totalCategories}
              </span>
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider mt-1 block">
                Catégories Officielles
              </span>
            </div>

            <div className="premium-card p-6 border-white/[0.08] text-center">
              <span className="text-3xl sm:text-4xl font-black text-white block">
                {stats.totalArtists}
              </span>
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider mt-1 block">
                Artistes en Compétition
              </span>
            </div>

            <div className="premium-card p-6 border-white/[0.08] text-center">
              <span className="text-3xl sm:text-4xl font-black text-gold block">
                {formatPoints(stats.totalPoints)}
              </span>
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider mt-1 block">
                Points Distribués
              </span>
            </div>

            <div className="premium-card p-6 border-white/[0.08] text-center">
              <span className="text-3xl sm:text-4xl font-black text-white block">
                {stats.totalVotes > 0 ? formatPoints(stats.totalVotes) : '—'}
              </span>
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider mt-1 block">
                Votes Enregistrés
              </span>
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* SECTION D : LES 16 CATÉGORIES OFFICIELLES            */}
        {/* ==================================================== */}
        <section id="categories" className="space-y-8 scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/[0.06] pb-6">
            <div>
              <span className="text-xs font-bold text-gold uppercase tracking-[0.2em] block mb-1">
                Compétition & Trophées
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Les 16 Catégories Officielles
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm mt-1">
                Explorez chaque catégorie et découvrez les artistes nommés.
              </p>
            </div>
            <Link href="/categories" className="text-xs font-bold text-gold hover:underline flex items-center gap-1">
              <span>Voir toutes les catégories</span>
              <span>→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="premium-card p-5 border-white/[0.06] hover:border-gold/40 hover:scale-[1.01] transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">{cat.icon || '🏆'}</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/[0.04] text-gold border border-gold/20">
                      #{cat.number}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-gold transition-colors line-clamp-2">
                    {cat.name}
                  </h3>
                  {cat.description && (
                    <p className="text-[11px] text-gray-400 line-clamp-2 mt-2 leading-relaxed">
                      {cat.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between text-[11px]">
                  <span className="text-gray-400">
                    {cat.artistCount} candidat{cat.artistCount > 1 ? 's' : ''}
                  </span>
                  {cat.leader && (
                    <span className="text-gold font-semibold truncate max-w-[120px]" title={`Leader : ${cat.leader.stageName}`}>
                      👑 {cat.leader.stageName}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ==================================================== */}
        {/* SECTION E : ARTISTES & CANDIDATS EN LICE             */}
        {/* ==================================================== */}
        {artists.length > 0 && (
          <section className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/[0.06] pb-6">
              <div>
                <span className="text-xs font-bold text-gold uppercase tracking-[0.2em] block mb-1">
                  Talents & Célébration
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  Artistes en Compétition
                </h2>
                <p className="text-gray-400 text-xs sm:text-sm mt-1">
                  Les ministères et voix chrétiennes participant à cette édition.
                </p>
              </div>
              <Link href="/artistes" className="text-xs font-bold text-gold hover:underline flex items-center gap-1">
                <span>Voir tous les artistes</span>
                <span>→</span>
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {artists.map((artist) => (
                <div
                  key={artist.id}
                  className="premium-card p-4 border-white/[0.06] hover:border-gold/30 transition-all flex flex-col items-center text-center justify-between group"
                >
                  <Link
                    href={`/artistes/${artist.slug}`}
                    className="flex flex-col items-center text-center w-full group/artist"
                  >
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden relative border-2 border-gold/20 group-hover/artist:border-gold transition-colors mb-3 bg-zinc-900">
                      {artist.profileImage ? (
                        <Image
                          src={artist.profileImage}
                          alt={artist.stageName}
                          fill
                          sizes="96px"
                          className="object-cover"
                          unoptimized={artist.profileImage.includes('supabase.co')}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">🎤</div>
                      )}
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-white group-hover/artist:text-gold transition-colors truncate w-full">
                      {artist.stageName}
                    </h3>
                    <div className="text-[10px] text-gray-400 mt-1 line-clamp-1">
                      {artist.categories.map((c) => c.name).join(', ')}
                    </div>
                  </Link>

                  <div className="w-full mt-3 pt-2.5 border-t border-white/[0.04] flex flex-col gap-1.5">
                    <Link
                      href={`/voter?artist=${artist.id}`}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-gold/10 hover:bg-gold text-gold hover:text-[#060912] border border-gold/30 text-[11px] font-bold transition-all flex items-center justify-center gap-1 shadow-sm"
                    >
                      <span>🗳️</span>
                      <span>Voter</span>
                    </Link>
                    <Link
                      href={`/artistes/${artist.slug}`}
                      className="text-[10px] text-gray-400 hover:text-white transition-colors"
                    >
                      Profil complet →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ==================================================== */}
        {/* SECTION F : CLASSEMENT & PODIUM DE L'ÉDITION         */}
        {/* ==================================================== */}
        {topArtists.length > 0 && stats.totalPoints > 0 && (
          <section className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/[0.06] pb-6">
              <div>
                <span className="text-xs font-bold text-gold uppercase tracking-[0.2em] block mb-1">
                  Performances en Direct
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  Podium & Leaders de l'Édition
                </h2>
                <p className="text-gray-400 text-xs sm:text-sm mt-1">
                  Les artistes en tête du classement général des points.
                </p>
              </div>
              <Link href="/classements" className="text-xs font-bold text-gold hover:underline flex items-center gap-1">
                <span>Voir le classement complet</span>
                <span>→</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {topArtists.map((artist, idx) => (
                <div
                  key={artist.id}
                  className={`premium-card p-6 flex flex-col items-center text-center relative overflow-hidden ${
                    idx === 0 ? 'border-gold/40 glow-gold sm:-translate-y-2' : 'border-white/[0.08]'
                  }`}
                >
                  <div className="text-3xl mb-2">{getRankEmoji(idx + 1)}</div>
                  <div className="w-16 h-16 rounded-full overflow-hidden relative border-2 border-gold/30 mb-3 bg-zinc-900">
                    {artist.profileImage ? (
                      <Image
                        src={artist.profileImage}
                        alt={artist.stageName}
                        fill
                        sizes="64px"
                        className="object-cover"
                        unoptimized={artist.profileImage.includes('supabase.co')}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">🎤</div>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white truncate w-full">{artist.stageName}</h3>
                  <div className="text-base font-black text-gold mt-1">
                    {formatPoints(artist.totalPoints)} <span className="text-[10px] text-gray-400 font-normal">pts</span>
                  </div>
                  <Link
                    href={`/artistes/${artist.slug}`}
                    className="mt-4 text-[11px] font-semibold text-gray-400 hover:text-gold transition-colors"
                  >
                    Voir le profil →
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ==================================================== */}
        {/* SECTION G : COMMENT VOTER / GUIDE DE PARTICIPATION   */}
        {/* ==================================================== */}
        <section className="space-y-8">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold text-gold uppercase tracking-[0.2em] block mb-1">
              Guide de Participation
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Comment Participer au Vote ?
            </h2>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">
              Soutenez vos artistes chrétiens en 4 étapes simples et transparentes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="premium-card p-6 border-white/[0.06] flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center font-black text-lg mb-4">
                  1
                </div>
                <h3 className="text-sm font-bold text-white mb-2">Créez votre compte</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Inscrivez-vous en 30 secondes pour accéder à votre espace personnel et sécurisé.
                </p>
              </div>
            </div>

            <div className="premium-card p-6 border-white/[0.06] flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center font-black text-lg mb-4">
                  2
                </div>
                <h3 className="text-sm font-bold text-white mb-2">Achetez vos points</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Choisissez un pack de points adapté via Mobile Money (M-Pesa, Orange Money, Airtel Money).
                </p>
              </div>
            </div>

            <div className="premium-card p-6 border-white/[0.06] flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center font-black text-lg mb-4">
                  3
                </div>
                <h3 className="text-sm font-bold text-white mb-2">Choisissez la catégorie</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Sélectionnez parmi les 16 catégories officielles celle où concourt votre candidat.
                </p>
              </div>
            </div>

            <div className="premium-card p-6 border-white/[0.06] flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center font-black text-lg mb-4">
                  4
                </div>
                <h3 className="text-sm font-bold text-white mb-2">Votez pour votre artiste</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Attribuez vos points en un clic et suivez l'évolution des classements en temps réel.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center pt-4">
            <Link href="/voter" className="btn-primary !py-4 !px-10 text-sm font-black shadow-xl shadow-gold/20 inline-flex items-center gap-2">
              <span>🗳️</span>
              <span>Accéder au Module de Vote</span>
            </Link>
          </div>
        </section>

        {/* ==================================================== */}
        {/* SECTION H : PARTAGE OFFICIEL & MOBILISATION          */}
        {/* ==================================================== */}
        <section className="premium-card p-6 sm:p-8 border border-gold/30 bg-gradient-to-r from-gold/[0.05] via-[#0A0E1A] to-gold/[0.02] shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-lg">📣</span>
                <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                  Partagez la Page Officielle de l'Édition
                </h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Faites rayonner la musique gospel et mobilisez votre communauté autour de l'édition{' '}
                <strong className="text-gold">{competition.name}</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {hasNativeShare && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="flex-1 sm:flex-initial btn-primary !py-2.5 !px-4 text-xs font-black flex items-center justify-center gap-2 shadow-lg"
                >
                  <span>📲</span>
                  <span>Partager</span>
                </button>
              )}

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 text-[#25D366] text-xs font-bold transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="text-sm">💬</span>
                <span>WhatsApp</span>
              </a>

              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-[#1877F2]/15 hover:bg-[#1877F2]/25 border border-[#1877F2]/40 text-[#1877F2] text-xs font-bold transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="text-sm">📘</span>
                <span>Facebook</span>
              </a>

              <button
                type="button"
                onClick={handleCopyLink}
                className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                  copied
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/[0.04] border-white/[0.1] text-gray-200 hover:border-gold/40 hover:text-gold hover:bg-white/[0.06]'
                }`}
              >
                <span>{copied ? '✓' : '🔗'}</span>
                <span>{copied ? 'Lien copié !' : 'Copier le lien'}</span>
              </button>
            </div>
          </div>

          {copied && (
            <div className="mt-3 pt-2.5 border-t border-emerald-500/20 text-xs font-semibold text-emerald-400 flex items-center gap-2 animate-fade-in">
              <span>✓</span>
              <span>Lien officiel de l'édition copié dans le presse-papier !</span>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
