'use server'

import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signIn, signOut } from '@/lib/auth'
import { loginSchema, registerSchema, candidateSchema } from '@/lib/validations/auth'
import { slugify, getSafeRedirectUrl } from '@/lib/utils'
import { AuthError } from 'next-auth'

export async function loginAction(_prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const callbackUrl = formData.get('callbackUrl')

  const validated = loginSchema.safeParse({ email, password })
  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  const redirectTo = getSafeRedirectUrl(callbackUrl, '/dashboard')

  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: 'Email ou mot de passe incorrect' }
        default:
          return { error: 'Une erreur est survenue' }
      }
    }
    throw error
  }
}

export async function registerAction(_prevState: any, formData: FormData) {
  const data = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  }

  const validated = registerSchema.safeParse(data)
  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  })

  if (existingUser) {
    return { error: 'Un compte avec cet email existe déjà' }
  }

  const hashedPassword = await bcrypt.hash(data.password, 12)

  await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      hashedPassword,
      role: 'USER',
    },
  })

  const callbackUrl = formData.get('callbackUrl')
  const redirectTo = getSafeRedirectUrl(callbackUrl, '/dashboard')

  try {
    await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirectTo,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Compte créé. Veuillez vous connecter.' }
    }
    throw error
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: '/connexion' })
}
