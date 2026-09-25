/**
 * Implémentations et registre des fournisseurs de retrait
 * Gospel Awards RDC
 * 
 * IMPORTANT :
 * À ce stade, les API M-Pesa RDC et Orange Money RDC ne sont PAS connectées.
 * Les classes sont prêtes pour l'intégration des API officielles (SDK / REST)
 * sans modifier le reste du système.
 */

import { PayoutProvider, PayoutProviderId, PayoutRequest, PayoutResponse } from './types'

export * from './types'

/**
 * Fournisseur M-Pesa RDC (Vodacom)
 */
class MpesaPayoutProvider implements PayoutProvider {
  readonly id: PayoutProviderId = 'MPESA'
  readonly name = 'M-Pesa RDC'
  readonly isEnabled = process.env.MPESA_ENABLED === 'true'
  readonly statusBadge = this.isEnabled ? 'Opérationnel' : 'API bientôt disponible'
  readonly description = 'Transfert automatique vers un compte M-Pesa RDC (+243)'

  async withdraw(request: PayoutRequest): Promise<PayoutResponse> {
    if (!this.isEnabled) {
      return {
        success: false,
        status: 'PENDING',
        message: 'L\'API officielle M-Pesa RDC n\'est pas encore configurée. La demande reste enregistrée en attente.',
      }
    }

    // Emplacement pour l'appel API officiel M-Pesa RDC lorsque les clés officielles seront fournies
    return {
      success: false,
      status: 'PENDING',
      message: 'Intégration API M-Pesa en attente de validation.',
    }
  }

  async getStatus(reference: string): Promise<PayoutResponse> {
    return {
      success: false,
      status: 'PENDING',
      message: 'Vérification API M-Pesa indisponible.',
    }
  }
}

/**
 * Fournisseur Orange Money RDC
 */
class OrangeMoneyPayoutProvider implements PayoutProvider {
  readonly id: PayoutProviderId = 'ORANGE_MONEY'
  readonly name = 'Orange Money RDC'
  readonly isEnabled = process.env.ORANGE_MONEY_ENABLED === 'true'
  readonly statusBadge = this.isEnabled ? 'Opérationnel' : 'API bientôt disponible'
  readonly description = 'Transfert automatique vers un compte Orange Money RDC (+243)'

  async withdraw(request: PayoutRequest): Promise<PayoutResponse> {
    if (!this.isEnabled) {
      return {
        success: false,
        status: 'PENDING',
        message: 'L\'API officielle Orange Money RDC n\'est pas encore configurée. La demande reste enregistrée en attente.',
      }
    }

    // Emplacement pour l'appel API officiel Orange Money RDC lorsque les clés officielles seront fournies
    return {
      success: false,
      status: 'PENDING',
      message: 'Intégration API Orange Money en attente de validation.',
    }
  }

  async getStatus(reference: string): Promise<PayoutResponse> {
    return {
      success: false,
      status: 'PENDING',
      message: 'Vérification API Orange Money indisponible.',
    }
  }
}

/**
 * Fournisseur Manuel (Enregistrement administratif interne)
 */
class ManualPayoutProvider implements PayoutProvider {
  readonly id: PayoutProviderId = 'MANUAL'
  readonly name = 'Retrait Manuel'
  readonly isEnabled = true
  readonly statusBadge = 'Disponible'
  readonly description = 'Enregistrement comptable d\'un décaissement effectué manuellement par l\'administrateur'

  async withdraw(request: PayoutRequest): Promise<PayoutResponse> {
    return {
      success: true,
      status: 'PENDING',
      message: 'Demande de retrait manuel créée avec succès. En attente de validation par l\'administrateur.',
    }
  }

  async getStatus(reference: string): Promise<PayoutResponse> {
    return {
      success: true,
      status: 'PENDING',
      message: 'Retrait géré manuellement.',
    }
  }
}

// Instances singleton
const providers: Record<PayoutProviderId, PayoutProvider> = {
  MPESA: new MpesaPayoutProvider(),
  ORANGE_MONEY: new OrangeMoneyPayoutProvider(),
  MANUAL: new ManualPayoutProvider(),
}

/**
 * Récupère l'instance d'un fournisseur selon son identifiant
 */
export function getPayoutProvider(providerId: PayoutProviderId | string): PayoutProvider {
  const provider = providers[providerId as PayoutProviderId]
  if (!provider) {
    return providers.MANUAL
  }
  return provider
}

/**
 * Liste l'ensemble des fournisseurs disponibles dans l'interface
 */
export function getAllPayoutProviders(): PayoutProvider[] {
  return [providers.MPESA, providers.ORANGE_MONEY, providers.MANUAL]
}
