'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { registerAction } from '@/actions/auth'

export default function InscriptionPage() {
  const [state, formAction, isPending] = useActionState(registerAction, null)

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#060912] relative overflow-hidden">
      {/* Glow backdrop */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gold/[0.04] rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6 group">
            <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center text-[#0A0E1A] font-black text-base shadow-lg">
              GA
            </div>
            <div className="text-left">
              <span className="text-sm font-bold tracking-wide gold-text block">GOSPEL AWARDS</span>
              <span className="text-[9px] block text-gray-500 tracking-[0.2em] -mt-0.5">RDC 2026</span>
            </div>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Créer un Compte</h1>
          <p className="text-gray-400 text-xs mt-2">Rejoignez la communauté des votants Gospel Awards RDC</p>
        </div>

        <div className="premium-card p-6 sm:p-8 border-white/[0.08]">
          {state?.error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl mb-5 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{state.error}</span>
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                Nom complet
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="input-field"
                placeholder="Ex: David Mwamba"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                Adresse Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input-field"
                placeholder="nom@exemple.cd"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                className="input-field"
                placeholder="Minimum 6 caractères"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                Confirmer le mot de passe
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="input-field"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full btn-primary !py-3.5 text-sm font-bold mt-2 animate-pulse-vote"
            >
              {isPending ? 'Création du compte...' : 'Créer mon compte'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/[0.06] text-center text-xs text-gray-400">
            Déjà inscrit ?{' '}
            <Link href="/connexion" className="text-gold font-bold hover:underline ml-1">
              Se connecter
            </Link>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-xs text-gray-500 hover:text-gold transition-colors">
            ← Retourner à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  )
}
