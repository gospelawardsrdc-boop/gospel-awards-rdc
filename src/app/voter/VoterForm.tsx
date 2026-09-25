'use client'

import { useState, useTransition } from 'react'
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
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [buyingPackageId, setBuyingPackageId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Find currently selected category & artist
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId)
  const availableArtists = selectedCategory?.artists.map((a) => a.artist) || []
  
  // If no artist is explicitly selected, try selecting the preselected or first available
  const activeArtist = availableArtists.find((a) => a.id === selectedArtistId) || 
    (selectedArtistId ? categories.flatMap(c => c.artists.map(ca => ca.artist)).find(a => a.id === selectedArtistId) : availableArtists[0])

  const isSelf = Boolean(currentArtistId && activeArtist?.id === currentArtistId)

  const handleVote = () => {
    if (!activeArtist || !selectedCategoryId || pointsToVote < 1) return

    startTransition(async () => {
      setMessage(null)
      const result = await voteForArtist(activeArtist.id, selectedCategoryId, pointsToVote)
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: result.message! })
        setBalance((prev) => prev - pointsToVote)
        setPointsToVote(1)
      }
    })
  }

  const handleBuyPoints = (pkg: PointPackage) => {
    setBuyingPackageId(pkg.id)
    startTransition(async () => {
      setMessage(null)
      const result = await createPaymentTransaction(pkg.id, 'MOBILE_MONEY')
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        // Le solde reste strictement inchangé (0 point crédité) tant que le paiement n'est pas confirmé
        setMessage({
          type: 'info',
          text: `Commande initiée pour le ${pkg.name} (${formatCurrency(pkg.priceFc)} = ${pkg.points} pts). Statut : EN ATTENTE DE PAIEMENT (Réf #${result.transactionId?.slice(-8)}). Les points seront crédités dès validation effective du paiement.`,
        })
      }
      setBuyingPackageId(null)
    })
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header Title */}
      <div className="text-center mb-10">
        <span className="text-xs font-semibold text-gold uppercase tracking-[0.2em] mb-2 block">
          Vote Officiel
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Soutenez votre <span className="gold-text">Artiste Favori</span>
        </h1>
        <p className="text-gray-400 text-sm mt-2 max-w-md mx-auto">
          Chaque vote compte pour le couronnement aux Gospel Awards RDC 2026.
        </p>
      </div>

      {/* Alert message */}
      {message && (
        <div
          className={`p-4 rounded-xl mb-8 flex items-center gap-3 text-sm animate-fade-in ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : message.type === 'info'
              ? 'bg-gold/10 border border-gold/30 text-amber-300'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
          }`}
        >
          <span className="text-lg">
            {message.type === 'success' ? '✅' : message.type === 'info' ? '⏳' : '⚠️'}
          </span>
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Vote & Artist Selection */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 1: Category Selector */}
          <div className="premium-card p-5">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 block">
              1. Choisir la catégorie
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {categories.map((category) => {
                const isSelected = selectedCategoryId === category.id
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(category.id)
                      const firstInCat = category.artists[0]?.artist
                      if (firstInCat) {
                        setSelectedArtistId(firstInCat.id)
                      }
                    }}
                    className={`flex items-center gap-2 p-3 rounded-xl text-left text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-gold/[0.12] border border-gold/40 text-gold shadow-sm'
                        : 'bg-white/[0.02] border border-white/[0.04] text-gray-300 hover:bg-white/[0.05]'
                    }`}
                  >
                    <span className="text-base">{category.icon || '🏆'}</span>
                    <span className="truncate">{category.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Step 2: Artist Selector */}
          <div className="premium-card p-5">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 block">
              2. Choisir l&apos;artiste
            </label>
            {availableArtists.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-xs">
                Aucun artiste éligible dans cette catégorie actuellement.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {availableArtists.map((artist) => {
                  const isSelected = activeArtist?.id === artist.id
                  return (
                    <button
                      key={artist.id}
                      type="button"
                      onClick={() => setSelectedArtistId(artist.id)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                        isSelected
                          ? 'bg-gold/[0.12] border border-gold/40 text-white ring-1 ring-gold/20'
                          : 'bg-white/[0.02] border border-white/[0.04] text-gray-400 hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-surface-light border border-white/[0.06] overflow-hidden flex-shrink-0">
                        {artist.profileImage ? (
                          <img src={artist.profileImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm">🎤</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-xs font-bold truncate ${isSelected ? 'text-gold' : 'text-gray-200'}`}>
                            {artist.stageName}
                          </span>
                          {currentArtistId === artist.id && (
                            <span className="text-[9px] bg-gold/10 text-gold border border-gold/20 px-1.5 py-0.2 rounded font-medium">
                              Votre profil
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {formatPoints(artist.totalPoints)} pts actuels
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Step 3: Active Artist Summary & Points Submission */}
          {activeArtist && (
            <div className="premium-card p-6 border-gold/20 glow-gold">
              <div className="flex items-center gap-4 pb-5 border-b border-white/[0.06]">
                <div className="w-16 h-16 rounded-2xl bg-surface-light border-2 border-gold/30 overflow-hidden flex-shrink-0 shadow-lg">
                  {activeArtist.profileImage ? (
                    <img src={activeArtist.profileImage} alt={activeArtist.stageName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🎤</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-gold uppercase tracking-wider block">
                    {selectedCategory?.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-white truncate">{activeArtist.stageName}</h3>
                    {isSelf && (
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold">
                        Votre profil
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">Score actuel :</span>
                    <span className="text-xs font-bold text-gold">{formatPoints(activeArtist.totalPoints)} points</span>
                  </div>
                </div>
              </div>

              {/* Points slider / stepper */}
              <div className="pt-5 space-y-4">
                {isSelf && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                    <span className="text-base">⚠️</span>
                    <span>Vous ne pouvez pas voter pour votre propre candidature.</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
                    Nombre de points à voter :
                  </span>
                  <span className="text-xs text-gray-400">
                    Solde dispo : <strong className="text-gold font-bold">{formatPoints(balance)} pts</strong>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isSelf}
                    onClick={() => setPointsToVote(Math.max(1, pointsToVote - 1))}
                    className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xl font-bold text-gray-200 hover:border-gold/30 hover:text-gold transition-colors flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, balance)}
                    disabled={isSelf}
                    value={pointsToVote}
                    onChange={(e) => setPointsToVote(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 text-center text-2xl font-black bg-white/[0.02] border border-white/[0.08] rounded-xl py-2.5 text-gold focus:outline-none focus:border-gold disabled:opacity-40"
                  />
                  <button
                    type="button"
                    disabled={isSelf}
                    onClick={() => setPointsToVote(pointsToVote + 1)}
                    className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xl font-bold text-gray-200 hover:border-gold/30 hover:text-gold transition-colors flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>

                {/* Quick point chips */}
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {[1, 5, 10, 20, 50, 100, 200].map((num) => (
                    <button
                      key={num}
                      type="button"
                      disabled={isSelf}
                      onClick={() => setPointsToVote(num)}
                      className={`flex-1 min-w-[42px] py-1.5 rounded-lg text-xs font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                        pointsToVote === num
                          ? 'bg-gold/20 border-gold text-gold'
                          : 'bg-white/[0.02] border-white/[0.06] text-gray-400 hover:text-white'
                      }`}
                    >
                      {num} pt{num > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>

                {/* Vote CTA Button */}
                <button
                  type="button"
                  onClick={handleVote}
                  disabled={isPending || isSelf || balance < pointsToVote}
                  className={`w-full !py-4 text-base tracking-wide mt-3 ${
                    isSelf
                      ? 'bg-white/[0.04] text-gray-500 border border-white/[0.06] cursor-not-allowed rounded-xl font-bold'
                      : 'btn-primary animate-pulse-vote'
                  }`}
                >
                  {isSelf
                    ? 'Vote non autorisé pour votre propre profil'
                    : isPending
                    ? 'Traitement du vote...'
                    : balance < pointsToVote
                    ? 'Solde insuffisant (Achetez des points ci-contre)'
                    : `⭐ VOTER AVEC ${pointsToVote} POINT${pointsToVote > 1 ? 'S' : ''}`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Point Packages & Recharge */}
        <div className="lg:col-span-5 space-y-6">
          <div className="premium-card p-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-5">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">Mon Portefeuille</span>
                <span className="text-xl font-black text-white">Solde de Points</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-gold block">{formatPoints(balance)}</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-widest">Points dispo</span>
              </div>
            </div>

            <div className="mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-300 block mb-1">
                💳 Packs de Points Disponibles
              </span>
              <p className="text-[11px] text-gray-500">
                Paiement Mobile Money instantané (Orange Money, M-Pesa, Airtel Money, Afrimoney).
              </p>
            </div>

            {/* Packages Grid */}
            <div className="space-y-3">
              {pointPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-gold/30 transition-all flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gold/[0.08] flex items-center justify-center font-black text-gold text-sm group-hover:scale-110 transition-transform">
                      ⭐
                    </div>
                    <div>
                      <div className="font-black text-white text-sm">
                        {pkg.points} Points
                      </div>
                      <div className="text-xs font-semibold text-gold/90">
                        {formatCurrency(pkg.priceFc)}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleBuyPoints(pkg)}
                    className="btn-secondary !text-xs !py-2 !px-4 hover:!bg-gold hover:!text-[#0A0E1A] transition-all"
                  >
                    {buyingPackageId === pkg.id ? 'Recharge...' : 'Acheter'}
                  </button>
                </div>
              ))}
            </div>

            {/* Secure Payment Badges */}
            <div className="mt-6 pt-5 border-t border-white/[0.04] text-center">
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400 font-medium mb-2">
                <span>🔒 Paiement Sécurisé & Chiffré</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-[10px] text-gray-600 uppercase tracking-widest">
                <span>M-Pesa</span> · <span>Orange Money</span> · <span>Airtel Money</span> · <span>Visa</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gold/[0.04] border border-gold/10 text-xs text-gray-400 leading-relaxed">
            <strong className="text-gold font-bold block mb-1">Règlement des Votes :</strong>
            Les points attribués sont comptabilisés en direct dans les classements officiels. Vous pouvez voter plusieurs fois pour le même artiste.
          </div>
        </div>
      </div>
    </div>
  )
}
