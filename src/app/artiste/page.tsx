import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'
import ArtistPerformanceChart from '@/components/artist/ArtistPerformanceChart'
import ArtistProfileEditor from '@/components/artist/ArtistProfileEditor'
import { formatPoints, formatDate } from '@/lib/utils'

const artistMenuItems = [
  { label: 'Tableau de Bord', href: '/artiste', icon: '📊' },
  { label: 'Catégories', href: '/categories', icon: '🏷️' },
  { label: 'Classements', href: '/classements', icon: '📈' },
  { label: 'Voter', href: '/voter', icon: '⭐' },
]

export default async function ArtisteDashboard() {
  const session = await auth()
  if (!session?.user) redirect('/connexion')

  const userId = (session.user as any).id
  const role = (session.user as any).role
  if (role !== 'ARTIST' && role !== 'ADMIN') redirect('/dashboard')

  const artist = await prisma.artist.findUnique({
    where: { userId },
    include: {
      categories: { include: { category: true } },
      votes: {
        select: {
          id: true,
          points: true,
          userId: true,
          categoryId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      socialLinks: true,
      musicLinks: true,
    },
  })

  if (!artist) redirect('/dashboard')

  const totalPoints = artist.votes.reduce((sum, v) => sum + v.points, 0)
  const totalVotes = artist.votes.length
  const uniqueVoters = new Set(artist.votes.map((v) => v.userId)).size

  // Périodes : Aujourd'hui, 7 jours, 30 jours
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

  // Calcul du classement dynamique dans chaque catégorie participante
  const categoryRankings = await Promise.all(
    artist.categories.map(async (ac) => {
      const catArtists = await prisma.artistCategory.findMany({
        where: { categoryId: ac.categoryId, artist: { isActive: true, isApproved: true } },
        include: {
          artist: {
            include: {
              votes: {
                where: { categoryId: ac.categoryId },
                select: { points: true },
              },
            },
          },
        },
      })

      const sorted = catArtists
        .map((ca) => ({
          artistId: ca.artistId,
          points: ca.artist.votes.reduce((sum, v) => sum + v.points, 0),
        }))
        .sort((a, b) => b.points - a.points)

      const rankIndex = sorted.findIndex((item) => item.artistId === artist.id)
      const rank = rankIndex >= 0 ? rankIndex + 1 : 1
      const pointsInCat = sorted.find((item) => item.artistId === artist.id)?.points || 0

      return {
        categoryId: ac.category.id,
        categoryName: ac.category.name,
        categorySlug: ac.category.slug,
        categoryIcon: ac.category.icon,
        rank,
        points: pointsInCat,
        totalCompetitors: sorted.length,
      }
    })
  )

  return (
    <div className="min-h-screen bg-[#060912] flex">
      <Sidebar items={artistMenuItems} title="Espace Artiste" />

      <main className="flex-1 lg:ml-0 pt-8 pb-20 px-4 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
            <div>
              <span className="text-xs font-semibold text-gold uppercase tracking-[0.2em] mb-1 block">
                Dashboard Artiste Officiel
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Bienvenue, <span className="gold-text">{artist.stageName}</span>
              </h1>
              <div className="flex items-center gap-2 mt-1 text-xs">
                <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-medium">
                  ✓ Candidat Officiel Validé
                </span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-400">{artist.categories.length} catégorie(s) assignée(s)</span>
              </div>
            </div>
            <Link
              href={`/artistes/${artist.slug}`}
              className="btn-secondary !text-xs !py-2.5 !px-5"
            >
              Voir mon profil public →
            </Link>
          </div>

          {/* Stats Cards (No financial information - strictly votes & points) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="premium-card p-5 border-gold/20 glow-gold">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Points Totaux</div>
              <div className="text-2xl sm:text-3xl font-black text-gold">{formatPoints(totalPoints)}</div>
              <div className="text-[10px] text-gray-500 mt-1">Cumul de tous les votes</div>
            </div>
            <div className="premium-card p-5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Votes Reçus</div>
              <div className="text-2xl sm:text-3xl font-black text-white">{totalVotes}</div>
              <div className="text-[10px] text-gray-500 mt-1">Suffrages comptabilisés</div>
            </div>
            <div className="premium-card p-5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Votants Uniques</div>
              <div className="text-2xl sm:text-3xl font-black text-white">{uniqueVoters}</div>
              <div className="text-[10px] text-gray-500 mt-1">Partisans distincts</div>
            </div>
            <div className="premium-card p-5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Points Aujourd&apos;hui</div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">+{formatPoints(todayPoints)}</div>
              <div className="text-[10px] text-gray-500 mt-1">Activité des dernières 24h</div>
            </div>
          </div>

          {/* Performance par Période */}
          <div className="premium-card p-6">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              ⏱️ <span>Performance par Période</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] uppercase font-bold text-gray-500 block">Aujourd&apos;hui</span>
                <span className="text-lg font-black text-gold block mt-1">+{formatPoints(todayPoints)} pts</span>
                <span className="text-[10px] text-gray-400">{todayVotes.length} vote(s)</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] uppercase font-bold text-gray-500 block">7 derniers jours</span>
                <span className="text-lg font-black text-gold block mt-1">+{formatPoints(sevenDaysPoints)} pts</span>
                <span className="text-[10px] text-gray-400">{sevenDaysVotes.length} vote(s)</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] uppercase font-bold text-gray-500 block">30 derniers jours</span>
                <span className="text-lg font-black text-gold block mt-1">+{formatPoints(thirtyDaysPoints)} pts</span>
                <span className="text-[10px] text-gray-400">{thirtyDaysVotes.length} vote(s)</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] uppercase font-bold text-gray-500 block">Total Global</span>
                <span className="text-lg font-black text-gold block mt-1">+{formatPoints(totalPoints)} pts</span>
                <span className="text-[10px] text-gray-400">{totalVotes} vote(s)</span>
              </div>
            </div>
          </div>

          {/* Performance Chart */}
          <ArtistPerformanceChart
            votes={artist.votes.map((v) => ({
              points: v.points,
              createdAt: v.createdAt.toISOString(),
            }))}
          />

          {/* Catégories & Classements en direct */}
          <div className="premium-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                🏆 <span>Classements & Catégories Officielles</span>
              </h2>
              <span className="text-[11px] text-gray-400">Position en direct</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categoryRankings.map((cat) => (
                <div
                  key={cat.categoryId}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-gold/20 transition-all"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{cat.categoryIcon || '🏆'}</span>
                      <h4 className="text-xs font-bold text-white truncate">{cat.categoryName}</h4>
                    </div>
                    <div className="text-[11px] text-gold font-semibold mt-1">
                      {formatPoints(cat.points)} points accumulés
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-black ${
                        cat.rank === 1
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                          : cat.rank === 2
                          ? 'bg-slate-300/20 text-slate-200 border border-slate-300/40'
                          : cat.rank === 3
                          ? 'bg-amber-700/20 text-amber-500 border border-amber-700/40'
                          : 'bg-white/[0.05] text-gray-400'
                      }`}
                    >
                      Rang #{cat.rank}
                    </span>
                    <Link
                      href={`/categories/${cat.categorySlug}`}
                      className="text-[10px] text-gray-500 hover:text-gold transition-colors mt-1"
                    >
                      Classement complet →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Éditeur de Profil Éditorial */}
          <ArtistProfileEditor
            initialBio={artist.biography}
            initialProfileImage={artist.profileImage}
            initialCoverImage={artist.coverImage}
            socialLinks={artist.socialLinks.map((s) => ({ platform: s.platform, url: s.url }))}
            musicLinks={artist.musicLinks.map((m) => ({ platform: m.platform, url: m.url }))}
          />

          {/* Derniers Votes */}
          <div className="premium-card p-6">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              📋 <span>Derniers Votes Reçus</span>
            </h2>
            {artist.votes.length === 0 ? (
              <p className="text-gray-500 text-xs py-4">Aucun vote enregistré pour le moment.</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {artist.votes.slice(0, 15).map((vote) => (
                  <div key={vote.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-xs text-gray-400">
                      {formatDate(vote.createdAt)}
                    </span>
                    <span className="text-gold font-black text-xs">+{vote.points} points</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
