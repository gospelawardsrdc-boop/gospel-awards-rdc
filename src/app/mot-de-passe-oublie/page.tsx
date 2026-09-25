'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { requestPasswordResetAction } from '@/actions/forgot-password'

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string; link?: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    const formData = new FormData()
    formData.append('email', email)

    startTransition(async () => {
      const res = await requestPasswordResetAction(formData)
      if (res.error) {
        setMessage({ type: 'error', text: res.error })
      } else {
        setMessage({
          type: 'success',
          text: res.message || 'Demande traitée avec succès.',
          link: res.resetLink,
        })
      }
    })
  }

  return (
    <div className="min-h-screen bg-[#060912] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6 group">
            <div className="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center text-[#0A0E1A] font-black text-base shadow-lg shadow-gold/20">
              GA
            </div>
          </Link>
          <span className="text-xs font-semibold text-gold uppercase tracking-[0.2em] block mb-1">
            Sécurité du Compte
          </span>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Mot de passe <span className="gold-text">oublié</span>
          </h1>
          <p className="text-gray-400 text-xs mt-2 max-w-sm mx-auto">
            Saisissez l&apos;adresse email associée à votre compte pour recevoir les instructions de réinitialisation.
          </p>
        </div>

        <div className="premium-card p-6 sm:p-8 border-gold/20 glow-gold">
          {message && (
            <div
              className={`p-4 rounded-xl mb-6 flex flex-col gap-2 text-xs leading-relaxed ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/25 text-rose-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{message.type === 'success' ? '✉️' : '⚠️'}</span>
                <span>{message.text}</span>
              </div>
              {message.link && (
                <div className="mt-2 p-2.5 rounded-lg bg-black/40 border border-white/10 text-white font-mono text-[11px] break-all">
                  Lien de réinitialisation sécurisé :<br />
                  <Link href={message.link} className="text-gold underline font-bold mt-1 block">
                    Accéder à la page de réinitialisation →
                  </Link>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                Adresse Email *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre-email@domaine.cd"
                className="input-field"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="btn-primary w-full !py-3.5 text-sm font-bold tracking-wide"
              >
                {isPending ? 'Envoi en cours...' : 'Envoyer les instructions'}
              </button>
            </div>

            <div className="text-center pt-3 border-t border-white/[0.04]">
              <Link href="/connexion" className="text-xs text-gray-400 hover:text-gold transition-colors">
                ← Retour à la connexion
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
