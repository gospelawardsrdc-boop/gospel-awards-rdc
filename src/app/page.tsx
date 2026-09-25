import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { formatPoints, getRankEmoji } from '@/lib/utils'

async function getHomeData() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { orderIndex: 'asc' },
    include: { _count: { select: { artists: true } } },
  })

  const topArtists = await prisma.artist.findMany({
    where: { isActive: true, isApproved: true },
    include: {
      categories: { include: { category: true } },
      votes: true,
    },
    take: 6,
  })

  const artistsWithPoints = topArtists
    .map((artist) => ({
      ...artist,
      totalPoints: artist.votes.reduce((sum, v) => sum + v.points, 0),
      totalVotes: artist.votes.length,
      totalVoters: new Set(artist.votes.map((v) => v.userId)).size,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints)

  const competition = await prisma.competition.findFirst({ where: { isActive: true } })

  return { categories, topArtists: artistsWithPoints, competition }
}

export default async function HomePage() {
  const session = await auth()
  const { categories, topArtists, competition } = await getHomeData()
  const user = session?.user ? { name: session.user.name!, role: (session.user as any).role } : null

  return (
    <div className="min-h-screen bg-[#060912]">
      <Header user={user} />

      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-[100vh] lg:min-h-[90vh] flex items-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src="/images/hero-gospel.jpg"
            alt="Gospel Artist"
            fill
            className="object-cover object-top"
            priority
            quality={90}
          />
          <div className="hero-overlay absolute inset-0" />
          {/* Extra gradient for text readability on mobile */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#060912] via-transparent to-transparent" />
        </div>

        {/* Decorative elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold/[0.03] rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-accent/[0.04] rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 lg:pt-40 lg:pb-32">
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/[0.08] border border-gold/[0.15] mb-8 animate-fade-in-up">
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
              <span className="text-gold text-xs font-semibold tracking-wide uppercase">
                {competition?.name || 'Gospel Awards RDC 2026'} · Votes ouverts
              </span>
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black leading-[1.05] tracking-tight mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              Célébrons les voix qui{' '}
              <span className="gold-text">inspirent</span>{' '}
              la RDC
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-gray-400 leading-relaxed max-w-lg mb-10 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              Découvrez, soutenez et votez pour les artistes chrétiens qui font vibrer
              la République Démocratique du Congo.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <Link href="/voter" className="btn-primary text-base !py-4 !px-8 animate-pulse-vote">
                ⭐ Voter maintenant
              </Link>
              <Link href="/classements" className="btn-secondary text-base !py-4 !px-8">
                Voir les classements
              </Link>
            </div>

            {/* Stats mini */}
            <div className="flex items-center gap-8 mt-12 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <div>
                <div className="text-2xl font-bold text-white">{categories.length}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Catégories</div>
              </div>
              <div className="w-px h-8 bg-white/[0.08]" />
              <div>
                <div className="text-2xl font-bold text-white">{topArtists.length}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Artistes</div>
              </div>
              <div className="w-px h-8 bg-white/[0.08]" />
              <div>
                <div className="text-2xl font-bold text-white">2026</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Édition</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TOP ARTISTS SECTION ===== */}
      {topArtists.length > 0 && (
        <section className="py-20 lg:py-28 px-4 relative">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-12">
              <div>
                <span className="text-xs font-semibold text-gold uppercase tracking-[0.2em] mb-2 block">Classement</span>
                <h2 className="section-title text-white">
                  🔥 Artistes <span className="gold-text">en tête</span>
                </h2>
              </div>
              <Link href="/classements" className="hidden sm:inline-flex btn-secondary !text-sm !py-2 !px-5">
                Tous les classements →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topArtists.map((artist, index) => (
                <div
                  key={artist.id}
                  className={`premium-card overflow-hidden group ${index === 0 ? 'md:col-span-2 lg:col-span-1' : ''}`}
                >
                  {/* Cover */}
                  <div className="relative h-44 sm:h-52 bg-gradient-to-br from-surface-light to-surface overflow-hidden">
                    {artist.coverImage ? (
                      <img src={artist.coverImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-gold/[0.06] via-accent/[0.04] to-transparent" />
                    )}
                    <div className="category-gradient absolute inset-0" />

                    {/* Rank badge */}
                    <div className={`absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center text-lg font-black ${
                      index === 0 ? 'bg-yellow-500/20 text-yellow-400 ring-2 ring-yellow-500/30' :
                      index === 1 ? 'bg-gray-400/20 text-gray-300 ring-2 ring-gray-400/30' :
                      index === 2 ? 'bg-orange-600/20 text-orange-400 ring-2 ring-orange-500/30' :
                      'bg-surface-light text-gray-400'
                    }`}>
                      {getRankEmoji(index + 1)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5 -mt-10 relative">
                    <div className="w-16 h-16 rounded-2xl bg-surface border-2 border-gold/20 overflow-hidden mb-4 ring-4 ring-[#060912]">
                      {artist.profileImage ? (
                        <img src={artist.profileImage} alt={artist.stageName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl bg-surface-light">🎤</div>
                      )}
                    </div>

                    <h3 className="font-bold text-lg text-white group-hover:text-gold transition-colors">
                      {artist.stageName}
                    </h3>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {artist.categories.slice(0, 2).map((ac) => (
                        <span
                          key={ac.category.id}
                          className="text-[10px] uppercase tracking-wider bg-gold/[0.06] text-gold/80 px-2.5 py-0.5 rounded-full"
                        >
                          {ac.category.name}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/[0.04]">
                      <div>
                        <span className="text-lg font-bold text-gold">{formatPoints(artist.totalPoints)}</span>
                        <span className="text-xs text-gray-500 ml-1">pts</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {artist.totalVoters} votant{artist.totalVoters !== 1 ? 's' : ''}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Link
                        href={`/artistes/${artist.slug}`}
                        className="flex-1 text-center text-xs font-semibold py-2.5 rounded-lg border border-white/[0.08] text-gray-300 hover:border-gold/30 hover:text-gold transition-all"
                      >
                        Voir le profil
                      </Link>
                      <Link
                        href={`/voter?artist=${artist.id}`}
                        className="flex-1 text-center text-xs font-bold py-2.5 rounded-lg gold-gradient text-[#0A0E1A] hover:opacity-90 transition-opacity"
                      >
                        ⭐ Voter
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-8 sm:hidden">
              <Link href="/classements" className="btn-secondary !text-sm">
                Tous les classements →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ===== CATEGORIES SECTION ===== */}
      <section className="py-20 lg:py-28 px-4 relative">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-gold uppercase tracking-[0.2em] mb-2 block">Découvrez</span>
            <h2 className="section-title text-white">
              Explorez les <span className="gold-text">catégories</span>
            </h2>
            <p className="text-gray-500 mt-4 max-w-md mx-auto text-sm">
              {categories.length} catégories pour récompenser l&apos;excellence de la musique chrétienne congolaise
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {categories.map((category, i) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="premium-card p-5 text-center group"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">
                  {category.icon || '🏆'}
                </div>
                <h3 className="text-xs sm:text-sm font-semibold text-gray-300 group-hover:text-gold transition-colors leading-tight">
                  {category.name}
                </h3>
                <div className="text-[10px] text-gray-600 mt-2">
                  {category._count.artists} candidat{category._count.artists !== 1 ? 's' : ''}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="py-20 lg:py-28 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-gold/[0.03] via-transparent to-accent/[0.03]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold/[0.03] rounded-full blur-3xl" />

        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="section-title text-white mb-4">
            Prêt à <span className="gold-text">soutenir</span> vos artistes ?
          </h2>
          <p className="text-gray-400 mb-10 text-sm sm:text-base">
            Chaque vote compte. Soutenez les artistes chrétiens qui vous inspirent
            et participez à l&apos;histoire du gospel congolais.
          </p>
          <Link href="/voter" className="btn-primary text-base !py-4 !px-10 animate-pulse-vote">
            ⭐ Commencer à voter
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
