import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { formatPoints, formatDate } from '@/lib/utils'
import { signOut } from '@/lib/auth'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/connexion')

  const userId = (session.user as any).id
  const role = (session.user as any).role

  if (role === 'ADMIN') redirect('/admin')
  if (role === 'ARTIST') redirect('/artiste')

  const [user, recentVotes, totalVotes, totalPointsSpent] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { pointBalance: true, name: true, email: true },
    }),
    prisma.vote.findMany({
      where: { userId },
      include: {
        artist: { select: { stageName: true, slug: true, profileImage: true } },
        category: { select: { name: true, slug: true, icon: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.vote.count({ where: { userId } }),
    prisma.vote.aggregate({
      where: { userId },
      _sum: { points: true },
    }),
  ])

  return (
    <div className="min-h-screen bg-[#060912] flex flex-col justify-between">
      <Header user={{ name: session.user.name!, role }} />
      <main className="pt-28 lg:pt-36 pb-24 lg:pb-20 px-4 flex-1">
        <div className="max-w-5xl mx-auto">
          {/* Welcome Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 pb-6 border-b border-white/[0.06]">
            <div>
              <span className="text-xs font-semibold text-gold uppercase tracking-[0.2em] mb-1 block">
                Espace Votant
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Bonjour, <span className="gold-text">{user?.name}</span>
              </h1>
              <p className="text-gray-400 text-xs mt-1">{user?.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/voter" className="btn-primary !text-xs !py-2.5 !px-5">
                ⭐ Voter / Acheter des points
              </Link>
              <form action={async () => { 'use server'; await signOut({ redirectTo: '/connexion' }) }}>
                <button type="submit" className="text-xs text-gray-400 hover:text-rose-400 transition-colors px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  🚪 Déconnexion
                </button>
              </form>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <div className="premium-card p-6 border-gold/20 glow-gold">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                Solde Actuel
              </div>
              <div className="text-3xl sm:text-4xl font-black text-gold">
                {formatPoints(user?.pointBalance || 0)}
              </div>
              <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between">
                <span className="text-[11px] text-gray-500">Points disponibles</span>
                <Link href="/voter" className="text-xs text-gold font-bold hover:underline">
                  Recharger →
                </Link>
              </div>
            </div>

            <div className="premium-card p-6">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                Votes Exprimés
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white">
                {totalVotes}
              </div>
              <div className="mt-3 pt-3 border-t border-white/[0.04]">
                <span className="text-[11px] text-gray-500">Nombre de suffrages</span>
              </div>
            </div>

            <div className="premium-card p-6">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                Points Dépensés
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white">
                {formatPoints(totalPointsSpent._sum.points || 0)}
              </div>
              <div className="mt-3 pt-3 border-t border-white/[0.04]">
                <span className="text-[11px] text-gray-500">Total investis en soutien</span>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="flex flex-wrap gap-3 mb-10">
            <Link
              href="/categories"
              className="btn-secondary !text-xs !py-2.5 !px-5"
            >
              🏷️ Découvrir les catégories
            </Link>
            <Link
              href="/classements"
              className="btn-secondary !text-xs !py-2.5 !px-5"
            >
              🏆 Voir les classements en direct
            </Link>
          </div>

          {/* Recent Votes */}
          <div className="premium-card p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                📋 <span>Historique de mes Votes</span>
              </h2>
              <span className="text-xs text-gray-500">{recentVotes.length} dernier(s) vote(s)</span>
            </div>

            {recentVotes.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                <div className="text-4xl mb-3 opacity-40">🗳️</div>
                <p>Vous n&apos;avez pas encore participé aux votes.</p>
                <Link href="/voter" className="btn-primary !text-xs !py-2.5 !px-6 mt-4 inline-block">
                  Faire mon premier vote
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentVotes.map((vote) => (
                  <div
                    key={vote.id}
                    className="flex items-center gap-4 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-gold/20 transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-surface-light border border-white/[0.06] overflow-hidden flex-shrink-0">
                      {vote.artist.profileImage ? (
                        <img src={vote.artist.profileImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">🎤</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/artistes/${vote.artist.slug}`}
                        className="font-bold text-sm text-white hover:text-gold transition-colors block truncate"
                      >
                        {vote.artist.stageName}
                      </Link>
                      <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <span>{vote.category.icon}</span>
                        <span>{vote.category.name}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-gold font-bold text-sm">+{vote.points} pts</div>
                      <div className="text-[10px] text-gray-500">{formatDate(vote.createdAt)}</div>
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
