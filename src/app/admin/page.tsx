import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'
import { getFinancialSummary } from '@/actions/finances'
import { formatPoints, formatCurrency, formatDate, formatDateTime } from '@/lib/utils'

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

  const role = (session.user as any).role
  if (role === 'USER') redirect('/dashboard')
  if (role === 'ARTIST') redirect('/artiste')
  if (role !== 'ADMIN') redirect('/dashboard')

  // Fetch all admin data in parallel
  const [
    financialSummary,
    usersByRole,
    artistsStats,
    votesAgg,
    recentVotes,
    categoriesWithStats,
    recentUsers,
    recentTransactions,
  ] = await Promise.all([
    getFinancialSummary(),
    prisma.user.groupBy({
      by: ['role'],
      _count: { _all: true },
    }),
    prisma.artist.findMany({
      select: {
        id: true,
        stageName: true,
        slug: true,
        profileImage: true,
        isActive: true,
        isApproved: true,
        createdAt: true,
        _count: { select: { votes: true } },
      },
    }),
    prisma.vote.aggregate({
      _sum: { points: true },
      _count: { _all: true },
    }),
    prisma.vote.findMany({
      include: {
        user: { select: { name: true } },
        artist: { select: { stageName: true, slug: true, profileImage: true } },
        category: { select: { name: true, icon: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
      include: {
        artists: {
          where: { artist: { isActive: true, isApproved: true } },
          select: { id: true },
        },
        _count: { select: { votes: true } },
      },
    }),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.transaction.findMany({
      include: {
        user: { select: { name: true } },
        package: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  // In-memory calculations
  const totalUsersCount = usersByRole.reduce((sum, r) => sum + r._count._all, 0)
  const roleUserCount = usersByRole.find((r) => r.role === 'USER')?._count._all || 0
  const roleArtistCount = usersByRole.find((r) => r.role === 'ARTIST')?._count._all || 0
  const roleAdminCount = usersByRole.find((r) => r.role === 'ADMIN')?._count._all || 0

  const approvedActiveArtists = artistsStats.filter((a) => a.isApproved && a.isActive)
  const pendingApprovalArtists = artistsStats.filter((a) => !a.isApproved)
  const inactiveArtists = artistsStats.filter((a) => a.isApproved && !a.isActive)
  const emptyCategories = categoriesWithStats.filter((c) => c.artists.length === 0)

  const totalVotesCount = votesAgg._count._all
  const totalPointsVoted = votesAgg._sum.points || 0

  // Check items needing attention
  const attentionItems: { label: string; count: number; href: string; severity: 'warning' | 'info' }[] = []
  if (financialSummary.pendingTxCount > 0) {
    attentionItems.push({
      label: 'Transactions en attente de confirmation',
      count: financialSummary.pendingTxCount,
      href: '/admin/transactions',
      severity: 'info',
    })
  }
  if (financialSummary.pendingWithdrawalsCount > 0) {
    attentionItems.push({
      label: 'Demandes de retraits en cours de traitement',
      count: financialSummary.pendingWithdrawalsCount,
      href: '/admin/finances',
      severity: 'warning',
    })
  }
  if (pendingApprovalArtists.length > 0) {
    attentionItems.push({
      label: "Candidatures d'artistes en attente de validation",
      count: pendingApprovalArtists.length,
      href: '/admin/artistes',
      severity: 'warning',
    })
  }
  if (emptyCategories.length > 0) {
    attentionItems.push({
      label: 'Catégories sans aucun candidat assigné',
      count: emptyCategories.length,
      href: '/admin/categories',
      severity: 'info',
    })
  }

  return (
    <div className="min-h-screen bg-[#060912] flex">
      <Sidebar items={adminMenuItems} title="Administration" />

      <main className="flex-1 lg:ml-0 pt-8 pb-20 px-4 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* 1. Admin Hero Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/30 text-gold text-xs font-bold uppercase tracking-wider mb-2">
                <span>🛡️</span> Supervision Centrale · Édition 2026
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Dashboard <span className="gold-text">Administration</span>
              </h1>
              <p className="text-gray-400 text-xs sm:text-sm mt-1">
                Pilotez et surveillez l&apos;ensemble des activités de Gospel Awards RDC.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/admin/artistes"
                className="btn-primary !text-xs !py-3 !px-5 font-black tracking-wide shadow-lg"
              >
                + Inviter un Artiste
              </Link>
            </div>
          </div>

          {/* 2. Top Main KPI Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Chiffre d'Affaires Brut Validé */}
            <div className="premium-card p-5 border-2 border-emerald-500/30 glow-gold flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                  Chiffre d&apos;Affaires Brut
                </span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                  {formatCurrency(financialSummary.grossRevenue)}
                </div>
                <span className="text-[10px] text-gray-500 mt-1 block">
                  {financialSummary.completedTxCount} recharge(s) validée(s)
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
                <span className="text-gray-400">Solde dispo :</span>
                <span className="text-gold font-bold">{formatCurrency(financialSummary.availableBalance)}</span>
              </div>
            </div>

            {/* Capacité Nette de Retrait */}
            <div className="premium-card p-5 border border-white/[0.08] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gold block mb-1">
                  Capacité Nette Retrait
                </span>
                <div className="text-2xl sm:text-3xl font-black text-gold">
                  {formatCurrency(financialSummary.netWithdrawalCapacity)}
                </div>
                <span className="text-[10px] text-gray-500 mt-1 block">
                  {formatCurrency(financialSummary.totalWithdrawn)} déjà retirés
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
                <span className="text-gray-400">En cours :</span>
                <span className="text-amber-400 font-bold">{formatCurrency(financialSummary.pendingWithdrawalsAmount)}</span>
              </div>
            </div>

            {/* Votes Exprimés */}
            <div className="premium-card p-5 border border-white/[0.08] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Votes Enregistrés
                </span>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {totalVotesCount}
                </div>
                <span className="text-[10px] text-gray-500 mt-1 block">
                  {formatPoints(totalPointsVoted)} points attribués
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-white/[0.06] text-[11px] text-gray-400">
                Participation certifiée
              </div>
            </div>

            {/* Artistes & Candidats */}
            <div className="premium-card p-5 border border-white/[0.08] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Artistes Officiels
                </span>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {approvedActiveArtists.length}
                </div>
                <span className="text-[10px] text-gray-500 mt-1 block">
                  {totalUsersCount} utilisateur(s) total
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-white/[0.06] text-[11px] text-gray-400">
                {categoriesWithStats.length} catégories actives
              </div>
            </div>
          </div>

          {/* 3. Section Watchlist / Éléments Nécessitant Attention */}
          <div className="premium-card p-6 border border-white/[0.08]">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <span>⚠️</span> Surveillance & Actions en Attente
              </h2>
              <span className="text-[11px] text-gray-400">Statut temps réel</span>
            </div>

            {attentionItems.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2.5 font-medium">
                <span>✅</span>
                <span>Tout est à jour — Aucune action administrative urgente requise.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {attentionItems.map((item, i) => (
                  <Link
                    key={i}
                    href={item.href}
                    className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 group ${
                      item.severity === 'warning'
                        ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 text-amber-300'
                        : 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 text-blue-300'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold block truncate">{item.label}</span>
                      <span className="text-[10px] opacity-80 group-hover:underline">Consulter →</span>
                    </div>
                    <span className="w-7 h-7 rounded-full bg-white/10 font-black text-xs flex items-center justify-center flex-shrink-0">
                      {item.count}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 4. Quick Action Shortcuts */}
          <div className="flex flex-wrap gap-2.5">
            <Link href="/admin/artistes" className="btn-secondary !text-xs !py-2.5 !px-4">
              🎤 Artistes ({artistsStats.length})
            </Link>
            <Link href="/admin/categories" className="btn-secondary !text-xs !py-2.5 !px-4">
              🏷️ Catégories ({categoriesWithStats.length})
            </Link>
            <Link href="/admin/votes" className="btn-secondary !text-xs !py-2.5 !px-4">
              🗳️ Journal des Votes ({totalVotesCount})
            </Link>
            <Link href="/admin/transactions" className="btn-secondary !text-xs !py-2.5 !px-4">
              💳 Transactions ({financialSummary.totalTxCount})
            </Link>
            <Link href="/admin/finances" className="btn-secondary !text-xs !py-2.5 !px-4">
              💰 Finances & Grand Livre
            </Link>
            <Link href="/admin/points" className="btn-secondary !text-xs !py-2.5 !px-4">
              📦 Packs de Points
            </Link>
            <Link href="/admin/utilisateurs" className="btn-secondary !text-xs !py-2.5 !px-4">
              👥 Utilisateurs ({totalUsersCount})
            </Link>
          </div>

          {/* 5. Two Columns: Finances/Transactions (Left) + Users/Categories (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 7 Cols: Financial & Vote Ledger */}
            <div className="lg:col-span-7 space-y-6">
              {/* Financial Ledger Summary Card */}
              <div className="premium-card p-6 border-2 border-gold/20 glow-gold space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gold block">
                      Ledger Comptable
                    </span>
                    <h2 className="text-base font-black text-white">Grand Livre Financier</h2>
                  </div>
                  <Link href="/admin/finances" className="text-xs text-gold font-bold hover:underline">
                    Détails Trésorerie →
                  </Link>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between text-gray-300">
                    <span>Chiffre d&apos;affaires brut (COMPLETED) :</span>
                    <strong className="text-emerald-400 font-bold">
                      {formatCurrency(financialSummary.grossRevenue)}
                    </strong>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Frais opérateurs & passerelles :</span>
                    <span>- {formatCurrency(financialSummary.paymentFees)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Remboursements :</span>
                    <span>- {formatCurrency(financialSummary.refunds)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Retraits effectués (COMPLETED) :</span>
                    <span>- {formatCurrency(financialSummary.totalWithdrawn)}</span>
                  </div>
                  <div className="flex justify-between text-white font-bold pt-2 border-t border-white/[0.06]">
                    <span>Solde brut disponible :</span>
                    <span className="text-gold">{formatCurrency(financialSummary.availableBalance)}</span>
                  </div>
                  <div className="flex justify-between text-amber-400">
                    <span>Retraits réservés (PENDING / PROCESSING) :</span>
                    <span>- {formatCurrency(financialSummary.pendingWithdrawalsAmount)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 font-black pt-2 border-t border-white/[0.06] text-sm">
                    <span>Capacité nette de retrait :</span>
                    <span>{formatCurrency(financialSummary.netWithdrawalCapacity)}</span>
                  </div>
                </div>
              </div>

              {/* Recent Votes Table */}
              <div className="premium-card p-6 border border-white/[0.08]">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🗳️</span>
                    <h2 className="text-sm font-black uppercase tracking-wider text-white">
                      Activité de Vote Récente
                    </h2>
                  </div>
                  <Link href="/admin/votes" className="text-xs text-gold font-bold hover:underline">
                    Journal complet →
                  </Link>
                </div>

                {recentVotes.length === 0 ? (
                  <p className="text-gray-500 text-xs py-6 text-center">Aucun vote enregistré pour le moment.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-gray-500 border-b border-white/[0.04]">
                          <th className="pb-2.5 font-semibold">Votant</th>
                          <th className="pb-2.5 font-semibold">Artiste</th>
                          <th className="pb-2.5 font-semibold">Catégorie</th>
                          <th className="pb-2.5 font-semibold text-right">Points</th>
                          <th className="pb-2.5 font-semibold text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.02]">
                        {recentVotes.map((vote) => (
                          <tr key={vote.id} className="hover:bg-white/[0.02]">
                            <td className="py-2.5 text-gray-300 font-medium truncate max-w-[120px]">
                              {vote.user.name || 'Anonyme'}
                            </td>
                            <td className="py-2.5 text-gold font-bold truncate max-w-[120px]">
                              {vote.artist.stageName}
                            </td>
                            <td className="py-2.5 text-gray-400 truncate max-w-[140px]">
                              {vote.category.icon} {vote.category.name}
                            </td>
                            <td className="py-2.5 text-right font-black text-gold">
                              +{vote.points} pts
                            </td>
                            <td className="py-2.5 text-right text-gray-500 text-[10px]">
                              {formatDate(vote.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Right 5 Cols: Users Breakdown & Recent Transactions */}
            <div className="lg:col-span-5 space-y-6">
              {/* Users by Role Card */}
              <div className="premium-card p-6 border border-white/[0.08] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                      Gestion Comptes
                    </span>
                    <h2 className="text-base font-black text-white">Utilisateurs & Rôles</h2>
                  </div>
                  <Link href="/admin/utilisateurs" className="text-xs text-gold font-bold hover:underline">
                    Gérer →
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Votants</span>
                    <span className="text-xl font-black text-white block mt-1">{roleUserCount}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-gold/[0.04] border border-gold/20">
                    <span className="text-[10px] uppercase font-bold text-gold block">Artistes</span>
                    <span className="text-xl font-black text-gold block mt-1">{roleArtistCount}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-[10px] uppercase font-bold text-purple-400 block">Admins</span>
                    <span className="text-xl font-black text-purple-400 block mt-1">{roleAdminCount}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                    Dernières Inscriptions
                  </span>
                  {recentUsers.map((u) => (
                    <div key={u.id} className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.02] last:border-0">
                      <div className="min-w-0 flex-1 pr-2">
                        <span className="text-gray-200 font-bold block truncate">{u.name || 'Sans nom'}</span>
                        <span className="text-[10px] text-gray-500">{formatDate(u.createdAt)}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        u.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-400' : u.role === 'ARTIST' ? 'bg-gold/10 text-gold' : 'bg-white/[0.04] text-gray-400'
                      }`}>
                        {u.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Transactions Card */}
              <div className="premium-card p-6 border border-white/[0.08] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                      Flux Financier
                    </span>
                    <h2 className="text-base font-black text-white">Dernières Recharges</h2>
                  </div>
                  <Link href="/admin/transactions" className="text-xs text-gold font-bold hover:underline">
                    Historique →
                  </Link>
                </div>

                {recentTransactions.length === 0 ? (
                  <p className="text-gray-500 text-xs py-4 text-center">Aucune transaction enregistrée.</p>
                ) : (
                  <div className="space-y-2.5">
                    {recentTransactions.map((tx) => (
                      <div key={tx.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="font-bold text-white truncate max-w-[140px]">{tx.user.name || 'Utilisateur'}</div>
                          <div className="text-[10px] text-gray-500">{formatDate(tx.createdAt)} · {tx.paymentMethod}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-emerald-400">{formatCurrency(tx.amountFc)}</div>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                            tx.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : tx.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
