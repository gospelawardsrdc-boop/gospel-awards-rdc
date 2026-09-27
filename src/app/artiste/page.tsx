import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ArtistPerformanceChart from '@/components/artist/ArtistPerformanceChart'
import ArtistProfileEditor from '@/components/artist/ArtistProfileEditor'
import { formatPoints, formatDate, formatDateTime, getRankEmoji } from '@/lib/utils'

export default async function ArtisteDashboard() {
  const session = await auth()
  if (!session?.user) redirect('/connexion')

  const userId = (session.user as any).id
  const role = (session.user as any).role

  // Security role guards
  if (role === 'ADMIN') redirect('/admin')
  if (role === 'USER') redirect('/dashboard')

  // Fetch only authenticated artist profile
  const artist = await prisma.artist.findUnique({
    where: { userId },
    include: {
      categories: {
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              icon: true,
              description: true,
            },
          },
        },
      },
      votes: {
        select: {
          id: true,
          points: true,
          userId: true,
          categoryId: true,
          createdAt: true,
          category: {
            select: {
              name: true,
              icon: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      socialLinks: true,
      musicLinks: true,
    },
  })

  if (!artist) redirect('/dashboard')

  // Global Performance Calculations
  const totalPoints = artist.votes.reduce((sum, v) => sum + v.points, 0)
  const totalVotes = artist.votes.length
  const uniqueVoters = new Set(artist.votes.map((v) => v.userId)).size

  // Periods: Today, 7 Days, 30 Days
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000)

  const todayVotes = artist.votes.filter((v) => v.createdAt >= startOfToday)
  const todayPoints = todayVotes.reduce((sum, v) => sum + v.points, 0)

  const sevenDaysVotes = artist.votes.filter((v) => v.createdAt >= sevenDaysAgo)
  const sevenDaysPoints = sevenDaysVotes.reduce((sum, v) => sum + v.points, 0)

  const thirtyDaysVotes = artist.votes.filter((v) => v.createdAt >= thirtyDaysAgo)
  const thirtyDaysPoints = thirtyDaysVotes.reduce((sum, v) => sum + v.points, 0)

  // Calculate real rank and stats for each category the artist participates in
  const categoryIds = artist.categories.map((ac) => ac.categoryId)

  const [catArtists, catVotesGroup] = categoryIds.length > 0
    ? await Promise.all([
        prisma.artistCategory.findMany({
          where: {
            categoryId: { in: categoryIds },
            artist: { isActive: true, isApproved: true },
          },
          select: { categoryId: true, artistId: true },
        }),
        prisma.vote.groupBy({
          by: ['categoryId', 'artistId'],
          where: { categoryId: { in: categoryIds } },
          _sum: { points: true },
        }),
      ])
    : [[], []]

  const voteMapByCat = new Map<string, Map<string, number>>()
  for (const row of catVotesGroup) {
    if (!voteMapByCat.has(row.categoryId)) {
      voteMapByCat.set(row.categoryId, new Map())
    }
    voteMapByCat.get(row.categoryId)!.set(row.artistId, row._sum.points || 0)
  }

  const competitorsByCat = new Map<string, string[]>()
  for (const ca of catArtists) {
    const list = competitorsByCat.get(ca.categoryId) || []
    list.push(ca.artistId)
    competitorsByCat.set(ca.categoryId, list)
  }

  const categoryRankings = artist.categories.map((ac) => {
    const compArtistIds = competitorsByCat.get(ac.categoryId) || []
    const catPointsMap = voteMapByCat.get(ac.categoryId) || new Map<string, number>()

    const sorted = compArtistIds
      .map((artId) => ({
        artistId: artId,
        points: catPointsMap.get(artId) || 0,
      }))
      .sort((a, b) => b.points - a.points)

    const rankIndex = sorted.findIndex((item) => item.artistId === artist.id)
    const rank = rankIndex >= 0 ? rankIndex + 1 : sorted.length || 1

    const myVotesInCat = artist.votes.filter((v) => v.categoryId === ac.categoryId)
    const myPointsInCat = myVotesInCat.reduce((sum, v) => sum + v.points, 0)
    const myVoteCountInCat = myVotesInCat.length
    const myVoterCountInCat = new Set(myVotesInCat.map((v) => v.userId)).size

    return {
      categoryId: ac.category.id,
      categoryName: ac.category.name,
      categorySlug: ac.category.slug,
      categoryIcon: ac.category.icon,
      rank,
      points: myPointsInCat,
      votes: myVoteCountInCat,
      voters: myVoterCountInCat,
      totalCompetitors: compArtistIds.length || 1,
    }
  })

  const bestRank = categoryRankings.length > 0
    ? Math.min(...categoryRankings.map((c) => c.rank))
    : null

  return (
    <div className="min-h-screen bg-[#060912] flex flex-col justify-between">
      <Header user={{ name: session.user.name || '', role }} />

      <main className="pt-28 lg:pt-36 pb-24 lg:pb-20 px-4 flex-1">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* 1. Artist Welcome Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/[0.06]">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gold/10 border border-gold/30 text-gold text-xs font-bold uppercase tracking-wider mb-2.5">
                <span>🎤</span> Artiste Officiel Certifié
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Bonjour, <span className="gold-text">{artist.stageName}</span> 👋
              </h1>
              <p className="text-gray-400 text-xs sm:text-sm mt-1.5 max-w-xl">
                Bienvenue dans votre espace artiste officiel Gospel Awards RDC. Suivez vos performances en direct et gérez votre présence éditoriale.
              </p>
              <div className="flex items-center gap-3 mt-3 text-xs">
                <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-semibold">
                  ✓ Statut : Candidat Actif
                </span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-300 font-medium">
                  {artist.categories.length} catégorie{artist.categories.length > 1 ? 's' : ''} officielle{artist.categories.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/artistes/${artist.slug}`}
                className="btn-primary !text-xs !py-3 !px-5 font-black tracking-wide shadow-lg flex items-center gap-2"
                target="_blank"
              >
                <span>👀</span>
                <span>Voir mon profil public ↗</span>
              </Link>
              <Link
                href="/classements"
                className="btn-secondary !text-xs !py-3 !px-4 font-bold flex items-center gap-1.5"
              >
                <span>🏆</span>
                <span>Classements</span>
              </Link>
            </div>
          </div>

          {/* 2. Main Performance Cards (4 KPI Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Points Totaux */}
            <div className="premium-card p-6 border-2 border-gold/30 glow-gold flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gold">
                    Points Totaux
                  </span>
                  <span className="text-xl">⭐</span>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-gold">
                  {formatPoints(totalPoints)}
                </div>
                <span className="text-[11px] text-gray-400 font-semibold mt-1 block">
                  Cumul de tous les votes
                </span>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.08] text-[11px] text-emerald-400 font-medium">
                +{formatPoints(todayPoints)} pts aujourd&apos;hui
              </div>
            </div>

            {/* Votes Reçus */}
            <div className="premium-card p-6 border border-white/[0.08] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Votes Reçus
                  </span>
                  <span className="text-xl">🗳️</span>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-white">
                  {totalVotes}
                </div>
                <span className="text-[11px] text-gray-400 font-semibold mt-1 block">
                  Suffrages comptabilisés
                </span>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] text-gray-500">
                Participation du public
              </div>
            </div>

            {/* Votants Uniques */}
            <div className="premium-card p-6 border border-white/[0.08] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Votants Uniques
                  </span>
                  <span className="text-xl">👥</span>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-white">
                  {uniqueVoters}
                </div>
                <span className="text-[11px] text-gray-400 font-semibold mt-1 block">
                  Partisans distincts
                </span>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] text-gray-500">
                Audience engagée
              </div>
            </div>

            {/* Meilleure Position */}
            <div className="premium-card p-6 border border-white/[0.08] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Meilleur Rang
                  </span>
                  <span className="text-xl">🏆</span>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-white">
                  {bestRank !== null ? (
                    <span className={bestRank === 1 ? 'text-gold' : bestRank === 2 ? 'text-slate-300' : bestRank === 3 ? 'text-amber-600' : 'text-white'}>
                      {getRankEmoji(bestRank)} #{bestRank}
                    </span>
                  ) : (
                    '-'
                  )}
                </div>
                <span className="text-[11px] text-gray-400 font-semibold mt-1 block">
                  Sur l&apos;ensemble de vos catégories
                </span>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] text-gray-500">
                Position en direct
              </div>
            </div>
          </div>

          {/* 3. Performances par Catégorie */}
          <div className="premium-card p-6 sm:p-7 border border-white/[0.08] space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-gold block mb-0.5">
                  Distinctions Officielles
                </span>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <span>🏆</span> Mes Performances par Catégorie
                </h2>
              </div>
              <span className="text-xs text-gray-400 font-semibold">
                {categoryRankings.length} catégorie(s)
              </span>
            </div>

            {categoryRankings.length === 0 ? (
              <p className="text-xs text-gray-500 py-6 text-center">
                Aucune catégorie assignée pour le moment. Contactez l&apos;administration si nécessaire.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryRankings.map((cat) => (
                  <div
                    key={cat.categoryId}
                    className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-gold/30 transition-all space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-xl flex-shrink-0">
                          {cat.categoryIcon || '🏆'}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-black text-white truncate">{cat.categoryName}</h3>
                          <span className="text-[11px] text-gray-400">
                            {cat.totalCompetitors} candidat{cat.totalCompetitors > 1 ? 's' : ''} au total
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-xs px-3 py-1 rounded-full font-black flex-shrink-0 ${
                          cat.rank === 1
                            ? 'bg-amber-400 text-[#060912] shadow-md'
                            : cat.rank === 2
                            ? 'bg-slate-300 text-[#060912]'
                            : cat.rank === 3
                            ? 'bg-amber-700 text-white'
                            : 'bg-white/[0.06] text-gray-300'
                        }`}
                      >
                        {getRankEmoji(cat.rank)} Rang #{cat.rank}
                      </span>
                    </div>

                    {/* Stats Breakdown in Category */}
                    <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-black/30 border border-white/[0.04] text-center">
                      <div>
                        <span className="text-xs font-black text-gold block">{formatPoints(cat.points)}</span>
                        <span className="text-[10px] text-gray-500 uppercase">Points</span>
                      </div>
                      <div className="border-x border-white/[0.06]">
                        <span className="text-xs font-bold text-white block">{cat.votes}</span>
                        <span className="text-[10px] text-gray-500 uppercase">Votes</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-300 block">{cat.voters}</span>
                        <span className="text-[10px] text-gray-500 uppercase">Votants</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <Link
                        href={`/categories/${cat.categorySlug}`}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        Voir la catégorie →
                      </Link>
                      <Link
                        href="/classements"
                        className="text-gold hover:underline font-bold"
                      >
                        Voir le classement en direct ↗
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Évolution des Points & Périodes */}
          <div className="space-y-4">
            {/* Breakdown Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="premium-card p-4 border border-white/[0.06]">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Aujourd&apos;hui</span>
                <span className="text-lg font-black text-gold block mt-1">+{formatPoints(todayPoints)} pts</span>
                <span className="text-[10px] text-gray-500">{todayVotes.length} vote(s)</span>
              </div>
              <div className="premium-card p-4 border border-white/[0.06]">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">7 derniers jours</span>
                <span className="text-lg font-black text-gold block mt-1">+{formatPoints(sevenDaysPoints)} pts</span>
                <span className="text-[10px] text-gray-500">{sevenDaysVotes.length} vote(s)</span>
              </div>
              <div className="premium-card p-4 border border-white/[0.06]">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">30 derniers jours</span>
                <span className="text-lg font-black text-gold block mt-1">+{formatPoints(thirtyDaysPoints)} pts</span>
                <span className="text-[10px] text-gray-500">{thirtyDaysVotes.length} vote(s)</span>
              </div>
              <div className="premium-card p-4 border border-white/[0.06]">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Cumulé</span>
                <span className="text-lg font-black text-gold block mt-1">+{formatPoints(totalPoints)} pts</span>
                <span className="text-[10px] text-gray-500">{totalVotes} vote(s)</span>
              </div>
            </div>

            {/* Performance Chart */}
            <ArtistPerformanceChart
              votes={artist.votes.map((v) => ({
                points: v.points,
                createdAt: v.createdAt.toISOString(),
              }))}
            />
          </div>

          {/* 5. Profil Éditorial (Supabase Storage Images + Bio + Liens) */}
          <ArtistProfileEditor
            initialBio={artist.biography}
            initialProfileImage={artist.profileImage}
            initialCoverImage={artist.coverImage}
            socialLinks={artist.socialLinks.map((s) => ({ platform: s.platform, url: s.url }))}
            musicLinks={artist.musicLinks.map((m) => ({ platform: m.platform, url: m.url }))}
          />

          {/* 6. Activité Récente (Derniers Votes Reçus) */}
          <div className="premium-card p-6 sm:p-7 border border-white/[0.08]">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <h2 className="text-sm font-black uppercase tracking-wider text-white">
                  Activité Récente — Derniers Votes Reçus
                </h2>
              </div>
              <span className="text-xs text-gray-500">
                {artist.votes.length} vote(s) au total
              </span>
            </div>

            {artist.votes.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-xs">
                Aucun vote enregistré pour le moment. Partagez votre profil auprès de votre communauté pour recueillir vos premiers suffrages !
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {artist.votes.slice(0, 15).map((vote) => (
                  <div
                    key={vote.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-gold/20 transition-all text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base">{vote.category.icon || '🏆'}</span>
                      <div className="min-w-0">
                        <span className="text-gray-300 font-bold block truncate">
                          Vote dans « {vote.category.name} »
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {formatDateTime(vote.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-gold font-black text-xs sm:text-sm">
                        +{vote.points} point{vote.points > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
