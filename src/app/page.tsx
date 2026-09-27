import { unstable_cache } from 'next/cache'
import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { formatPoints, formatCurrency, getRankEmoji } from '@/lib/utils'

const getHomeData = unstable_cache(
  async () => {
    const [categories, pointPackages, competition, approvedArtists, allVotes, totalPointsAgg] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          icon: true,
          description: true,
          orderIndex: true,
        },
      }),
      prisma.pointPackage.findMany({
        where: { isActive: true },
        orderBy: { orderIndex: 'asc' },
      }),
      prisma.competition.findFirst({
        where: { isActive: true },
      }),
      prisma.artist.findMany({
        where: { isActive: true, isApproved: true },
        select: {
          id: true,
          stageName: true,
          slug: true,
          profileImage: true,
          coverImage: true,
          categories: {
            select: {
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      }),
      prisma.vote.groupBy({
        by: ['artistId'],
        _sum: { points: true },
        _count: { _all: true },
      }),
      prisma.vote.aggregate({
        _sum: { points: true },
      }),
    ])

    // Compute category artist count in memory (0 subquery overhead)
    const categoryArtistCountMap = new Map<string, number>()
    for (const artist of approvedArtists) {
      for (const ac of artist.categories) {
        categoryArtistCountMap.set(ac.category.id, (categoryArtistCountMap.get(ac.category.id) || 0) + 1)
      }
    }

    const categoriesWithCount = categories.map((cat) => ({
      ...cat,
      _count: {
        artists: categoryArtistCountMap.get(cat.id) || 0,
      },
    }))

    // Aggregate real votes in memory
    const artistVotesMap = new Map<string, { totalPoints: number; totalVotes: number }>()
    for (const v of allVotes) {
      artistVotesMap.set(v.artistId, {
        totalPoints: v._sum.points || 0,
        totalVotes: v._count._all || 0,
      })
    }
    const totalPointsDistributed = totalPointsAgg._sum.points || 0

    const artistsWithStats = approvedArtists
      .map((artist) => {
        const stat = artistVotesMap.get(artist.id)
        return {
          id: artist.id,
          stageName: artist.stageName,
          slug: artist.slug,
          profileImage: artist.profileImage,
          coverImage: artist.coverImage,
          categories: artist.categories.map((ac) => ({
            id: ac.category.id,
            name: ac.category.name,
            slug: ac.category.slug,
          })),
          totalPoints: stat?.totalPoints || 0,
          totalVotes: stat?.totalVotes || 0,
          totalVoters: stat?.totalVotes || 0,
        }
      })
      .sort((a, b) => b.totalPoints - a.totalPoints)

    return {
      categories: categoriesWithCount,
      pointPackages,
      competition,
      topArtists: artistsWithStats.slice(0, 6),
      totalArtistsCount: approvedArtists.length,
      totalPointsDistributed,
    }
  },
  ['home-page-data-v1'],
  { revalidate: 30, tags: ['home-data', 'rankings', 'votes'] }
)

export default async function HomePage() {
  const [session, homeData] = await Promise.all([
    auth(),
    getHomeData(),
  ])

  const {
    categories,
    pointPackages,
    competition,
    topArtists,
    totalArtistsCount,
    totalPointsDistributed,
  } = homeData

  const user = session?.user ? { name: session.user.name!, role: (session.user as any).role } : null

  return (
    <div className="min-h-screen bg-[#060912] flex flex-col justify-between">
      <Header user={user} />

      <main className="flex-1">
        {/* ===== 1. HERO SECTION ===== */}
        <section className="relative min-h-[90vh] lg:min-h-[92vh] flex items-center overflow-hidden">
          {/* Background image */}
          <div className="absolute inset-0 pointer-events-none">
            <Image
              src="/images/hero-gospel.jpg"
              alt="Gospel Awards RDC"
              fill
              className="object-cover object-top opacity-35"
              priority
              quality={90}
            />
            <div className="hero-overlay absolute inset-0" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#060912] via-transparent to-transparent" />
          </div>

          {/* Subtle Ambient Glows */}
          <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-gold/[0.04] rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/10 w-96 h-96 bg-accent/[0.03] rounded-full blur-3xl pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 lg:pt-40 lg:pb-32 w-full">
            <div className="max-w-3xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-gold/10 border border-gold/30 mb-6 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-gold animate-pulse" />
                <span className="text-gold text-xs font-bold tracking-[0.15em] uppercase">
                  {competition?.name || 'Gospel Awards RDC 2026'} · Vote Officiel Ouvert
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.08] tracking-tight mb-6">
                Célébrons les voix qui <span className="gold-text">inspirent</span> la RDC
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-xl text-gray-300 leading-relaxed max-w-2xl mb-4">
                Célébrons les voix, les talents et les œuvres qui marquent la musique chrétienne en République démocratique du Congo.
              </p>

              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-xl mb-10">
                Soutenez vos artistes préférés grâce au système de vote certifié et propulsez-les vers le couronnement officiel.
              </p>

              {/* Primary CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Link
                  href="/voter"
                  className="btn-primary text-sm sm:text-base !py-4 !px-8 font-black tracking-wide shadow-xl animate-pulse-vote text-center"
                >
                  ⭐ Voter maintenant
                </Link>
                <Link
                  href="/categories"
                  className="btn-secondary text-sm sm:text-base !py-4 !px-8 font-bold text-center hover:!bg-gold/10"
                >
                  Découvrir les artistes
                </Link>
                <Link
                  href="/classements"
                  className="px-6 py-4 rounded-full text-xs sm:text-sm font-semibold text-gray-400 hover:text-white transition-colors text-center"
                >
                  Voir les classements ↗
                </Link>
              </div>

              {/* Real Stats Bar */}
              <div className="grid grid-cols-3 gap-4 max-w-md mt-12 pt-8 border-t border-white/[0.08]">
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-white">{categories.length}</div>
                  <div className="text-[11px] text-gray-400 uppercase font-bold tracking-wider mt-0.5">Catégories</div>
                </div>
                <div className="border-x border-white/[0.08] px-3">
                  <div className="text-2xl sm:text-3xl font-black text-gold">{totalArtistsCount}</div>
                  <div className="text-[11px] text-gray-400 uppercase font-bold tracking-wider mt-0.5">Artistes Nommés</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-400">{formatPoints(totalPointsDistributed)}</div>
                  <div className="text-[11px] text-gray-400 uppercase font-bold tracking-wider mt-0.5">Points Votés</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== 2. SECTION COMMENT ÇA MARCHE ===== */}
        <section className="py-20 lg:py-28 px-4 relative border-t border-white/[0.06] bg-gradient-to-b from-[#060912] via-[#090d1a] to-[#060912]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <span className="text-xs font-bold text-gold uppercase tracking-[0.2em] mb-2 block">
                Guide Utilisateur
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Comment <span className="gold-text">participer au vote</span> ?
              </h2>
              <p className="text-gray-400 text-sm mt-3">
                Un processus simple, transparent et sécurisé pour soutenir vos chantres favoris en 4 étapes.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  step: '01',
                  icon: '🔍',
                  title: 'Découvrez les artistes',
                  desc: 'Parcourez les 16 catégories officielles et explorez les profils des candidats approuvés.',
                },
                {
                  step: '02',
                  icon: '💳',
                  title: 'Achetez des points',
                  desc: 'Rechargez votre solde avec les moyens de paiement disponibles sur la plateforme.',
                },
                {
                  step: '03',
                  icon: '⭐',
                  title: 'Votez pour vos favoris',
                  desc: 'Allouez vos points en un clic avec confirmation sécurisée et calcul transparent en direct.',
                },
                {
                  step: '04',
                  icon: '🏆',
                  title: 'Suivez les classements',
                  desc: 'Consultez les scores en direct sur le podium officiel et suivez l’évolution des résultats.',
                },
              ].map((card) => (
                <div
                  key={card.step}
                  className="premium-card p-6 border border-white/[0.08] hover:border-gold/30 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <span className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                        {card.icon}
                      </span>
                      <span className="text-2xl font-black text-white/[0.1] font-mono group-hover:text-gold/30 transition-colors">
                        {card.step}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-white mb-2 group-hover:text-gold transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed">{card.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== 3. SECTION ARTISTES EN TÊTE (TOP ARTISTS) ===== */}
        {topArtists.length > 0 && (
          <section className="py-20 lg:py-28 px-4 relative border-t border-white/[0.06]">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
                <div>
                  <span className="text-xs font-bold text-gold uppercase tracking-[0.2em] mb-2 block">
                    Classement Provisoire
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    🔥 Artistes <span className="gold-text">actuellement en tête</span>
                  </h2>
                </div>
                <Link href="/classements" className="btn-secondary !text-xs !py-2.5 !px-5 font-bold self-start sm:self-auto">
                  Tous les classements →
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {topArtists.map((artist, index) => (
                  <div
                    key={artist.id}
                    className={`premium-card overflow-hidden group border border-white/[0.08] hover:border-gold/40 transition-all ${
                      index === 0 ? 'ring-1 ring-gold/30' : ''
                    }`}
                  >
                    {/* Header Cover */}
                    <div className="relative h-40 sm:h-44 bg-gradient-to-br from-surface-light to-surface overflow-hidden">
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

                      {/* Rank badge */}
                      <div className="absolute top-3.5 left-3.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/[0.1] text-xs font-black text-white flex items-center gap-1.5 shadow-lg">
                        <span>{getRankEmoji(index + 1)}</span>
                        <span>Rang #{index + 1}</span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 -mt-10 relative">
                      <div className="w-16 h-16 rounded-2xl bg-surface border-2 border-gold/30 overflow-hidden mb-4 ring-4 ring-[#060912] shadow-xl">
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

                      <h3 className="font-black text-lg text-white group-hover:text-gold transition-colors truncate">
                        {artist.stageName}
                      </h3>

                      <div className="flex flex-wrap gap-1.5 mt-2 min-h-[24px]">
                        {artist.categories.slice(0, 2).map((ac) => (
                          <span
                            key={ac.id}
                            className="text-[10px] uppercase tracking-wider font-semibold bg-gold/[0.08] text-gold border border-gold/20 px-2 py-0.5 rounded-full"
                          >
                            {ac.name}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.06]">
                        <div>
                          <span className="text-xl font-black text-gold block leading-none">
                            {formatPoints(artist.totalPoints)}
                          </span>
                          <span className="text-[10px] text-gray-500 uppercase font-semibold">Points enregistrés</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-white block leading-none">
                            {artist.totalVotes}
                          </span>
                          <span className="text-[10px] text-gray-500 uppercase font-semibold">
                            Vote{artist.totalVotes > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2.5 mt-5">
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
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ===== 4. SECTION CATÉGORIES OFFICIELLES ===== */}
        <section className="py-20 lg:py-28 px-4 relative border-t border-white/[0.06] bg-gradient-to-b from-[#060912] via-[#0a0f1d] to-[#060912]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-14 max-w-2xl mx-auto">
              <span className="text-xs font-bold text-gold uppercase tracking-[0.2em] mb-2 block">
                Compétition Officielle
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Explorez les <span className="gold-text">{categories.length} Catégories</span>
              </h2>
              <p className="text-gray-400 mt-3 text-sm">
                Découvrez toutes les catégories officielles récompensant l&apos;excellence de la musique chrétienne en RDC.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  className="premium-card p-4 sm:p-5 text-center group border border-white/[0.06] hover:border-gold/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">
                      {category.icon || '🏆'}
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-gray-200 group-hover:text-gold transition-colors leading-tight line-clamp-2">
                      {category.name}
                    </h3>
                  </div>
                  <div className="text-[11px] text-gray-500 font-semibold mt-3 pt-3 border-t border-white/[0.04]">
                    {category._count.artists} candidat{category._count.artists > 1 ? 's' : ''}
                  </div>
                </Link>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link href="/categories" className="btn-secondary !text-xs !py-3 !px-6 font-bold">
                Voir toutes les catégories en détail →
              </Link>
            </div>
          </div>
        </section>

        {/* ===== 5. SECTION SYSTÈME DE POINTS TRANSPARENT ===== */}
        <section className="py-20 lg:py-28 px-4 relative border-t border-white/[0.06]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-14 max-w-2xl mx-auto">
              <span className="text-xs font-bold text-gold uppercase tracking-[0.2em] mb-2 block">
                Tarification Officielle
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Packs de Points <span className="gold-text">Accessibles</span>
              </h2>
              <p className="text-gray-400 mt-3 text-sm">
                Des tarifs clairs et transparents pour permettre à chaque fidèle et passionné de faire entendre sa voix.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {pointPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="premium-card p-5 border border-white/[0.08] hover:border-gold/40 text-center transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center text-xl font-black text-gold mb-4 group-hover:scale-110 transition-transform">
                      ⭐
                    </div>
                    <h3 className="text-sm font-black text-white mb-1">{pkg.name}</h3>
                    <div className="text-2xl font-black text-gold my-2">
                      {pkg.points} <span className="text-xs font-semibold text-gray-400">pts</span>
                    </div>
                    <div className="text-xs font-bold text-gray-300">
                      {formatCurrency(pkg.priceFc)}
                    </div>
                  </div>

                  <Link
                    href="/voter"
                    className="mt-5 w-full btn-secondary !text-xs !py-2.5 font-bold hover:!bg-gold hover:!text-[#060912] transition-all"
                  >
                    Acheter & Voter
                  </Link>
                </div>
              ))}
            </div>

            {/* Payment Trust Footer */}
            <div className="mt-12 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
              <span>💳</span>
              <span>Paiement sécurisé via les moyens de paiement disponibles sur la plateforme</span>
            </div>
          </div>
        </section>

        {/* ===== 6. SECTION ARTISTES GOSPEL (POUR LES CANDIDATS) ===== */}
        <section className="py-20 lg:py-28 px-4 relative border-t border-white/[0.06] bg-gradient-to-r from-gold/[0.03] via-surface/[0.4] to-accent/[0.03]">
          <div className="max-w-5xl mx-auto premium-card p-8 sm:p-12 border-2 border-gold/20 glow-gold">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-8 space-y-4">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gold block">
                  Espace Artistes
                </span>
                <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                  Vous êtes artiste ou chantre en RDC ?
                </h2>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Gospel Awards RDC met en lumière l&apos;impact de vos œuvres chrétiennes. Les artistes officiellement nommés bénéficient d&apos;un profil public vérifié, d&apos;une présence dans leurs catégories et du suivi en temps réel des votes du public.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="text-xs px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-gray-300">
                    ✓ Profil officiel certifié
                  </span>
                  <span className="text-xs px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-gray-300">
                    ✓ Suivi des votes en direct
                  </span>
                  <span className="text-xs px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-gray-300">
                    ✓ Visibilité nationale & diaspora
                  </span>
                </div>
              </div>

              <div className="md:col-span-4 flex flex-col gap-3">
                <Link
                  href="/connexion"
                  className="btn-primary !py-3.5 !text-xs font-black tracking-wider text-center shadow-lg"
                >
                  Espace Artiste / Connexion
                </Link>
                <Link
                  href="/categories"
                  className="btn-secondary !py-3 !text-xs font-bold text-center"
                >
                  Découvrir les catégories
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ===== 7. SECTION TRANSPARENCE & INTÉGRITÉ ===== */}
        <section className="py-16 lg:py-24 px-4 border-t border-white/[0.06] bg-[#060912]">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-gray-300 text-xs font-bold">
              <span>⚖️</span> Charte de Transparence & Équité
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Un système de vote rigoureux et vérifiable
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left pt-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <div className="text-base font-bold text-gold">🔒 Décompte Atomique</div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Chaque point voté est déduit immédiatement et crédité de manière irréversible dans le classement officiel.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <div className="text-base font-bold text-gold">🛡️ Anti-Auto-Vote</div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Le système empêche systématiquement tout artiste de voter pour sa propre candidature afin de garantir l&apos;intégrité.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <div className="text-base font-bold text-gold">📊 Classement Réel</div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Les positions du podium et du classement reflètent fidèlement les votes effectifs enregistrés sur la plateforme.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== 8. CTA FINAL ===== */}
        <section className="py-20 lg:py-28 px-4 relative overflow-hidden border-t border-white/[0.06]">
          <div className="absolute inset-0 bg-gradient-to-r from-gold/[0.04] via-transparent to-accent/[0.04] pointer-events-none" />
          <div className="relative max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Faites entendre votre voix pour la <span className="gold-text">musique chrétienne</span>
            </h2>
            <p className="text-gray-300 text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
              Rejoignez des milliers de fidèles et de mélomanes à travers la RDC et le monde. Chaque vote contribue à couronner les serviteurs de Dieu.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/voter" className="w-full sm:w-auto btn-primary !py-4 !px-10 text-sm font-black tracking-wide shadow-2xl animate-pulse-vote">
                ⭐ Commencer à voter maintenant
              </Link>
              <Link href="/classements" className="w-full sm:w-auto btn-secondary !py-4 !px-8 text-sm font-bold">
                Consulter les classements
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
