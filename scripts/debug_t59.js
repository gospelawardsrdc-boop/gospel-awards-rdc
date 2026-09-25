const { createRequire } = require('module')
const requireFromApp = createRequire('c:/Users/BOBOZO/Documents/VENDEUR+/Gospel Awards RDC 01/package.json')
const { PrismaClient } = requireFromApp('@prisma/client')

const prisma = new PrismaClient()

async function testWd() {
  const cTx = await prisma.transaction.aggregate({ where: { status: 'COMPLETED' }, _sum: { amountFc: true } })
  const cWd = await prisma.withdrawal.aggregate({ where: { status: 'COMPLETED' }, _sum: { amountFc: true } })
  const pWd = await prisma.withdrawal.aggregate({ where: { status: { in: ['PENDING', 'PROCESSING'] } }, _sum: { amountFc: true } })
  const gross = cTx._sum.amountFc || 0
  const withdrawn = cWd._sum.amountFc || 0
  const pending = pWd._sum.amountFc || 0
  const maxCap = Math.max(0, gross - withdrawn - pending)
  console.log('Gross:', gross, 'Withdrawn:', withdrawn, 'Pending:', pending, 'MaxCap:', maxCap)

  const requestWdAtomic = async (amt, admin, key) => {
    return prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(742910481)')
      const inTxGross = (await tx.transaction.aggregate({ where: { status: 'COMPLETED' }, _sum: { amountFc: true } }))._sum.amountFc || 0
      const inTxWithdrawn = (await tx.withdrawal.aggregate({ where: { status: 'COMPLETED' }, _sum: { amountFc: true } }))._sum.amountFc || 0
      const inTxPending = (await tx.withdrawal.aggregate({ where: { status: { in: ['PENDING', 'PROCESSING'] } }, _sum: { amountFc: true } }))._sum.amountFc || 0
      const inTxCap = Math.max(0, inTxGross - inTxWithdrawn - inTxPending)
      console.log(`[${admin}] inTxCap:`, inTxCap, 'amt:', amt)
      if (amt > inTxCap) throw new Error('INSUFFICIENT_CAPACITY')
      return tx.withdrawal.create({
        data: {
          amountFc: amt,
          provider: 'MANUAL',
          destination: 'Caisse Test',
          status: 'PENDING',
          reference: `GA-WD-TEST-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          idempotencyKey: key,
          requestedBy: admin,
        }
      })
    }, { maxWait: 20000, timeout: 30000 })
  }

  const ask = Math.max(1000, Math.floor(maxCap * 0.75))
  console.log('Testing 2 simultaneous requests of', ask, 'FC (Total:', ask * 2, 'FC vs MaxCap:', maxCap, 'FC)')
  const [r1, r2] = await Promise.allSettled([
    requestWdAtomic(ask, 'Admin 1', `ik_test_1_${Date.now()}`),
    requestWdAtomic(ask, 'Admin 2', `ik_test_2_${Date.now()}`),
  ])
  console.log('Result 1:', r1.status, r1.status === 'rejected' ? r1.reason?.message : r1.value.id)
  console.log('Result 2:', r2.status, r2.status === 'rejected' ? r2.reason?.message : r2.value.id)

  const created = [r1, r2].filter(r => r.status === 'fulfilled').map(r => r.value.id)
  for (const id of created) {
    await prisma.withdrawal.delete({ where: { id } })
  }
}

testWd().then(() => prisma.$disconnect()).catch(err => { console.error(err); prisma.$disconnect(); })
