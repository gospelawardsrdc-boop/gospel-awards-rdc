'use client'

import { useActionState, useState } from 'react'
import { requestWithdrawalAction } from '@/actions/finances'
import { formatCurrency } from '@/lib/utils'

interface Props {
  isOpen: boolean
  onClose: () => void
  availableBalance: number
  pendingWithdrawalsAmount: number
  netCapacity: number
}

export default function WithdrawalModal({
  isOpen,
  onClose,
  availableBalance,
  pendingWithdrawalsAmount,
  netCapacity,
}: Props) {
  const [state, formAction, isPending] = useActionState(requestWithdrawalAction, null)
  const [selectedProvider, setSelectedProvider] = useState<'MPESA' | 'ORANGE_MONEY' | 'MANUAL'>('MPESA')
  const [amount, setAmount] = useState<number | ''>('')
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => `wd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`)

  // Reset idempotency key when opening or after success
  const handleClose = () => {
    setIdempotencyKey(`wd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0D1224] border border-gold/30 rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/[0.08] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">💰</span>
              <h3 className="text-lg font-black text-white">Demande de Retrait Administratif</h3>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Préparez un décaissement vers un compte Mobile Money ou enregistrez un retrait manuel.
            </p>
          </div>
          <button
            onClick={handleClose}
            type="button"
            className="text-gray-400 hover:text-white text-lg p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Balance Info Banner */}
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-gold/[0.05] border border-gold/20">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 block">
              Solde Brut Disponible
            </span>
            <span className="text-sm font-black text-white">{formatCurrency(availableBalance)}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 block">
              Capacité Nette de Retrait
            </span>
            <span className="text-sm font-black text-emerald-400">{formatCurrency(netCapacity)}</span>
          </div>
          {pendingWithdrawalsAmount > 0 && (
            <div className="col-span-2 pt-1 border-t border-gold/10 text-[10px] text-amber-400">
              ⚠️ {formatCurrency(pendingWithdrawalsAmount)} déjà en cours de validation.
            </div>
          )}
        </div>

        {/* Feedback Messages */}
        {state?.error && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium">
            ❌ {state.error}
          </div>
        )}

        {state?.success && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
            ✅ {state.message}
          </div>
        )}

        {/* Form */}
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          {/* Montant */}
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              Montant du Retrait (FC) <span className="text-gold">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                name="amountFc"
                required
                min={1}
                max={netCapacity}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Ex: 50000"
                className="input-field !text-base !font-bold text-gold placeholder:text-gray-600 w-full"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                FC
              </span>
            </div>

            {/* Quick Amount Buttons */}
            {netCapacity > 0 && (
              <div className="flex gap-2 mt-2">
                {[
                  { label: '25%', val: Math.floor(netCapacity * 0.25) },
                  { label: '50%', val: Math.floor(netCapacity * 0.5) },
                  { label: '75%', val: Math.floor(netCapacity * 0.75) },
                  { label: 'Max (100%)', val: netCapacity },
                ].map((pct) => (
                  <button
                    key={pct.label}
                    type="button"
                    onClick={() => setAmount(pct.val)}
                    className="text-[10px] font-bold px-2 py-1 rounded bg-white/[0.05] hover:bg-gold/20 text-gray-300 hover:text-gold transition-colors border border-white/[0.06]"
                  >
                    {pct.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fournisseur */}
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
              Fournisseur de Paiement <span className="text-gold">*</span>
            </label>
            <input type="hidden" name="provider" value={selectedProvider} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* M-Pesa */}
              <button
                type="button"
                onClick={() => setSelectedProvider('MPESA')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedProvider === 'MPESA'
                    ? 'bg-rose-500/10 border-rose-500/60 text-white shadow-lg'
                    : 'bg-surface/50 border-white/[0.06] text-gray-400 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">M-Pesa RDC</span>
                  <span className="text-xs">🔴</span>
                </div>
                <span className="inline-block mt-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  API bientôt disponible
                </span>
              </button>

              {/* Orange Money */}
              <button
                type="button"
                onClick={() => setSelectedProvider('ORANGE_MONEY')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedProvider === 'ORANGE_MONEY'
                    ? 'bg-orange-500/10 border-orange-500/60 text-white shadow-lg'
                    : 'bg-surface/50 border-white/[0.06] text-gray-400 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">Orange Money</span>
                  <span className="text-xs">🟠</span>
                </div>
                <span className="inline-block mt-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  API bientôt disponible
                </span>
              </button>

              {/* Manuel */}
              <button
                type="button"
                onClick={() => setSelectedProvider('MANUAL')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedProvider === 'MANUAL'
                    ? 'bg-gold/[0.12] border-gold text-white shadow-lg'
                    : 'bg-surface/50 border-white/[0.06] text-gray-400 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">Manuel</span>
                  <span className="text-xs">✍️</span>
                </div>
                <span className="inline-block mt-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Disponible
                </span>
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">
              {selectedProvider === 'MANUAL'
                ? 'ℹ️ Enregistrement administratif pour documenter un retrait effectué manuellement par l\'administrateur.'
                : 'ℹ️ La demande sera enregistrée avec le statut EN ATTENTE. Le virement automatique sera exécuté dès le raccordement de l\'API officielle.'}
            </p>
          </div>

          {/* Numéro / Compte de destination */}
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              Numéro Destinataire / Compte <span className="text-gold">*</span>
            </label>
            <input
              type="text"
              name="destination"
              required
              placeholder={selectedProvider === 'MANUAL' ? 'Ex: Caisse Principale / Compte Bancaire' : '+243 81X XXX XXX'}
              className="input-field !text-xs w-full"
            />
          </div>

          {/* Nom du bénéficiaire */}
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              Nom du Bénéficiaire (Optionnel)
            </label>
            <input
              type="text"
              name="destinationName"
              placeholder="Ex: Trésorerie Gospel Awards RDC"
              className="input-field !text-xs w-full"
            />
          </div>

          {/* Note / Justificatif */}
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              Note ou Motif (Optionnel)
            </label>
            <textarea
              name="note"
              rows={2}
              placeholder="Ex: Décaissement pour logistique événementielle..."
              className="input-field !text-xs w-full resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary !text-xs !py-2.5 !px-5"
            >
              Fermer
            </button>
            <button
              type="submit"
              disabled={isPending || netCapacity <= 0}
              className="btn-primary !text-xs !py-2.5 !px-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Enregistrement...' : '⚡ Confirmer la Demande'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
