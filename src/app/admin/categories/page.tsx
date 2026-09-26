import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import { revalidatePath } from 'next/cache'
import { slugify } from '@/lib/utils'

const adminMenuItems = [
  { label: 'Dashboard', href: '/admin', icon: '📊' },
  { label: 'Artistes & Candidats', href: '/admin/artistes', icon: '🎤' },
  { label: 'Catégories', href: '/admin/categories', icon: '🏷️' },
  { label: 'Votes', href: '/admin/votes', icon: '🗳️' },
  { label: 'Packs de points', href: '/admin/points', icon: '📦' },
  { label: 'Transactions', href: '/admin/transactions', icon: '💳' },
  { label: 'Finances & Retraits', href: '/admin/finances', icon: '💰' },
  { label: 'Utilisateurs', href: '/admin/utilisateurs', icon: '👥' },
]

async function toggleCategory(formData: FormData) {
  'use server'
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return
  }

  const categoryId = formData.get('categoryId') as string
  const cat = await prisma.category.findUnique({ where: { id: categoryId } })
  if (cat) {
    await prisma.category.update({
      where: { id: categoryId },
      data: { isActive: !cat.isActive },
    })
  }
  revalidatePath('/admin/categories')
  revalidatePath('/categories')
  revalidatePath('/')
}

export default async function AdminCategoriesPage() {
  const [session, categories] = await Promise.all([
    auth(),
    prisma.category.findMany({
      orderBy: { orderIndex: 'asc' },
      include: {
        artists: {
          where: { artist: { isActive: true, isApproved: true } },
          select: { id: true },
        },
        _count: { select: { votes: true } },
      },
    }),
  ])
  if (!session?.user || (session.user as any).role !== 'ADMIN') redirect('/connexion')

  return (
    <div className="min-h-screen bg-[#060912] flex">
      <Sidebar items={adminMenuItems} title="Administration" />
      <main className="flex-1 lg:ml-0 pt-8 pb-20 px-4 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
            <div>
              <span className="text-xs font-semibold text-gold uppercase tracking-[0.2em] mb-1 block">
                Structure Officielle du Concours
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Les 16 <span className="gold-text">Catégories Officielles</span>
              </h1>
              <p className="text-gray-400 text-xs mt-1">
                {categories.length} catégories officielles approuvées pour les Gospel Awards RDC.
              </p>
            </div>
          </div>

          {/* Categories List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className={`premium-card p-4 flex items-center gap-4 ${
                  !category.isActive ? 'opacity-40 border-dashed' : 'border-white/[0.06]'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-gold/[0.08] flex items-center justify-center text-2xl flex-shrink-0">
                  {category.icon || '🏆'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-sm truncate">{category.name}</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {category.artists.length} artiste(s) · {category._count.votes} vote(s)
                    {!category.isActive && ' · ⚠️ Inactive'}
                  </p>
                </div>
                <form action={toggleCategory}>
                  <input type="hidden" name="categoryId" value={category.id} />
                  <button
                    type="submit"
                    className="text-xs text-gray-400 hover:text-gold transition-colors px-2 py-1 rounded bg-white/[0.02]"
                  >
                    {category.isActive ? 'Désactiver' : 'Activer'}
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
