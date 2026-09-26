import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Suspense } from 'react'
import './globals.css'
import NavigationProgressBar from '@/components/layout/NavigationProgressBar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Gospel Awards RDC - Votez pour vos artistes chrétiens préférés',
  description:
    'Plateforme de vote pour les artistes et musiciens chrétiens de la République Démocratique du Congo. Découvrez, votez et soutenez vos artistes gospel favoris.',
  keywords: ['gospel', 'awards', 'RDC', 'Congo', 'musique chrétienne', 'vote', 'artistes'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={`${inter.className} antialiased`}>
        <Suspense fallback={null}>
          <NavigationProgressBar />
        </Suspense>
        {children}
      </body>
    </html>
  )
}
