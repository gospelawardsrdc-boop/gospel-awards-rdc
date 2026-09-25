'use client'

import { useState } from 'react'
import WithdrawalModal from '@/components/admin/WithdrawalModal'
import { completeWithdrawalAction, cancelWithdrawalAction } from '@/actions/finances'
import { formatCurrency, formatDate } from '@/lib/utils'

interface SummaryData {
  grossRevenue: number
  pointsDistributed: number
  paymentFees: number
  refunds: number
  totalWithdrawn: number
  availableBalance: number
  pendingWithdrawalsAmount: number
  pendingRevenueAmount: number
  netWithdrawalCapacity: number
  totalTxCount: number
  completedTxCount: number
  pendingTxCount: number
  failedTxCount: number
  totalWithdrawalsCount: number
  pendingWithdrawalsCount: number
  completedWithdrawalsCount: number
}

interface Props {
  summary: SummaryData
  pendingWithdrawals: any[]
  allWithdrawals: any[]
  recentTransactions: any[]
  auditLogs: any[]
}

export default function FinancesClient({
  summary,
  pendingWithdrawals,
  allWithdrawals,
  recentTransactions,
  auditLogs,
}: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [providerFilter, setProviderFilter] = useState<string>('ALL')

  const filteredWithdrawals = allWithdrawals.filter((w) => {
    if (statusFilter !== 'ALL' && w.status !== statusFilter) return false
    if (providerFilter !== 'ALL' && w.provider !== providerFilter) return false
    return true
  })

  return (
    <div className="space-y-8">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div>
          <span className="text-xs font-semibold text-gold uppercase tracking-[0.2em] mb-1 block">
            Gestion Financière & Trésorerie
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Finances & <span className="gold-text">Retraits</span>
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            Suivi des revenus issus des achats de points et gestion des décaissements Mobile Money.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="btn-primary !text-xs !py-3 !px-6 shadow-xl flex items-center gap-2"
          >
            <span>💰</span>
            <span>Demander un Retrait</span>
          </button>
        </div>
      </div>

      {/* 4 Main Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CA Brut */}
        <div className="premium-card p-5 border-emerald-500/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              💵 Chiffre d&apos;Affaires Brut
            </span>
            <span className="text-xs">📈</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white mt-2">
            {formatCurrency(summary.grossRevenue)}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            {summary.completedTxCount} recharge{summary.completedTxCount > 1 ? 's' : ''} validée{summary.completedTxCount > 1 ? 's' : ''}
          </div>
        </div>

        {/* Frais de Paiement */}
        <div className="premium-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              📉 Frais Opérateurs
            </span>
            <span className="text-xs">🏷️</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-gray-300 mt-2">
            {formatCurrency(summary.paymentFees)}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            0% (Prêt pour passerelles réelles)
          </div>
        </div>

        {/* Remboursements */}
        <div className="premium-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              ↩️ Remboursements
            </span>
            <span className="text-xs">🔄</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-gray-300 mt-2">
            {formatCurrency(summary.refunds)}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            0 FC (Aucun litige)
          </div>
        </div>

        {/* Montant Retiré */}
        <div className="premium-card p-5 border-rose-500/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
              📤 Total Retiré
            </span>
            <span className="text-xs">🏦</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-400 mt-2">
            {formatCurrency(summary.totalWithdrawn)}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            {summary.completedWithdrawalsCount} retrait{summary.completedWithdrawalsCount > 1 ? 's' : ''} effectué{summary.completedWithdrawalsCount > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Large Dedicated « Solde Disponible » Card */}
      <div className="premium-card p-6 lg:p-8 bg-gradient-to-br from-surface via-[#0d1326] to-surface border border-gold/30 shadow-2xl glow-gold">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💎</span>
              <span className="text-xs font-black text-gold uppercase tracking-[0.25em]">
                Grand Livre de Trésorerie
              </span>
            </div>
            <h2 className="text-sm font-bold text-gray-300">
              SOLDE NET DISPONIBLE POUR RETRAIT
            </h2>
            <div className="text-3xl sm:text-5xl font-black text-white tracking-tight flex items-baseline gap-2">
              <span className="gold-text">{formatCurrency(summary.availableBalance)}</span>
            </div>
            <p className="text-xs text-gray-400 max-w-xl leading-relaxed">
              Formule comptable : <strong>Revenus validés</strong> ({formatCurrency(summary.grossRevenue)}) 
              − <strong>Frais</strong> ({formatCurrency(summary.paymentFees)}) 
              − <strong>Remboursements</strong> ({formatCurrency(summary.refunds)}) 
              − <strong>Retraits décaissés</strong> ({formatCurrency(summary.totalWithdrawn)}).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 min-w-[240px]">
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.08] text-xs">
              <div className="text-[10px] uppercase font-bold text-gray-400">Capacité de retrait immédiate</div>
              <div className="text-base font-black text-emerald-400 mt-0.5">
                {formatCurrency(summary.netWithdrawalCapacity)}
              </div>
              {summary.pendingWithdrawalsAmount > 0 && (
                <div className="text-[10px] text-amber-400/90 mt-1">
                  ⏳ {formatCurrency(summary.pendingWithdrawalsAmount)} en attente
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              disabled={summary.netWithdrawalCapacity <= 0}
              className="btn-primary !text-xs !py-3.5 !px-6 w-full text-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Demander un Retrait →
            </button>
          </div>
        </div>
      </div>

      {/* Retraits en Attente de Traitement (si présents) */}
      {pendingWithdrawals.length > 0 && (
        <div className="premium-card p-6 border-amber-500/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <span>Retraits en Attente de Traitement ({pendingWithdrawals.length})</span>
            </h2>
            <span className="text-xs font-bold text-amber-400">
              Total : {formatCurrency(summary.pendingWithdrawalsAmount)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b border-white/[0.06]">
                  <th className="pb-2.5 font-semibold">Référence</th>
                  <th className="pb-2.5 font-semibold">Montant</th>
                  <th className="pb-2.5 font-semibold">Fournisseur</th>
                  <th className="pb-2.5 font-semibold">Bénéficiaire / Destination</th>
                  <th className="pb-2.5 font-semibold">Demandé par</th>
                  <th className="pb-2.5 font-semibold">Date</th>
                  <th className="pb-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {pendingWithdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-white/[0.01]">
                    <td className="py-3 font-mono text-gold font-bold">{w.reference}</td>
                    <td className="py-3 font-black text-white text-sm">{formatCurrency(w.amountFc)}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-white/[0.05] text-[10px] font-bold text-gray-300">
                        {w.provider}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="font-medium text-white">{w.destination}</div>
                      {w.destinationName && (
                        <div className="text-[10px] text-gray-400">{w.destinationName}</div>
                      )}
                    </td>
                    <td className="py-3 text-gray-400">{w.requestedBy}</td>
                    <td className="py-3 text-gray-500">{formatDate(w.createdAt)}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Confirmer */}
                        <form
                          action={async (formData) => {
                            await completeWithdrawalAction(formData)
                          }}
                        >
                          <input type="hidden" name="withdrawalId" value={w.id} />
                          <button
                            type="submit"
                            title="Confirmer le décaissement et déduire définitivement du solde"
                            className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold rounded-lg border border-emerald-500/30 transition-colors"
                          >
                            ✓ Valider Retrait
                          </button>
                        </form>

                        {/* Annuler */}
                        <form
                          action={async (formData) => {
                            await cancelWithdrawalAction(formData)
                          }}
                        >
                          <input type="hidden" name="withdrawalId" value={w.id} />
                          <button
                            type="submit"
                            title="Annuler la demande de retrait"
                            className="px-2.5 py-1 bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold rounded-lg border border-rose-500/30 transition-colors"
                          >
                            ✕ Annuler
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Historique des Retraits */}
      <div className="premium-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              📋 <span>Historique des Retraits</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Registre de toutes les demandes de décaissement enregistrées.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Statut filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field !text-xs !py-1.5 !px-3"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="COMPLETED">COMPLETED (Validés)</option>
              <option value="PENDING">PENDING (En attente)</option>
              <option value="CANCELLED">CANCELLED (Annulés)</option>
            </select>

            {/* Provider filter */}
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="input-field !text-xs !py-1.5 !px-3"
            >
              <option value="ALL">Tous les opérateurs</option>
              <option value="MPESA">M-Pesa RDC</option>
              <option value="ORANGE_MONEY">Orange Money</option>
              <option value="MANUAL">Manuel</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 border-b border-white/[0.06]">
                <th className="pb-3 font-semibold">Date Demande</th>
                <th className="pb-3 font-semibold">Montant</th>
                <th className="pb-3 font-semibold">Fournisseur</th>
                <th className="pb-3 font-semibold">Destination</th>
                <th className="pb-3 font-semibold">Référence</th>
                <th className="pb-3 font-semibold text-center">Statut</th>
                <th className="pb-3 font-semibold">Administrateur</th>
                <th className="pb-3 font-semibold text-right">Date Traitement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {filteredWithdrawals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    Aucun retrait enregistré pour ces critères.
                  </td>
                </tr>
              ) : (
                filteredWithdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-white/[0.01]">
                    <td className="py-3 text-gray-400">{formatDate(w.createdAt)}</td>
                    <td className="py-3 font-black text-white">{formatCurrency(w.amountFc)}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-white/[0.05] text-[10px] font-bold text-gray-300">
                        {w.provider}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="font-medium text-white">{w.destination}</div>
                      {w.destinationName && (
                        <div className="text-[10px] text-gray-400">{w.destinationName}</div>
                      )}
                    </td>
                    <td className="py-3 font-mono text-gold font-bold">{w.reference}</td>
                    <td className="py-3 text-center">
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                          w.status === 'COMPLETED'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : w.status === 'PENDING'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {w.status === 'COMPLETED' ? 'VALIDÉ' : w.status === 'PENDING' ? 'EN ATTENTE' : w.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400">
                      <div>{w.requestedBy}</div>
                      {w.processedBy && w.processedBy !== w.requestedBy && (
                        <div className="text-[10px] text-gray-500">Traité par : {w.processedBy}</div>
                      )}
                    </td>
                    <td className="py-3 text-right text-gray-500">
                      {w.processedAt ? formatDate(w.processedAt) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transactions Récentes Alimentant les Revenus */}
      <div className="premium-card p-6">
        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          💳 <span>Dernières Recharges de Points (Alimentation Trésorerie)</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 border-b border-white/[0.06]">
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">Utilisateur</th>
                <th className="pb-3 font-semibold">Pack</th>
                <th className="pb-3 font-semibold text-right">Points Émis</th>
                <th className="pb-3 font-semibold text-right">Montant Encaissé</th>
                <th className="pb-3 font-semibold text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {recentTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-white/[0.01]">
                  <td className="py-3 text-gray-500">{formatDate(tx.createdAt)}</td>
                  <td className="py-3 font-medium text-white">{tx.user.name}</td>
                  <td className="py-3 text-gray-300">{tx.package.name}</td>
                  <td className="py-3 text-right font-black text-gold">+{tx.pointsAmount} pts</td>
                  <td className="py-3 text-right font-bold text-emerald-400">{formatCurrency(tx.amountFc)}</td>
                  <td className="py-3 text-center">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        tx.status === 'COMPLETED'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-amber-500/15 text-amber-400'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Journal d'Audit Financier */}
      {auditLogs.length > 0 && (
        <div className="premium-card p-6">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            🛡️ <span>Journal d&apos;Audit des Actions Financières</span>
          </h2>
          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs gap-2"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-gold font-bold">{log.action}</span>
                    <span className="text-gray-400">• {log.actorName}</span>
                  </div>
                  <div className="text-gray-300 text-[11px]">{log.note}</div>
                </div>
                <div className="text-right flex-shrink-0 text-gray-500 text-[10px]">
                  {formatDate(log.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Demande de Retrait */}
      <WithdrawalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        availableBalance={summary.availableBalance}
        pendingWithdrawalsAmount={summary.pendingWithdrawalsAmount}
        netCapacity={summary.netWithdrawalCapacity}
      />
    </div>
  )
}
