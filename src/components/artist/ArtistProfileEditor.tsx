'use client'

import { useState, useTransition } from 'react'
import { updateArtistProfileEditorialAction } from '@/actions/artist-profile'
import ArtistImageUploader from './ArtistImageUploader'

interface Props {
  initialBio: string | null
  initialProfileImage: string | null
  initialCoverImage: string | null
  socialLinks: { platform: string; url: string }[]
  musicLinks: { platform: string; url: string }[]
}

export default function ArtistProfileEditor({
  initialBio,
  initialProfileImage,
  initialCoverImage,
  socialLinks,
  musicLinks,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const getSocial = (platform: string) =>
    socialLinks.find((s) => s.platform.toLowerCase() === platform.toLowerCase())?.url || ''
  const getMusic = (platform: string) =>
    musicLinks.find((m) => m.platform.toLowerCase() === platform.toLowerCase())?.url || ''

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const res = await updateArtistProfileEditorialAction(formData)
      if (res.error) {
        setMessage({ type: 'error', text: res.error })
      } else {
        setMessage({ type: 'success', text: res.message || 'Profil mis à jour avec succès.' })
      }
    })
  }

  return (
    <div className="premium-card p-6 border-gold/15 glow-gold">
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-6">
        <div>
          <span className="text-[10px] font-bold text-gold uppercase tracking-wider block">
            Édition Personnelle
          </span>
          <h2 className="text-base font-bold text-white">Gestion de votre Profil Éditorial</h2>
        </div>
        <span className="text-[10px] bg-white/[0.04] text-gray-400 px-3 py-1 rounded-full border border-white/[0.08]">
          🔒 Catégories sous contrôle Admin
        </span>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl mb-6 flex items-center gap-2.5 text-xs ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/25 text-rose-400'
          }`}
        >
          <span>{message.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{message.text}</span>
        </div>
      )}

      {/* ===== SECTION 1 & 2 : IMPORT DES IMAGES DE PROFIL & COUVERTURE (SUPABASE STORAGE) ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6 pb-6 border-b border-white/[0.06]">
        {/* Photo de profil */}
        <ArtistImageUploader
          type="profile"
          initialImageUrl={initialProfileImage}
        />

        {/* Image de couverture */}
        <ArtistImageUploader
          type="cover"
          initialImageUrl={initialCoverImage}
        />
      </div>

      {/* ===== SECTION 3 : BIOGRAPHIE ET LIENS SOCIAUX ===== */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
            Biographie & Présentation
          </label>
          <textarea
            name="biography"
            rows={3}
            defaultValue={initialBio || ''}
            placeholder="Partagez votre parcours, vos inspirations et votre message avec le public..."
            className="input-field resize-none text-xs"
          />
        </div>

        {/* Social Links */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
            Réseaux Sociaux & Streaming Vidéo
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-gray-400 mb-1 block font-medium">Instagram</span>
              <input
                name="instagram"
                defaultValue={getSocial('instagram')}
                placeholder="https://instagram.com/..."
                className="input-field !text-xs !py-2"
              />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 mb-1 block font-medium">Facebook</span>
              <input
                name="facebook"
                defaultValue={getSocial('facebook')}
                placeholder="https://facebook.com/..."
                className="input-field !text-xs !py-2"
              />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 mb-1 block font-medium">YouTube</span>
              <input
                name="youtube"
                defaultValue={getSocial('youtube')}
                placeholder="https://youtube.com/@..."
                className="input-field !text-xs !py-2"
              />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 mb-1 block font-medium">TikTok</span>
              <input
                name="tiktok"
                defaultValue={getSocial('tiktok')}
                placeholder="https://tiktok.com/@..."
                className="input-field !text-xs !py-2"
              />
            </div>
          </div>
        </div>

        {/* Music Streaming */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
            Plateformes de Streaming Musical
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-gray-400 mb-1 block font-medium">Spotify</span>
              <input
                name="spotify"
                defaultValue={getMusic('spotify')}
                placeholder="https://open.spotify.com/artist/..."
                className="input-field !text-xs !py-2"
              />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 mb-1 block font-medium">Apple Music</span>
              <input
                name="appleMusic"
                defaultValue={getMusic('apple music')}
                placeholder="https://music.apple.com/..."
                className="input-field !text-xs !py-2"
              />
            </div>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between flex-wrap gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="btn-primary !py-2.5 !px-6 text-xs font-bold"
          >
            {isPending ? 'Enregistrement...' : 'Enregistrer les Informations'}
          </button>
          <span className="text-[11px] text-gray-500">
            Ces modifications seront immédiatement visibles sur votre profil public.
          </span>
        </div>
      </form>
    </div>
  )
}
