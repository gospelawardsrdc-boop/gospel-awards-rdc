'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

/**
 * Calcule en temps réel l'ensemble des métriques du grand livre financier (Ledger)
 * à partir des véritables transactions et retraits en base de données.
 * 
 * Optimisé : utilise des agrégations groupées pour réduire l'empreinte sur le pool de connexions (2 requêtes SQL au lieu de 11).
 */
export async function getFinancialSummary() {
  const [txGroup, wdGroup] = await Promise.all([
    // Groupement des transactions par statut (1 seule requête SQL)
    prisma.transaction.groupBy({
      by: ['status'],
      _sum: { amountFc: true, pointsAmount: true },
      _count: { _all: true },
    }),
    // Groupement des retraits par statut (1 seule requête SQL)
    prisma.withdrawal.groupBy({
      by: ['status'],
      _sum: { amountFc: true },
      _count: { _all: true },
    }),
  ])

  // Extraction des métriques de transactions
  let grossRevenue = 0
  let pointsDistributed = 0
  let pendingRevenueAmount = 0
  let completedTxCount = 0
  let pendingTxCount = 0
  let failedTxCount = 0
  let totalTxCount = 0

  for (const g of txGroup) {
    totalTxCount += g._count._all
    if (g.status === 'COMPLETED') {
      grossRevenue += g._sum.amountFc || 0
      pointsDistributed += g._sum.pointsAmount || 0
      completedTxCount += g._count._all
    } else if (g.status === 'PENDING') {
      pendingRevenueAmount += g._sum.amountFc || 0
      pendingTxCount += g._count._all
    } else if (g.status === 'FAILED') {
      failedTxCount += g._count._all
    }
  }

  // Extraction des métriques de retraits
  let totalWithdrawn = 0
  let pendingWithdrawalsAmount = 0
  let completedWithdrawalsCount = 0
  let pendingWithdrawalsCount = 0
  let totalWithdrawalsCount = 0

  for (const w of wdGroup) {
    totalWithdrawalsCount += w._count._all
    if (w.status === 'COMPLETED') {
      totalWithdrawn += w._sum.amountFc || 0
      completedWithdrawalsCount += w._count._all
    } else if (w.status === 'PENDING' || w.status === 'PROCESSING') {
      pendingWithdrawalsAmount += w._sum.amountFc || 0
      pendingWithdrawalsCount += w._count._all
    }
  }

  const paymentFees = 0 // Prêt pour enregistrer les frais opérateur réels
  const refunds = 0 // Prêt pour les remboursements réels

  // SOLDE DISPONIBLE = Revenus validés - Frais - Remboursements - Retraits COMPLETED
  const availableBalance = Math.max(0, grossRevenue - paymentFees - refunds - totalWithdrawn)

  // Capacité de retrait nette immédiate
  const netWithdrawalCapacity = Math.max(0, availableBalance - pendingWithdrawalsAmount)

  return {
    grossRevenue,
    pointsDistributed,
    paymentFees,
    refunds,
    totalWithdrawn,
    availableBalance,
    pendingWithdrawalsAmount,
    pendingRevenueAmount,
    netWithdrawalCapacity,
    totalTxCount,
    completedTxCount,
    pendingTxCount,
    failedTxCount,
    totalWithdrawalsCount,
    pendingWithdrawalsCount,
    completedWithdrawalsCount,
  }
}

/**
 * Server Action : Demander un retrait administratif
 * Vérification stricte des autorisations ADMIN, du solde, des entrées et protection d'idempotence
 */
export async function requestWithdrawalAction(prevState: any, formData: FormData) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return { error: 'Accès non autorisé. Réservé aux administrateurs.' }
  }

  const amountStr = formData.get('amountFc') as string
  const provider = (formData.get('provider') as string)?.trim()?.toUpperCase()
  const destination = (formData.get('destination') as string)?.trim()
  const destinationName = (formData.get('destinationName') as string)?.trim() || null
  const note = (formData.get('note') as string)?.trim() || null
  const idempotencyKey = (formData.get('idempotencyKey') as string)?.trim() || null

  // 1. Validation du montant
  const amountFc = Number(amountStr)
  if (
    isNaN(amountFc) ||
    !isFinite(amountFc) ||
    !Number.isInteger(amountFc) ||
    amountFc <= 0
  ) {
    return { error: 'Le montant du retrait doit être un entier positif supérieur à 0 FC.' }
  }

  // 2. Validation du fournisseur
  const validProviders = ['MPESA', 'ORANGE_MONEY', 'MANUAL']
  if (!provider || !validProviders.includes(provider)) {
    return { error: 'Fournisseur de retrait invalide. Veuillez sélectionner M-Pesa, Orange Money ou Manuel.' }
  }

  // 3. Validation de la destination
  if (!destination || destination.length < 4) {
    return { error: 'Le numéro de téléphone ou compte de destination est requis.' }
  }

  // 4. Protection d'Idempotence préalable : Vérifier si ce retrait a déjà été créé avec cette clé
  if (idempotencyKey) {
    try {
      const existingWithdrawal = await prisma.withdrawal.findUnique({
        where: { idempotencyKey },
      })
      if (existingWithdrawal) {
        return {
          success: true,
          message: `Demande de retrait ${existingWithdrawal.reference} déjà enregistrée (${existingWithdrawal.amountFc.toLocaleString('fr-FR')} FC, Statut : ${existingWithdrawal.status}).`,
        }
      }
    } catch (checkErr) {
      console.warn('Idempotency pre-check warning:', checkErr)
    }
  }

  const adminName = session.user.name || session.user.email || 'Admin'
  const adminId = (session.user as any).id || session.user.email || 'admin'

  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
  const reference = `GA-WD-${timestamp}-${randomSuffix}`

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Verrou transactionnel exclusif PostgreSQL (Advisory Xact Lock)
        // Garantit la sérialisation stricte des retraits concurrents.
        // Libéré automatiquement à la fin de la transaction (COMMIT ou ROLLBACK).
        await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(742910481)')

        // 2. Double vérification d'idempotence sous transaction
        if (idempotencyKey) {
          const inTxExisting = await tx.withdrawal.findUnique({
            where: { idempotencyKey },
          })
          if (inTxExisting) {
            return inTxExisting
          }
        }

        // 3. Recalcul temps réel du solde disponible et des réserves sous verrou
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
        const paymentFees = 0 // Frais opérateurs réels (0 actuellement)
        const refunds = 0 // Remboursements réels (0 actuellement)

        const availableBalance = Math.max(0, currentGross - paymentFees - refunds - currentWithdrawn)
        const maxAllowed = Math.max(0, availableBalance - currentPendingWd)

        if (amountFc > maxAllowed) {
          throw new Error(
            `Solde insuffisant pour ce retrait. Capacité disponible : ${maxAllowed.toLocaleString('fr-FR')} FC (Solde brut : ${availableBalance.toLocaleString('fr-FR')} FC, En attente : ${currentPendingWd.toLocaleString('fr-FR')} FC).`
          )
        }

        // Création de la demande de retrait avec clé d'idempotence
        const withdrawal = await tx.withdrawal.create({
          data: {
            amountFc,
            provider,
            destination,
            destinationName,
            status: 'PENDING',
            reference,
            idempotencyKey,
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
            note: `Création demande de retrait de ${amountFc} FC via ${provider} vers ${destination}${destinationName ? ` (${destinationName})` : ''}`,
          },
        })

        return withdrawal
      },
      {
        maxWait: 20000,
        timeout: 30000,
      }
    )

    try {
      revalidatePath('/admin/finances')
      revalidatePath('/admin')
    } catch {}

    return {
      success: true,
      message: `Demande de retrait ${result.reference} de ${amountFc.toLocaleString('fr-FR')} FC créée avec succès (Statut : EN ATTENTE).`,
    }
  } catch (err: any) {
    // Si une erreur de timeout de réponse survient, vérifier si l'opération a en réalité été COMMITTED
    if (idempotencyKey) {
      try {
        const committed = await prisma.withdrawal.findUnique({
          where: { idempotencyKey },
        })
        if (committed) {
          return {
            success: true,
            message: `Demande de retrait ${committed.reference} de ${committed.amountFc.toLocaleString('fr-FR')} FC confirmée et enregistrée en base (Statut : ${committed.status}).`,
          }
        }
      } catch {}
    }

    return { error: err.message || 'Une erreur est survenue lors de la création de la demande de retrait.' }
  }
}

/**
 * Server Action : Marquer un retrait comme COMPLETED (Traitement et confirmation)
 */
export async function completeWithdrawalAction(formData: FormData) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return { error: 'Accès non autorisé.' }
  }

  const withdrawalId = formData.get('withdrawalId') as string
  const adminName = session.user.name || session.user.email || 'Admin'
  const adminId = (session.user as any).id || session.user.email || 'admin'
  const confirmationNote = (formData.get('note') as string)?.trim() || null

  if (!withdrawalId) {
    return { error: 'Identifiant de retrait manquant.' }
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const existing = await tx.withdrawal.findUnique({
          where: { id: withdrawalId },
        })

        if (!existing) {
          throw new Error('Retrait introuvable.')
        }

        // Validation atomique conditionnée aux statuts PENDING / PROCESSING (anti-race condition)
        const updateRes = await tx.withdrawal.updateMany({
          where: {
            id: withdrawalId,
            status: { in: ['PENDING', 'PROCESSING'] },
          },
          data: {
            status: 'COMPLETED',
            processedBy: adminName,
            processedAt: new Date(),
            note: confirmationNote || existing.note,
          },
        })

        if (updateRes.count === 0) {
          throw new Error('Ce retrait a déjà été finalisé, annulé ou n\'est plus éligible pour validation.')
        }

        await tx.financialAuditLog.create({
          data: {
            action: 'WITHDRAWAL_COMPLETED',
            actorId: adminId,
            actorName: adminName,
            amountFc: existing.amountFc,
            reference: existing.reference,
            oldValue: existing.status,
            newValue: 'COMPLETED',
            note: confirmationNote ? `Validé avec note: ${confirmationNote}` : 'Retrait confirmé et déduit du solde disponible',
          },
        })
      },
      {
        maxWait: 20000,
        timeout: 30000,
      }
    )

    try {
      revalidatePath('/admin/finances')
      revalidatePath('/admin')
    } catch {}

    return { success: true, message: 'Retrait confirmé avec succès.' }
  } catch (err: any) {
    return { error: err.message || 'Erreur lors de la validation du retrait.' }
  }
}

/**
 * Server Action : Annuler une demande de retrait
 */
export async function cancelWithdrawalAction(formData: FormData) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return { error: 'Accès non autorisé.' }
  }

  const withdrawalId = formData.get('withdrawalId') as string
  const reason = (formData.get('reason') as string)?.trim() || 'Annulé par l\'administrateur'
  const adminName = session.user.name || session.user.email || 'Admin'
  const adminId = (session.user as any).id || session.user.email || 'admin'

  if (!withdrawalId) {
    return { error: 'Identifiant de retrait manquant.' }
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const existing = await tx.withdrawal.findUnique({
          where: { id: withdrawalId },
        })

        if (!existing) {
          throw new Error('Retrait introuvable.')
        }

        // Annulation atomique conditionnée aux statuts PENDING / PROCESSING (anti-race condition)
        const updateRes = await tx.withdrawal.updateMany({
          where: {
            id: withdrawalId,
            status: { in: ['PENDING', 'PROCESSING'] },
          },
          data: {
            status: 'CANCELLED',
            processedBy: adminName,
            processedAt: new Date(),
            note: reason,
          },
        })

        if (updateRes.count === 0) {
          throw new Error('Un retrait déjà finalisé ou annulé ne peut pas être annulé.')
        }

        await tx.financialAuditLog.create({
          data: {
            action: 'WITHDRAWAL_CANCELLED',
            actorId: adminId,
            actorName: adminName,
            amountFc: existing.amountFc,
            reference: existing.reference,
            oldValue: existing.status,
            newValue: 'CANCELLED',
            note: `Annulation du retrait : ${reason}`,
          },
        })
      },
      {
        maxWait: 20000,
        timeout: 30000,
      }
    )

    try {
      revalidatePath('/admin/finances')
      revalidatePath('/admin')
    } catch {}

    return { success: true, message: 'Demande de retrait annulée avec succès.' }
  } catch (err: any) {
    return { error: err.message || 'Erreur lors de l\'annulation du retrait.' }
  }
}
