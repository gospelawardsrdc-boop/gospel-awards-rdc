'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  updateCategoryNameAction,
  toggleCategoryStatusAction,
} from '@/actions/admin-category'

export interface CategoryItem {
  id: string
  name: string
  slug: string
  icon: string | null
  isActive: boolean
  artists: { id: string }[]
  _count: { votes: number }
}

interface Props {
  categories: CategoryItem[]
}

export default function AdminCategoriesClient({ categories }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // État de la catégorie en cours de modification
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)

  // Message de feedback global (succès / erreur)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Gestion de la soumission du formulaire de modification
  const handleUpdateCategory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setModalError(null)

    const form = e.currentTarget
    const formData = new FormData(form)

    startTransition(async () => {
      const res = await updateCategoryNameAction(formData)

      if (res.error) {
        setModalError(res.error)
      } else if (res.success) {
        const catName = res.category?.name || 'Catégorie'
        setEditingCategory(null)
        setModalError(null)
        setMessage({
          type: 'success',
          text: `La catégorie a été renommée avec succès en "${catName}".`,
        })
        router.refresh()
      }
    })
  }

  // Gestion de l'activation / désactivation
  const handleToggleStatus = (category: CategoryItem) => {
    startTransition(async () => {
      setMessage(null)
      const res = await toggleCategoryStatusAction(category.id)

      if (res.error) {
        setMessage({ type: 'error', text: res.error })
      } else if (res.success) {
        const newStatus = res.category?.isActive ? 'activée' : 'désactivée'
        setMessage({
          type: 'success',
          text: `La catégorie "${category.name}" est désormais ${newStatus}.`,
        })
        router.refresh()
      }
    })
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* En-tête de la page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div>
          <span className="text-xs font-semibold text-gold uppercase tracking-[0.2em] mb-1 block">
            Structure Officielle du Concours
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Les 16 <span className="gold-text">Catégories Officielles</span>
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            {categories.length} catégories officielles approuvées pour les Gospel Awards RDC.
          </p>
        </div>
      </div>

      {/* Message de notification global */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-xs transition-all animate-fade-in ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/25 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-base">{message.type === 'success' ? '✅' : '⚠️'}</span>
            <span className="font-medium">{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-gray-400 hover:text-white transition-colors text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Grille des 16 Catégories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {categories.map((category) => (
          <div
            key={category.id}
            className={`premium-card p-4 flex flex-col justify-between gap-3 transition-all ${
              !category.isActive ? 'opacity-40 border-dashed' : 'border-white/[0.06] hover:border-gold/20'
            }`}
          >
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-gold/[0.08] border border-gold/15 flex items-center justify-center text-2xl flex-shrink-0">
                {category.icon || '🏆'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-sm truncate" title={category.name}>
                    {category.name}
                  </h3>
                  {!category.isActive && (
                    <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.2 rounded-full font-semibold">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {category.artists.length} artiste(s) · {category._count.votes} vote(s)
                </p>
                <div className="mt-1">
                  <Link
                    href={`/categories/${category.slug}`}
                    target="_blank"
                    className="text-[10px] text-gold/70 hover:text-gold hover:underline"
                  >
                    Voir la page publique ↗
                  </Link>
                </div>
              </div>
            </div>

            {/* Barre d'actions : Modifier & Activer/Désactiver */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.04]">
              {/* Bouton Modifier */}
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setEditingCategory(category)
                  setModalError(null)
                }}
                className="text-xs font-semibold text-gray-300 bg-white/[0.04] border border-white/[0.08] hover:border-gold/40 hover:text-gold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-40"
              >
                <span>✏️</span>
                <span>Modifier</span>
              </button>

              {/* Bouton Activer / Désactiver */}
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleToggleStatus(category)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all disabled:opacity-40 ${
                  category.isActive
                    ? 'text-rose-400 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20'
                    : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20'
                }`}
              >
                {category.isActive ? 'Désactiver' : 'Activer'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modale d'édition d'une catégorie */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="premium-card p-6 sm:p-8 max-w-lg w-full border-gold/30 glow-gold space-y-5 animate-scale-up">
            {/* Header de la modale */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{editingCategory.icon || '🏆'}</span>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Modifier la Catégorie
                  </h3>
                  <span className="text-[11px] text-gray-400">
                    ID : <code className="text-gold/70 text-[10px]">{editingCategory.id}</code>
                  </span>
                </div>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setEditingCategory(null)
                  setModalError(null)
                }}
                className="text-xs text-gray-400 hover:text-white p-1 rounded transition-colors"
              >
                ✕ Fermer
              </button>
            </div>

            {/* Message d'erreur dans la modale si échec */}
            {modalError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-start gap-2.5">
                <span className="text-base leading-none">⚠️</span>
                <div className="flex-1">{modalError}</div>
              </div>
            )}

            {/* Note d'intégrité */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[11px] text-gray-400 space-y-1">
              <p>
                <strong className="text-white">Nom actuel :</strong> {editingCategory.name}
              </p>
              <p className="text-[10px] text-gray-500">
                🔒 Le changement de libellé préserve l&apos;URL publique canonique (<code className="text-gold/80">/categories/{editingCategory.slug}</code>) ainsi que les votes et classements existants.
              </p>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleUpdateCategory} className="space-y-4 text-xs">
              <input type="hidden" name="categoryId" value={editingCategory.id} />

              <div>
                <label className="block font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                  Nouveau Nom de la Catégorie *
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  autoFocus
                  defaultValue={editingCategory.name}
                  placeholder="Ex : Artiste chrétien de l'année"
                  className="input-field text-sm"
                  maxLength={100}
                />
              </div>

              {/* Boutons d'action */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    setEditingCategory(null)
                    setModalError(null)
                  }}
                  className="btn-secondary !py-2 !px-4"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary !py-2 !px-6 font-bold"
                >
                  {isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
