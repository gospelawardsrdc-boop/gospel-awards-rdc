import { formatDate } from '@/lib/utils'

// Types de test
interface MockCompetition {
  id: string
  name: string
  status: string | null
  startDate: Date
  endDate: Date
  isActive: boolean
}

/**
 * Validation unitaire pure et isolée des gardes de vote (voteForArtist)
 * 100% in-memory — Aucune écriture ni modification sur les comptes ou bases de données.
 */
export function validateVoteGuards(
  competition: MockCompetition | null,
  now: Date = new Date(),
  artist: { id: string; userId: string; isActive: boolean; isApproved: boolean } | null = { id: 'art-1', userId: 'user-art-1', isActive: true, isApproved: true },
  currentUserId: string = 'user-voter-1',
  categoryRelationExists: boolean = true
) {
  // 1. Validation de l'artiste
  if (!artist || !artist.isActive || !artist.isApproved) {
    return { error: 'Artiste non disponible' }
  }

  // 2. Anti auto-vote
  if (artist.userId === currentUserId) {
    return { error: 'Vous ne pouvez pas voter pour votre propre candidature.' }
  }

  // 3. Appartenance catégorie
  if (!categoryRelationExists) {
    return { error: 'Cet artiste n\'est pas dans cette catégorie' }
  }

  // 4. Garde A : Existence d'une édition active
  if (!competition || !competition.isActive) {
    return { error: 'Aucune édition n\'est actuellement disponible pour recevoir des votes.' }
  }

  // 5. Garde B : Statut de l'édition
  if (competition.status === 'UPCOMING') {
    return { error: 'L\'édition officielle n\'a pas encore débuté. Les votes ouvriront prochainement.' }
  }

  if (competition.status === 'DRAFT') {
    return { error: 'Cette édition est en préparation. Les votes ne sont pas ouverts.' }
  }

  if (competition.status === 'CLOSED') {
    return { error: 'Les votes pour cette édition sont officiellement clôturés.' }
  }

  if (competition.status === 'GALA') {
    return { error: 'La période des votes est terminée. Cérémonie de remise des trophées en cours.' }
  }

  if (competition.status !== 'ACTIVE') {
    return { error: 'Les votes ne sont pas ouverts pour cette édition.' }
  }

  // 6. Garde C : Fenêtre temporelle [startDate, endDate]
  if (now < competition.startDate) {
    return { error: `La période de vote n'est pas encore ouverte (Ouverture prévue le ${formatDate(competition.startDate)}).` }
  }

  if (now > competition.endDate) {
    return { error: 'La période de vote est terminée pour cette édition. Les votes sont clôturés.' }
  }

  return { success: true, competitionId: competition.id }
}

export function runVoteGuardTestSuite(): { total: number; passed: number; failed: number } {
  let passed = 0
  let failed = 0
  const now = new Date('2026-11-15T12:00:00Z')

  const testCases: { name: string; run: () => boolean }[] = [
    {
      name: '1. 0 Competition active',
      run: () => validateVoteGuards(null, now).error === 'Aucune édition n\'est actuellement disponible pour recevoir des votes.',
    },
    {
      name: '2. status = UPCOMING',
      run: () => validateVoteGuards({ id: 'c2', name: 'E2', status: 'UPCOMING', startDate: new Date('2026-11-20'), endDate: new Date('2026-12-20'), isActive: true }, now).error === 'L\'édition officielle n\'a pas encore débuté. Les votes ouvriront prochainement.',
    },
    {
      name: '3. ACTIVE + startDate future',
      run: () => Boolean(validateVoteGuards({ id: 'c3', name: 'E3', status: 'ACTIVE', startDate: new Date('2026-12-01'), endDate: new Date('2026-12-31'), isActive: true }, now).error?.includes('La période de vote n\'est pas encore ouverte')),
    },
    {
      name: '4. ACTIVE + Période valide',
      run: () => {
        const res = validateVoteGuards({ id: 'c4', name: 'E4', status: 'ACTIVE', startDate: new Date('2026-11-01'), endDate: new Date('2026-11-30'), isActive: true }, now)
        return res.success === true && res.competitionId === 'c4'
      },
    },
    {
      name: '5. ACTIVE + endDate passée',
      run: () => validateVoteGuards({ id: 'c5', name: 'E5', status: 'ACTIVE', startDate: new Date('2026-10-01'), endDate: new Date('2026-10-31'), isActive: true }, now).error === 'La période de vote est terminée pour cette édition. Les votes sont clôturés.',
    },
    {
      name: '6. status = CLOSED',
      run: () => validateVoteGuards({ id: 'c6', name: 'E6', status: 'CLOSED', startDate: new Date('2026-11-01'), endDate: new Date('2026-11-30'), isActive: true }, now).error === 'Les votes pour cette édition sont officiellement clôturés.',
    },
    {
      name: '7. status = GALA',
      run: () => validateVoteGuards({ id: 'c7', name: 'E7', status: 'GALA', startDate: new Date('2026-11-01'), endDate: new Date('2026-11-30'), isActive: true }, now).error === 'La période des votes est terminée. Cérémonie de remise des trophées en cours.',
    },
    {
      name: '8. status = DRAFT',
      run: () => validateVoteGuards({ id: 'c8', name: 'E8', status: 'DRAFT', startDate: new Date('2026-11-01'), endDate: new Date('2026-11-30'), isActive: true }, now).error === 'Cette édition est en préparation. Les votes ne sont pas ouverts.',
    },
    {
      name: '9. isActive = false',
      run: () => validateVoteGuards({ id: 'c9', name: 'E9', status: 'ACTIVE', startDate: new Date('2026-11-01'), endDate: new Date('2026-11-30'), isActive: false }, now).error === 'Aucune édition n\'est actuellement disponible pour recevoir des votes.',
    },
    {
      name: '10. Impossibilité de competitionId null',
      run: () => {
        const res = validateVoteGuards(null, now)
        return res.success !== true
      },
    },
    {
      name: '11. Auto-vote bloqué',
      run: () => validateVoteGuards(
        { id: 'c11', name: 'E11', status: 'ACTIVE', startDate: new Date('2026-11-01'), endDate: new Date('2026-11-30'), isActive: true },
        now,
        { id: 'art-1', userId: 'user-same-1', isActive: true, isApproved: true },
        'user-same-1'
      ).error === 'Vous ne pouvez pas voter pour votre propre candidature.',
    },
  ]

  for (const tc of testCases) {
    if (tc.run()) {
      passed++
    } else {
      failed++
    }
  }

  return { total: testCases.length, passed, failed }
}
