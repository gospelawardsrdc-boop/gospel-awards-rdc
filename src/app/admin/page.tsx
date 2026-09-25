import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'
import { formatPoints, formatCurrency, formatDate } from '@/lib/utils'

const adminMenuItems = [
  { label: 'Dashboard', href: '/admin', icon: '📊' },
  { label: 'Artistes & Candidats', href: '/admin/artistes', icon: '🎤' },
  { label: 'Catégories', href: '/admin/categories', icon: '🏷️' },
  { label: 'Votes', href: '/admin/votes', icon: '🗳️' },
  { label: 'Packs de points', href: '/admin/points', icon: '📦' },
  { label: 'Transactions', href: '/admin/transactions', icon: '💳' },
  { label: 'Finances & Retraits', href: '/admin/finances', icon: '💰' },
  { label: 'Utilisateurs', href: '/admin/utilisateurs', icon: '👥' },
]

export default async function AdminDashboard() {
  const session = await auth()
  if (!session?.user) redirect('/connexion')
  if ((session.user as any).role !== 'ADMIN') redirect('/dashboard')

  const [
    totalUsers,
    totalArtists,
    pendingArtists,
    totalVotes,
    totalTransactions,
    totalCategories,
    totalPointsSold,
    totalRevenue,
    recentVotes,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.artist.count({ where: { isApproved: true } }),
    prisma.artist.count({ where: { isApproved: false } }),
    prisma.vote.count(),
    prisma.transaction.count({ where: { status: 'COMPLETED' } }),
    prisma.category.count(),
    prisma.transaction.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { pointsAmount: true },
    }),
    prisma.transaction.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amountFc: true },
    }),
    prisma.vote.findMany({
      include: {
        user: { select: { name: true } },
        artist: { select: { stageName: true } },
        category: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ])

  return (
    <div className="min-h-screen bg-[#060912] flex">
      <Sidebar items={adminMenuItems} title="Administration" />

      <main className="flex-1 lg:ml-0 pt-8 pb-20 px-4 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
            <div>
              <span className="text-xs font-semibold text-gold uppercase tracking-[0.2em] mb-1 block">
                Supervision Centrale
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Tableau de Bord <span className="gold-text">Administrateur</span>
              </h1>
              <p className="text-gray-400 text-xs mt-1">Supervision globale des votes, participants et finances.</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/admin/artistes" className="btn-primary !text-xs !py-2.5 !px-5">
                + Ajouter un Artiste
              </Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="premium-card p-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">👥 Votants Inscrits</div>
              <div className="text-2xl sm:text-3xl font-black text-white">{totalUsers}</div>
            </div>
            <div className="premium-card p-5 border-gold/20">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">🎤 Artistes Officiels</div>
              <div className="text-2xl sm:text-3xl font-black text-gold">{totalArtists}</div>
            </div>
            <div className="premium-card p-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">⏳ Candidatures</div>
              <div className={`text-2xl sm:text-3xl font-black ${pendingArtists > 0 ? 'text-amber-400' : 'text-gray-400'}`}>
                {pendingArtists}
              </div>
            </div>
            <div className="premium-card p-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">🗳️ Votes Exprimés</div>
              <div className="text-2xl sm:text-3xl font-black text-white">{totalVotes}</div>
            </div>
            <div className="premium-card p-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">💳 Recharges Validées</div>
              <div className="text-2xl sm:text-3xl font-black text-white">{totalTransactions}</div>
            </div>
            <div className="premium-card p-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">🏷️ Catégories Actives</div>
              <div className="text-2xl sm:text-3xl font-black text-white">{totalCategories}</div>
            </div>
            <div className="premium-card p-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">⭐ Points Distribués</div>
              <div className="text-2xl sm:text-3xl font-black text-gold">
                {formatPoints(totalPointsSold._sum.pointsAmount || 0)}
              </div>
            </div>
            <div className="premium-card p-5 border-emerald-500/20 glow-gold">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-1">💵 Chiffre d&apos;Affaires (FC)</div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                {formatCurrency(totalRevenue._sum.amountFc || 0)}
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/artistes"
              className="btn-secondary !text-xs !py-2.5 !px-5"
            >
              🎤 Gérer les Artistes & Candidats
            </Link>
            <Link
              href="/admin/categories"
              className="btn-secondary !text-xs !py-2.5 !px-5"
            >
              🏷️ Gérer les Catégories
            </Link>
            <Link
              href="/admin/points"
              className="btn-secondary !text-xs !py-2.5 !px-5"
            >
              💰 Configurer les Packs de Points
            </Link>
            <Link
              href="/admin/votes"
              className="btn-secondary !text-xs !py-2.5 !px-5"
            >
              🗳️ Consulter le Journal des Votes
            </Link>
          </div>

          {/* Recent Activity Table */}
          <div className="premium-card p-6">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              📋 <span>Derniers Votes Effectués</span>
            </h2>
            {recentVotes.length === 0 ? (
              <p className="text-gray-500 text-xs py-4">Aucun vote enregistré pour le moment.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-white/[0.06]">
                      <th className="pb-3 font-semibold">Votant</th>
                      <th className="pb-3 font-semibold">Artiste</th>
                      <th className="pb-3 font-semibold">Catégorie</th>
                      <th className="pb-3 font-semibold text-right">Points</th>
                      <th className="pb-3 font-semibold text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {recentVotes.map((vote) => (
                      <tr key={vote.id} className="hover:bg-white/[0.01]">
                        <td className="py-3 font-medium text-gray-300">{vote.user.name}</td>
                        <td className="py-3 text-gold font-bold">{vote.artist.stageName}</td>
                        <td className="py-3 text-gray-400">{vote.category.name}</td>
                        <td className="py-3 text-right font-black text-gold">+{vote.points} pts</td>
                        <td className="py-3 text-right text-gray-500">{formatDate(vote.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
