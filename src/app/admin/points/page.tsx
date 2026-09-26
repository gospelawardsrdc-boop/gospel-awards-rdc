import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import { formatCurrency, formatPoints } from '@/lib/utils'
import { revalidatePath } from 'next/cache'

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

async function createPackage(formData: FormData) {
  'use server'
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return
  }

  const name = formData.get('name') as string
  const points = parseInt(formData.get('points') as string)
  const priceFc = parseInt(formData.get('priceFc') as string)

  if (!name || isNaN(points) || isNaN(priceFc) || points < 1 || priceFc < 1) return

  await prisma.pointPackage.create({
    data: {
      name,
      points,
      priceFc,
      orderIndex: (await prisma.pointPackage.count()) + 1,
    },
  })
  revalidatePath('/admin/points')
  revalidatePath('/voter')
}

async function togglePackage(formData: FormData) {
  'use server'
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return
  }

  const packageId = formData.get('packageId') as string
  const pkg = await prisma.pointPackage.findUnique({ where: { id: packageId } })
  if (pkg) {
    await prisma.pointPackage.update({
      where: { id: packageId },
      data: { isActive: !pkg.isActive },
    })
  }
  revalidatePath('/admin/points')
  revalidatePath('/voter')
}

export default async function AdminPointsPage() {
  const [session, packages] = await Promise.all([
    auth(),
    prisma.pointPackage.findMany({
      orderBy: { orderIndex: 'asc' },
      include: { _count: { select: { transactions: true } } },
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
                Tarification & Monétisation
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Packs de <span className="gold-text">Points</span>
              </h1>
              <p className="text-gray-400 text-xs mt-1">Gestion des offres de vote et équivalences de conversion.</p>
            </div>
          </div>

          {/* Add Package Form */}
          <div className="premium-card p-6 sm:p-8 border-gold/20 glow-gold">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              ➕ <span>Ajouter un Nouveau Pack</span>
            </h2>
            <form action={createPackage} className="flex flex-col sm:flex-row gap-3">
              <input
                name="name"
                placeholder="Ex: Pack Diamant"
                required
                className="flex-1 input-field"
              />
              <input
                name="points"
                type="number"
                placeholder="Points (ex: 200)"
                required
                min={1}
                className="w-full sm:w-36 input-field"
              />
              <input
                name="priceFc"
                type="number"
                placeholder="Prix en FC (ex: 100000)"
                required
                min={1}
                className="w-full sm:w-44 input-field"
              />
              <button type="submit" className="btn-primary !text-xs !py-3 !px-6 whitespace-nowrap">
                Créer Pack
              </button>
            </form>
          </div>

          {/* Packages Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`premium-card p-6 flex flex-col justify-between ${
                  !pkg.isActive ? 'opacity-40 border-dashed' : 'border-gold/15'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-white text-base">{pkg.name}</h3>
                    <form action={togglePackage}>
                      <input type="hidden" name="packageId" value={pkg.id} />
                      <button
                        type="submit"
                        className="text-[11px] font-semibold text-gray-400 hover:text-gold transition-colors"
                      >
                        {pkg.isActive ? 'Suspendre' : 'Activer'}
                      </button>
                    </form>
                  </div>
                  <div className="text-3xl font-black text-gold mb-1">
                    {formatPoints(pkg.points)} <span className="text-xs text-gray-400 font-normal">pts</span>
                  </div>
                  <div className="text-sm font-bold text-gray-200">{formatCurrency(pkg.priceFc)}</div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/[0.04] text-[11px] text-gray-500">
                  {pkg._count.transactions} transaction(s) enregistrée(s)
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
