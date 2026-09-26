'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { voteForArtist, createPaymentTransaction } from '@/actions/vote'
import { formatPoints, formatCurrency } from '@/lib/utils'

interface Artist {
  id: string
  stageName: string
  slug: string
  profileImage: string | null
  totalPoints: number
}

interface Category {
  id: string
  name: string
  slug: string
  icon: string | null
  artists: { artist: Artist }[]
}

interface PointPackage {
  id: string
  name: string
  points: number
  priceFc: number
}

interface Props {
  categories: Category[]
  pointPackages: PointPackage[]
  userBalance: number
  preselectedArtist?: string
  preselectedCategory?: string
  currentArtistId?: string | null
}

export default function VoterForm({
  categories,
  pointPackages,
  userBalance: initialBalance,
  preselectedArtist,
  preselectedCategory,
  currentArtistId,
}: Props) {
  const [selectedCategoryId, setSelectedCategoryId] = useState(preselectedCategory || (categories[0]?.id || ''))
  const [selectedArtistId, setSelectedArtistId] = useState(preselectedArtist || '')
  const [pointsToVote, setPointsToVote] = useState(1)
  const [balance, setBalance] = useState(initialBalance)
  const [artistSearchQuery, setArtistSearchQuery] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [voteSuccessData, setVoteSuccessData] = useState<{
    artistName: string
    categoryName: string
    points: number
    newBalance: number
    artistImage: string | null
    artistSlug: string
    categorySlug: string
  } | null>(null)
  
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [buyingPackageId, setBuyingPackageId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Selected Category
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) || categories[0]
  
  // Available Artists in Selected Category sorted by totalPoints desc
  const availableArtists = useMemo(() => {
    if (!selectedCategory) return []
    const list = selectedCategory.artists.map((a) => a.artist)
    return [...list].sort((a, b) => b.totalPoints - a.totalPoints)
  }, [selectedCategory])

  // Filtered Artists based on search query
  const filteredArtists = useMemo(() => {
    if (!artistSearchQuery.trim()) return availableArtists
    const q = artistSearchQuery.toLowerCase()
    return availableArtists.filter((a) => a.stageName.toLowerCase().includes(q))
  }, [availableArtists, artistSearchQuery])

  // Find currently active artist
  const activeArtist = useMemo(() => {
    if (selectedArtistId) {
      const found = availableArtists.find((a) => a.id === selectedArtistId)
      if (found) return found
      // Check in all categories in case preselected artist was from another category
      const foundAnywhere = categories.flatMap(c => c.artists.map(ca => ca.artist)).find(a => a.id === selectedArtistId)
      if (foundAnywhere) return foundAnywhere
    }
    return availableArtists[0] || null
  }, [selectedArtistId, availableArtists, categories])

  const isSelf = Boolean(currentArtistId && activeArtist?.id === currentArtistId)
  const hasInsufficientBalance = balance < pointsToVote || balance === 0
  const remainingBalance = balance - pointsToVote

  // Handle Category Switch
  const handleSelectCategory = (catId: string) => {
    setSelectedCategoryId(catId)
    setArtistSearchQuery('')
    setMessage(null)
    const targetCat = categories.find((c) => c.id === catId)
    if (targetCat && targetCat.artists.length > 0) {
      setSelectedArtistId(targetCat.artists[0].artist.id)
    } else {
      setSelectedArtistId('')
    }
  }

  // Pre-Vote Validation & Open Modal
  const handleOpenConfirmModal = () => {
    if (!activeArtist || !selectedCategory || pointsToVote < 1) return
    if (isSelf) {
      setMessage({ type: 'error', text: 'Vous ne pouvez pas voter pour votre propre candidature.' })
      return
    }
    if (hasInsufficientBalance) {
      setMessage({ type: 'error', text: 'Solde de points insuffisant pour effectuer ce vote.' })
      return
    }
    setShowConfirmModal(true)
  }

  // Submit Vote to Server Action
  const handleConfirmVote = () => {
    if (!activeArtist || !selectedCategory || pointsToVote < 1) return

    startTransition(async () => {
      setMessage(null)
      const votePoints = pointsToVote
      const artistSnapshot = activeArtist
      const catSnapshot = selectedCategory

      const result = await voteForArtist(artistSnapshot.id, catSnapshot.id, votePoints)
      
      setShowConfirmModal(false)

      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        const newBal = balance - votePoints
        setBalance(newBal)
        setPointsToVote(1)
        setVoteSuccessData({
          artistName: artistSnapshot.stageName,
          categoryName: catSnapshot.name,
          points: votePoints,
          newBalance: newBal,
          artistImage: artistSnapshot.profileImage,
          artistSlug: artistSnapshot.slug,
          categorySlug: catSnapshot.slug,
        })
      }
    })
  }

  // Handle Buying Points Package
  const handleBuyPoints = (pkg: PointPackage) => {
    setBuyingPackageId(pkg.id)
    startTransition(async () => {
      setMessage(null)
      const result = await createPaymentTransaction(pkg.id, 'MOBILE_MONEY')
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({
          type: 'info',
          text: `Commande initiée pour le ${pkg.name} (${formatCurrency(pkg.priceFc)} = ${pkg.points} pts). Statut : EN ATTENTE DE PAIEMENT (Réf #${result.transactionId?.slice(-8)}). Les points seront crédités dès validation effective du paiement.`,
        })
      }
      setBuyingPackageId(null)
    })
  }

  const quickPointOptions = [1, 5, 10, 20, 50, 100, 200]

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="text-center relative pb-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gold/10 border border-gold/30 text-gold text-xs font-bold uppercase tracking-[0.2em] mb-3">
          <span>🏆</span> Vote Officiel · Édition 2026
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          Soutenez votre <span className="gold-text">Artiste Favori</span>
        </h1>
        <p className="text-gray-400 text-sm sm:text-base mt-2.5 max-w-xl mx-auto">
          Attribuez vos points aux artistes nommés. Chaque vote est instantanément comptabilisé dans le classement officiel.
        </p>

        {/* Wizard Step Progress */}
        <div className="grid grid-cols-3 max-w-md mx-auto mt-6 pt-4 border-t border-white/[0.06] text-xs font-semibold">
          <div className="flex flex-col items-center gap-1.5 text-gold">
            <span className="w-7 h-7 rounded-full bg-gold text-[#060912] font-black flex items-center justify-center text-xs shadow-md">
              1
            </span>
            <span className="text-[11px] font-bold">Catégorie</span>
          </div>
          <div className={`flex flex-col items-center gap-1.5 ${activeArtist ? 'text-gold' : 'text-gray-400'}`}>
            <span className={`w-7 h-7 rounded-full font-black flex items-center justify-center text-xs transition-all ${
              activeArtist ? 'bg-gold text-[#060912] shadow-md' : 'bg-white/[0.08] text-gray-400'
            }`}>
              2
            </span>
            <span className="text-[11px] font-bold">Artiste</span>
          </div>
          <div className={`flex flex-col items-center gap-1.5 ${pointsToVote > 0 ? 'text-gold' : 'text-gray-400'}`}>
            <span className={`w-7 h-7 rounded-full font-black flex items-center justify-center text-xs transition-all ${
              pointsToVote > 0 ? 'bg-gold text-[#060912] shadow-md' : 'bg-white/[0.08] text-gray-400'
            }`}>
              3
            </span>
            <span className="text-[11px] font-bold">Points & Vote</span>
          </div>
        </div>
      </div>

      {/* Global Alert Notification */}
      {message && (
        <div
          className={`p-4 sm:p-5 rounded-2xl flex items-start gap-3.5 text-sm transition-all shadow-lg ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : message.type === 'info'
              ? 'bg-gold/10 border border-gold/40 text-amber-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}
        >
          <span className="text-xl flex-shrink-0 mt-0.5">
            {message.type === 'success' ? '✅' : message.type === 'info' ? 'ℹ️' : '⚠️'}
          </span>
          <div className="flex-1">
            <div className="font-bold mb-0.5">
              {message.type === 'success' ? 'Opération réussie' : message.type === 'info' ? 'Information' : 'Attention'}
            </div>
            <div className="leading-relaxed opacity-95">{message.text}</div>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-white/[0.05]"
          >
            ✕
          </button>
        </div>
      )}

      {/* Post-Vote Success Celebration Banner */}
      {voteSuccessData && (
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#0e1726] via-[#121d30] to-[#0a101d] border-2 border-gold/40 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row items-center gap-6 relative z-10 text-center md:text-left">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-surface-light border-2 border-gold overflow-hidden flex-shrink-0 shadow-xl relative">
              {voteSuccessData.artistImage ? (
                <img
                  src={voteSuccessData.artistImage}
                  alt={voteSuccessData.artistName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">🎤</div>
              )}
              <div className="absolute top-1 right-1 bg-emerald-500 text-white p-1 rounded-full text-xs shadow-md">
                ✓
              </div>
            </div>

            <div className="flex-1 space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <span>🎉</span> Vote validé avec succès !
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                +{voteSuccessData.points} point{voteSuccessData.points > 1 ? 's' : ''} attribué{voteSuccessData.points > 1 ? 's' : ''} à{' '}
                <span className="text-gold">{voteSuccessData.artistName}</span>
              </h2>
              <p className="text-gray-300 text-sm">
                Catégorie : <strong className="text-white">{voteSuccessData.categoryName}</strong> · Votre nouveau solde est de{' '}
                <strong className="text-gold">{formatPoints(voteSuccessData.newBalance)} pts</strong>.
              </p>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={() => setVoteSuccessData(null)}
                className="btn-primary !py-2.5 !px-5 text-xs font-bold w-full sm:w-auto"
              >
                ⭐ Continuer à voter
              </button>
              <Link
                href="/classements"
                className="btn-secondary !py-2.5 !px-5 text-xs font-bold w-full sm:w-auto text-center"
              >
                📊 Voir le classement
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Voting Flow (Left 7 Cols) + Wallet/Packs (Right 5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: 3-Step Voting Experience */}
        <div className="lg:col-span-7 space-y-6">
          {/* STEP 1: Categories */}
          <div className="premium-card p-5 sm:p-6 border border-white/[0.08]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-gold/20 text-gold text-xs font-black flex items-center justify-center border border-gold/40">
                  1
                </span>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Sélectionnez une Catégorie
                </h3>
              </div>
              <span className="text-xs font-semibold text-gray-400">
                {categories.length} catégories
              </span>
            </div>

            {/* Scrollable / Responsive category grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {categories.map((category) => {
                const isSelected = selectedCategoryId === category.id
                const artistCount = category.artists.length

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleSelectCategory(category.id)}
                    className={`flex items-center justify-between gap-3 p-3 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-gold/[0.15] border-2 border-gold text-white shadow-md ring-1 ring-gold/30'
                        : 'bg-white/[0.02] border border-white/[0.06] text-gray-300 hover:bg-white/[0.06] hover:border-white/[0.12]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl flex-shrink-0">{category.icon || '🏆'}</span>
                      <div className="min-w-0">
                        <span className={`text-xs font-bold block truncate ${isSelected ? 'text-gold' : 'text-gray-200'}`}>
                          {category.name}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {artistCount} artiste{artistCount > 1 ? 's' : ''} nommé{artistCount > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-gold text-[#060912] font-black text-xs flex items-center justify-center flex-shrink-0">
                        ✓
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* STEP 2: Artists in Category */}
          <div className="premium-card p-5 sm:p-6 border border-white/[0.08]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-gold/20 text-gold text-xs font-black flex items-center justify-center border border-gold/40">
                  2
                </span>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    Choisissez l&apos;Artiste
                  </h3>
                  <span className="text-[11px] text-gold font-medium">
                    Dans « {selectedCategory?.name || 'Catégorie'} »
                  </span>
                </div>
              </div>

              {/* Local Quick Search */}
              <div className="relative w-full sm:w-56">
                <input
                  type="text"
                  placeholder="Rechercher un artiste..."
                  value={artistSearchQuery}
                  onChange={(e) => setArtistSearchQuery(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-gold rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none transition-all"
                />
                {artistSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setArtistSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Artist List or Empty State */}
            {filteredArtists.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-2xl bg-white/[0.01] border border-white/[0.04] space-y-2">
                <span className="text-3xl block">🔍</span>
                <p className="text-xs font-medium text-gray-400">
                  {artistSearchQuery
                    ? `Aucun artiste trouvé pour « ${artistSearchQuery} » dans cette catégorie.`
                    : 'Aucun artiste disponible dans cette catégorie pour le moment.'}
                </p>
                {artistSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setArtistSearchQuery('')}
                    className="text-xs text-gold underline font-semibold hover:opacity-80"
                  >
                    Effacer la recherche
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                {filteredArtists.map((artist, idx) => {
                  const isSelected = activeArtist?.id === artist.id
                  const isThisSelf = currentArtistId === artist.id

                  return (
                    <button
                      key={artist.id}
                      type="button"
                      onClick={() => {
                        setSelectedArtistId(artist.id)
                        setMessage(null)
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all relative overflow-hidden ${
                        isSelected
                          ? 'bg-gold/[0.15] border-2 border-gold text-white shadow-lg ring-1 ring-gold/30'
                          : 'bg-white/[0.02] border border-white/[0.06] text-gray-300 hover:bg-white/[0.06] hover:border-white/[0.12]'
                      }`}
                    >
                      {/* Position / Rank badge */}
                      <span className="absolute top-1.5 left-1.5 text-[9px] font-black text-gray-500 px-1 rounded bg-black/40">
                        #{idx + 1}
                      </span>

                      <div className="w-12 h-12 rounded-xl bg-surface-light border border-white/[0.08] overflow-hidden flex-shrink-0 relative mt-2 sm:mt-0">
                        {artist.profileImage ? (
                          <img
                            src={artist.profileImage}
                            alt={artist.stageName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-base">🎤</div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-xs font-black truncate ${isSelected ? 'text-gold' : 'text-gray-100'}`}>
                            {artist.stageName}
                          </span>
                          {isThisSelf && (
                            <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded font-semibold">
                              Votre profil
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-semibold text-gray-400 mt-0.5">
                          <strong className="text-gold font-bold">{formatPoints(artist.totalPoints)}</strong> pts dans cette catégorie
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-gold text-[#060912] font-black text-xs flex items-center justify-center flex-shrink-0">
                          ✓
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* STEP 3: Active Selection & Point Allocation */}
          {activeArtist && (
            <div className="premium-card p-6 border-2 border-gold/30 glow-gold">
              <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-white/[0.08]">
                <span className="w-6 h-6 rounded-full bg-gold text-[#060912] text-xs font-black flex items-center justify-center shadow-md">
                  3
                </span>
                <div className="flex-1">
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    Attribution des Points de Vote
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Déterminez le nombre de points à attribuer à <strong className="text-gold">{activeArtist.stageName}</strong>.
                  </p>
                </div>
              </div>

              {/* Summary Card */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] mb-5">
                <div className="w-16 h-16 rounded-2xl bg-surface-light border-2 border-gold/40 overflow-hidden flex-shrink-0 shadow-lg">
                  {activeArtist.profileImage ? (
                    <img
                      src={activeArtist.profileImage}
                      alt={activeArtist.stageName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🎤</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-gold uppercase tracking-wider block">
                    {selectedCategory?.name}
                  </span>
                  <h4 className="text-xl font-black text-white truncate">{activeArtist.stageName}</h4>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                    <span>Score actuel : <strong className="text-white font-bold">{formatPoints(activeArtist.totalPoints)} pts</strong></span>
                    <Link
                      href={`/artistes/${activeArtist.slug}`}
                      className="text-gold hover:underline text-[11px] font-medium"
                      target="_blank"
                    >
                      Voir le profil ↗
                    </Link>
                  </div>
                </div>
              </div>

              {/* Self-vote alert */}
              {isSelf && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-3 mb-5">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <strong className="font-bold block">Action non autorisée</strong>
                    Selon le règlement officiel, les artistes ne peuvent pas voter pour leur propre candidature.
                  </div>
                </div>
              )}

              {/* Point Allocation Stepper & Chips */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
                    Nombre de points :
                  </span>
                  <span className="text-xs text-gray-400">
                    Solde disponible : <strong className="text-gold font-bold">{formatPoints(balance)} pts</strong>
                  </span>
                </div>

                {/* Counter Input */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isSelf || pointsToVote <= 1}
                    onClick={() => setPointsToVote((prev) => Math.max(1, prev - 1))}
                    className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.1] text-2xl font-black text-gray-200 hover:border-gold hover:text-gold transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                  >
                    -
                  </button>

                  <div className="flex-1 relative">
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, balance)}
                      disabled={isSelf}
                      value={pointsToVote}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1
                        setPointsToVote(Math.max(1, val))
                      }}
                      className="w-full text-center text-3xl font-black bg-white/[0.03] border-2 border-white/[0.1] focus:border-gold rounded-xl py-2 text-gold outline-none transition-all disabled:opacity-40"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500 uppercase tracking-widest hidden sm:inline">
                      PTS
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isSelf}
                    onClick={() => setPointsToVote((prev) => prev + 1)}
                    className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.1] text-2xl font-black text-gray-200 hover:border-gold hover:text-gold transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                  >
                    +
                  </button>
                </div>

                {/* Quick Point Chips */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                    Sélection rapide :
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {quickPointOptions.map((num) => (
                      <button
                        key={num}
                        type="button"
                        disabled={isSelf}
                        onClick={() => setPointsToVote(num)}
                        className={`flex-1 min-w-[50px] py-2 rounded-xl text-xs font-black border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                          pointsToVote === num
                            ? 'bg-gold border-gold text-[#060912] shadow-md scale-105'
                            : 'bg-white/[0.03] border-white/[0.08] text-gray-300 hover:border-gold/50 hover:text-gold'
                        }`}
                      >
                        {num} pt{num > 1 ? 's' : ''}
                      </button>
                    ))}

                    {/* Max Points Button */}
                    {balance > 0 && (
                      <button
                        type="button"
                        disabled={isSelf}
                        onClick={() => setPointsToVote(balance)}
                        className={`py-2 px-3 rounded-xl text-xs font-black border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                          pointsToVote === balance
                            ? 'bg-gold border-gold text-[#060912] shadow-md'
                            : 'bg-gold/10 border-gold/30 text-gold hover:bg-gold/20'
                        }`}
                      >
                        Max ({formatPoints(balance)})
                      </button>
                    )}
                  </div>
                </div>

                {/* Live Balance Impact Preview */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs">
                  <div className="text-gray-400">
                    Solde après ce vote :
                  </div>
                  <div className={`font-black text-sm ${remainingBalance < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {remainingBalance < 0 ? (
                      <span>Solde insuffisant ({formatPoints(remainingBalance)} pts)</span>
                    ) : (
                      <span>{formatPoints(remainingBalance)} points restants</span>
                    )}
                  </div>
                </div>

                {/* Submit Vote CTA */}
                <button
                  type="button"
                  onClick={handleOpenConfirmModal}
                  disabled={isPending || isSelf || hasInsufficientBalance}
                  className={`w-full !py-4 text-sm sm:text-base font-black tracking-wide rounded-2xl transition-all shadow-xl ${
                    isSelf
                      ? 'bg-white/[0.04] text-gray-500 border border-white/[0.06] cursor-not-allowed'
                      : hasInsufficientBalance
                      ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300 cursor-not-allowed'
                      : 'btn-primary animate-pulse-vote hover:scale-[1.01]'
                  }`}
                >
                  {isSelf
                    ? 'Vote non autorisé pour votre profil'
                    : hasInsufficientBalance
                    ? '⚠️ Solde insuffisant pour voter'
                    : `⭐ VOTER AVEC ${pointsToVote} POINT${pointsToVote > 1 ? 'S' : ''}`}
                </button>

                {hasInsufficientBalance && (
                  <p className="text-center text-xs text-rose-400/90 font-medium">
                    Vous avez besoin de {pointsToVote - balance} point(s) supplémentaire(s). Achetez un pack ci-contre pour continuer.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Wallet & Point Packages */}
        <div className="lg:col-span-5 space-y-6">
          {/* User Wallet Card */}
          <div className="premium-card p-6 border-2 border-gold/20">
            <div className="flex items-center justify-between pb-5 border-b border-white/[0.08] mb-5">
              <div>
                <span className="text-[10px] uppercase font-black tracking-[0.2em] text-gold block">
                  Portefeuille Utilisateur
                </span>
                <h3 className="text-xl font-black text-white mt-0.5">Solde de Points</h3>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black gold-text block leading-none">
                  {formatPoints(balance)}
                </span>
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mt-1 block">
                  Points Disponibles
                </span>
              </div>
            </div>

            <div className="mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-200 block mb-1">
                💳 Acheter des Points de Vote
              </span>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Paiement instantané par Mobile Money (Orange Money, M-Pesa, Airtel Money, Afrimoney). Vos points sont crédités après validation.
              </p>
            </div>

            {/* Point Packages List */}
            <div className="space-y-3">
              {pointPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-gold/40 hover:bg-white/[0.04] transition-all flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center font-black text-gold text-base group-hover:scale-110 transition-transform">
                      ⭐
                    </div>
                    <div>
                      <div className="font-black text-white text-sm">
                        {pkg.points} Points
                      </div>
                      <div className="text-xs font-bold text-gold">
                        {formatCurrency(pkg.priceFc)}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isPending || buyingPackageId === pkg.id}
                    onClick={() => handleBuyPoints(pkg)}
                    className="btn-secondary !text-xs !py-2 !px-4 hover:!bg-gold hover:!text-[#0A0E1A] font-bold transition-all disabled:opacity-40"
                  >
                    {buyingPackageId === pkg.id ? 'Traitement...' : 'Acheter'}
                  </button>
                </div>
              ))}
            </div>

            {/* Payment Trust Badges */}
            <div className="mt-6 pt-5 border-t border-white/[0.06] text-center space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 font-semibold">
                <span>🔒</span> Transaction Sécurisée & Chiffrée
              </div>
              <div className="flex items-center justify-center flex-wrap gap-2 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                <span>M-Pesa</span> · <span>Orange Money</span> · <span>Airtel Money</span> · <span>Afrimoney</span>
              </div>
            </div>
          </div>

          {/* Voting Transparency & Rules */}
          <div className="p-5 rounded-2xl bg-gold/[0.04] border border-gold/15 text-xs text-gray-300 space-y-2 leading-relaxed">
            <div className="flex items-center gap-2 text-gold font-black">
              <span>⚖️</span> Charte Officielle du Vote
            </div>
            <p>
              • <strong>Transparence :</strong> Les votes sont auditables et vérifiés en temps réel.<br />
              • <strong>Attribution multiple :</strong> Vous pouvez voter plusieurs fois pour vos artistes préférés dans différentes catégories.<br />
              • <strong>Intégrité :</strong> Les votes frauduleux ou d&apos;auto-vote sont systématiquement bloqués.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && activeArtist && selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#0e1726] border-2 border-gold/40 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-center relative overflow-hidden">
            <div className="w-16 h-16 mx-auto rounded-full bg-gold/10 border-2 border-gold flex items-center justify-center text-2xl shadow-lg">
              🗳️
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gold block mb-1">
                Confirmation de Vote
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Confirmer l&apos;attribution de vos points ?
              </h3>
            </div>

            {/* Recap Card */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-left space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-white/[0.06]">
                <div className="w-12 h-12 rounded-xl bg-surface-light border border-gold/30 overflow-hidden flex-shrink-0">
                  {activeArtist.profileImage ? (
                    <img src={activeArtist.profileImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg">🎤</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold text-gold uppercase">{selectedCategory.name}</div>
                  <div className="text-sm font-black text-white truncate">{activeArtist.stageName}</div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-300">
                  <span>Points alloués :</span>
                  <strong className="text-gold font-bold">+{pointsToVote} pts</strong>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Solde actuel :</span>
                  <span>{formatPoints(balance)} pts</span>
                </div>
                <div className="flex justify-between text-gray-300 pt-1.5 border-t border-white/[0.04] font-semibold">
                  <span>Solde après vote :</span>
                  <span className="text-emerald-400 font-bold">{formatPoints(remainingBalance)} pts</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 leading-normal">
              Cette action déduira immédiatement {pointsToVote} point(s) de votre solde et les ajoutera au score officiel de l&apos;artiste.
            </p>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 rounded-xl border border-white/[0.1] text-xs font-bold text-gray-300 hover:bg-white/[0.05] transition-all disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmVote}
                className="flex-1 btn-primary !py-3 !text-xs font-black tracking-wide shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <span className="animate-spin inline-block">⏳</span> Enregistrement...
                  </>
                ) : (
                  `Confirmer (${pointsToVote} pts)`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
