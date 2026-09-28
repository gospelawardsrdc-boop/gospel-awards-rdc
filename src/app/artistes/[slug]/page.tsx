import { unstable_cache } from 'next/cache'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ArtistPerformanceChart from '@/components/artist/ArtistPerformanceChart'
import ArtistShareButtons from '@/components/artist/ArtistShareButtons'
import StickyVoteButton from '@/components/artist/StickyVoteButton'
import { formatPoints, getRankEmoji } from '@/lib/utils'

interface Props {
  params: Promise<{ slug: string }>
}

const getPublicArtistProfile = unstable_cache(
  async (slug: string) => {
    // 1. Récupération de l'édition active (avec isolation stricte)
    const competition = await prisma.competition.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        year: true,
        status: true,
        startDate: true,
        endDate: true,
        isActive: true,
      },
    })

    // 2. Récupération de l'artiste avec ses relations et filtrage des votes sur l'édition active
    const artist = await prisma.artist.findUnique({
      where: { slug },
      include: {
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                icon: true,
              },
            },
          },
        },
        socialLinks: true,
        musicLinks: true,
        videoLinks: true,
        ...(competition
          ? {
              votes: {
                where: { competitionId: competition.id },
                select: {
                  id: true,
                  points: true,
                  userId: true,
                  createdAt: true,
                },
              },
            }
          : {
              votes: {
                where: { id: 'no-votes-placeholder' },
                select: {
                  id: true,
                  points: true,
                  userId: true,
                  createdAt: true,
                },
              },
            }),
      },
    })

    if (!artist || !artist.isActive || !artist.isApproved) return null

    const totalPoints = artist.votes.reduce((sum, v) => sum + v.points, 0)
    const totalVotes = artist.votes.length
    const uniqueVoters = new Set(artist.votes.map((v) => v.userId)).size

    // 3. Calcul du classement en temps réel par catégorie strictement filtré sur l'édition active
    const categoryRanks = await Promise.all(
      artist.categories.map(async (ac) => {
        const [catCompetitors, rankings] = await Promise.all([
          prisma.artistCategory.count({
            where: {
              categoryId: ac.categoryId,
              artist: { isActive: true, isApproved: true },
            },
          }),
          competition
            ? prisma.vote.groupBy({
                by: ['artistId'],
                where: {
                  categoryId: ac.categoryId,
                  competitionId: competition.id,
                },
                _sum: { points: true },
                orderBy: { _sum: { points: 'desc' } },
              })
            : Promise.resolve([]),
        ])

        const rankIndex = rankings.findIndex((r) => r.artistId === artist.id)
        const rank = rankIndex >= 0 ? rankIndex + 1 : (rankings.length > 0 ? rankings.length + 1 : 1)

        return {
          category: ac.category,
          rank: rank || 1,
          totalCompetitors: Math.max(catCompetitors, rankings.length, 1),
        }
      })
    )

    // 4. Détermination de l'état de vote
    const now = new Date()
    let votingState: {
      canVote: boolean
      buttonLabel: string
      statusMessage: string
      subMessage: string
      status: string
    }

    if (!competition) {
      votingState = {
        canVote: false,
        buttonLabel: 'Aucune édition de vote disponible',
        statusMessage: 'Aucune édition de vote disponible',
        subMessage: 'Aucune compétition n\'est actuellement ouverte aux votes.',
        status: 'NONE',
      }
    } else if (competition.status === 'DRAFT') {
      votingState = {
        canVote: false,
        buttonLabel: 'Votes non ouverts',
        statusMessage: 'Votes non ouverts',
        subMessage: 'Cette édition est en cours de préparation.',
        status: 'DRAFT',
      }
    } else if (competition.status === 'UPCOMING' || now < competition.startDate) {
      votingState = {
        canVote: false,
        buttonLabel: 'Votes bientôt ouverts',
        statusMessage: 'Votes bientôt ouverts',
        subMessage: 'L\'ouverture des votes est prévue prochainement.',
        status: 'UPCOMING',
      }
    } else if (competition.status === 'CLOSED' || now > competition.endDate) {
      votingState = {
        canVote: false,
        buttonLabel: 'Période de vote clôturée',
        statusMessage: 'Période de vote clôturée',
        subMessage: 'Les votes pour cette édition sont officiellement terminés.',
        status: 'CLOSED',
      }
    } else if (competition.status === 'GALA') {
      votingState = {
        canVote: false,
        buttonLabel: 'Cérémonie en cours',
        statusMessage: 'Cérémonie en cours',
        subMessage: 'La cérémonie de remise des prix est en cours.',
        status: 'GALA',
      }
    } else if (
      competition.status === 'ACTIVE' &&
      competition.isActive &&
      now >= competition.startDate &&
      now <= competition.endDate
    ) {
      votingState = {
        canVote: true,
        buttonLabel: 'VOTER POUR CET ARTISTE',
        statusMessage: 'Voter pour cet artiste',
        subMessage: 'Soutenez son parcours vers la victoire 🏆',
        status: 'ACTIVE',
      }
    } else {
      votingState = {
        canVote: false,
        buttonLabel: 'Votes non disponibles',
        statusMessage: 'Votes non disponibles',
        subMessage: 'Les votes ne sont pas ouverts actuellement.',
        status: competition.status || 'INACTIVE',
      }
    }

    return {
      artist,
      competition: competition
        ? {
            id: competition.id,
            name: competition.name,
            year: competition.year,
            status: competition.status,
          }
        : null,
      totalPoints,
      totalVotes,
      uniqueVoters,
      categoryRanks,
      votingState,
    }
  },
  ['public-artist-profile-v2'],
  { revalidate: 30, tags: ['artists', 'votes', 'edition', 'competition'] }
)

export default async function ArtistPage({ params }: Props) {
  const { slug } = await params
  const [session, profileData] = await Promise.all([
    auth(),
    getPublicArtistProfile(slug),
  ])

  if (!profileData) notFound()

  const { artist, competition, totalPoints, totalVotes, uniqueVoters, categoryRanks, votingState } = profileData
  const user = session?.user ? { name: session.user.name!, role: (session.user as any).role } : null

  const socialIcons: Record<string, { icon: string; label: string; bgClass: string }> = {
    facebook: { icon: '📘', label: 'Facebook', bgClass: 'hover:border-blue-500/40 hover:text-blue-400' },
    instagram: { icon: '📸', label: 'Instagram', bgClass: 'hover:border-pink-500/40 hover:text-pink-400' },
    tiktok: { icon: '🎵', label: 'TikTok', bgClass: 'hover:border-cyan-500/40 hover:text-cyan-300' },
    youtube: { icon: '📺', label: 'YouTube', bgClass: 'hover:border-red-500/40 hover:text-red-400' },
    twitter: { icon: '🐦', label: 'X (Twitter)', bgClass: 'hover:border-sky-500/40 hover:text-sky-400' },
  }

  const clips = artist.videoLinks.filter((v) => !v.isExcerpt)
  const excerpts = artist.videoLinks.filter((v) => v.isExcerpt)

  const currentUserId = (session?.user as any)?.id
  const isSelf = Boolean(currentUserId && currentUserId === artist.userId)

  const editionName = competition?.name || 'Gospel Awards RDC'
  const editionYear = competition?.year || new Date().getFullYear()

  return (
    <div className="min-h-screen bg-[#060912] text-white selection:bg-gold/20 selection:text-gold flex flex-col justify-between">
      <Header user={user} />

      <div className="flex-1">
        {/* ===== HERO / COVER BANNER ===== */}
        <section className="relative w-full h-64 sm:h-80 md:h-96 lg:h-[420px] overflow-hidden bg-[#0A0E1A]">
          {artist.coverImage ? (
            <Image
              src={artist.coverImage}
              alt={`Couverture officielle de ${artist.stageName}`}
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
              unoptimized={artist.coverImage.includes('supabase.co')}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#0c1222] via-[#11192e] to-[#070b14] relative flex items-center justify-center">
              {/* Pattern décoratif subtil pour les artistes sans image de couverture */}
              <div className="absolute inset-0 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />
              <div className="text-center px-4 relative z-10">
                <span className="text-5xl sm:text-6xl opacity-20 block mb-2">🎤</span>
                <span className="text-xs uppercase tracking-[0.3em] text-gold/40 font-bold">
                  {editionName}
                </span>
              </div>
            </div>
          )}

          {/* Dégradés cinématiques pour contraste et lisibilité */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#060912] via-[#060912]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#060912]/80 via-transparent to-[#060912]/40" />

          {/* Badge Top Header */}
          <div className="absolute top-20 sm:top-24 left-4 sm:left-8 z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-semibold text-gray-300">
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
              <span className="tracking-wider uppercase text-gold">Profil Officiel Nommé</span>
              {competition && (
                <>
                  <span className="text-gray-500">•</span>
                  <span>{competition.name}</span>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ===== CONTENU PRINCIPAL DE LA FICHE ARTISTE ===== */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 sm:-mt-28 md:-mt-32 relative z-20 pb-20 space-y-8">
          
          {/* CARTE D'IDENTITÉ PRINCIPALE DE L'ARTISTE */}
          <div className="premium-card p-6 sm:p-8 md:p-10 border-gold/20 shadow-2xl bg-[#0A0E1A]/95 backdrop-blur-xl">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
              
              {/* Photo de profil de l'artiste */}
              <div className="relative group flex-shrink-0">
                <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44 rounded-3xl overflow-hidden bg-surface border-2 border-gold/40 shadow-2xl ring-4 ring-[#060912] flex items-center justify-center relative">
                  {artist.profileImage ? (
                    <Image
                      src={artist.profileImage}
                      alt={artist.stageName}
                      fill
                      sizes="(max-width: 640px) 128px, (max-width: 768px) 160px, 176px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      unoptimized={artist.profileImage.includes('supabase.co')}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-surface-light text-gray-400">
                      <span className="text-5xl sm:text-6xl mb-1">🎤</span>
                      <span className="text-[10px] uppercase font-bold text-gray-500">Candidat</span>
                    </div>
                  )}
                </div>
                {/* Badge statut vérifié */}
                <div
                  title="Candidat officiel validé"
                  className="absolute -bottom-2 -right-2 bg-[#060912] p-1 rounded-2xl border border-gold/40 shadow-lg z-10"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gold flex items-center justify-center text-[#0A0E1A] font-black text-sm sm:text-base">
                    ✓
                  </div>
                </div>
              </div>

              {/* Informations textuelles & Catégories */}
              <div className="flex-1 text-center md:text-left space-y-3 min-w-0">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                  <span className="text-xs uppercase font-bold tracking-[0.2em] text-gold/90 bg-gold/[0.08] px-3 py-1 rounded-full border border-gold/20">
                    Artiste Officiel Gospel Awards
                  </span>
                  <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full font-semibold">
                    ✓ Candidature Validée
                  </span>
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                  {artist.stageName}
                </h1>

                {/* Catégories assignées */}
                <div className="pt-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
                    En lice dans les catégories officielles :
                  </span>
                  <div className="flex flex-wrap justify-center md:justify-start gap-2">
                    {artist.categories.map((ac) => (
                      <Link
                        key={ac.category.id}
                        href={`/categories/${ac.category.slug}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/[0.04] hover:bg-gold/[0.12] border border-white/[0.08] hover:border-gold/30 text-gray-200 hover:text-gold px-3.5 py-1.5 rounded-xl transition-all"
                      >
                        <span>{ac.category.icon || '🏆'}</span>
                        <span>{ac.category.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* BOUTON D'ACTION DE VOTE (CTA PRINCIPAL) */}
              <div className="w-full md:w-auto flex flex-col items-center md:items-end justify-center pt-2 md:pt-0">
                {isSelf ? (
                  <div className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-gold/[0.08] border border-gold/30 text-gold text-xs sm:text-sm font-bold flex flex-col items-center text-center gap-1">
                    <span className="flex items-center gap-1.5">
                      <span>👤</span>
                      <span>Votre Profil Officiel d&apos;Artiste</span>
                    </span>
                    <span className="text-[11px] text-gray-400 font-normal">
                      Auto-vote restreint conformément au règlement officiel.
                    </span>
                  </div>
                ) : votingState.canVote ? (
                  <div id="main-vote-cta" className="w-full sm:w-auto flex flex-col items-center gap-2">
                    <Link
                      href={`/voter?artist=${artist.id}`}
                      prefetch={true}
                      className="w-full sm:w-auto btn-primary text-sm sm:text-base !py-4 !px-8 sm:!px-10 font-black tracking-wide shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all text-center flex items-center justify-center gap-3 gold-gradient text-[#0A0E1A]"
                    >
                      <span className="text-lg">⭐</span>
                      <span>{votingState.buttonLabel}</span>
                    </Link>
                    <span className="text-[11px] text-gray-400 text-center">
                      {votingState.subMessage}
                    </span>
                  </div>
                ) : (
                  <div id="main-vote-cta" className="w-full sm:w-auto flex flex-col items-center gap-2">
                    <div className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.1] text-gray-300 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                      <span>🔒</span>
                      <span>{votingState.buttonLabel}</span>
                    </div>
                    <span className="text-[11px] text-gray-400 text-center">
                      {votingState.subMessage}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CAMPAGNE OFFICIELLE & PARTAGE SOCIAL */}
          <ArtistShareButtons
            artistName={artist.stageName}
            artistSlug={artist.slug}
            competitionName={editionName}
            competitionYear={editionYear}
          />

          {/* BARRE DE STATISTIQUES & IMPACT DES VOTES */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="premium-card p-6 border-gold/25 glow-gold relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gold/90">
                  Points Accumulés
                </span>
                <span className="text-xl">⭐</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-gold">
                {formatPoints(totalPoints)}
              </div>
              <p className="text-[11px] text-gray-400 mt-2 border-t border-white/[0.04] pt-2">
                Total des points attribués par les partisans
              </p>
            </div>

            <div className="premium-card p-6 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
                  Votes Reçus
                </span>
                <span className="text-xl">🗳️</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white">
                {formatPoints(totalVotes)}
              </div>
              <p className="text-[11px] text-gray-400 mt-2 border-t border-white/[0.04] pt-2">
                Nombre de suffrages officiellement enregistrés
              </p>
            </div>

            <div className="premium-card p-6 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
                  Partisans Votants
                </span>
                <span className="text-xl">👥</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white">
                {formatPoints(uniqueVoters)}
              </div>
              <p className="text-[11px] text-gray-400 mt-2 border-t border-white/[0.04] pt-2">
                Communauté d&apos;utilisateurs uniques engagés
              </p>
            </div>
          </div>

          {/* CLASSEMENTS EN DIRECT PAR CATÉGORIE */}
          {categoryRanks.length > 0 && (
            <div className="premium-card p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/[0.06]">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                    <span>🏆</span>
                    <span>Positions Officielles dans le Concours</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Classements calculés en temps réel d&apos;après les votes certifiés.
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full self-start sm:self-auto">
                  ● En direct
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryRanks.map(({ category, rank, totalCompetitors }) => (
                  <div
                    key={category.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                      rank === 1
                        ? 'bg-amber-500/[0.06] border-amber-500/30 glow-gold'
                        : rank === 2
                        ? 'bg-slate-300/[0.04] border-slate-300/30'
                        : rank === 3
                        ? 'bg-amber-700/[0.04] border-amber-700/30'
                        : 'bg-white/[0.02] border-white/[0.06] hover:border-gold/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-3xl p-2 rounded-xl bg-surface border border-white/[0.06] flex-shrink-0">
                          {category.icon || '🏆'}
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-bold text-white text-sm sm:text-base leading-tight truncate">
                            {category.name}
                          </h3>
                          <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">
                            {totalCompetitors} artiste{totalCompetitors > 1 ? 's' : ''} en compétition
                          </p>
                        </div>
                      </div>

                      {/* Badge du rang */}
                      <div className="flex-shrink-0 text-right">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-black px-3 py-1 rounded-full ${
                            rank === 1
                              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                              : rank === 2
                              ? 'bg-slate-300/20 text-slate-200 border border-slate-300/40'
                              : rank === 3
                              ? 'bg-amber-700/20 text-amber-500 border border-amber-700/40'
                              : 'bg-white/[0.05] text-gray-300 border border-white/10'
                          }`}
                        >
                          <span>{rank > 0 ? getRankEmoji(rank) : '—'}</span>
                          <span>{rank > 0 ? `Rang #${rank}` : 'Non classé'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Actions de vote direct par catégorie */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.04] gap-2">
                      <Link
                        href={`/categories/${category.slug}`}
                        className="text-xs text-gray-400 hover:text-gold transition-colors font-medium"
                      >
                        Voir tout le classement →
                      </Link>

                      {!isSelf && votingState.canVote && (
                        <Link
                          href={`/voter?artist=${artist.id}&category=${category.id}`}
                          className="btn-secondary !text-xs !py-1.5 !px-3.5 font-bold hover:border-gold/40 text-gold flex items-center gap-1.5"
                        >
                          <span>⭐</span>
                          <span>Voter ici</span>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GRAPHIQUE D'ÉVOLUTION DES VOTES */}
          <ArtistPerformanceChart
            votes={artist.votes.map((v) => ({
              points: v.points,
              createdAt: typeof v.createdAt === 'string' ? v.createdAt : new Date(v.createdAt).toISOString(),
            }))}
          />

          {/* BIOGRAPHIE & PARCOURS */}
          {artist.biography && (
            <div className="premium-card p-6 sm:p-8 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5 pb-3 border-b border-white/[0.06]">
                <span>📖</span>
                <span>Parcours & Biographie</span>
              </h2>
              <div className="prose prose-invert max-w-none">
                <p className="text-gray-300 leading-relaxed text-sm sm:text-base whitespace-pre-line">
                  {artist.biography}
                </p>
              </div>
            </div>
          )}

          {/* MUSIQUES & DISCOGRAPHIE */}
          {artist.musicLinks.length > 0 && (
            <div className="premium-card p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                    <span>🎵</span>
                    <span>Musiques & Titres Officiels</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Découvrez les productions et écoutes proposées par l&apos;artiste.
                  </p>
                </div>
                {artist.musicLinks[0]?.url && (
                  <a
                    href={artist.musicLinks[0].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary !text-xs !py-2 !px-4 self-start sm:self-auto"
                  >
                    🎧 Écouter sur les plateformes
                  </a>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {artist.musicLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 rounded-2xl bg-surface/50 hover:bg-surface-light border border-white/[0.06] hover:border-gold/30 transition-all flex items-center gap-3.5 group"
                  >
                    <div className="w-11 h-11 rounded-xl bg-gold/[0.1] border border-gold/20 flex items-center justify-center text-xl group-hover:scale-110 transition-transform flex-shrink-0">
                      🎶
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-white group-hover:text-gold transition-colors truncate">
                        {link.title || 'Titre musical'}
                      </h4>
                      <p className="text-[11px] text-gray-400 capitalize truncate mt-0.5">
                        Plateforme : {link.platform}
                      </p>
                    </div>
                    <span className="text-gray-500 group-hover:text-gold text-xs font-bold">↗</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* CLIPS & VIDÉOS OFFICIELLES */}
          {clips.length > 0 && (
            <div className="premium-card p-6 sm:p-8 space-y-6">
              <div className="pb-3 border-b border-white/[0.06]">
                <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                  <span>🎬</span>
                  <span>Clips & Vidéos Officielles</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Vidéoclips officiels présentés pour les Gospel Awards RDC.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {clips.map((clip) => (
                  <a
                    key={clip.id}
                    href={clip.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 rounded-2xl bg-surface/50 hover:bg-surface-light border border-white/[0.06] hover:border-gold/30 transition-all flex items-center gap-4 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform flex-shrink-0">
                      📺
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-white group-hover:text-gold transition-colors truncate">
                        {clip.title || 'Regarder le clip officiel'}
                      </h4>
                      <p className="text-xs text-gray-400 capitalize mt-0.5">
                        {clip.platform} • Vidéo officielle
                      </p>
                    </div>
                    <span className="btn-secondary !text-xs !py-1.5 !px-3 font-semibold group-hover:border-gold/40">
                      Lire ↗
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* EXTRAITS MUSICAUX */}
          {excerpts.length > 0 && (
            <div className="premium-card p-6 sm:p-8 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5 pb-3 border-b border-white/[0.06]">
                <span>🎧</span>
                <span>Extraits & Démonstrations</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {excerpts.map((excerpt) => (
                  <a
                    key={excerpt.id}
                    href={excerpt.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3.5 rounded-xl bg-surface/40 hover:bg-surface-light border border-white/[0.04] hover:border-gold/20 transition-all flex items-center gap-3"
                  >
                    <span className="text-xl">🎧</span>
                    <span className="text-xs text-gray-300 font-medium truncate flex-1">
                      {excerpt.title || 'Écouter l\'extrait'}
                    </span>
                    <span className="text-xs text-gold">↗</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* RÉSEAUX SOCIAUX ET CANAUX OFFICIELS */}
          {artist.socialLinks.length > 0 && (
            <div className="premium-card p-6 sm:p-8 space-y-4">
              <div className="pb-3 border-b border-white/[0.06]">
                <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                  <span>📱</span>
                  <span>Réseaux Sociaux & Canaux Officiels</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Suivez les actualités et soutenez la communauté officielle de {artist.stageName}.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                {artist.socialLinks.map((link) => {
                  const info = socialIcons[link.platform.toLowerCase()] || {
                    icon: '🔗',
                    label: link.platform,
                    bgClass: 'hover:border-gold/40 hover:text-gold',
                  }
                  return (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-surface/60 border border-white/[0.06] text-xs font-semibold text-gray-200 transition-all group ${info.bgClass}`}
                    >
                      <span className="text-base group-hover:scale-110 transition-transform">{info.icon}</span>
                      <span className="capitalize">{info.label}</span>
                      <span className="text-[10px] text-gray-500 group-hover:text-white">↗</span>
                    </a>
                  )
                })}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* BOUTON STICKY MOBILE DÉCLENCHÉ PAR INTERSECTION OBSERVER */}
      <StickyVoteButton
        artistId={artist.id}
        artistName={artist.stageName}
        isSelf={isSelf}
        canVote={votingState.canVote}
        editionName={editionName}
        targetElementId="main-vote-cta"
      />

      <Footer />
    </div>
  )
}
