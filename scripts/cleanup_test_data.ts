import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupAndCheck() {
  console.log('=== NETTOYAGE & VÉRIFICATION DE L\'ÉTAT INITIAL ===')
  
  // Supprimer les retraits et logs d'audit créés lors du script de diagnostic
  await prisma.financialAuditLog.deleteMany({})
  await prisma.withdrawal.deleteMany({})
  
  console.log('✅ Tables Withdrawal et FinancialAuditLog remises à zéro.')

  // Vérifier le solde
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

  console.log(`Revenus bruts (COMPLETED) : ${gross.toLocaleString('fr-FR')} FC`)
  console.log(`Montant retiré (COMPLETED) : ${withdrawn.toLocaleString('fr-FR')} FC`)
  console.log(`Retraits en attente : ${pending.toLocaleString('fr-FR')} FC`)
  console.log(`Solde disponible : ${available.toLocaleString('fr-FR')} FC`)
  console.log(`Capacité nette de retrait : ${capacity.toLocaleString('fr-FR')} FC`)
}

cleanupAndCheck()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
