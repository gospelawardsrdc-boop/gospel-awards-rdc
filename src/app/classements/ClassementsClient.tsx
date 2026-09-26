'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatPoints, getRankEmoji } from '@/lib/utils'

interface Artist {
  id: string
  stageName: string
  slug: string
  profileImage: string | null
}

interface RankedItem {
  rank: number
  artist: Artist
  totalPoints: number
  totalVotes: number
}

interface CategoryWithRankings {
  category: {
    id: string
    name: string
    slug: string
    icon: string | null
    description?: string | null
  }
  rankings: RankedItem[]
}

interface Props {
  rankings: CategoryWithRankings[]
  currentArtistId?: string | null
}

export default function ClassementsClient({ rankings, currentArtistId }: Props) {
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>(
    rankings[0]?.category.slug || 'all'
  )
  const [searchQuery, setSearchQuery] = useState('')

  // Compute global statistics
  const totalArtists = useMemo(() => {
    const uniqueIds = new Set<string>()
    rankings.forEach((c) => c.rankings.forEach((r) => uniqueIds.add(r.artist.id)))
    return uniqueIds.size
  }, [rankings])

  const totalPointsDistributed = useMemo(() => {
    return rankings.reduce((acc, c) => acc + c.rankings.reduce((sum, r) => sum + r.totalPoints, 0), 0)
  }, [rankings])

  const totalVotesCast = useMemo(() => {
    return rankings.reduce((acc, c) => acc + c.rankings.reduce((sum, r) => sum + r.totalVotes, 0), 0)
  }, [rankings])

  // Active Category Data (when not viewing 'all')
  const activeCategoryData = useMemo(() => {
    return rankings.find((c) => c.category.slug === selectedCategorySlug) || null
  }, [rankings, selectedCategorySlug])

  // Filtered Rankings based on search query
  const filteredRankings = useMemo(() => {
    if (!searchQuery.trim()) {
      return rankings
    }
    const q = searchQuery.toLowerCase()
    return rankings
      .map((catData) => ({
        ...catData,
        rankings: catData.rankings.filter((r) =>
          r.artist.stageName.toLowerCase().includes(q)
        ),
      }))
      .filter((catData) => catData.rankings.length > 0)
  }, [rankings, searchQuery])

  return (
    <div className="space-y-10">
      {/* Header Banner */}
      <div className="text-center relative max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/10 border border-gold/30 text-gold text-xs font-bold uppercase tracking-[0.2em] mb-4 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          En direct · Vote Officiel 2026
        </div>
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight">
          Classements <span className="gold-text">Gospel Awards</span>
        </h1>
        <p className="text-gray-400 text-sm sm:text-base mt-3 max-w-xl mx-auto leading-relaxed">
          Découvrez les artistes actuellement en tête dans chaque catégorie. Les classements sont calculés en temps réel sur la base des votes certifiés.
        </p>

        {/* Global Ceremony Metrics */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-lg mx-auto mt-8 p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
          <div>
            <span className="text-lg sm:text-2xl font-black text-white block">{rankings.length}</span>
            <span className="text-[10px] sm:text-xs text-gray-400 font-semibold uppercase tracking-wider">Catégories</span>
          </div>
          <div className="border-x border-white/[0.06]">
            <span className="text-lg sm:text-2xl font-black text-gold block">{totalArtists}</span>
            <span className="text-[10px] sm:text-xs text-gray-400 font-semibold uppercase tracking-wider">Artistes Nommés</span>
          </div>
          <div>
            <span className="text-lg sm:text-2xl font-black text-emerald-400 block">{formatPoints(totalPointsDistributed)}</span>
            <span className="text-[10px] sm:text-xs text-gray-400 font-semibold uppercase tracking-wider">Points Attribués</span>
          </div>
        </div>
      </div>

      {/* Controls Bar: Search & Category Navigation */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="max-w-md mx-auto relative">
          <input
            type="text"
            placeholder="Rechercher un artiste parmi les nommés..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.1] focus:border-gold rounded-2xl py-3 pl-11 pr-10 text-sm text-white placeholder-gray-500 outline-none transition-all shadow-lg"
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

        {/* Category Selector Tabs */}
        {!searchQuery && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none pt-2 justify-start lg:justify-center">
            <button
              type="button"
              onClick={() => setSelectedCategorySlug('all')}
              className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                selectedCategorySlug === 'all'
                  ? 'bg-gold text-[#060912] shadow-lg shadow-gold/20 scale-105'
                  : 'bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              ✨ Vue d&apos;ensemble (Toutes)
            </button>

            {rankings.map(({ category, rankings: catRankings }) => {
              const isSelected = selectedCategorySlug === category.slug
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategorySlug(category.slug)}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-gold text-[#060912] shadow-lg shadow-gold/20 scale-105'
                      : 'bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="text-sm">{category.icon || '🏆'}</span>
                  <span>{category.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isSelected ? 'bg-[#060912]/20 text-[#060912]' : 'bg-white/[0.06] text-gray-400'
                    }`}
                  >
                    {catRankings.length}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* If Search Active: Display Filtered Results */}
      {searchQuery && (
        <div className="space-y-8">
          <div className="text-center text-xs text-gray-400">
            Résultats pour « <strong className="text-white">{searchQuery}</strong> » :
          </div>

          {filteredRankings.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-3xl bg-white/[0.02] border border-white/[0.06] max-w-md mx-auto space-y-3">
              <span className="text-4xl block">🔍</span>
              <h3 className="text-base font-black text-white">Aucun artiste trouvé</h3>
              <p className="text-xs text-gray-400">
                Aucun candidat ne correspond à votre recherche. Vérifiez l&apos;orthographe ou parcourez les catégories.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="btn-secondary !text-xs !py-2 !px-4 mt-2 font-bold"
              >
                Effacer la recherche
              </button>
            </div>
          ) : (
            filteredRankings.map(({ category, rankings: catRankings }) => (
              <div key={category.id} className="premium-card p-6 border border-white/[0.08]">
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{category.icon || '🏆'}</span>
                    <div>
                      <h3 className="text-base font-black text-white">{category.name}</h3>
                      <span className="text-[11px] text-gray-400">{catRankings.length} artiste(s) correspondant(s)</span>
                    </div>
                  </div>
                  <Link
                    href={`/categories/${category.slug}`}
                    className="text-xs text-gold hover:underline font-semibold"
                  >
                    Voir la catégorie →
                  </Link>
                </div>

                <div className="space-y-2.5">
                  {catRankings.map((item) => (
                    <ArtistRankingRow
                      key={item.artist.id}
                      item={item}
                      category={category}
                      currentArtistId={currentArtistId}
                      maxPoints={catRankings[0]?.totalPoints || 1}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SINGLE CATEGORY VIEW (Podium + Full Leaderboard) */}
      {!searchQuery && selectedCategorySlug !== 'all' && activeCategoryData && (
        <div className="space-y-10">
          {/* Category Header Card */}
          <div className="premium-card p-6 sm:p-8 border-2 border-gold/20 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="w-16 h-16 rounded-2xl bg-gold/10 border-2 border-gold/30 flex items-center justify-center text-3xl flex-shrink-0 shadow-lg">
                {activeCategoryData.category.icon || '🏆'}
              </div>
              <div>
                <span className="text-[10px] uppercase font-black tracking-[0.2em] text-gold block mb-0.5">
                  Catégorie Officielle
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  {activeCategoryData.category.name}
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  {activeCategoryData.rankings.length} candidat{activeCategoryData.rankings.length > 1 ? 's' : ''} en compétition ·{' '}
                  <strong className="text-gold">
                    {formatPoints(
                      activeCategoryData.rankings.reduce((sum, r) => sum + r.totalPoints, 0)
                    )}{' '}
                    pts
                  </strong>{' '}
                  enregistrés au total
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/voter?category=${activeCategoryData.category.id}`}
                className="btn-primary !text-xs !py-3 !px-5 font-black tracking-wider shadow-lg"
              >
                ⭐ Voter dans cette catégorie
              </Link>
              <Link
                href={`/categories/${activeCategoryData.category.slug}`}
                className="btn-secondary !text-xs !py-3 !px-4 font-bold"
              >
                Infos catégorie →
              </Link>
            </div>
          </div>

          {/* TOP 3 PODIUM */}
          {activeCategoryData.rankings.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <span>👑</span> Podium Provisoire — Top 3
                </h3>
                <span className="text-[11px] text-gray-400 font-medium">
                  Mis à jour en temps réel
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 items-end">
                {/* 2nd Place (Silver) */}
                {activeCategoryData.rankings[1] ? (
                  <div className="order-2 md:order-1">
                    <PodiumCard
                      item={activeCategoryData.rankings[1]}
                      category={activeCategoryData.category}
                      currentArtistId={currentArtistId}
                      rank={2}
                    />
                  </div>
                ) : (
                  <div className="hidden md:block order-2 md:order-1" />
                )}

                {/* 1st Place (Gold) - Elevated */}
                {activeCategoryData.rankings[0] && (
                  <div className="order-1 md:order-2 md:-translate-y-3">
                    <PodiumCard
                      item={activeCategoryData.rankings[0]}
                      category={activeCategoryData.category}
                      currentArtistId={currentArtistId}
                      rank={1}
                      isLeader
                    />
                  </div>
                )}

                {/* 3rd Place (Bronze) */}
                {activeCategoryData.rankings[2] ? (
                  <div className="order-3">
                    <PodiumCard
                      item={activeCategoryData.rankings[2]}
                      category={activeCategoryData.category}
                      currentArtistId={currentArtistId}
                      rank={3}
                    />
                  </div>
                ) : (
                  <div className="hidden md:block order-3" />
                )}
              </div>
            </div>
          )}

          {/* FULL CATEGORY TABLE / LEADERBOARD */}
          <div className="premium-card p-5 sm:p-7 border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
              <div>
                <h3 className="text-base font-black uppercase tracking-wider text-white">
                  Classement Général Complet
                </h3>
                <span className="text-[11px] text-gray-400">
                  Tous les artistes nommés dans l&apos;ordre officiel
                </span>
              </div>
              <span className="text-xs font-bold text-gold">
                {activeCategoryData.rankings.length} candidats
              </span>
            </div>

            {activeCategoryData.rankings.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-xs">
                Aucun candidat inscrit dans cette catégorie actuellement.
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeCategoryData.rankings.map((item) => (
                  <ArtistRankingRow
                    key={item.artist.id}
                    item={item}
                    category={activeCategoryData.category}
                    currentArtistId={currentArtistId}
                    maxPoints={activeCategoryData.rankings[0]?.totalPoints || 1}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ALL CATEGORIES OVERVIEW VIEW */}
      {!searchQuery && selectedCategorySlug === 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rankings.map(({ category, rankings: catRankings }) => {
            const leader = catRankings[0]
            const second = catRankings[1]
            const third = catRankings[2]
            const totalCatPoints = catRankings.reduce((sum, r) => sum + r.totalPoints, 0)

            return (
              <div
                key={category.id}
                className="premium-card p-6 border border-white/[0.08] hover:border-gold/40 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Category Header */}
                  <div className="flex items-start justify-between gap-3 pb-4 border-b border-white/[0.06] mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-105 transition-transform">
                        {category.icon || '🏆'}
                      </div>
                      <div>
                        <h3 className="text-base font-black text-white group-hover:text-gold transition-colors">
                          {category.name}
                        </h3>
                        <span className="text-[11px] text-gray-400">
                          {catRankings.length} candidats · {formatPoints(totalCatPoints)} points
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedCategorySlug(category.slug)}
                      className="text-xs text-gold/80 hover:text-gold font-bold hover:underline"
                    >
                      Détails →
                    </button>
                  </div>

                  {/* Leaders Summary (Top 3) */}
                  <div className="space-y-2.5 my-4">
                    {catRankings.length === 0 ? (
                      <p className="text-xs text-gray-500 py-3 text-center">Aucun candidat dans cette catégorie.</p>
                    ) : (
                      catRankings.slice(0, 3).map((item) => (
                        <div
                          key={item.artist.id}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-base flex-shrink-0">{getRankEmoji(item.rank)}</span>
                            <div className="w-8 h-8 rounded-lg bg-surface-light overflow-hidden flex-shrink-0 border border-white/[0.08]">
                              {item.artist.profileImage ? (
                                <img src={item.artist.profileImage} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs">🎤</div>
                              )}
                            </div>
                            <Link
                              href={`/artistes/${item.artist.slug}`}
                              className="text-xs font-bold text-white hover:text-gold truncate"
                            >
                              {item.artist.stageName}
                            </Link>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <span className="text-xs font-black text-gold block">{formatPoints(item.totalPoints)} pts</span>
                            <span className="text-[9px] text-gray-500">{item.totalVotes} vote{item.totalVotes !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 border-t border-white/[0.06] flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCategorySlug(category.slug)}
                    className="flex-1 btn-secondary !text-xs !py-2.5 font-bold text-center"
                  >
                    Voir le classement complet ({catRankings.length})
                  </button>
                  <Link
                    href={`/voter?category=${category.id}`}
                    className="btn-primary !text-xs !py-2.5 !px-3 font-bold flex-shrink-0"
                    title="Voter dans cette catégorie"
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

// Sub-Component: Top 3 Podium Card
function PodiumCard({
  item,
  category,
  currentArtistId,
  rank,
  isLeader = false,
}: {
  item: RankedItem
  category: { id: string; name: string; slug: string }
  currentArtistId?: string | null
  rank: 1 | 2 | 3
  isLeader?: boolean
}) {
  const isSelf = currentArtistId === item.artist.id

  const rankConfig = {
    1: {
      badge: '🥇 1er Rang · Leader',
      cardBorder: 'border-2 border-gold glow-gold bg-gradient-to-b from-[#1c180e] via-[#121522] to-[#0a0e1a]',
      badgeColor: 'bg-gold text-[#060912] font-black',
      ringColor: 'ring-4 ring-gold/40 border-2 border-gold',
      textColor: 'text-gold',
    },
    2: {
      badge: '🥈 2e Rang',
      cardBorder: 'border border-slate-400/40 bg-gradient-to-b from-[#131620] to-[#0a0e1a]',
      badgeColor: 'bg-slate-300 text-[#060912] font-black',
      ringColor: 'ring-2 ring-slate-400/40 border-2 border-slate-300',
      textColor: 'text-slate-300',
    },
    3: {
      badge: '🥉 3e Rang',
      cardBorder: 'border border-amber-700/40 bg-gradient-to-b from-[#1a1411] to-[#0a0e1a]',
      badgeColor: 'bg-amber-600 text-white font-black',
      ringColor: 'ring-2 ring-amber-700/40 border-2 border-amber-600',
      textColor: 'text-amber-500',
    },
  }[rank]

  return (
    <div className={`rounded-3xl p-6 text-center space-y-4 shadow-2xl relative overflow-hidden transition-all ${rankConfig.cardBorder}`}>
      {/* Crown / Top Badge */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs shadow-md">
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${rankConfig.badgeColor}`}>
          {rankConfig.badge}
        </span>
      </div>

      {/* Artist Avatar */}
      <div className="relative mx-auto w-24 h-24 sm:w-28 sm:h-28">
        <div className={`w-full h-full rounded-2xl bg-surface-light overflow-hidden shadow-xl ${rankConfig.ringColor}`}>
          {item.artist.profileImage ? (
            <img src={item.artist.profileImage} alt={item.artist.stageName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">🎤</div>
          )}
        </div>
        {isLeader && (
          <span className="absolute -top-3 -right-2 text-2xl drop-shadow-md animate-bounce">
            👑
          </span>
        )}
      </div>

      {/* Artist Info */}
      <div className="space-y-1">
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <Link
            href={`/artistes/${item.artist.slug}`}
            className="text-lg font-black text-white hover:text-gold transition-colors truncate max-w-full"
          >
            {item.artist.stageName}
          </Link>
          {isSelf && (
            <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded font-semibold">
              Vous
            </span>
          )}
        </div>
        <div className={`text-2xl font-black ${rankConfig.textColor}`}>
          {formatPoints(item.totalPoints)} <span className="text-xs text-gray-400 font-semibold">pts</span>
        </div>
        <div className="text-[11px] text-gray-400 font-medium">
          {item.totalVotes} vote{item.totalVotes !== 1 ? 's' : ''} certifié{item.totalVotes !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Actions */}
      <div className="pt-2 flex flex-col gap-2">
        <Link
          href={`/voter?artist=${item.artist.id}&category=${category.id}`}
          className={`w-full !py-2.5 !text-xs font-black rounded-xl transition-all shadow-md ${
            isLeader ? 'btn-primary' : 'btn-secondary hover:!bg-gold hover:!text-[#060912]'
          }`}
        >
          ⭐ Voter pour cet artiste
        </Link>
        <Link
          href={`/artistes/${item.artist.slug}`}
          className="text-[11px] text-gray-400 hover:text-white transition-colors"
        >
          Voir le profil complet →
        </Link>
      </div>
    </div>
  )
}

// Sub-Component: Artist Ranking Row
function ArtistRankingRow({
  item,
  category,
  currentArtistId,
  maxPoints,
}: {
  item: RankedItem
  category: { id: string; name: string; slug: string }
  currentArtistId?: string | null
  maxPoints: number
}) {
  const isSelf = currentArtistId === item.artist.id
  const progressPercent = maxPoints > 0 ? Math.min(100, Math.round((item.totalPoints / maxPoints) * 100)) : 0

  return (
    <div
      className={`p-3 sm:p-4 rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 ${
        item.rank === 1
          ? 'bg-gold/[0.08] border border-gold/30 shadow-sm'
          : item.rank === 2
          ? 'bg-slate-400/[0.05] border border-slate-400/20'
          : item.rank === 3
          ? 'bg-amber-700/[0.05] border border-amber-700/20'
          : 'bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08]'
      }`}
    >
      {/* Left: Rank, Avatar, Stage Name */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
        {/* Rank Number / Medal */}
        <div className="w-9 text-center flex-shrink-0">
          <span
            className={`text-base sm:text-lg font-black ${
              item.rank === 1
                ? 'rank-1 text-xl'
                : item.rank === 2
                ? 'rank-2 text-xl'
                : item.rank === 3
                ? 'rank-3 text-xl'
                : 'text-gray-500 font-mono text-sm'
            }`}
          >
            {item.rank <= 3 ? getRankEmoji(item.rank) : `#${item.rank}`}
          </span>
        </div>

        {/* Profile Image */}
        <div className="w-12 h-12 rounded-xl bg-surface-light border border-white/[0.08] overflow-hidden flex-shrink-0">
          {item.artist.profileImage ? (
            <img src={item.artist.profileImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm bg-surface">🎤</div>
          )}
        </div>

        {/* Stage Name & Points Progress Bar */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/artistes/${item.artist.slug}`}
              className="font-bold text-sm text-white hover:text-gold transition-colors truncate"
            >
              {item.artist.stageName}
            </Link>
            {isSelf && (
              <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded font-semibold">
                Votre profil
              </span>
            )}
          </div>

          {/* Visual Score Relative Gauge */}
          <div className="w-full max-w-xs bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                item.rank === 1 ? 'bg-gold' : item.rank === 2 ? 'bg-slate-300' : item.rank === 3 ? 'bg-amber-600' : 'bg-gray-500'
              }`}
              style={{ width: `${Math.max(4, progressPercent)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Right: Scores & CTA Buttons */}
      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pl-12 sm:pl-0 border-t sm:border-t-0 border-white/[0.04] pt-2 sm:pt-0">
        <div className="text-left sm:text-right">
          <div className="text-gold font-black text-sm sm:text-base">
            {formatPoints(item.totalPoints)} <span className="text-[10px] text-gray-400 font-semibold">pts</span>
          </div>
          <div className="text-[10px] text-gray-500 font-medium">
            {item.totalVotes} vote{item.totalVotes !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/artistes/${item.artist.slug}`}
            className="p-2 text-xs font-semibold text-gray-400 hover:text-white rounded-xl hover:bg-white/[0.06] transition-all hidden md:inline-block"
            title="Voir le profil"
          >
            Profil ↗
          </Link>
          <Link
            href={`/voter?artist=${item.artist.id}&category=${category.id}`}
            className="btn-primary !text-xs !py-2 !px-3 sm:!px-4 font-black shadow-md flex-shrink-0"
          >
            ⭐ Voter
          </Link>
        </div>
      </div>
    </div>
  )
}
