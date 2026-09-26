'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createArtistInvitationAction, regenerateArtistInvitationAction } from '@/actions/artist-invitation'
import {
  updateArtistAdminAction,
  toggleArtistStatusAction,
  addCategoryToArtistAction,
  removeCategoryFromArtistAction,
} from '@/actions/admin-artist'
import ArtistImageUploader from '@/components/artist/ArtistImageUploader'

interface Category {
  id: string
  name: string
  icon: string | null
}

interface ArtistItem {
  id: string
  stageName: string
  slug: string
  biography: string | null
  profileImage: string | null
  coverImage: string | null
  isActive: boolean
  isApproved: boolean
  user: {
    name: string
    email: string
    hashedPassword: string | null
  }
  categories: {
    category: {
      id: string
      name: string
      icon: string | null
    }
  }[]
  invitation: {
    id: string
    activationCode: string
    token: string
    isUsed: boolean
    expiresAt: string
  } | null
  _count: {
    votes: number
  }
}

interface Props {
  artists: ArtistItem[]
  categories: Category[]
}

export default function AdminArtistesClient({ artists, categories }: Props) {
  const [isPending, startTransition] = useTransition()
  const [searchQuery, setSearchQuery] = useState('')
  const [editingArtist, setEditingArtist] = useState<ArtistItem | null>(null)
  const [addingCategoryArtistId, setAddingCategoryArtistId] = useState<string | null>(null)
  const [selectedCatToAdd, setSelectedCatToAdd] = useState('')

  const [createdInvite, setCreatedInvite] = useState<{
    stageName: string
    email: string
    activationCode: string
    activationLink: string
    expiresAt: string
  } | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const filteredArtists = artists.filter((a) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return (
      a.stageName.toLowerCase().includes(q) ||
      a.user.email.toLowerCase().includes(q) ||
      a.categories.some((c) => c.category.name.toLowerCase().includes(q))
    )
  })

  const handleCreateArtist = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage(null)
    setCreatedInvite(null)

    const form = e.currentTarget
    const formData = new FormData(form)

    startTransition(async () => {
      const res = await createArtistInvitationAction(formData)
      if (res.error) {
        setMessage({ type: 'error', text: res.error })
      } else if (res.success) {
        form.reset()
        setCreatedInvite({
          stageName: res.stageName!,
          email: res.email!,
          activationCode: res.activationCode!,
          activationLink: res.activationLink!,
          expiresAt: res.expiresAt!,
        })
        setMessage({
          type: 'success',
          text: `Artiste ${res.stageName} créé avec succès ! Transmettez-lui son code ou lien d'activation.`,
        })
      }
    })
  }

  const handleUpdateArtist = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage(null)

    const form = e.currentTarget
    const formData = new FormData(form)

    startTransition(async () => {
      const res = await updateArtistAdminAction(formData)
      if (res.error) {
        setMessage({ type: 'error', text: res.error })
      } else {
        setMessage({
          type: 'success',
          text: `Profil de l'artiste ${res.artist?.stageName} mis à jour avec succès.`,
        })
        setEditingArtist(null)
      }
    })
  }

  const handleToggleStatus = (artistId: string, currentStatus: boolean, stageName: string) => {
    startTransition(async () => {
      setMessage(null)
      const res = await toggleArtistStatusAction(artistId)
      if (res.error) {
        setMessage({ type: 'error', text: res.error })
      } else {
        setMessage({
          type: 'success',
          text: `Statut de ${stageName} : ${res.isActive ? 'Actif' : 'Désactivé'}.`,
        })
      }
    })
  }

  const handleAddCategory = (artistId: string) => {
    if (!selectedCatToAdd) return
    startTransition(async () => {
      setMessage(null)
      const res = await addCategoryToArtistAction(artistId, selectedCatToAdd)
      if (res.error) {
        setMessage({ type: 'error', text: res.error })
      } else {
        setMessage({ type: 'success', text: 'Catégorie ajoutée avec succès.' })
        setAddingCategoryArtistId(null)
        setSelectedCatToAdd('')
      }
    })
  }

  const handleRemoveCategory = (artistId: string, categoryId: string, catName: string) => {
    startTransition(async () => {
      setMessage(null)
      const res = await removeCategoryFromArtistAction(artistId, categoryId)
      if (res.error) {
        setMessage({ type: 'error', text: res.error })
      } else {
        setMessage({ type: 'success', text: `Catégorie "${catName}" retirée avec succès.` })
      }
    })
  }

  const handleRegenerate = (artistId: string, stageName: string) => {
    startTransition(async () => {
      setMessage(null)
      const res = await regenerateArtistInvitationAction(artistId)
      if (res.error) {
        setMessage({ type: 'error', text: res.error })
      } else if (res.success) {
        setCreatedInvite({
          stageName,
          email: '',
          activationCode: res.activationCode!,
          activationLink: res.activationLink!,
          expiresAt: res.expiresAt!,
        })
        setMessage({
          type: 'success',
          text: `Nouvelle invitation générée pour ${stageName}.`,
        })
      }
    })
  }

  const handleCopyLink = (textToCopy: string) => {
    const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${textToCopy}` : textToCopy
    navigator.clipboard.writeText(fullUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <div className="space-y-8">
      {/* Alert message */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-xs ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/25 text-rose-400'
          }`}
        >
          <span className="text-base">{message.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{message.text}</span>
        </div>
      )}

      {/* Modal / Card Invitation Details */}
      {createdInvite && (
        <div className="p-6 rounded-2xl bg-gold/[0.08] border-2 border-gold/40 glow-gold space-y-4 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-gold/20">
            <div className="flex items-center gap-2">
              <span className="text-xl">✉️</span>
              <h3 className="text-base font-black text-white">
                Invitation d&apos;Activation Générée pour <span className="text-gold">{createdInvite.stageName}</span>
              </h3>
            </div>
            <button
              onClick={() => setCreatedInvite(null)}
              className="text-xs text-gray-400 hover:text-white"
            >
              ✕ Fermer
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">
                Code d&apos;Activation Temporaire (Usage Unique)
              </span>
              <span className="text-xl font-black text-gold font-mono tracking-wider block">
                {createdInvite.activationCode}
              </span>
              <span className="text-[10px] text-gray-500">
                Expire le : {new Date(createdInvite.expiresAt).toLocaleDateString('fr-FR')}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1 flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">
                  Lien Direct d&apos;Activation
                </span>
                <span className="text-xs font-mono text-gray-300 truncate block mt-0.5">
                  {createdInvite.activationLink}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyLink(createdInvite.activationLink)}
                className="btn-secondary !text-xs !py-1.5 !px-3 self-start mt-2"
              >
                {copied ? '✓ Lien Copié !' : '📋 Copier le Lien d\'Activation'}
              </button>
            </div>
          </div>

          <p className="text-[11px] text-gray-400 italic">
            🔒 Conformément aux règles de sécurité, l&apos;administrateur ne définit aucun mot de passe. L&apos;artiste définira son propre mot de passe lors de sa première connexion via ce lien ou ce code.
          </p>
        </div>
      )}

      {/* Form: Enregistrer un Artiste et Générer son Invitation */}
      <div className="premium-card p-6 sm:p-8 border-gold/20 glow-gold">
        <h2 className="text-lg font-black text-white mb-2 flex items-center gap-2">
          ➕ <span>Créer un Artiste & Générer l&apos;Invitation Officielle</span>
        </h2>
        <p className="text-xs text-gray-400 mb-6">
          L&apos;inscription des artistes est exclusivement gérée par l&apos;administration. Le système crée le profil public et génère une invitation unique avec code temporaire.
        </p>

        <form onSubmit={handleCreateArtist} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                Nom de Scène *
              </label>
              <input
                name="stageName"
                required
                placeholder="Ex: Athoms Mbuma"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                Nom Civil / Réel
              </label>
              <input
                name="realName"
                placeholder="Ex: Athoms Mbuma"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                Email de Contact *
              </label>
              <input
                name="email"
                type="email"
                required
                placeholder="artiste@contact.cd"
                className="input-field"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-gold/[0.04] border border-gold/15 text-xs text-gray-300 flex items-start gap-2.5">
            <span className="text-base leading-none">🖼️</span>
            <div>
              <p className="font-semibold text-gold mb-0.5">Photos & Médias de l&apos;artiste</p>
              <p className="text-[11px] text-gray-400">
                Les photos de profil et de couverture (JPG, PNG, WebP — max 5 Mo) peuvent être importées directement depuis votre appareil via le bouton « ✏️ Modifier » dès la création de l&apos;artiste, ou téléversées directement par l&apos;artiste lors de l&apos;activation de son compte.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
              Biographie
            </label>
            <textarea
              name="biography"
              rows={2}
              placeholder="Présentation de l'artiste..."
              className="input-field resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
              Catégories Officielles d&apos;Attribution (Sélectionner au moins une)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-44 overflow-y-auto pr-1">
              {categories.map((cat) => (
                <label
                  key={cat.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-gold/20 cursor-pointer text-xs"
                >
                  <input
                    type="checkbox"
                    name="categoryIds"
                    value={cat.id}
                    className="rounded border-gray-700 text-gold focus:ring-gold"
                  />
                  <span className="truncate text-gray-300">{cat.icon} {cat.name}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="btn-primary !py-3.5 !px-8 text-sm font-bold w-full sm:w-auto"
          >
            {isPending ? 'Création en cours...' : '✓ Créer l\'Artiste & Générer l\'Invitation'}
          </button>
        </form>
      </div>

      {/* Modal Edition Artiste Existant */}
      {editingArtist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="premium-card p-6 sm:p-8 max-w-2xl w-full border-gold/30 glow-gold space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                ✏️ <span>Modifier l&apos;Artiste :</span> <span className="text-gold">{editingArtist.stageName}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingArtist(null)}
                className="text-xs text-gray-400 hover:text-white"
              >
                ✕ Fermer
              </button>
            </div>

            <form onSubmit={handleUpdateArtist} className="space-y-4 text-xs">
              <input type="hidden" name="artistId" value={editingArtist.id} />
              <input type="hidden" name="profileImage" value={editingArtist.profileImage || ''} />
              <input type="hidden" name="coverImage" value={editingArtist.coverImage || ''} />

              <div>
                <label className="block font-bold uppercase tracking-wider text-gray-300 mb-1">
                  Nom de Scène *
                </label>
                <input
                  name="stageName"
                  defaultValue={editingArtist.stageName}
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-gray-300 mb-2">
                  Photos & Médias de l&apos;Artiste
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ArtistImageUploader
                    type="profile"
                    initialImageUrl={editingArtist.profileImage}
                    artistId={editingArtist.id}
                    onImageUpdated={(newUrl) => {
                      setEditingArtist((prev) => (prev ? { ...prev, profileImage: newUrl } : null))
                    }}
                  />
                  <ArtistImageUploader
                    type="cover"
                    initialImageUrl={editingArtist.coverImage}
                    artistId={editingArtist.id}
                    onImageUpdated={(newUrl) => {
                      setEditingArtist((prev) => (prev ? { ...prev, coverImage: newUrl } : null))
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-gray-300 mb-1">
                  Biographie
                </label>
                <textarea
                  name="biography"
                  rows={3}
                  defaultValue={editingArtist.biography || ''}
                  className="input-field resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setEditingArtist(null)}
                  className="btn-secondary !py-2 !px-4"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary !py-2 !px-6 font-bold"
                >
                  {isPending ? 'Enregistrement...' : 'Enregistrer les Modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Liste des Artistes & Suivi des Invitations */}
      <div className="premium-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-base font-bold text-white">
            🎤 Artistes Enregistrés ({filteredArtists.length})
          </h2>

          <div className="w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un artiste, email..."
              className="input-field !text-xs !py-2"
            />
          </div>
        </div>

        <div className="space-y-4">
          {filteredArtists.length === 0 ? (
            <p className="text-gray-500 text-xs py-4 text-center">Aucun artiste ne correspond à votre recherche.</p>
          ) : (
            filteredArtists.map((artist) => {
              const isActivated = artist.invitation?.isUsed || Boolean(artist.user.hashedPassword)
              const assignedCatIds = artist.categories.map((c) => c.category.id)
              const availableCategories = categories.filter((c) => !assignedCatIds.includes(c.id))

              return (
                <div
                  key={artist.id}
                  className={`p-4 rounded-xl border transition-all ${
                    artist.isActive
                      ? 'bg-white/[0.02] border-white/[0.04] hover:border-gold/20'
                      : 'bg-rose-500/[0.02] border-rose-500/20 opacity-70'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-surface-light border border-white/[0.06] overflow-hidden flex-shrink-0">
                        {artist.profileImage ? (
                          <img src={artist.profileImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">🎤</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-white truncate">{artist.stageName}</h4>
                          {isActivated ? (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                              ✓ Compte Activé
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold">
                              ⏳ Invitation en attente {artist.invitation?.activationCode ? `(${artist.invitation.activationCode})` : ''}
                            </span>
                          )}
                          {!artist.isActive && (
                            <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full font-semibold">
                              ⚠️ Désactivé
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{artist.user.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap justify-end">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleToggleStatus(artist.id, artist.isActive, artist.stageName)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                          artist.isActive
                            ? 'text-rose-400 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20'
                            : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20'
                        }`}
                      >
                        {artist.isActive ? 'Désactiver' : 'Activer'}
                      </button>

                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => setEditingArtist(artist)}
                        className="text-xs font-semibold text-gray-300 bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 rounded-lg hover:border-gold/30 hover:text-gold transition-all"
                      >
                        ✏️ Modifier
                      </button>

                      {!isActivated && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleRegenerate(artist.id, artist.stageName)}
                          className="text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg hover:bg-amber-500/20 transition-all"
                        >
                          🔄 Renvoyer Code
                        </button>
                      )}

                      <Link
                        href={`/artistes/${artist.slug}`}
                        className="text-xs font-semibold text-gold border border-gold/30 px-3 py-1.5 rounded-lg hover:bg-gold/10 transition-colors"
                      >
                        Voir Profil Public
                      </Link>
                    </div>
                  </div>

                  {/* Gestion des catégories de l'artiste */}
                  <div className="mt-3 pt-3 border-t border-white/[0.04]">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Catégories assignées ({artist.categories.length}) :
                      </span>
                      {availableCategories.length > 0 && addingCategoryArtistId !== artist.id && (
                        <button
                          type="button"
                          onClick={() => {
                            setAddingCategoryArtistId(artist.id)
                            setSelectedCatToAdd(availableCategories[0]?.id || '')
                          }}
                          className="text-[10px] font-semibold text-gold hover:underline"
                        >
                          + Ajouter une catégorie
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {artist.categories.map((ac) => (
                        <span
                          key={ac.category.id}
                          className="inline-flex items-center gap-1.5 text-[10px] bg-gold/[0.08] border border-gold/20 text-gold px-2 py-0.5 rounded-md"
                        >
                          <span>{ac.category.icon} {ac.category.name}</span>
                          <button
                            type="button"
                            disabled={isPending}
                            title="Retirer cette catégorie"
                            onClick={() => handleRemoveCategory(artist.id, ac.category.id, ac.category.name)}
                            className="text-gold hover:text-rose-400 transition-colors ml-0.5"
                          >
                            ✕
                          </button>
                        </span>
                      ))}

                      {/* Dropdown ajout catégorie */}
                      {addingCategoryArtistId === artist.id && (
                        <div className="flex items-center gap-1.5 bg-black/50 p-1 rounded-lg border border-gold/30">
                          <select
                            value={selectedCatToAdd}
                            onChange={(e) => setSelectedCatToAdd(e.target.value)}
                            className="bg-[#0A0E1A] text-white text-[10px] rounded px-2 py-1 border border-white/10"
                          >
                            {availableCategories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.icon} {c.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleAddCategory(artist.id)}
                            className="px-2 py-1 bg-gold text-[#0A0E1A] text-[10px] font-bold rounded hover:opacity-90"
                          >
                            Ajouter
                          </button>
                          <button
                            type="button"
                            onClick={() => setAddingCategoryArtistId(null)}
                            className="px-1.5 py-1 text-gray-400 hover:text-white text-[10px]"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
