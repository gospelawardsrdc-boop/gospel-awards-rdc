import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
})

export const registerSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})

export const candidateSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  confirmPassword: z.string(),
  stageName: z.string().min(2, 'Le nom d\'artiste doit contenir au moins 2 caractères'),
  biography: z.string().optional(),
  categoryIds: z.array(z.string()).min(1, 'Sélectionnez au moins une catégorie'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})

export const voteSchema = z.object({
  artistId: z.string().min(1, 'Artiste requis'),
  categoryId: z.string().min(1, 'Catégorie requise'),
  points: z.number().min(1, 'Minimum 1 point'),
})

export const purchasePointsSchema = z.object({
  packageId: z.string().min(1, 'Pack requis'),
})
