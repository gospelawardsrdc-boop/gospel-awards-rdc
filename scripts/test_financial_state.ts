import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function diagnose() {
  console.log('--- DIAGNOSTIC DES DONNÉES FINANCIÈRES ---')
  
  // 1. Transactions
  const transactions = await prisma.transaction.findMany({
    include: { user: true, package: true },
    orderBy: { createdAt: 'desc' }
  })
  console.log(`Transactions trouvées : ${transactions.length}`)
  for (const t of transactions) {
    console.log(`- Tx ${t.id}: ${t.amountFc} FC, statut: ${t.status}, user: ${t.user.name}`)
  }

  // 2. Withdrawals
  const withdrawals = await prisma.withdrawal.findMany({
    orderBy: { createdAt: 'desc' }
  })
  console.log(`\nWithdrawals trouvés : ${withdrawals.length}`)
  for (const w of withdrawals) {
    console.log(`- Wd ${w.id} (${w.reference}): ${w.amountFc} FC, statut: ${w.status}, provider: ${w.provider}`)
  }

  // 3. Calcul du solde
  const completedTx = await prisma.transaction.aggregate({
    where: { status: 'COMPLETED' },
    _sum: { amountFc: true }
  })
  const completedWd = await prisma.withdrawal.aggregate({
    where: { status: 'COMPLETED' },
    _sum: { amountFc: true }
  })
  const pendingWd = await prisma.withdrawal.aggregate({
    where: { status: { in: ['PENDING', 'PROCESSING'] } },
    _sum: { amountFc: true }
  })

  const gross = completedTx._sum.amountFc || 0
  const withdrawn = completedWd._sum.amountFc || 0
  const pending = pendingWd._sum.amountFc || 0
  const available = Math.max(0, gross - withdrawn)
  const capacity = Math.max(0, available - pending)

  console.log(`\nRevenus bruts COMPLETED : ${gross} FC`)
  console.log(`Retraits COMPLETED : ${withdrawn} FC`)
  console.log(`Retraits PENDING : ${pending} FC`)
  console.log(`Solde disponible : ${available} FC`)
  console.log(`Capacité nette de retrait : ${capacity} FC`)
}

diagnose()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
