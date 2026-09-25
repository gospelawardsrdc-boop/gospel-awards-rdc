import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import { getFinancialSummary } from '@/actions/finances'
import FinancesClient from './FinancesClient'

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

export default async function AdminFinancesPage() {
  const session = await auth()
  if (!session?.user) redirect('/connexion')
  if ((session.user as any).role !== 'ADMIN') redirect('/dashboard')

  const [summary, allWithdrawals, recentTransactions, auditLogs] = await Promise.all([
    getFinancialSummary(),
    prisma.withdrawal.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.transaction.findMany({
      where: { status: 'COMPLETED' },
      include: {
        user: { select: { name: true } },
        package: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.financialAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 15,
    }),
  ])

  const pendingWithdrawals = allWithdrawals.filter(
    (w) => w.status === 'PENDING' || w.status === 'PROCESSING'
  )

  return (
    <div className="min-h-screen bg-[#060912] flex">
      <Sidebar items={adminMenuItems} title="Administration" />
      <main className="flex-1 lg:ml-0 pt-8 pb-20 px-4 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <FinancesClient
            summary={summary}
            pendingWithdrawals={pendingWithdrawals}
            allWithdrawals={allWithdrawals}
            recentTransactions={recentTransactions}
            auditLogs={auditLogs}
          />
        </div>
      </main>
    </div>
  )
}
