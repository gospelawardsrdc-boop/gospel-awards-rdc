import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { getFinancialSummary } from '@/actions/finances'
import FinancesClient from './FinancesClient'

export default async function AdminFinancesPage() {
  const session = await auth()
  if (!session?.user) redirect('/connexion')
  if ((session.user as any).role !== 'ADMIN') redirect('/dashboard')

  const [summary, allWithdrawals, recentTransactions, auditLogs] = await Promise.all([
    getFinancialSummary(),
    prisma.withdrawal.findMany({
      select: {
        id: true,
        amountFc: true,
        paymentMethod: true,
        recipientPhone: true,
        recipientName: true,
        status: true,
        reference: true,
        processedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.transaction.findMany({
      where: { status: 'COMPLETED' },
      select: {
        id: true,
        amountFc: true,
        pointsAmount: true,
        paymentMethod: true,
        paymentRef: true,
        status: true,
        createdAt: true,
        user: { select: { name: true } },
        package: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.financialAuditLog.findMany({
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        createdAt: true,
        performedBy: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 15,
    }),
  ])

  const pendingWithdrawals = allWithdrawals.filter(
    (w) => w.status === 'PENDING' || w.status === 'PROCESSING'
  )

  return (
    <div className="max-w-6xl mx-auto">
      <FinancesClient
        summary={summary}
        pendingWithdrawals={pendingWithdrawals}
        allWithdrawals={allWithdrawals}
        recentTransactions={recentTransactions}
        auditLogs={auditLogs}
      />
    </div>
  )
}

