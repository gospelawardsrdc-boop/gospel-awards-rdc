/**
 * Types et interfaces normalisés pour l'intégration des passerelles de paiement Mobile Money RDC
 * (M-Pesa RDC / Vodacom, Orange Money RDC, Airtel Money RDC, Afrimoney)
 */

export type PaymentProvider = 'MPESA' | 'ORANGE_MONEY' | 'AIRTEL_MONEY' | 'AFRIMONEY'

export type PaymentTransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'EXPIRED'

export interface PaymentOrderRequest {
  userId: string
  packageId: string
  provider: PaymentProvider
  customerPhone?: string
}

export interface PaymentOrderResult {
  success: boolean
  transactionId?: string
  status?: PaymentTransactionStatus
  pointsAmount?: number
  amountFc?: number
  provider?: PaymentProvider
  operatorReference?: string
  instructions?: string
  error?: string
}

export interface PaymentCallbackPayload {
  transactionId: string
  providerReference: string
  status: 'SUCCESS' | 'FAILED' | 'CANCELLED'
  amountFc: number
  currency?: string
  provider: PaymentProvider
  rawPayload?: Record<string, any>
}

export interface PaymentConfirmationResult {
  success: boolean
  transactionId?: string
  pointsCredited?: number
  newBalance?: number
  alreadyProcessed?: boolean
  error?: string
}

export interface PaymentStatusQueryResult {
  transactionId: string
  status: PaymentTransactionStatus
  providerReference?: string
  amountFc: number
  pointsAmount: number
  isFinal: boolean
  message?: string
}
