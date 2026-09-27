'use client'

import React, { useState, useTransition, useRef } from 'react'
import Image from 'next/image'
import { formatDate, formatDateTime } from '@/lib/utils'
import { saveEditionAction, uploadEditionBannerAction } from '@/actions/admin-edition'

export const VALID_EDITION_STATUSES = ['DRAFT', 'UPCOMING', 'ACTIVE', 'CLOSED', 'GALA'] as const
export type EditionStatus = typeof VALID_EDITION_STATUSES[number]

export interface CompetitionData {
  id: string
  name: string
  description: string | null
  year: number | null
  bannerImage: string | null
  theme: string | null
  status: string | null
  startDate: string
  endDate: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    votes: number
  }
}

interface AdminEditionClientProps {
  initialCompetition: CompetitionData | null
}

const STATUS_CONFIG: Record<EditionStatus, { label: string; badgeClass: string; desc: string; icon: string }> = {
  DRAFT: {
    label: 'Brouillon',
    badgeClass: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    desc: 'Configuration interne en préparation, invisible pour le grand public.',
    icon: '📝',
  },
  UPCOMING: {
    label: 'À venir',
    badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    desc: 'Annonces officielles et préparatifs avant l\'ouverture des votes.',
    icon: '⏳',
  },
  ACTIVE: {
    label: 'En cours (Active)',
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]',
    desc: 'Période officielle de votes ouverte à tous les utilisateurs.',
    icon: '🔥',
  },
  CLOSED: {
    label: 'Clôturée',
    badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    desc: 'Votes clos. Calcul et audit final des classements en cours.',
    icon: '🔒',
  },
  GALA: {
    label: 'Soirée de Gala',
    badgeClass: 'bg-gold/20 text-gold border-gold/40 shadow-[0_0_15px_rgba(197,168,128,0.25)]',
    desc: 'Cérémonie officielle de remise des trophées et annonce du palmarès.',
    icon: '✨',
  },
}

function toInputDateTime(isoString?: string): string {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    const yyyy = d.getFullYear()
    const MM = pad(d.getMonth() + 1)
    const dd = pad(d.getDate())
    const hh = pad(d.getHours())
    const mm = pad(d.getMinutes())
    return `${yyyy}-${MM}-${dd}T${hh}:${mm}`
  } catch {
    return ''
  }
}

export default function AdminEditionClient({ initialCompetition }: AdminEditionClientProps) {
  const [competition, setCompetition] = useState<CompetitionData | null>(initialCompetition)
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Default dates if no competition yet
  const defaultStart = new Date()
  const defaultEnd = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // +60 days

  // Form states
  const [name, setName] = useState(competition?.name || 'Gospel Awards RDC 2026')
  const [year, setYear] = useState<number | string>(competition?.year ?? 2026)
  const [theme, setTheme] = useState(competition?.theme || 'Célébrons l\'Excellence du Gospel Congolais')
  const [status, setStatus] = useState<EditionStatus>((competition?.status as EditionStatus) || 'ACTIVE')
  const [description, setDescription] = useState(
    competition?.description ||
      'La plus prestigieuse célébration de la musique gospel en République Démocratique du Congo. Récompensant les talents, la foi et l\'excellence artistique.'
  )
  const [startDate, setStartDate] = useState(
    toInputDateTime(competition?.startDate) || toInputDateTime(defaultStart.toISOString())
  )
  const [endDate, setEndDate] = useState(
    toInputDateTime(competition?.endDate) || toInputDateTime(defaultEnd.toISOString())
  )
  const [bannerImage, setBannerImage] = useState(competition?.bannerImage || '')
  const [isActive, setIsActive] = useState(competition ? competition.isActive : true)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Upload handler for banner
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setMessage(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await uploadEditionBannerAction(formData)
      if (res.error) {
        setMessage({ type: 'error', text: res.error })
      } else if (res.url) {
        setBannerImage(res.url)
        setMessage({ type: 'success', text: 'Bannière officielle téléchargée avec succès ! Pensez à enregistrer les modifications.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Une erreur est survenue lors du téléchargement de l\'image.' })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    const formData = new FormData()
    if (competition?.id) {
      formData.append('id', competition.id)
    }
    formData.append('name', name)
    if (year) formData.append('year', String(year))
    if (theme) formData.append('theme', theme)
    if (description) formData.append('description', description)
    formData.append('status', status)
    formData.append('startDate', new Date(startDate).toISOString())
    formData.append('endDate', new Date(endDate).toISOString())
    if (bannerImage) formData.append('bannerImage', bannerImage)
    formData.append('isActive', isActive ? 'true' : 'false')

    startTransition(async () => {
      const res = await saveEditionAction(formData)
      if (res.error) {
        setMessage({ type: 'error', text: res.error })
      } else if (res.success && res.competition) {
        setCompetition(res.competition as any)
        setMessage({ type: 'success', text: 'Configuration de l\'édition enregistrée avec succès.' })
      }
    })
  }

  const currentStatusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.ACTIVE

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div>
          <span className="text-xs font-semibold text-gold uppercase tracking-[0.2em] mb-1 block">
            Gestion de l'Événement
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span>🏆</span>
            <span>Édition <span className="gold-text">Gospel Awards RDC</span></span>
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            Configurez les métadonnées officielles, la période de compétition, le statut et l'identité visuelle de l'édition.
          </p>
        </div>

        {/* Live status badge */}
        <div className="flex items-center gap-3">
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border ${currentStatusConfig.badgeClass}`}
          >
            <span>{currentStatusConfig.icon}</span>
            <span>Statut : {currentStatusConfig.label}</span>
          </div>
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
              isActive
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
            <span>{isActive ? 'Édition Active' : 'Inactive'}</span>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {message && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 transition-all duration-300 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <span className="text-lg">{message.type === 'success' ? '✅' : '⚠️'}</span>
          <div className="text-sm font-medium flex-1">{message.text}</div>
          <button
            onClick={() => setMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="premium-card p-5 border-white/[0.08] flex flex-col justify-between">
          <div className="text-xs text-gray-400 font-medium">Nom Officiel</div>
          <div className="text-lg font-black text-white mt-1 truncate" title={name}>
            {name || 'Non défini'}
          </div>
          <div className="text-[11px] text-gold font-semibold mt-2">
            Année {year || '—'}
          </div>
        </div>

        <div className="premium-card p-5 border-white/[0.08] flex flex-col justify-between">
          <div className="text-xs text-gray-400 font-medium">Période Officielle</div>
          <div className="text-xs font-bold text-gray-200 mt-1">
            {startDate ? formatDate(startDate) : '—'}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            au {endDate ? formatDate(endDate) : '—'}
          </div>
        </div>

        <div className="premium-card p-5 border-white/[0.08] flex flex-col justify-between">
          <div className="text-xs text-gray-400 font-medium">Statut Actuel</div>
          <div className="mt-1">
            <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold border ${currentStatusConfig.badgeClass}`}>
              {currentStatusConfig.icon} {currentStatusConfig.label}
            </span>
          </div>
          <div className="text-[11px] text-gray-500 mt-2 truncate" title={currentStatusConfig.desc}>
            {currentStatusConfig.desc}
          </div>
        </div>

        <div className="premium-card p-5 border-white/[0.08] flex flex-col justify-between">
          <div className="text-xs text-gray-400 font-medium">Votes Enregistrés</div>
          <div className="text-2xl font-black text-gold mt-1">
            {competition?._count?.votes ?? 0}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            associés à cette édition
          </div>
        </div>
      </div>

      {/* Main Configuration Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="premium-card p-6 sm:p-8 border-gold/20 glow-gold space-y-6">
          <div className="border-b border-white/[0.08] pb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>⚙️</span>
              <span>Paramètres de l'Édition</span>
            </h2>
            <span className="text-xs text-gray-400">ID : {competition?.id || 'Nouvelle édition'}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Nom de l'édition */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-300 block">
                Nom de l'Édition <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Gospel Awards RDC 2026"
                className="w-full input-field"
              />
              <p className="text-[11px] text-gray-500">
                Titre officiel affiché sur l'ensemble de la plateforme et des pages publiques.
              </p>
            </div>

            {/* Année */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-300 block">
                Année <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                required
                min={2000}
                max={2100}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2026"
                className="w-full input-field"
              />
            </div>
          </div>

          {/* Thème officiel */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-300 block">
              Thème Officiel de l'Édition
            </label>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Ex: Célébrons l'Excellence du Gospel Congolais"
              className="w-full input-field"
            />
            <p className="text-[11px] text-gray-500">
              Slogan ou axe thématique guidant cette édition.
            </p>
          </div>

          {/* Statut & Toggle Actif */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Statut sélecteur */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-300 block">
                Statut du Déroulement <span className="text-rose-400">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as EditionStatus)}
                className="w-full input-field bg-[#0A0E1A] text-white cursor-pointer"
              >
                {VALID_EDITION_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {STATUS_CONFIG[st].icon} {STATUS_CONFIG[st].label} — {st}
                  </option>
                ))}
              </select>
              <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-lg text-xs text-gray-400">
                ℹ️ {STATUS_CONFIG[status]?.desc}
              </div>
            </div>

            {/* Toggle IsActive */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-300 block">
                Disponibilité de l'Édition
              </label>
              <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-white">Édition Actuellement Active</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Définit cette édition comme la référence courante du site.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Dates de début et de fin */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-300 block">
                Date & Heure de Début <span className="text-rose-400">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full input-field bg-[#0A0E1A] text-white"
              />
              <p className="text-[11px] text-gray-500">
                Lancement officiel de la période de compétition.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-300 block">
                Date & Heure de Fin <span className="text-rose-400">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full input-field bg-[#0A0E1A] text-white"
              />
              <p className="text-[11px] text-gray-500">
                Clôture automatique des votes pour l'édition.
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-300 block">
              Description Éditoriale & Présentation
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Présentation générale de l'édition, vision, message du comité..."
              className="w-full input-field resize-y"
            />
          </div>

          {/* Bannière / Image officielle */}
          <div className="space-y-4 pt-4 border-t border-white/[0.08]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-300 block">
                  Bannière Officielle de l'Édition
                </label>
                <p className="text-xs text-gray-400">
                  Image grand format affichée en tête de l'édition (Format recommandé : 1920x600 px ou 16:9, max 5 Mo).
                </p>
              </div>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleBannerUpload}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="btn-secondary !text-xs !py-2 !px-4 flex items-center gap-2 cursor-pointer"
                >
                  <span>{isUploading ? '⏳' : '📁'}</span>
                  <span>{isUploading ? 'Téléversement...' : 'Téléverser une image'}</span>
                </button>
              </div>
            </div>

            {/* Banner Preview */}
            {bannerImage ? (
              <div className="relative rounded-2xl overflow-hidden border border-gold/30 bg-black/40 h-48 sm:h-64 group">
                <Image
                  src={bannerImage}
                  alt="Bannière Édition"
                  fill
                  className="object-cover"
                  unoptimized={bannerImage.includes('supabase.co')}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                  <div className="text-xs font-medium text-white drop-shadow-md truncate max-w-md">
                    {bannerImage}
                  </div>
                  <button
                    type="button"
                    onClick={() => setBannerImage('')}
                    className="px-3 py-1.5 bg-rose-500/80 hover:bg-rose-600 text-white text-xs font-bold rounded-lg transition-colors shadow-lg"
                  >
                    Supprimer l'image
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/10 hover:border-gold/40 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-white/[0.01]"
              >
                <div className="text-3xl mb-2">🖼️</div>
                <div className="text-sm font-semibold text-gray-300">Aucune bannière configurée</div>
                <div className="text-xs text-gray-500 mt-1">
                  Cliquez ici pour téléverser une image de couverture (JPG, PNG ou WebP)
                </div>
              </div>
            )}

            {/* Manual URL field */}
            <div className="pt-2">
              <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                Ou spécifier directement une URL d'image :
              </label>
              <input
                type="url"
                value={bannerImage}
                onChange={(e) => setBannerImage(e.target.value)}
                placeholder="https://..."
                className="w-full input-field !text-xs !py-2 text-gray-400"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              type="submit"
              disabled={isPending || isUploading}
              className="btn-primary w-full sm:w-auto !py-3 !px-8 flex items-center justify-center gap-2"
            >
              <span>{isPending ? '⏳' : '💾'}</span>
              <span>{isPending ? 'Enregistrement en cours...' : 'Enregistrer l\'Édition'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
