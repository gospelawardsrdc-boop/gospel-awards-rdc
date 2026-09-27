'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatPoints } from '@/lib/utils'

interface CategoryItem {
  id: string
  number: number
  name: string
  slug: string
  icon: string | null
  description: string | null
  artistCount: number
  totalPoints: number
  totalVotes: number
  leader: {
    stageName: string
    points: number
    profileImage: string | null
    slug: string
  } | null
}

interface Props {
  categories: CategoryItem[]
  totalArtistsCount: number
}

export default function CategoriesClient({ categories, totalArtistsCount }: Props) {
  const [searchQuery, setSearchQuery] = useState('')

  // Filter categories based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories
    const q = searchQuery.toLowerCase().trim()
    return categories.filter((cat) =>
      cat.name.toLowerCase().includes(q) ||
      (cat.description && cat.description.toLowerCase().includes(q))
    )
  }, [categories, searchQuery])

  return (
    <div className="space-y-10">
      {/* 1. Hero Section */}
      <div className="text-center relative max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/10 border border-gold/30 text-gold text-xs font-bold uppercase tracking-[0.2em] mb-4 shadow-sm">
          <span>🏆</span> Compétition Officielle · Édition 2026
        </div>
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight">
          Les Catégories <span className="gold-text">Officielles</span>
        </h1>
        <p className="text-gray-300 text-sm sm:text-base mt-3 max-w-2xl mx-auto leading-relaxed">
          Découvrez les 16 catégories de Gospel Awards RDC et les artistes qui concourent pour chaque distinction.
        </p>
        <p className="text-xs sm:text-sm text-gray-400 mt-2 max-w-xl mx-auto">
          Explorez les catégories, découvrez les candidats et soutenez votre artiste préféré.
        </p>

        {/* 2. Counters Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 max-w-lg mx-auto mt-8 p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
          <div>
            <span className="text-xl sm:text-3xl font-black text-gold block">{categories.length}</span>
            <span className="text-[10px] sm:text-xs text-gray-400 font-semibold uppercase tracking-wider">
              Catégories Officielles
            </span>
          </div>
          <div className="border-x border-white/[0.06]">
            <span className="text-xl sm:text-3xl font-black text-white block">{totalArtistsCount}</span>
            <span className="text-[10px] sm:text-xs text-gray-400 font-semibold uppercase tracking-wider">
              Artistes Nommés
            </span>
          </div>
          <div className="col-span-2 sm:col-span-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.06]">
            <span className="text-xl sm:text-3xl font-black text-emerald-400 block">2026</span>
            <span className="text-[10px] sm:text-xs text-gray-400 font-semibold uppercase tracking-wider">
              Édition Annuelle
            </span>
          </div>
        </div>
      </div>

      {/* 3. Search Bar */}
      <div className="max-w-md mx-auto relative">
        <input
          type="text"
          placeholder="Rechercher une catégorie..."
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

      {/* Search Result Feedback */}
      {searchQuery && (
        <div className="flex items-center justify-between text-xs text-gray-400 max-w-7xl mx-auto px-1">
          <div>
            <span>
              {filteredCategories.length} catégorie{filteredCategories.length > 1 ? 's' : ''} trouvée{filteredCategories.length > 1 ? 's' : ''} pour « <strong className="text-white">{searchQuery}</strong> »
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-gold hover:underline font-bold"
          >
            Effacer la recherche ✕
          </button>
        </div>
      )}

      {/* 4. Categories Grid or Empty State */}
      {filteredCategories.length === 0 ? (
        <div className="text-center py-20 px-4 rounded-3xl bg-white/[0.02] border border-white/[0.06] max-w-md mx-auto space-y-4">
          <span className="text-4xl block">🔍</span>
          <h3 className="text-lg font-black text-white">Aucune catégorie trouvée</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Aucune catégorie ne correspond à « {searchQuery} ». Vérifiez l&apos;orthographe ou parcourez la liste complète.
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="btn-primary !text-xs !py-2.5 !px-6 font-bold mt-2"
          >
            Afficher toutes les catégories
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              className="premium-card overflow-hidden border border-white/[0.08] hover:border-gold/40 transition-all flex flex-col justify-between group p-6 relative"
            >
              <div>
                {/* Card Top: Number, Icon, Name */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform shadow-md">
                      {cat.icon || '🏆'}
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gold block">
                        Catégorie #{cat.number < 10 ? `0${cat.number}` : cat.number}
                      </span>
                      <h2 className="font-black text-white text-base sm:text-lg group-hover:text-gold transition-colors leading-tight line-clamp-2">
                        {cat.name}
                      </h2>
                    </div>
                  </div>
                </div>

                {/* Description if present */}
                {cat.description && (
                  <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 mb-4">
                    {cat.description}
                  </p>
                )}

                {/* Candidates Count & Leader Box */}
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2 mb-5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-medium">Candidats officiels :</span>
                    <strong className="text-white font-black">
                      {cat.artistCount} artiste{cat.artistCount > 1 ? 's' : ''}
                    </strong>
                  </div>

                  {cat.artistCount === 0 ? (
                    <div className="text-[11px] text-gray-500 italic pt-1 border-t border-white/[0.04]">
                      Aucun artiste inscrit dans cette catégorie pour le moment.
                    </div>
                  ) : cat.leader ? (
                    <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-white/[0.04]">
                      <span className="text-gold font-semibold flex items-center gap-1">
                        <span>🥇</span> Leader actuel :
                      </span>
                      <span className="text-gray-200 font-bold truncate max-w-[150px]">
                        {cat.leader.stageName} ({formatPoints(cat.leader.points)} pts)
                      </span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-gray-500 pt-1 border-t border-white/[0.04]">
                      En attente des premiers votes.
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/categories/${cat.slug}`}
                    prefetch={true}
                    className="btn-secondary !text-xs !py-2.5 !px-3 font-bold text-center truncate"
                  >
                    Voir les artistes ({cat.artistCount})
                  </Link>
                  <Link
                    href="/classements"
                    prefetch={true}
                    className="py-2.5 px-3 rounded-xl border border-white/[0.08] hover:border-gold/40 text-gray-300 hover:text-white text-xs font-semibold text-center transition-all truncate bg-white/[0.02]"
                  >
                    Voir le classement ↗
                  </Link>
                </div>
                <Link
                  href={`/voter?category=${cat.id}`}
                  prefetch={true}
                  className="w-full block btn-primary !text-xs !py-2.5 font-black text-center shadow-md"
                >
                  ⭐ Voter dans cette catégorie
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
