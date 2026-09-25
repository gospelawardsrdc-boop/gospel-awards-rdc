import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import {
  PaymentOrderRequest,
  PaymentOrderResult,
  PaymentCallbackPayload,
  PaymentConfirmationResult,
  PaymentStatusQueryResult,
} from './types'

/**
 * Service centralisé pour l'orchestration des paiements automatiques Mobile Money (RDC)
 * Prêt pour le raccordement direct des SDKs officiels M-Pesa RDC et Orange Money RDC.
 */

/**
 * 1. Initiation de la commande de paiement côté serveur
 * Crée systématiquement une transaction avec le statut strict PENDING.
 * Aucun point n'est crédité à cette étape.
 */
export async function initiatePaymentOrder({
  userId,
  packageId,
  provider,
  customerPhone,
}: PaymentOrderRequest): Promise<PaymentOrderResult> {
  const pointPackage = await prisma.pointPackage.findUnique({
    where: { id: packageId },
  })

  if (!pointPackage || !pointPackage.isActive) {
    return { success: false, error: 'Pack de points introuvable ou inactif' }
  }

  // Création transaction en statut PENDING
  const transaction = await prisma.transaction.create({
    data: {
      userId,
      packageId: pointPackage.id,
      pointsAmount: pointPackage.points,
      amountFc: pointPackage.priceFc,
      status: 'PENDING',
      paymentMethod: provider,
      paymentRef: customerPhone ? `PHONE:${customerPhone}` : undefined,
    },
  })

  return {
    success: true,
    transactionId: transaction.id,
    status: 'PENDING',
    pointsAmount: transaction.pointsAmount,
    amountFc: transaction.amountFc,
    provider,
    instructions: `Paiement ${provider} initié. Veuillez confirmer la transaction sur votre téléphone.`,
  }
}

/**
 * 2. Traitement automatique du callback opérateur / webhook officiel
 * Appelé automatiquement lors de la réception de la notification de l'opérateur
 * (M-Pesa C2B/IPN ou Orange Money Webhook).
 * Exécute le passage à COMPLETED et le crédit atomique des points.
 */
export async function handleOperatorPaymentConfirmation(
  payload: PaymentCallbackPayload
): Promise<PaymentConfirmationResult> {
  const { transactionId, providerReference, status, amountFc, provider } = payload

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { user: true, package: true },
  })

  if (!transaction) {
    return { success: false, error: `Transaction ${transactionId} introuvable.` }
  }

  // Idempotence : si déjà complétée, ignorer sans doubler le crédit
  if (transaction.status === 'COMPLETED') {
    return {
      success: true,
      transactionId: transaction.id,
      pointsCredited: 0,
      newBalance: transaction.user.pointBalance,
      alreadyProcessed: true,
    }
  }

  // Si le statut envoyé par l'opérateur est un échec ou une annulation
  if (status !== 'SUCCESS') {
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: status === 'CANCELLED' ? 'CANCELLED' : 'FAILED',
        paymentRef: providerReference,
      },
    })
    return { success: false, error: `Paiement opérateur ${provider} non réussi (${status}).` }
  }

  // Vérification de la devise si renseignée (RDC : CDF ou FC obligatoire)
  if (payload.currency) {
    const normCurrency = payload.currency.toUpperCase().trim()
    if (normCurrency !== 'CDF' && normCurrency !== 'FC') {
      await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'FAILED',
          paymentRef: `${providerReference} (ERREUR_DEVISE_${normCurrency})`,
        },
      })
      return { success: false, error: `Devise invalide (${payload.currency}). Seul le Franc Congolais (CDF / FC) est accepté.` }
    }
  }

  // Vérification de sécurité stricte sur le montant (doit correspondre exactement au montant en FC du pack)
  if (amountFc !== undefined && amountFc > 0 && amountFc !== transaction.amountFc) {
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'FAILED',
        paymentRef: `${providerReference} (ERREUR_MONTANT_RECU_${amountFc}_ATTENDU_${transaction.amountFc})`,
      },
    })
    return { success: false, error: `Montant payé (${amountFc} FC) non conforme au tarif officiel du pack (${transaction.amountFc} FC).` }
  }

  // Crédit atomique et passage à COMPLETED conditionné au statut PENDING strict
  try {
    const result = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.transaction.updateMany({
        where: {
          id: transactionId,
          status: 'PENDING',
        },
        data: {
          status: 'COMPLETED',
          paymentRef: providerReference,
        },
      })

      if (updateResult.count === 0) {
        const current = await tx.transaction.findUnique({
          where: { id: transactionId },
          include: { user: true },
        })
        if (current?.status === 'COMPLETED') {
          return {
            alreadyProcessed: true,
            pointsCredited: 0,
            newBalance: current.user?.pointBalance || 0,
          }
        }
        throw new Error(`Transaction non éligible pour finalisation (Statut: ${current?.status})`)
      }

      const updatedUser = await tx.user.update({
        where: { id: transaction.userId },
        data: {
          pointBalance: { increment: transaction.pointsAmount },
        },
      })

      return {
        alreadyProcessed: false,
        pointsCredited: transaction.pointsAmount,
        newBalance: updatedUser.pointBalance,
      }
    }, {
      maxWait: 20000,
      timeout: 30000,
    })

    try {
      revalidatePath('/dashboard')
      revalidatePath('/voter')
      revalidatePath('/admin/transactions')
      revalidatePath('/admin/finances')
    } catch {}

    return {
      success: true,
      transactionId: transaction.id,
      pointsCredited: result.pointsCredited,
      newBalance: result.newBalance,
      alreadyProcessed: result.alreadyProcessed,
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur lors du traitement du paiement opérateur.' }
  }
}

/**
 * 3. Enregistrement d'un échec de paiement transmis par l'opérateur
 */
export async function handleOperatorPaymentFailure(
  transactionId: string,
  providerReference?: string
): Promise<void> {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  })

  if (transaction && transaction.status === 'PENDING') {
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'FAILED',
        paymentRef: providerReference || transaction.paymentRef,
      },
    })

    try {
      revalidatePath('/admin/transactions')
    } catch {}
  }
}

/**
 * 4. Interrogation automatique du statut auprès de la base ou de l'opérateur
 */
export async function queryPaymentStatus(transactionId: string): Promise<PaymentStatusQueryResult | null> {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  })

  if (!transaction) return null

  return {
    transactionId: transaction.id,
    status: transaction.status as any,
    providerReference: transaction.paymentRef || undefined,
    amountFc: transaction.amountFc,
    pointsAmount: transaction.pointsAmount,
    isFinal: transaction.status === 'COMPLETED' || transaction.status === 'FAILED' || transaction.status === 'CANCELLED',
    message:
      transaction.status === 'COMPLETED'
        ? 'Paiement confirmé et points crédités avec succès.'
        : transaction.status === 'PENDING'
        ? 'Paiement en cours de traitement par l\'opérateur.'
        : 'Paiement non complété.',
  }
}
