import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testCompleteWithdrawal() {
  console.log('=== TEST DE VALIDATION DU RETRAIT (COMPLETED) ===\n')

  const pendingWd = await prisma.withdrawal.findFirst({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'desc' }
  })

  if (!pendingWd) {
    console.log('Aucun retrait PENDING trouvé.')
    return
  }

  console.log(`Validation du retrait : ${pendingWd.reference} (${pendingWd.amountFc} FC)...`)

  const updated = await prisma.$transaction(
    async (tx) => {
      const existing = await tx.withdrawal.findUnique({
        where: { id: pendingWd.id }
      })
      if (!existing || existing.status === 'COMPLETED') {
        throw new Error('Retrait déjà validé.')
      }

      const res = await tx.withdrawal.update({
        where: { id: pendingWd.id },
        data: {
          status: 'COMPLETED',
          processedBy: 'Super Admin',
          processedAt: new Date(),
          note: 'Retrait manuel décaissé en espèces à la caisse principale'
        }
      })

      await tx.financialAuditLog.create({
        data: {
          action: 'WITHDRAWAL_COMPLETED',
          actorId: 'admin-live-id',
          actorName: 'Super Admin',
          amountFc: existing.amountFc,
          reference: existing.reference,
          oldValue: 'PENDING',
          newValue: 'COMPLETED',
          note: 'Validation du décaissement',
        }
      })

      return res
    },
    { maxWait: 20000, timeout: 30000 }
  )

  console.log('✅ Retrait validé avec succès :', updated.reference, '| Statut :', updated.status)

  // Vérifier le nouveau solde disponible après COMPLETED
  const completedTx = await prisma.transaction.aggregate({
    where: { status: 'COMPLETED' },
    _sum: { amountFc: true }
  })
  const completedWd = await prisma.withdrawal.aggregate({
    where: { status: 'COMPLETED' },
    _sum: { amountFc: true }
  })
  const pendingWdCount = await prisma.withdrawal.aggregate({
    where: { status: { in: ['PENDING', 'PROCESSING'] } },
    _sum: { amountFc: true }
  })

  const gross = completedTx._sum.amountFc || 0
  const withdrawn = completedWd._sum.amountFc || 0
  const pending = pendingWdCount._sum.amountFc || 0
  const available = Math.max(0, gross - withdrawn)

  console.log('\n=== SOLDES APRÈS DÉCAISSEMENT DÉFINITIF ===')
  console.log(`- Chiffre d'affaires brut : ${gross.toLocaleString('fr-FR')} FC`)
  console.log(`- Total Retiré (COMPLETED) : ${withdrawn.toLocaleString('fr-FR')} FC`)
  console.log(`- Retraits en attente : ${pending.toLocaleString('fr-FR')} FC`)
  console.log(`- NOUVEAU SOLDE DISPONIBLE : ${available.toLocaleString('fr-FR')} FC`)
}

testCompleteWithdrawal()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
