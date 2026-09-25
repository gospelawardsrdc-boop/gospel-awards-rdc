import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export default async function CategoriesPage() {
  const session = await auth()
  const user = session?.user ? { name: session.user.name!, role: (session.user as any).role } : null

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { orderIndex: 'asc' },
    include: {
      artists: {
        where: { artist: { isActive: true, isApproved: true } },
        select: { id: true },
      },
      _count: { select: { votes: true } },
    },
  })

  const categoryImages = [
    'from-yellow-900/25 to-amber-900/10',
    'from-blue-900/25 to-cyan-900/10',
    'from-purple-900/25 to-violet-900/10',
    'from-emerald-900/25 to-green-900/10',
    'from-red-900/25 to-rose-900/10',
    'from-indigo-900/25 to-blue-900/10',
    'from-pink-900/25 to-fuchsia-900/10',
    'from-teal-900/25 to-cyan-900/10',
    'from-orange-900/25 to-amber-900/10',
    'from-violet-900/25 to-purple-900/10',
    'from-sky-900/25 to-indigo-900/10',
    'from-lime-900/25 to-emerald-900/10',
    'from-amber-900/25 to-yellow-900/10',
    'from-fuchsia-900/25 to-rose-900/10',
    'from-cyan-900/25 to-teal-900/10',
    'from-rose-900/25 to-red-900/10',
  ]

  return (
    <div className="min-h-screen bg-[#060912]">
      <Header user={user} />
      <main className="pt-28 lg:pt-36 pb-24 lg:pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <span className="text-xs font-semibold text-gold uppercase tracking-[0.2em] mb-3 block">Découvrez</span>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight mb-4">
              Explorez les <span className="gold-text">catégories</span>
            </h1>
            <p className="text-gray-500 max-w-md mx-auto">
              {categories.length} catégories pour célébrer l&apos;excellence de la musique chrétienne congolaise
            </p>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {categories.map((category, i) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="premium-card overflow-hidden group"
              >
                <div className={`h-32 bg-gradient-to-br ${categoryImages[i % categoryImages.length]} relative overflow-hidden`}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-6xl opacity-30 group-hover:opacity-50 group-hover:scale-110 transition-all duration-500">
                      {category.icon || '🏆'}
                    </span>
                  </div>
                  <div className="category-gradient absolute inset-0" />
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-bold text-white text-lg group-hover:text-gold transition-colors leading-tight">
                        {category.name}
                      </h2>
                      <p className="text-gray-500 text-xs mt-2 line-clamp-2 leading-relaxed">
                        {category.description}
                      </p>
                    </div>
                    <span className="text-3xl ml-3 flex-shrink-0">{category.icon || '🏆'}</span>
                  </div>

                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/[0.04] text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="text-gold">🎤</span> {category.artists.length} candidat{category.artists.length !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-gold">🗳️</span> {category._count.votes} vote{category._count.votes !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
