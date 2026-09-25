import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ArtistPerformanceChart from '@/components/artist/ArtistPerformanceChart'
import { formatPoints, getRankEmoji } from '@/lib/utils'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ArtistPage({ params }: Props) {
  const { slug } = await params
  const session = await auth()
  const user = session?.user ? { name: session.user.name!, role: (session.user as any).role } : null

  const artist = await prisma.artist.findUnique({
    where: { slug },
    include: {
      categories: { include: { category: true } },
      socialLinks: true,
      musicLinks: true,
      videoLinks: true,
      votes: {
        select: {
          id: true,
          points: true,
          userId: true,
          createdAt: true,
        },
      },
    },
  })

  if (!artist || !artist.isActive || !artist.isApproved) notFound()

  const totalPoints = artist.votes.reduce((sum, v) => sum + v.points, 0)
  const totalVotes = artist.votes.length
  const uniqueVoters = new Set(artist.votes.map((v) => v.userId)).size

  const categoryRanks = await Promise.all(
    artist.categories.map(async (ac) => {
      const rankings = await prisma.vote.groupBy({
        by: ['artistId'],
        where: { categoryId: ac.categoryId },
        _sum: { points: true },
        orderBy: { _sum: { points: 'desc' } },
      })
      const rank = rankings.findIndex((r) => r.artistId === artist.id) + 1
      return { category: ac.category, rank: rank || 0 }
    })
  )

  const socialIcons: Record<string, string> = {
    facebook: '📘', instagram: '📸', tiktok: '🎵', youtube: '📺', twitter: '🐦',
  }

  const excerpts = artist.videoLinks.filter((v) => v.isExcerpt)

  const currentUserId = (session?.user as any)?.id
  const isSelf = Boolean(currentUserId && currentUserId === artist.userId)

  return (
    <div className="min-h-screen bg-[#060912]">
      <Header user={user} />

      {/* Cover */}
      <div className="relative h-64 sm:h-80 lg:h-96">
        {artist.coverImage ? (
          <img src={artist.coverImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-surface via-surface-light to-surface" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#060912] via-[#060912]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#060912]/60 to-transparent" />
      </div>

      <main className="max-w-5xl mx-auto px-4 -mt-28 relative pb-24 lg:pb-20">
        {/* Profile Header */}
        <div className="flex flex-col lg:flex-row items-start gap-6 mb-10">
          <div className="w-28 h-28 lg:w-36 lg:h-36 rounded-2xl bg-surface border-2 border-gold/20 overflow-hidden flex-shrink-0 ring-4 ring-[#060912] shadow-2xl">
            {artist.profileImage ? (
              <img src={artist.profileImage} alt={artist.stageName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl bg-surface-light">🎤</div>
            )}
          </div>

          <div className="flex-1 pt-2">
            <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight">{artist.stageName}</h1>
            <div className="flex flex-wrap gap-2 mt-3">
              {artist.categories.map((ac) => (
                <Link
                  key={ac.category.id}
                  href={`/categories/${ac.category.slug}`}
                  className="text-[10px] uppercase tracking-wider bg-gold/[0.08] text-gold/80 px-3 py-1 rounded-full hover:bg-gold/[0.12] transition-colors"
                >
                  {ac.category.icon} {ac.category.name}
                </Link>
              ))}
            </div>
          </div>

          {!isSelf ? (
            <Link
              href={`/voter?artist=${artist.id}`}
              className="btn-primary text-base !py-3.5 !px-8 animate-pulse-vote w-full lg:w-auto text-center"
            >
              ⭐ VOTER POUR CET ARTISTE
            </Link>
          ) : (
            <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gold/[0.08] border border-gold/30 text-gold text-xs font-bold uppercase tracking-wider">
              <span>👤</span>
              <span>Votre Profil Officiel</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
          <div className="premium-card p-5 text-center">
            <div className="text-2xl sm:text-3xl font-black text-gold">{formatPoints(totalPoints)}</div>
            <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">⭐ Points</div>
          </div>
          <div className="premium-card p-5 text-center">
            <div className="text-2xl sm:text-3xl font-black text-white">{totalVotes}</div>
            <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">🗳️ Votes</div>
          </div>
          <div className="premium-card p-5 text-center">
            <div className="text-2xl sm:text-3xl font-black text-white">{uniqueVoters}</div>
            <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">👥 Votants</div>
          </div>
        </div>

        {/* Rankings per category */}
        {categoryRanks.length > 0 && (
          <div className="premium-card p-6 mb-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              🏆 <span>Classements Officiels</span>
            </h2>
            <div className="space-y-3">
              {categoryRanks.map(({ category, rank }) => (
                <div key={category.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <span className="text-gray-300 text-sm">{category.icon} {category.name}</span>
                  <span className={`font-bold text-lg ${rank <= 3 ? `rank-${rank}` : 'text-gray-500'}`}>
                    {rank > 0 ? getRankEmoji(rank) : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Graph */}
        <ArtistPerformanceChart
          votes={artist.votes.map((v) => ({
            points: v.points,
            createdAt: v.createdAt.toISOString(),
          }))}
        />

        {/* Biography */}
        {artist.biography && (
          <div className="premium-card p-6 mb-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              📖 <span>Biographie</span>
            </h2>
            <p className="text-gray-400 leading-relaxed text-sm whitespace-pre-line">{artist.biography}</p>
          </div>
        )}

        {/* Music */}
        {artist.musicLinks.length > 0 && (
          <div className="premium-card p-6 mb-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              🎵 <span>Musiques</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {artist.musicLinks.map((link) => (
                <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface/50 hover:bg-surface-light border border-white/[0.04] hover:border-gold/10 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-gold/[0.08] flex items-center justify-center text-lg group-hover:scale-110 transition-transform">🎶</div>
                  <div>
                    <div className="font-medium text-sm text-white">{link.title || link.platform}</div>
                    <div className="text-xs text-gray-500 capitalize">{link.platform}</div>
                  </div>
                </a>
              ))}
            </div>
            <a href={artist.musicLinks[0]?.url} target="_blank" rel="noopener noreferrer"
              className="btn-secondary !text-xs mt-4 w-full sm:w-auto">
              🎧 ÉCOUTER TOUTES SES MUSIQUES
            </a>
          </div>
        )}

        {/* Clips */}
        {artist.videoLinks.filter((v) => !v.isExcerpt).length > 0 && (
          <div className="premium-card p-6 mb-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              🎬 <span>Clips</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {artist.videoLinks.filter((v) => !v.isExcerpt).map((link) => (
                <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface/50 hover:bg-surface-light border border-white/[0.04] hover:border-gold/10 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent/[0.08] flex items-center justify-center text-lg group-hover:scale-110 transition-transform">📺</div>
                  <div>
                    <div className="font-medium text-sm text-white">{link.title || 'Voir le clip'}</div>
                    <div className="text-xs text-gray-500 capitalize">{link.platform}</div>
                  </div>
                </a>
              ))}
            </div>
            <a href={artist.videoLinks.filter((v) => !v.isExcerpt)[0]?.url} target="_blank" rel="noopener noreferrer"
              className="btn-secondary !text-xs mt-4 w-full sm:w-auto">
              🎬 VOIR TOUS SES CLIPS
            </a>
          </div>
        )}

        {/* Excerpts */}
        {excerpts.length > 0 && (
          <div className="premium-card p-6 mb-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              🎧 <span>Extraits</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {excerpts.map((link) => (
                <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface/50 hover:bg-surface-light border border-white/[0.04] transition-all"
                >
                  <span className="text-xl">🎧</span>
                  <span className="text-sm text-gray-300">{link.title || 'Écouter l\'extrait'}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Social Links */}
        {artist.socialLinks.length > 0 && (
          <div className="premium-card p-6 mb-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              📱 <span>Réseaux sociaux</span>
            </h2>
            <div className="flex flex-wrap gap-3">
              {artist.socialLinks.map((link) => (
                <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-surface/50 hover:bg-surface-light border border-white/[0.04] hover:border-gold/10 transition-all group"
                >
                  <span className="text-xl group-hover:scale-110 transition-transform">{socialIcons[link.platform.toLowerCase()] || '🔗'}</span>
                  <span className="text-sm font-medium text-gray-300 capitalize">{link.platform}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
