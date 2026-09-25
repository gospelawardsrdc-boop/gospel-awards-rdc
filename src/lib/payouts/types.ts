/**
 * Types & Interfaces pour l'architecture modulaire des fournisseurs de retraits (Payout Providers)
 * Gospel Awards RDC
 */

export type PayoutProviderId = 'MPESA' | 'ORANGE_MONEY' | 'MANUAL'

export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

export interface PayoutRequest {
  withdrawalId: string
  reference: string
  amountFc: number
  destination: string
  destinationName?: string
  note?: string
  idempotencyKey?: string
}

export interface PayoutResponse {
  success: boolean
  status: PayoutStatus
  providerReference?: string
  message: string
  rawResponse?: Record<string, unknown>
}

export interface PayoutProvider {
  readonly id: PayoutProviderId
  readonly name: string
  readonly isEnabled: boolean
  readonly statusBadge: string
  readonly description: string

  /**
   * Initie ou exécute un paiement sortant vers le destinataire
   */
  withdraw(request: PayoutRequest): Promise<PayoutResponse>

  /**
   * Vérifie le statut d'un transfert auprès du fournisseur
   */
  getStatus(reference: string): Promise<PayoutResponse>
}
