'use server'

import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

/**
 * Demande de réinitialisation de mot de passe sécurisée
 */
export async function requestPasswordResetAction(formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase()

  if (!email) {
    return { error: 'Veuillez renseigner votre adresse email.' }
  }

  const user = await prisma.user.findUnique({ where: { email } })

  // Réponse générique pour des raisons de sécurité
  if (!user) {
    return {
      success: true,
      message: 'Si un compte correspond à cette adresse, un lien de réinitialisation vous a été préparé.',
    }
  }

  // Invalider les anciens tokens non utilisés pour cet email
  await prisma.passwordResetToken.deleteMany({
    where: { email, isUsed: false },
  })

  // Générer nouveau token expirant dans 2 heures
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 2 * 3600 * 1000)

  await prisma.passwordResetToken.create({
    data: {
      email,
      token,
      expiresAt,
      isUsed: false,
    },
  })

  return {
    success: true,
    resetToken: token,
    resetLink: `/reinitialiser-mot-de-passe?token=${token}`,
    message: 'Si un compte correspond à cette adresse, un lien de réinitialisation a été préparé.',
  }
}

/**
 * Réinitialisation effective du mot de passe avec validation du token
 */
export async function resetPasswordAction(formData: FormData) {
  const token = (formData.get('token') as string)?.trim()
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!token) {
    return { error: 'Jeton de réinitialisation manquant ou invalide.' }
  }

  if (!password || password.length < 8) {
    return { error: 'Le nouveau mot de passe doit comporter au moins 8 caractères.' }
  }

  if (password !== confirmPassword) {
    return { error: 'Les mots de passe ne correspondent pas.' }
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  })

  if (!resetToken || resetToken.isUsed) {
    return { error: 'Ce lien de réinitialisation est invalide ou a déjà été utilisé.' }
  }

  if (new Date() > resetToken.expiresAt) {
    return { error: 'Ce lien de réinitialisation a expiré. Veuillez refaire une demande.' }
  }

  const user = await prisma.user.findUnique({
    where: { email: resetToken.email },
  })

  if (!user) {
    return { error: 'Utilisateur introuvable.' }
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  try {
    await prisma.$transaction(async (tx) => {
      const updateToken = await tx.passwordResetToken.updateMany({
        where: {
          id: resetToken.id,
          isUsed: false,
        },
        data: {
          isUsed: true,
        },
      })

      if (updateToken.count === 0) {
        throw new Error('ALREADY_USED')
      }

      await tx.user.update({
        where: { id: user.id },
        data: { hashedPassword },
      })
    }, {
      maxWait: 20000,
      timeout: 30000,
    })
  } catch (err: any) {
    if (err.message === 'ALREADY_USED') {
      return { error: 'Ce lien de réinitialisation a déjà été utilisé.' }
    }
    return { error: 'Erreur lors de la réinitialisation du mot de passe.' }
  }

  return {
    success: true,
    message: 'Votre mot de passe a été modifié avec succès ! Vous pouvez maintenant vous connecter.',
  }
}
