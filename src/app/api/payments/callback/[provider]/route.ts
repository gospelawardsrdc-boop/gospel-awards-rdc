import { NextRequest, NextResponse } from 'next/server'
import { handleOperatorPaymentConfirmation, handleOperatorPaymentFailure } from '@/lib/payments/service'
import { PaymentProvider } from '@/lib/payments/types'

/**
 * Endpoint universel et sécurisé pour la réception automatique des notifications de paiement
 * des opérateurs Mobile Money RDC (M-Pesa, Orange Money, Airtel Money, Afrimoney).
 *
 * Route : POST /api/payments/callback/[provider]
 * Exemples :
 * - /api/payments/callback/mpesa
 * - /api/payments/callback/orange-money
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider: rawProvider } = await params
    const normalizedProvider = rawProvider.toUpperCase().replace('-', '_') as PaymentProvider

    const body = await request.json().catch(() => ({}))

    // Extraction standardisée selon les protocoles officiels
    let transactionId = body.transactionId || body.reference || body.order_id || body.BillRefNumber
    let providerReference = body.providerReference || body.mpesa_receipt || body.notif_token || body.txnid || body.TransID || `REF-${Date.now()}`
    let amountFc = Number(body.amount || body.amountFc || body.TransAmount || 0)
    let status: 'SUCCESS' | 'FAILED' | 'CANCELLED' = 'SUCCESS'

    // Interprétation des codes de statut opérateurs standards
    if (body.status === 'FAILED' || body.ResultCode !== undefined && body.ResultCode !== 0 && body.ResultCode !== '0') {
      status = 'FAILED'
    } else if (body.status === 'CANCELLED' || body.status === 'EXPIRED') {
      status = 'CANCELLED'
    }

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Paramètre transactionId ou reference manquant' },
        { status: 400 }
      )
    }

    let currency = body.currency || body.Currency || body.cur || 'CDF'

    const result = await handleOperatorPaymentConfirmation({
      transactionId,
      providerReference,
      status,
      amountFc,
      currency,
      provider: normalizedProvider,
      rawPayload: body,
    })

    if (!result.success && !result.alreadyProcessed) {
      return NextResponse.json(
        {
          ResultCode: 1,
          ResultDesc: result.error || 'Erreur lors du traitement du paiement',
        },
        { status: 400 }
      )
    }

    // Réponse standard d'acquittement pour les passerelles
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Payment confirmed successfully',
      transactionId: result.transactionId,
      pointsCredited: result.pointsCredited,
    })
  } catch (error: any) {
    console.error('Erreur webhook paiement:', error)
    return NextResponse.json(
      { error: 'Erreur interne lors du traitement du callback de paiement' },
      { status: 500 }
    )
  }
}
