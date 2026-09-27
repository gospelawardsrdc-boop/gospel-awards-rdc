import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { formatPoints, formatDate, formatDateTime } from '@/lib/utils'
import { signOut } from '@/lib/auth'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/connexion')

  const userId = (session.user as any).id
  const role = (session.user as any).role

  // Security role guards
  if (role === 'ADMIN') redirect('/admin')
  if (role === 'ARTIST') redirect('/artiste')

  // Fetch only authenticated user's data in parallel
  const [user, recentVotes, userVoteStats, userCategoryVotes] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        pointBalance: true,
        name: true,
        email: true,
        createdAt: true,
      },
    }),
    prisma.vote.findMany({
      where: { userId },
      select: {
        id: true,
        points: true,
        createdAt: true,
        artist: {
          select: {
            id: true,
            stageName: true,
            slug: true,
            profileImage: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.vote.aggregate({
      where: { userId },
      _sum: { points: true },
      _count: { _all: true },
    }),
    prisma.vote.groupBy({
      by: ['categoryId'],
      where: { userId },
      _sum: { points: true },
      _count: { _all: true },
    }),
  ])

  const categoryIds = userCategoryVotes.map((c) => c.categoryId)
  const categoriesList = categoryIds.length > 0
    ? await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true, slug: true, icon: true },
      })
    : []

  const catMap = new Map(categoriesList.map((c) => [c.id, c]))
  const supportedCategories = userCategoryVotes
    .map((c) => ({
      category: catMap.get(c.categoryId) || { id: c.categoryId, name: '', slug: '', icon: null },
      voteCount: c._count._all,
      pointsSpent: c._sum.points || 0,
    }))
    .sort((a, b) => b.pointsSpent - a.pointsSpent)

  const totalVotesCount = userVoteStats._count._all
  const totalPointsSpent = userVoteStats._sum.points || 0
  const lastVoteDate = recentVotes[0]?.createdAt || null

  const displayName = user?.name?.trim() || 'Votant'

  return (
    <div className="min-h-screen bg-[#060912] flex flex-col justify-between">
      <Header user={{ name: session.user.name || '', role }} />

      <main className="pt-28 lg:pt-36 pb-24 lg:pb-20 px-4 flex-1">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* 1. Welcome Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/[0.06]">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/30 text-gold text-xs font-bold uppercase tracking-wider mb-2">
                <span>👤</span> Espace Personnel · Votant
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Bonjour, <span className="gold-text">{displayName}</span> 👋
              </h1>
              <p className="text-gray-400 text-xs sm:text-sm mt-1.5 max-w-xl">
                Suivez vos votes, votre solde de points et votre activité sur Gospel Awards RDC.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/voter"
                className="btn-primary !text-xs !py-3 !px-5 font-black tracking-wide shadow-lg flex items-center gap-2"
              >
                <span>⭐</span>
                <span>Voter / Recharger</span>
              </Link>
              <form
                action={async () => {
                  'use server'
                  await signOut({ redirectTo: '/connexion' })
                }}
              >
                <button
                  type="submit"
                  className="text-xs text-gray-400 hover:text-rose-400 transition-colors px-3.5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] font-semibold flex items-center gap-1.5"
                >
                  <span>🚪</span>
                  <span>Déconnexion</span>
                </button>
              </form>
            </div>
          </div>

          {/* 2 & 3. Personal Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Solde Actuel Card (Highlighted) */}
            <div className="premium-card p-6 border-2 border-gold/30 glow-gold flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gold">
                    Mon Solde
                  </span>
                  <span className="text-xl">💳</span>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-gold">
                  {formatPoints(user?.pointBalance || 0)}
                </div>
                <span className="text-[11px] text-gray-400 font-semibold mt-1 block">
                  Points disponibles
                </span>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between">
                <span className="text-[11px] text-gray-400">Besoin de points ?</span>
                <Link href="/voter" className="text-xs text-gold font-bold hover:underline">
                  Recharger mes points →
                </Link>
              </div>
            </div>

            {/* Votes Exprimés */}
            <div className="premium-card p-6 border border-white/[0.08] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Votes Exprimés
                  </span>
                  <span className="text-xl">🗳️</span>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-white">
                  {totalVotesCount}
                </div>
                <span className="text-[11px] text-gray-400 font-semibold mt-1 block">
                  Suffrages validés
                </span>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] text-gray-500">
                Participation active
              </div>
            </div>

            {/* Points Dépensés */}
            <div className="premium-card p-6 border border-white/[0.08] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Points Dépensés
                  </span>
                  <span className="text-xl">⭐</span>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-white">
                  {formatPoints(totalPointsSpent)}
                </div>
                <span className="text-[11px] text-gray-400 font-semibold mt-1 block">
                  Points alloués aux artistes
                </span>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] text-gray-500">
                Total soutien cumulé
              </div>
            </div>

            {/* Catégories Votées */}
            <div className="premium-card p-6 border border-white/[0.08] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Catégories Soutenues
                  </span>
                  <span className="text-xl">📂</span>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-white">
                  {supportedCategories.length}
                </div>
                <span className="text-[11px] text-gray-400 font-semibold mt-1 block">
                  Distinctions différentes
                </span>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] text-gray-500">
                Diversité de vos votes
              </div>
            </div>
          </div>

          {/* 4. Quick Actions Shortcuts */}
          <div className="premium-card p-6 border border-white/[0.08]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
              <span>⚡</span> Actions Rapides
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link
                href="/voter"
                className="p-4 rounded-xl bg-gold/[0.06] border border-gold/20 hover:border-gold/50 text-center transition-all group"
              >
                <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform">⭐</span>
                <span className="text-xs font-black text-gold block">Voter maintenant</span>
                <span className="text-[10px] text-gray-400">Attribuer des points</span>
              </Link>
              <Link
                href="/artistes"
                className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-gold/30 text-center transition-all group"
              >
                <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform">🎤</span>
                <span className="text-xs font-bold text-white group-hover:text-gold transition-colors block">
                  Découvrir les artistes
                </span>
                <span className="text-[10px] text-gray-400">Catalogue complet</span>
              </Link>
              <Link
                href="/classements"
                className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-gold/30 text-center transition-all group"
              >
                <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform">🏆</span>
                <span className="text-xs font-bold text-white group-hover:text-gold transition-colors block">
                  Voir les classements
                </span>
                <span className="text-[10px] text-gray-400">Scores en direct</span>
              </Link>
              <Link
                href="/categories"
                className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-gold/30 text-center transition-all group"
              >
                <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform">📂</span>
                <span className="text-xs font-bold text-white group-hover:text-gold transition-colors block">
                  Explorer les catégories
                </span>
                <span className="text-[10px] text-gray-400">16 catégories</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* 5. Left Column (7 cols): Mes Votes Récents */}
            <div className="lg:col-span-7 space-y-6">
              <div className="premium-card p-6 border border-white/[0.08]">
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📋</span>
                    <h2 className="text-sm font-black uppercase tracking-wider text-white">
                      Mes Votes Récents
                    </h2>
                  </div>
                  <span className="text-[11px] text-gray-400 font-semibold">
                    {recentVotes.length} dernier(s) vote(s)
                  </span>
                </div>

                {recentVotes.length === 0 ? (
                  <div className="text-center py-12 px-4 rounded-2xl bg-white/[0.01] border border-white/[0.04] space-y-3">
                    <span className="text-4xl block opacity-40">🗳️</span>
                    <h3 className="text-sm font-bold text-white">Vous n&apos;avez pas encore voté</h3>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                      Soutenez vos artistes chrétiens favoris en attribuant vos premiers points de vote.
                    </p>
                    <div className="pt-2 flex justify-center gap-2">
                      <Link href="/artistes" className="btn-secondary !text-xs !py-2 !px-4">
                        Découvrir les artistes
                      </Link>
                      <Link href="/voter" className="btn-primary !text-xs !py-2 !px-4">
                        ⭐ Voter
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentVotes.map((vote) => (
                      <div
                        key={vote.id}
                        className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-gold/30 transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-11 h-11 rounded-xl bg-surface-light border border-white/[0.08] overflow-hidden flex-shrink-0">
                            {vote.artist.profileImage ? (
                              <img
                                src={vote.artist.profileImage}
                                alt={vote.artist.stageName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm bg-surface">🎤</div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/artistes/${vote.artist.slug}`}
                              className="font-bold text-xs sm:text-sm text-white hover:text-gold transition-colors block truncate"
                            >
                              {vote.artist.stageName}
                            </Link>
                            <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                              <span>{vote.category.icon || '🏆'}</span>
                              <span className="truncate">{vote.category.name}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0 pl-2">
                          <span className="text-xs sm:text-sm font-black text-gold block">
                            +{vote.points} pt{vote.points > 1 ? 's' : ''}
                          </span>
                          <span className="text-[10px] text-gray-500 block">
                            {formatDate(vote.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 6. Right Column (5 cols): Mes Catégories & État du Compte */}
            <div className="lg:col-span-5 space-y-6">
              {/* Mes Catégories Soutenues */}
              <div className="premium-card p-6 border border-white/[0.08]">
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🏷️</span>
                    <h2 className="text-sm font-black uppercase tracking-wider text-white">
                      Mes Catégories
                    </h2>
                  </div>
                  <span className="text-[11px] text-gray-400 font-semibold">
                    {supportedCategories.length} active(s)
                  </span>
                </div>

                {supportedCategories.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-6">
                    Aucune catégorie soutenue pour le moment.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {supportedCategories.map(({ category, voteCount, pointsSpent }) => (
                      <div
                        key={category.id}
                        className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{category.icon || '🏆'}</span>
                            <span className="text-xs font-bold text-gray-200 truncate">
                              {category.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-500 block mt-0.5">
                            {voteCount} vote{voteCount > 1 ? 's' : ''} enregistré{voteCount > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xs font-bold text-gold">
                            {formatPoints(pointsSpent)} pts
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* État du Compte & Sécurité */}
              <div className="premium-card p-5 border border-white/[0.08] space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-300 pb-2 border-b border-white/[0.06]">
                  <span>🛡️</span> Mon Activité & Sécurité
                </div>
                <div className="space-y-2 text-xs text-gray-400">
                  <div className="flex justify-between">
                    <span>Statut :</span>
                    <span className="text-emerald-400 font-bold">✓ Votant Authentifié</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Email associé :</span>
                    <span className="text-gray-300 truncate max-w-[180px]">{user?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dernier vote :</span>
                    <span className="text-gray-300">
                      {lastVoteDate ? formatDateTime(lastVoteDate) : 'Aucun vote'}
                    </span>
                  </div>
                </div>
                <div className="pt-2 text-[10px] text-gray-500 border-t border-white/[0.04] leading-relaxed">
                  Tous vos votes sont chiffrés et comptabilisés de manière irréversible dans les classements officiels.
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
