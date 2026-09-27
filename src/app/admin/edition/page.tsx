import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import AdminEditionClient from './AdminEditionClient'

export const metadata = {
  title: 'Gestion de l\'Édition | Administration Gospel Awards RDC',
  description: 'Configuration officielle de l\'édition, dates, statut et bannière des Gospel Awards RDC.',
}

export default async function AdminEditionPage() {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    redirect('/connexion')
  }

  let competition = null
  try {
    // Récupération de l'édition active ou la plus récente
    competition = await prisma.competition.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { votes: true },
        },
      },
    })

    if (!competition) {
      competition = await prisma.competition.findFirst({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { votes: true },
          },
        },
      })
    }
  } catch (error) {
    console.error('Erreur chargement Competition dans AdminEditionPage:', error)
  }

  // Sérialisation des dates pour le composant client
  const serializedCompetition = competition
    ? {
        ...competition,
        startDate: competition.startDate ? competition.startDate.toISOString() : new Date().toISOString(),
        endDate: competition.endDate ? competition.endDate.toISOString() : new Date().toISOString(),
        createdAt: competition.createdAt ? competition.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: competition.updatedAt ? competition.updatedAt.toISOString() : new Date().toISOString(),
      }
    : null

  return <AdminEditionClient initialCompetition={serializedCompetition} />
}
