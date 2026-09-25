import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://postgres.ggqgodbfdfnneusrzzwp:Rdcawa2026%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres'
})

async function testTransaction() {
  console.log('--- TEST D\'UNE TRANSACTION ATOMIQUE PRISMA ---')
  const amountFc = 1000
  const adminName = 'Administrateur Test'
  const adminId = 'admin-test-id'

  const result = await prisma.$transaction(async (tx) => {
    // 1. Recalcul du solde
    const completedTx = await tx.transaction.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amountFc: true },
    })
    const completedWd = await tx.withdrawal.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amountFc: true },
    })
    const pendingWd = await tx.withdrawal.aggregate({
      where: { status: { in: ['PENDING', 'PROCESSING'] } },
      _sum: { amountFc: true },
    })

    const currentGross = completedTx._sum.amountFc || 0
    const currentWithdrawn = completedWd._sum.amountFc || 0
    const currentPendingWd = pendingWd._sum.amountFc || 0
    const availableBalance = Math.max(0, currentGross - currentWithdrawn)
    const maxAllowed = Math.max(0, availableBalance - currentPendingWd)

    console.log(`Solde brut vérifié : ${availableBalance} FC, Capacité : ${maxAllowed} FC`)

    if (amountFc > maxAllowed) {
      throw new Error(`Solde insuffisant pour ce retrait.`)
    }

    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
    const reference = `GA-WD-${timestamp}-${randomSuffix}`

    const withdrawal = await tx.withdrawal.create({
      data: {
        amountFc,
        provider: 'MANUAL',
        destination: 'Caisse Principale',
        destinationName: 'Trésorerie Gospel Awards',
        status: 'PENDING',
        reference,
        note: 'Test de retrait manuel 1 000 FC',
        requestedBy: adminName,
        requestedAt: new Date(),
      },
    })

    await tx.financialAuditLog.create({
      data: {
        action: 'WITHDRAWAL_CREATED',
        actorId: adminId,
        actorName: adminName,
        amountFc,
        reference,
        newValue: 'PENDING',
        note: `Création demande de retrait de ${amountFc} FC via MANUAL`,
      },
    })

    return withdrawal
  }, {
    maxWait: 15000,
    timeout: 30000,
  })

  console.log('\n✅ SUCCÈS ! Retrait créé :', result)
}

testTransaction()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
