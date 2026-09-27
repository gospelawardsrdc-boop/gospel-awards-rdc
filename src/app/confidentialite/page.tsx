import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Lock,
  UserCheck,
  Coins,
  Vote,
  EyeOff,
  ShieldCheck,
  Cookie,
  Mail,
  ArrowLeft,
  KeyRound,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Politique de confidentialité | Gospel Awards RDC',
  description: 'Politique de confidentialité et protection des données sur Gospel Awards RDC.',
}

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-[#060912] text-white pt-28 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation retour */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l&apos;accueil
          </Link>
        </div>

        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs font-semibold uppercase tracking-wider mb-4">
            <Lock className="w-3.5 h-3.5" />
            Protection des données
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
            Politique de Confidentialité
          </h1>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            Cette politique explique de manière simple et transparente comment nous traitons vos informations sur la plateforme Gospel Awards RDC.
          </p>
        </div>

        {/* Contenu */}
        <div className="space-y-6 text-gray-300 text-sm sm:text-base leading-relaxed">
          {/* 1. Informations collectées */}
          <section className="rounded-2xl bg-[#0A0E1A] border border-white/[0.06] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
                <UserCheck className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">1. Informations collectées lors de la création d&apos;un compte</h2>
            </div>
            <p className="mb-3">
              Lorsque vous créez un compte sur Gospel Awards RDC, nous collectons les informations indispensables au fonctionnement de votre espace personnel :
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-400">
              <li>Votre nom ou nom d&apos;affichage</li>
              <li>Votre adresse email (utilisée pour votre connexion et vos notifications de compte)</li>
              <li>Votre mot de passe (sécurisé sous forme hachée)</li>
            </ul>
          </section>

          {/* 2. Protection des mots de passe */}
          <section className="rounded-2xl bg-[#0A0E1A] border border-white/[0.06] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
                <KeyRound className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">2. Protection des mots de passe</h2>
            </div>
            <p>
              Votre mot de passe n&apos;est jamais stocké en clair. Il est systématiquement protégé grâce à des algorithmes de hachage cryptographique robustes afin qu&apos;aucune personne, y compris l&apos;équipe technique, ne puisse y accéder directement.
            </p>
          </section>

          {/* 3. Achats de points et données de vote */}
          <section className="rounded-2xl bg-[#0A0E1A] border border-white/[0.06] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
                <Coins className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">3. Achats de points et votes</h2>
            </div>
            <p className="mb-3">
              Pour assurer le bon suivi de votre solde et de vos actions :
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-400">
              <li>Nous conservons l&apos;historique de vos recharges de points (montant, référence de transaction, statut).</li>
              <li>Nous enregistrons les votes que vous émettez (artiste sélectionné, catégorie, points utilisés, date et heure).</li>
              <li>Ces données de vote permettent de calculer fidèlement les résultats et les classements en direct.</li>
            </ul>
          </section>

          {/* 4. Confidentialité des votants vis-à-vis des artistes */}
          <section className="rounded-2xl bg-[#0A0E1A] border border-white/[0.06] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
                <EyeOff className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">4. Confidentialité des votes vis-à-vis des artistes</h2>
            </div>
            <p className="mb-3">
              L&apos;identité privée des votants (nom, email) n&apos;est jamais affichée publiquement ni transmise individuellement aux artistes.
            </p>
            <p className="text-sm text-gray-400">
              Les artistes ont accès uniquement aux statistiques globales et nécessaires à leur tableau de bord (total des points reçus, nombre total de votes, nombre de votants uniques et position dans le classement).
            </p>
          </section>

          {/* 5. Sécurité et prévention des abus */}
          <section className="rounded-2xl bg-[#0A0E1A] border border-white/[0.06] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">5. Sécurité et prévention des fraudes</h2>
            </div>
            <p>
              Les données techniques de connexion et d&apos;activité peuvent être analysées pour maintenir la sécurité du service, prévenir les attaques informatiques, empêcher les manipulations de vote et garantir l&apos;équité de la compétition.
            </p>
          </section>

          {/* 6. Cookies */}
          <section className="rounded-2xl bg-[#0A0E1A] border border-white/[0.06] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
                <Cookie className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">6. Utilisation des cookies</h2>
            </div>
            <p>
              Nous utilisons uniquement des <strong>cookies techniques indispensables</strong> pour maintenir votre session active lorsque vous êtes connecté. Nous n&apos;utilisons aucun cookie de ciblage publicitaire tiers.
            </p>
          </section>

          {/* 7. Vos droits et contact */}
          <section className="rounded-2xl bg-[#0A0E1A] border border-white/[0.06] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
                <Mail className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">7. Vos droits et contact</h2>
            </div>
            <p className="mb-3">
              Vous pouvez à tout moment demander l&apos;accès, la mise à jour ou la suppression des données associées à votre compte utilisateur en écrivant à notre adresse officielle :
            </p>
            <p className="text-sm">
              <strong>Gospel Awards RDC</strong> — Email :{' '}
              <a href="mailto:gospelawardsrdc@gmail.com" className="text-gold underline hover:text-white">
                gospelawardsrdc@gmail.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
