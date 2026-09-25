'use client'

import { useState, useEffect, Suspense, useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { activateArtistAccountAction } from '@/actions/artist-invitation'

function cleanInputTokenOrCode(val: string): string {
  let cleaned = val.trim().replace(/^["']|["']$/g, '').trim()
  if (cleaned.includes('?') || cleaned.startsWith('/') || cleaned.startsWith('http')) {
    try {
      const parsed = new URL(cleaned, 'http://localhost')
      const t = parsed.searchParams.get('token') || parsed.searchParams.get('code')
      if (t) return t.trim()
    } catch {
      const match = cleaned.match(/[?&](?:token|code)=([^&#\s]+)/i)
      if (match && match[1]) return decodeURIComponent(match[1]).trim()
    }
  }
  const prefixMatch = cleaned.match(/^(?:token|code)=([^&#\s]+)/i)
  if (prefixMatch && prefixMatch[1]) return decodeURIComponent(prefixMatch[1]).trim()
  return cleaned
}

function ActiverCompteForm() {
  const searchParams = useSearchParams()
  const tokenFromUrl = searchParams.get('token') || searchParams.get('code') || ''

  const [state, formAction, isPending] = useActionState(activateArtistAccountAction, null)
  const [tokenOrCode, setTokenOrCode] = useState(cleanInputTokenOrCode(tokenFromUrl))
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (tokenFromUrl) {
      setTokenOrCode(cleanInputTokenOrCode(tokenFromUrl))
    }
  }, [tokenFromUrl])

  return (
    <div className="premium-card p-6 sm:p-8 border-gold/20 glow-gold">
      {state?.error && (
        <div className="p-4 rounded-xl mb-6 flex items-start gap-3 text-xs leading-relaxed bg-rose-500/10 border border-rose-500/25 text-rose-400">
          <span className="text-base">⚠️</span>
          <div>{state.error}</div>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
            Code ou Jeton d&apos;Activation *
          </label>
          <input
            name="tokenOrCode"
            type="text"
            required
            value={tokenOrCode}
            onChange={(e) => setTokenOrCode(cleanInputTokenOrCode(e.target.value))}
            placeholder="Ex: GA-849201 ou token"
            className="input-field font-mono text-sm"
          />
          <span className="text-[10px] text-gray-500 mt-1 block">
            Code à 6 chiffres ou lien sécurisé transmis par le comité.
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
            Définir votre mot de passe *
          </label>
          <input
            name="password"
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
            Confirmer votre mot de passe *
          </label>
          <input
            name="confirmPassword"
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
            {isPending ? 'Activation & Connexion en cours...' : '⭐ Activer & Accéder à mon Espace Artiste'}
          </button>
        </div>

        <div className="text-center pt-3 border-t border-white/[0.04]">
          <span className="text-[11px] text-gray-500">
            Vous possédez déjà un compte activé ?{' '}
            <Link href="/connexion" className="text-gold font-semibold hover:underline">
              Se connecter
            </Link>
          </span>
        </div>
      </form>
    </div>
  )
}

export default function ActiverComptePage() {
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
            Invitation Officielle
          </span>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Activation du <span className="gold-text">Compte Artiste</span>
          </h1>
          <p className="text-gray-400 text-xs mt-2 max-w-sm mx-auto">
            Bienvenue aux Gospel Awards RDC. Veuillez définir votre mot de passe personnel pour finaliser l&apos;activation de votre profil officiel.
          </p>
        </div>

        <Suspense fallback={<div className="text-center text-gray-400 text-xs py-8">Chargement du formulaire...</div>}>
          <ActiverCompteForm />
        </Suspense>
      </div>
    </div>
  )
}
