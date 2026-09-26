'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatPoints } from '@/lib/utils'

interface Category {
  id: string
  name: string
  slug: string
  icon: string | null
}

interface ArtistItem {
  id: string
  stageName: string
  slug: string
  profileImage: string | null
  coverImage: string | null
  categories: Category[]
  totalPoints: number
  totalVotes: number
  rankOverall: number
}

interface Props {
  artists: ArtistItem[]
  categories: Category[]
  currentArtistId?: string | null
}

export default function ArtistesClient({ artists, categories, currentArtistId }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'points' | 'name' | 'votes'>('points')

  // Filter and Sort Artists
  const filteredAndSortedArtists = useMemo(() => {
    let result = [...artists]

    // Filter by Category
    if (selectedCategorySlug !== 'all') {
      result = result.filter((artist) =>
        artist.categories.some((c) => c.slug === selectedCategorySlug)
      )
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter((artist) =>
        artist.stageName.toLowerCase().includes(q)
      )
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'points') {
        return b.totalPoints - a.totalPoints
      }
      if (sortBy === 'votes') {
        return b.totalVotes - a.totalVotes
      }
      if (sortBy === 'name') {
        return a.stageName.localeCompare(b.stageName)
      }
      return 0
    })

    return result
  }, [artists, selectedCategorySlug, searchQuery, sortBy])

  // Count active candidates per category for display badges
  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>()
    artists.forEach((a) => {
      a.categories.forEach((c) => {
        map.set(c.slug, (map.get(c.slug) || 0) + 1)
      })
    })
    return map
  }, [artists])

  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedCategorySlug('all')
    setSortBy('points')
  }

  return (
    <div className="space-y-10">
      {/* Header Banner */}
      <div className="text-center relative max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/10 border border-gold/30 text-gold text-xs font-bold uppercase tracking-[0.2em] mb-4 shadow-sm">
          <span>🏆</span> Candidats Officiels · Édition 2026
        </div>
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight">
          Les Artistes <span className="gold-text">Gospel Awards RDC</span>
        </h1>
        <p className="text-gray-400 text-sm sm:text-base mt-3 max-w-xl mx-auto leading-relaxed">
          Découvrez les artistes et chantres officiellement nommés pour l&apos;édition 2026. Explorez leurs parcours et soutenez vos favoris avec vos points de vote.
        </p>

        {/* Real Summary Metrics */}
        <div className="flex items-center justify-center gap-6 mt-8 max-w-sm mx-auto p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs font-semibold text-gray-400">
          <div>
            <strong className="text-white font-black text-base">{artists.length}</strong> artistes nommés
          </div>
          <div className="w-1 h-1 rounded-full bg-gold" />
          <div>
            <strong className="text-gold font-black text-base">{categories.length}</strong> catégories
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-lg">
            <input
              type="text"
              placeholder="Rechercher un artiste par son nom de scène..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.1] focus:border-gold rounded-2xl py-3 pl-11 pr-10 text-sm text-white placeholder-gray-500 outline-none transition-all shadow-md"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base">
              🔍
            </span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs bg-white/[0.08] hover:bg-white/[0.15] p-1.5 rounded-full"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <span className="text-xs text-gray-400 font-medium hidden sm:inline">Trier par :</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white/[0.04] border border-white/[0.1] focus:border-gold rounded-xl py-2.5 px-3.5 text-xs font-semibold text-gray-200 outline-none cursor-pointer"
            >
              <option value="points" className="bg-[#0e1726] text-white">Points (décroissant)</option>
              <option value="votes" className="bg-[#0e1726] text-white">Nombre de votes</option>
              <option value="name" className="bg-[#0e1726] text-white">Nom (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none pt-1">
          <button
            type="button"
            onClick={() => setSelectedCategorySlug('all')}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              selectedCategorySlug === 'all'
                ? 'bg-gold text-[#060912] shadow-md shadow-gold/20 scale-105'
                : 'bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            ✨ Toutes les catégories ({artists.length})
          </button>

          {categories.map((category) => {
            const isSelected = selectedCategorySlug === category.slug
            const count = categoryCounts.get(category.slug) || 0

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategorySlug(category.slug)}
                className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-gold text-[#060912] shadow-md shadow-gold/20 scale-105'
                    : 'bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <span>{category.icon || '🏆'}</span>
                <span>{category.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isSelected ? 'bg-[#060912]/20 text-[#060912]' : 'bg-white/[0.06] text-gray-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Active Filter Summary Feedback */}
      {(searchQuery || selectedCategorySlug !== 'all') && (
        <div className="flex items-center justify-between text-xs text-gray-400 px-1">
          <div>
            <span>
              {filteredAndSortedArtists.length} artiste{filteredAndSortedArtists.length > 1 ? 's' : ''} trouvé{filteredAndSortedArtists.length > 1 ? 's' : ''}
            </span>
            {selectedCategorySlug !== 'all' && (
              <span> dans « {categories.find((c) => c.slug === selectedCategorySlug)?.name} »</span>
            )}
            {searchQuery && (
              <span> pour « <strong className="text-white">{searchQuery}</strong> »</span>
            )}
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-gold hover:underline font-bold"
          >
            Effacer tous les filtres ✕
          </button>
        </div>
      )}

      {/* Artist Grid or Empty State */}
      {filteredAndSortedArtists.length === 0 ? (
        <div className="text-center py-20 px-4 rounded-3xl bg-white/[0.02] border border-white/[0.06] max-w-md mx-auto space-y-4">
          <span className="text-4xl block">🔍</span>
          <h3 className="text-lg font-black text-white">Aucun artiste trouvé</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Aucun candidat ne correspond aux filtres sélectionnés. Essayez d&apos;ajuster vos critères ou votre recherche.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="btn-primary !text-xs !py-2.5 !px-6 font-bold mt-2"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAndSortedArtists.map((artist) => {
            const isSelf = currentArtistId === artist.id

            return (
              <div
                key={artist.id}
                className="premium-card overflow-hidden group border border-white/[0.08] hover:border-gold/40 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Image / Header Cover */}
                  <div className="relative h-36 sm:h-40 bg-gradient-to-br from-surface-light to-surface overflow-hidden">
                    {artist.coverImage ? (
                      <img
                        src={artist.coverImage}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-gold/[0.08] via-accent/[0.04] to-transparent" />
                    )}
                    <div className="category-gradient absolute inset-0" />

                    {/* Rank Badge if in top 3 overall */}
                    {artist.rankOverall <= 3 && artist.totalPoints > 0 && (
                      <div
                        className={`absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-xs font-black flex items-center gap-1 shadow-lg ${
                          artist.rankOverall === 1
                            ? 'bg-amber-400 text-[#060912]'
                            : artist.rankOverall === 2
                            ? 'bg-slate-300 text-[#060912]'
                            : 'bg-amber-700 text-white'
                        }`}
                      >
                        <span>{artist.rankOverall === 1 ? '🥇 #1' : artist.rankOverall === 2 ? '🥈 #2' : '🥉 #3'}</span>
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-5 -mt-10 relative">
                    {/* Profile Avatar */}
                    <div className="w-16 h-16 rounded-2xl bg-surface border-2 border-gold/30 overflow-hidden mb-3 ring-4 ring-[#060912] shadow-xl">
                      {artist.profileImage ? (
                        <img
                          src={artist.profileImage}
                          alt={artist.stageName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl bg-surface-light">🎤</div>
                      )}
                    </div>

                    {/* Stage Name & Self Badge */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <Link
                        href={`/artistes/${artist.slug}`}
                        className="font-black text-base sm:text-lg text-white group-hover:text-gold transition-colors truncate"
                      >
                        {artist.stageName}
                      </Link>
                      {isSelf && (
                        <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded font-semibold">
                          Votre profil
                        </span>
                      )}
                    </div>

                    {/* Category Tags */}
                    <div className="flex flex-wrap gap-1.5 my-2.5 min-h-[22px]">
                      {artist.categories.slice(0, 2).map((cat) => (
                        <span
                          key={cat.id}
                          className="text-[10px] font-semibold bg-gold/[0.08] text-gold border border-gold/20 px-2 py-0.5 rounded-full truncate max-w-[150px]"
                        >
                          {cat.name}
                        </span>
                      ))}
                      {artist.categories.length > 2 && (
                        <span className="text-[10px] text-gray-500 px-1.5 py-0.5 font-bold">
                          +{artist.categories.length - 2}
                        </span>
                      )}
                    </div>

                    {/* Score & Votes Row */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] text-xs">
                      <div>
                        <span className="text-lg font-black text-gold block leading-none">
                          {formatPoints(artist.totalPoints)}
                        </span>
                        <span className="text-[10px] text-gray-500 uppercase font-semibold">
                          {artist.totalPoints > 1 ? 'Points' : 'Point'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-300 block leading-none">
                          {artist.totalVotes}
                        </span>
                        <span className="text-[10px] text-gray-500 uppercase font-semibold">
                          Vote{artist.totalVotes > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card CTA Actions */}
                <div className="p-5 pt-0 flex gap-2">
                  <Link
                    href={`/artistes/${artist.slug}`}
                    className="flex-1 text-center text-xs font-bold py-2.5 rounded-xl border border-white/[0.1] text-gray-300 hover:border-gold/40 hover:text-white transition-all"
                  >
                    Profil
                  </Link>
                  <Link
                    href={`/voter?artist=${artist.id}`}
                    className="flex-1 text-center text-xs font-black py-2.5 rounded-xl btn-primary text-[#060912] shadow-md"
                  >
                    ⭐ Voter
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
