import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import AdminCategoriesClient from './AdminCategoriesClient'

export default async function AdminCategoriesPage() {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') redirect('/connexion')

  const categories = await prisma.category.findMany({
    orderBy: { orderIndex: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      isActive: true,
      artists: {
        where: { artist: { isActive: true, isApproved: true } },
        select: { id: true },
      },
      _count: { select: { votes: true } },
    },
  })

  return <AdminCategoriesClient categories={categories} />
}
