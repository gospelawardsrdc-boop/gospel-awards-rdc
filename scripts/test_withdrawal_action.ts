import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testActionFlow() {
  console.log('=== TEST DE CRÉATION DE RETRAIT MANUEL DE 1 000 FC ===\n')

  const amountFc = 1000
  const provider = 'MANUAL'
  const destination = 'Caisse Principale'
  const destinationName = 'Trésorerie Gospel Awards'
  const note = 'Test retrait manuel 1 000 FC post-fix'
  const adminName = 'Administrateur Gospel Awards'
  const adminId = 'admin-live-id'

  console.log('1. Vérification des conditions initiales :')
  const initialSummary = await prisma.transaction.aggregate({
    where: { status: 'COMPLETED' },
    _sum: { amountFc: true }
  })
  console.log(`- Solde brut initial : ${initialSummary._sum.amountFc} FC`)

  console.log('\n2. Exécution de la transaction atomique (identique à Server Action requestWithdrawalAction)...')

  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
  const reference = `GA-WD-${timestamp}-${randomSuffix}`

  const result = await prisma.$transaction(
    async (tx) => {
      // Recalcul du solde disponible dans la transaction
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

      if (amountFc > maxAllowed) {
        throw new Error(
          `Solde insuffisant pour ce retrait. Capacité disponible : ${maxAllowed.toLocaleString('fr-FR')} FC.`
        )
      }

      // Création de la demande de retrait
      const withdrawal = await tx.withdrawal.create({
        data: {
          amountFc,
          provider,
          destination,
          destinationName,
          status: 'PENDING',
          reference,
          note,
          requestedBy: adminName,
          requestedAt: new Date(),
        },
      })

      // Enregistrement dans le journal d'audit financier
      await tx.financialAuditLog.create({
        data: {
          action: 'WITHDRAWAL_CREATED',
          actorId: adminId,
          actorName: adminName,
          amountFc,
          reference,
          newValue: 'PENDING',
          note: `Création demande de retrait de ${amountFc} FC via ${provider} vers ${destination}`,
        },
      })

      return withdrawal
    },
    {
      maxWait: 20000,
      timeout: 30000,
    }
  )

  console.log('✅ Demande de retrait créée avec succès !')
  console.log(`- ID : ${result.id}`)
  console.log(`- Référence : ${result.reference}`)
  console.log(`- Montant : ${result.amountFc} FC`)
  console.log(`- Statut : ${result.status}`)
  console.log(`- Provider : ${result.provider}`)
  console.log(`- Date : ${result.createdAt.toISOString()}`)

  console.log('\n3. Vérification des nouveaux soldes en base :')
  const completedWd = await prisma.withdrawal.aggregate({
    where: { status: 'COMPLETED' },
    _sum: { amountFc: true },
  })
  const pendingWd = await prisma.withdrawal.aggregate({
    where: { status: { in: ['PENDING', 'PROCESSING'] } },
    _sum: { amountFc: true },
  })

  const gross = initialSummary._sum.amountFc || 0
  const withdrawn = completedWd._sum.amountFc || 0
  const pending = pendingWd._sum.amountFc || 0
  const available = Math.max(0, gross - withdrawn)
  const capacity = Math.max(0, available - pending)

  console.log(`- Chiffre d'affaires brut (COMPLETED) : ${gross.toLocaleString('fr-FR')} FC`)
  console.log(`- Montant retiré (COMPLETED) : ${withdrawn.toLocaleString('fr-FR')} FC`)
  console.log(`- Retraits en attente (PENDING) : ${pending.toLocaleString('fr-FR')} FC`)
  console.log(`- Solde disponible (Brut) : ${available.toLocaleString('fr-FR')} FC`)
  console.log(`- Capacité nette restante pour nouveaux retraits : ${capacity.toLocaleString('fr-FR')} FC`)
}

testActionFlow()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
