import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { formatDate, formatCurrency, formatPoints } from '@/lib/utils'
import { confirmPaymentTransaction, cancelPaymentTransaction } from '@/actions/vote'

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') redirect('/connexion')

  const { q, status } = await searchParams

  const whereClause: any = {}
  if (status && status !== 'ALL') {
    whereClause.status = status
  }
  if (q) {
    whereClause.OR = [
      { id: { contains: q } },
      { paymentRef: { contains: q } },
      { user: { name: { contains: q } } },
      { user: { email: { contains: q } } },
    ]
  }

  const [transactions, statusGroups, stats] = await Promise.all([
    prisma.transaction.findMany({
      where: whereClause,
      select: {
        id: true,
        amountFc: true,
        pointsAmount: true,
        paymentMethod: true,
        paymentRef: true,
        status: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
        package: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.transaction.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.transaction.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amountFc: true, pointsAmount: true },
    }),
  ])

  let totalCount = 0
  let completedCount = 0
  let pendingCount = 0
  let failedCount = 0

  for (const g of statusGroups) {
    totalCount += g._count._all
    if (g.status === 'COMPLETED') completedCount = g._count._all
    else if (g.status === 'PENDING') pendingCount = g._count._all
    else if (g.status === 'FAILED') failedCount = g._count._all
  }

  async function handleConfirmTx(formData: FormData) {
    'use server'
    const txId = formData.get('transactionId') as string
    if (txId) {
      await confirmPaymentTransaction(txId)
    }
  }

  async function handleCancelTx(formData: FormData) {
    'use server'
    const txId = formData.get('transactionId') as string
    if (txId) {
      await cancelPaymentTransaction(txId)
    }
  }

  const totalAmount = stats._sum.amountFc || 0
  const totalPoints = stats._sum.pointsAmount || 0

  return (
    <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
            <div>
              <span className="text-xs font-semibold text-gold uppercase tracking-[0.2em] mb-1 block">
                Supervision & Audit des Flux
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Journal des <span className="gold-text">Transactions</span>
              </h1>
              <p className="text-gray-400 text-xs mt-1">
                Surveillance des paiements automatiques Mobile Money (M-Pesa, Orange Money).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-gray-300">
                Total: <strong className="text-white">{totalCount}</strong>
              </span>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="premium-card p-4">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">Volume Collecté</span>
              <div className="text-lg sm:text-xl font-black text-emerald-400 mt-1">{formatCurrency(totalAmount)}</div>
              <span className="text-[10px] text-gray-500">Paiements validés</span>
            </div>

            <div className="premium-card p-4">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">Points Émis</span>
              <div className="text-lg sm:text-xl font-black text-gold mt-1">+{formatPoints(totalPoints)} pts</div>
              <span className="text-[10px] text-gray-500">Crédités sur les soldes</span>
            </div>

            <div className="premium-card p-4">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">Confirmées</span>
              <div className="text-lg sm:text-xl font-black text-white mt-1">{completedCount}</div>
              <span className="text-[10px] text-emerald-400/80">Automatisées à 100%</span>
            </div>

            <div className="premium-card p-4">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">En Attente / Échec</span>
              <div className="text-lg sm:text-xl font-black text-amber-400 mt-1">
                {pendingCount} <span className="text-xs text-rose-400 font-normal">({failedCount} échecs)</span>
              </div>
              <span className="text-[10px] text-gray-500">En cours de traitement</span>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="premium-card p-4">
            <form method="get" className="flex flex-col sm:flex-row gap-3">
              <input
                name="q"
                defaultValue={q || ''}
                placeholder="Rechercher par utilisateur, email, réf transaction..."
                className="flex-1 input-field !text-xs !py-2.5"
              />
              <select
                name="status"
                defaultValue={status || 'ALL'}
                className="input-field !text-xs !py-2.5 sm:w-48"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="COMPLETED">COMPLETED (Confirmés)</option>
                <option value="PENDING">PENDING (En attente)</option>
                <option value="FAILED">FAILED (Échoués)</option>
                <option value="CANCELLED">CANCELLED (Annulés)</option>
              </select>
              <button type="submit" className="btn-secondary !text-xs !py-2.5 !px-5 whitespace-nowrap">
                Filtrer
              </button>
            </form>
          </div>

          {/* Transactions Table */}
          <div className="premium-card p-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-white/[0.06]">
                    <th className="pb-3 font-semibold">Utilisateur</th>
                    <th className="pb-3 font-semibold">Opérateur / Pack</th>
                    <th className="pb-3 font-semibold text-right">Points</th>
                    <th className="pb-3 font-semibold text-right">Montant</th>
                    <th className="pb-3 font-semibold text-center">Statut</th>
                    <th className="pb-3 font-semibold text-right">Date</th>
                    <th className="pb-3 font-semibold text-right">Réconciliation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">
                        Aucune transaction trouvée pour ces critères.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/[0.01]">
                        <td className="py-3">
                          <div className="font-bold text-white">{tx.user.name}</div>
                          <div className="text-[10px] text-gray-500">{tx.user.email}</div>
                        </td>
                        <td className="py-3">
                          <div className="text-gray-300 font-medium">{tx.package.name}</div>
                          <div className="text-[10px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                            <span className="px-1.5 py-0.2 rounded bg-white/[0.05] text-[9px] font-mono text-gray-400">
                              {tx.paymentMethod || 'MOBILE_MONEY'}
                            </span>
                            {tx.paymentRef && <span className="truncate max-w-[120px]">{tx.paymentRef}</span>}
                          </div>
                        </td>
                        <td className="py-3 text-right text-gold font-black">+{formatPoints(tx.pointsAmount)} pts</td>
                        <td className="py-3 text-right text-emerald-400 font-bold">{formatCurrency(tx.amountFc)}</td>
                        <td className="py-3 text-center">
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                              tx.status === 'COMPLETED'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : tx.status === 'PENDING'
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-3 text-right text-gray-500">{formatDate(tx.createdAt)}</td>
                        <td className="py-3 text-right">
                          {tx.status === 'PENDING' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <form action={handleConfirmTx}>
                                <input type="hidden" name="transactionId" value={tx.id} />
                                <button
                                  type="submit"
                                  title="Forcer la réconciliation en cas d'incident opérateur"
                                  className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 text-[9px] font-bold rounded border border-emerald-500/30"
                                >
                                  Réconcilier
                                </button>
                              </form>
                              <form action={handleCancelTx}>
                                <input type="hidden" name="transactionId" value={tx.id} />
                                <button
                                  type="submit"
                                  title="Annuler la transaction expirée ou invalide"
                                  className="px-2 py-0.5 bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 text-[9px] font-bold rounded border border-rose-500/30"
                                >
                                  Annuler
                                </button>
                              </form>
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-600 font-mono">#{tx.id.slice(-6)}</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
        </div>
      </div>
    </div>
  )
}
