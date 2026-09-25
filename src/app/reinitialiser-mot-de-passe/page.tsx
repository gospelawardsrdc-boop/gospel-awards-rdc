'use client'

import { useState, useTransition, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { resetPasswordAction } from '@/actions/forgot-password'

function ReinitialiserMotDePasseForm() {
  const searchParams = useSearchParams()
  const tokenFromUrl = searchParams.get('token') || ''

  const [token, setToken] = useState(tokenFromUrl)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (password.length < 8) {
      setMessage({ type: 'error', text: 'Le mot de passe doit comporter au moins 8 caractères.' })
      return
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Les deux mots de passe ne correspondent pas.' })
      return
    }

    const formData = new FormData()
    formData.append('token', token)
    formData.append('password', password)
    formData.append('confirmPassword', confirmPassword)

    startTransition(async () => {
      const res = await resetPasswordAction(formData)
      if (res.error) {
        setMessage({ type: 'error', text: res.error })
      } else {
        setIsSuccess(true)
        setMessage({ type: 'success', text: res.message || 'Mot de passe modifié avec succès.' })
      }
    })
  }

  return (
    <div className="premium-card p-6 sm:p-8 border-gold/20 glow-gold">
      {message && (
        <div
          className={`p-4 rounded-xl mb-6 flex items-start gap-3 text-xs leading-relaxed ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/25 text-rose-400'
          }`}
        >
          <span className="text-base">{message.type === 'success' ? '✓' : '⚠️'}</span>
          <div>{message.text}</div>
        </div>
      )}

      {isSuccess ? (
        <div className="space-y-4 text-center">
          <Link
            href="/connexion"
            className="btn-primary w-full !py-3.5 block text-center text-sm font-bold"
          >
            Se Connecter avec mon nouveau mot de passe →
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
              Jeton de Réinitialisation *
            </label>
            <input
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Collez votre jeton ici"
              className="input-field font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
              Nouveau Mot de Passe *
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 caractères"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
              Confirmer le Mot de Passe *
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Répétez le mot de passe"
              className="input-field"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full !py-3.5 text-sm font-bold tracking-wide"
            >
              {isPending ? 'Mise à jour...' : 'Enregistrer le nouveau mot de passe'}
            </button>
          </div>

          <div className="text-center pt-3 border-t border-white/[0.04]">
            <Link href="/connexion" className="text-xs text-gray-400 hover:text-gold transition-colors">
              ← Retour à la connexion
            </Link>
          </div>
        </form>
      )}
    </div>
  )
}

export default function ReinitialiserMotDePassePage() {
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
            Nouveau Mot de Passe
          </span>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Réinitialiser <span className="gold-text">l&apos;accès</span>
          </h1>
          <p className="text-gray-400 text-xs mt-2 max-w-sm mx-auto">
            Définissez votre nouveau mot de passe pour sécuriser votre compte.
          </p>
        </div>

        <Suspense fallback={<div className="text-center text-gray-400 text-xs py-8">Chargement du formulaire...</div>}>
          <ReinitialiserMotDePasseForm />
        </Suspense>
      </div>
    </div>
  )
}
