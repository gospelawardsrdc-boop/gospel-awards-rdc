'use client'

import { useState, useRef, useTransition } from 'react'
import Image from 'next/image'
import { uploadArtistImageAction, deleteArtistImageAction } from '@/actions/artist-profile'

interface ImageUploaderProps {
  type: 'profile' | 'cover'
  initialImageUrl: string | null
  artistId?: string
  onImageUpdated?: (newUrl: string | null) => void
}

export default function ArtistImageUploader({
  type,
  initialImageUrl,
  artistId,
  onImageUpdated,
}: ImageUploaderProps) {
  const [currentUrl, setCurrentUrl] = useState<string | null>(initialImageUrl)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isPending, startTransition] = useTransition()
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isProfile = type === 'profile'
  const title = isProfile ? '📷 Photo de profil' : '🖼️ Image de couverture'
  const formatDesc = isProfile ? 'Format recommandé : 800 × 800 px' : 'Format recommandé : 1600 × 600 px'

  // Sélection d'un fichier depuis l'appareil
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatusMessage(null)
    const file = e.target.files?.[0]
    if (!file) return

    // Validation taille côté client (5 Mo)
    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage({ type: 'error', text: 'Le fichier dépasse la taille maximale autorisée de 5 Mo.' })
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // Validation type côté client
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setStatusMessage({ type: 'error', text: 'Format non supporté. Veuillez choisir une image JPG, PNG ou WebP.' })
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setSelectedFile(file)
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)

    // Déclenchement automatique de l'upload après sélection
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)
    if (artistId) formData.append('artistId', artistId)

    startTransition(async () => {
      const res = await uploadArtistImageAction(formData)
      if (res.error) {
        setStatusMessage({ type: 'error', text: res.error })
        setPreviewUrl(null)
        setSelectedFile(null)
      } else if (res.url) {
        setCurrentUrl(res.url)
        setPreviewUrl(null)
        setSelectedFile(null)
        setStatusMessage({ type: 'success', text: res.message || 'Image enregistrée avec succès !' })
        if (onImageUpdated) onImageUpdated(res.url)
      }
      if (fileInputRef.current) fileInputRef.current.value = ''
    })
  }

  // Déclencher le sélecteur de fichiers
  const handleBrowseClick = () => {
    setStatusMessage(null)
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // Supprimer l'image actuelle
  const handleDelete = () => {
    if (!currentUrl) return
    setStatusMessage(null)

    startTransition(async () => {
      const res = await deleteArtistImageAction(type, artistId)
      if (res.error) {
        setStatusMessage({ type: 'error', text: res.error })
      } else {
        setCurrentUrl(null)
        setPreviewUrl(null)
        setSelectedFile(null)
        setStatusMessage({ type: 'success', text: res.message || 'Image supprimée avec succès.' })
        if (onImageUpdated) onImageUpdated(null)
      }
      if (fileInputRef.current) fileInputRef.current.value = ''
    })
  }

  const activeDisplayUrl = previewUrl || currentUrl

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-gold/20 transition-all flex flex-col justify-between">
      <div>
        {/* Titre du module */}
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-200">
            {title}
          </label>
          <span className="text-[10px] text-gold font-semibold">5 Mo max</span>
        </div>

        {/* Zone d'aperçu d'image */}
        <div
          className={`relative w-full rounded-xl overflow-hidden bg-surface-light border border-white/[0.08] mb-3.5 flex items-center justify-center ${
            isProfile ? 'aspect-square max-w-[180px] mx-auto' : 'aspect-[16/6] max-h-[140px]'
          }`}
        >
          {activeDisplayUrl ? (
            <img
              src={activeDisplayUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-500 p-4 text-center">
              <span className="text-3xl mb-1">{isProfile ? '👤' : '🖼️'}</span>
              <span className="text-[11px] text-gray-400">Aucune image définie</span>
            </div>
          )}

          {/* Overlay indicateur de chargement */}
          {isPending && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-gold z-10">
              <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
              <span className="text-[11px] font-bold">Téléversement en cours...</span>
            </div>
          )}
        </div>

        {/* Détails format */}
        <div className="text-[11px] text-gray-400 space-y-0.5 mb-4">
          <p className="font-medium text-gray-300">{formatDesc}</p>
          <p className="text-gray-500 text-[10px]">Formats acceptés : JPG, PNG ou WebP</p>
          {selectedFile && (
            <p className="text-gold font-medium text-[10px] truncate">
              Sélectionné : {selectedFile.name}
            </p>
          )}
        </div>
      </div>

      {/* Input de fichier caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Message de notification d'état */}
      {statusMessage && (
        <div
          className={`p-2.5 rounded-xl mb-3 flex items-center gap-2 text-[11px] ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/25 text-rose-400'
          }`}
        >
          <span>{statusMessage.type === 'success' ? '✓' : '⚠️'}</span>
          <span className="flex-1">{statusMessage.text}</span>
        </div>
      )}

      {/* Boutons d'action */}
      <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-white/[0.04]">
        {!currentUrl ? (
          <button
            type="button"
            onClick={handleBrowseClick}
            disabled={isPending}
            className="w-full btn-secondary !py-2.5 !px-4 text-xs font-bold flex items-center justify-center gap-2 hover:border-gold/40"
          >
            <span>📁</span>
            <span>{isProfile ? 'Importer une photo' : 'Importer une image'}</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleBrowseClick}
              disabled={isPending}
              className="flex-1 btn-secondary !py-2 !px-3 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <span>🔄</span>
              <span>Remplacer</span>
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="btn-danger !py-2 !px-3 text-xs font-semibold flex items-center justify-center gap-1.5 text-rose-400 hover:text-rose-300 border border-rose-500/20 bg-rose-500/10 rounded-xl hover:bg-rose-500/20 transition-all"
            >
              <span>🗑️</span>
              <span>Supprimer</span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
