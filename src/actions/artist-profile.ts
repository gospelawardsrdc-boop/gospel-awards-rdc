'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

/**
 * Mise à jour des informations éditoriales par l'artiste connecté
 * Seules les métadonnées éditoriales (photo, bio, liens sociaux & musicaux) sont modifiables.
 * Les catégories et l'approbation restent strictement verrouillées côté Admin.
 */
export async function updateArtistProfileEditorialAction(formData: FormData) {
  const session = await auth()
  if (!session?.user) {
    return { error: 'Vous devez être connecté.' }
  }

  const userId = (session.user as any).id
  const role = (session.user as any).role

  if (role !== 'ARTIST' && role !== 'ADMIN') {
    return { error: 'Accès réservé aux artistes enregistrés.' }
  }

  const artist = await prisma.artist.findUnique({
    where: { userId },
  })

  if (!artist) {
    return { error: 'Profil artiste introuvable.' }
  }

  const biography = (formData.get('biography') as string)?.trim() || null
  const profileImage = (formData.get('profileImage') as string)?.trim() || null
  const coverImage = (formData.get('coverImage') as string)?.trim() || null

  // Liens sociaux
  const instagramUrl = (formData.get('instagram') as string)?.trim()
  const facebookUrl = (formData.get('facebook') as string)?.trim()
  const youtubeUrl = (formData.get('youtube') as string)?.trim()
  const tiktokUrl = (formData.get('tiktok') as string)?.trim()

  // Liens musique & streaming
  const spotifyUrl = (formData.get('spotify') as string)?.trim()
  const appleMusicUrl = (formData.get('appleMusic') as string)?.trim()

  await prisma.$transaction(async (tx) => {
    // Mise à jour de base
    await tx.artist.update({
      where: { id: artist.id },
      data: {
        biography,
        profileImage,
        coverImage,
      },
    })

    // Réactualisation des liens sociaux
    await tx.artistSocialLink.deleteMany({ where: { artistId: artist.id } })
    const socialData = [
      { platform: 'instagram', url: instagramUrl },
      { platform: 'facebook', url: facebookUrl },
      { platform: 'youtube', url: youtubeUrl },
      { platform: 'tiktok', url: tiktokUrl },
    ].filter((s) => Boolean(s.url))

    if (socialData.length > 0) {
      await tx.artistSocialLink.createMany({
        data: socialData.map((s) => ({
          artistId: artist.id,
          platform: s.platform,
          url: s.url!,
        })),
      })
    }

    // Réactualisation des liens musicaux
    await tx.artistMusicLink.deleteMany({ where: { artistId: artist.id } })
    const musicData = [
      { platform: 'Spotify', url: spotifyUrl, title: 'Écouter sur Spotify' },
      { platform: 'Apple Music', url: appleMusicUrl, title: 'Écouter sur Apple Music' },
    ].filter((m) => Boolean(m.url))

    if (musicData.length > 0) {
      await tx.artistMusicLink.createMany({
        data: musicData.map((m) => ({
          artistId: artist.id,
          platform: m.platform,
          url: m.url!,
          title: m.title,
        })),
      })
    }
  })

  try {
    revalidatePath('/artiste')
    revalidatePath(`/artistes/${artist.slug}`)
    revalidatePath('/')
  } catch {}

  return { success: true, message: 'Votre profil éditorial a été mis à jour avec succès !' }
}
