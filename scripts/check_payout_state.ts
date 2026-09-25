import { PrismaClient } from '@prisma/client'

const url = process.env.DIRECT_URL || process.env.DATABASE_URL || 'postgresql://postgres.ggqgodbfdfnneusrzzwp:Rdcawa2026%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres'

// Append connection parameters if not present
const finalUrl = url.includes('?') ? `${url}&connect_timeout=30` : `${url}?connect_timeout=30`

const prisma = new PrismaClient({
  datasourceUrl: finalUrl
})

async function checkState() {
  console.log('=== VÉRIFICATION DE L\'ÉTAT FINANCIER & BASE SUPABASE ===\n')

  // 1. Transactions existantes
  const txs = await prisma.transaction.findMany({
    include: { user: true, package: true },
    orderBy: { createdAt: 'desc' }
  })
  console.log(`Nombre total de transactions : ${txs.length}`)
  for (const t of txs) {
    console.log(`- Tx ${t.id} : ${t.amountFc} FC | Statut : ${t.status} | User : ${t.user.name}`)
  }

  // 2. Retraits existants
  const wds = await prisma.withdrawal.findMany({
    orderBy: { createdAt: 'desc' }
  })
  console.log(`\nNombre total de retraits : ${wds.length}`)
  for (const w of wds) {
    console.log(`- Withdrawal ${w.id} (${w.reference}) : ${w.amountFc} FC | Statut : ${w.status} | Provider : ${w.provider}`)
  }

  // 3. Calculs financiers
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

  console.log('\n=== RÉSULTATS DU GRAND LIVRE ===')
  console.log(`Chiffre d'affaires brut (COMPLETED) : ${gross.toLocaleString('fr-FR')} FC`)
  console.log(`Montant retiré (COMPLETED) : ${withdrawn.toLocaleString('fr-FR')} FC`)
  console.log(`Retraits en attente : ${pending.toLocaleString('fr-FR')} FC`)
  console.log(`Solde disponible (Brut) : ${available.toLocaleString('fr-FR')} FC`)
  console.log(`Capacité nette de retrait : ${capacity.toLocaleString('fr-FR')} FC`)
}

checkState()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
