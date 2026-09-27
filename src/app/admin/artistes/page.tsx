import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import AdminArtistesClient from './AdminArtistesClient'

export default async function AdminArtistesPage() {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') redirect('/connexion')

  const [artists, categories] = await Promise.all([
    prisma.artist.findMany({
      select: {
        id: true,
        stageName: true,
        slug: true,
        biography: true,
        profileImage: true,
        coverImage: true,
        isActive: true,
        isApproved: true,
        user: { select: { name: true, email: true, hashedPassword: true } },
        categories: {
          select: {
            category: {
              select: {
                id: true,
                name: true,
                icon: true,
              },
            },
          },
        },
        invitation: {
          select: {
            id: true,
            activationCode: true,
            token: true,
            isUsed: true,
            expiresAt: true,
          },
        },
        _count: { select: { votes: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, icon: true },
      orderBy: { orderIndex: 'asc' },
    }),
  ])

  const serializedArtists = artists.map((a) => ({
    id: a.id,
    stageName: a.stageName,
    slug: a.slug,
    biography: a.biography,
    profileImage: a.profileImage,
    coverImage: a.coverImage,
    isActive: a.isActive,
    isApproved: a.isApproved,
    user: {
      name: a.user.name,
      email: a.user.email,
      hashedPassword: a.user.hashedPassword,
    },
    categories: a.categories.map((ac) => ({
      category: {
        id: ac.category.id,
        name: ac.category.name,
        icon: ac.category.icon,
      },
    })),
    invitation: a.invitation
      ? {
          id: a.invitation.id,
          activationCode: a.invitation.activationCode,
          token: a.invitation.token,
          isUsed: a.invitation.isUsed,
          expiresAt: a.invitation.expiresAt.toISOString(),
        }
      : null,
    _count: a._count,
  }))

  const serializedCategories = categories.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
  }))

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div>
          <span className="text-xs font-semibold text-gold uppercase tracking-[0.2em] mb-1 block">
            Gestion Exclusive des Artistes
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Artistes & <span className="gold-text">Invitations</span>
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            Création des profils, génération de codes temporaires et contrôle des participations.
          </p>
        </div>
      </div>

      <AdminArtistesClient
        artists={serializedArtists}
        categories={serializedCategories}
      />
    </div>
  )
}

