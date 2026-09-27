import type { Metadata } from 'next'
import Link from 'next/link'
import {
  FileText,
  UserCheck,
  Coins,
  Vote,
  Trophy,
  Mic2,
  ShieldAlert,
  Ban,
  RefreshCw,
  Mail,
  ArrowLeft,
  Sparkles,
} from 'lucide-react'

export const metadata: Metadata = {
  title: "Conditions d'utilisation | Gospel Awards RDC",
  description: "Conditions générales d'utilisation de la plateforme Gospel Awards RDC.",
}

export default function ConditionsPage() {
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
            <FileText className="w-3.5 h-3.5" />
            Règles & Engagements
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
            Conditions d&apos;Utilisation
          </h1>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            Bienvenue sur Gospel Awards RDC. Les présentes conditions définissent les règles d&apos;utilisation de notre plateforme pour le public, les votants et les artistes.
          </p>
        </div>

        {/* Contenu structuré */}
        <div className="space-y-6 text-gray-300 text-sm sm:text-base leading-relaxed">
          {/* 1. Présentation */}
          <section className="rounded-2xl bg-[#0A0E1A] border border-white/[0.06] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">1. Présentation de Gospel Awards RDC</h2>
            </div>
            <p>
              <strong>Gospel Awards RDC</strong> est une plateforme dédiée à la célébration, à la mise en valeur et au soutien de la musique chrétienne et des artistes gospel en République Démocratique du Congo. Elle permet aux mélomanes de découvrir les artistes nommés dans différentes catégories officielles et de soutenir leurs artistes préférés par le vote.
            </p>
          </section>

          {/* 2. Utilisation de la plateforme */}
          <section className="rounded-2xl bg-[#0A0E1A] border border-white/[0.06] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">2. Utilisation de la plateforme</h2>
            </div>
            <p>
              L&apos;accès à la consultation des catégories, de la liste des artistes et des classements en direct est ouvert à tous. La participation aux votes et la gestion d&apos;un espace personnel nécessitent la création d&apos;un compte utilisateur.
            </p>
          </section>

          {/* 3. Création et utilisation du compte */}
          <section className="rounded-2xl bg-[#0A0E1A] border border-white/[0.06] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
                <UserCheck className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">3. Création et sécurité du compte</h2>
            </div>
            <p className="mb-3">
              Chaque utilisateur s&apos;engage à fournir des informations exactes lors de son inscription. Vous êtes responsable de la confidentialité de votre mot de passe et de toute activité effectuée depuis votre compte.
            </p>
            <p className="text-gray-400 text-sm">
              En cas de suspicion d&apos;accès non autorisé à votre compte, nous vous invitons à réinitialiser votre mot de passe sans délai.
            </p>
          </section>

          {/* 4. Achat et utilisation des points */}
          <section className="rounded-2xl bg-[#0A0E1A] border border-white/[0.06] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
                <Coins className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">4. Achat et utilisation des points</h2>
            </div>
            <p className="mb-3">
              Les votes s&apos;effectuent à l&apos;aide de points acquis sur la plateforme. Chaque recharge de points est définitive dès que le paiement est confirmé par l&apos;opérateur de paiement.
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-400">
              <li>Les points sont utilisables exclusivement pour voter sur la plateforme Gospel Awards RDC.</li>
              <li>Les points consommés lors d&apos;un vote validé sont immédiatement déduits de votre solde.</li>
            </ul>
          </section>

          {/* 5. Fonctionnement et règles des votes */}
          <section className="rounded-2xl bg-[#0A0E1A] border border-white/[0.06] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
                <Vote className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">5. Fonctionnement et règles des votes</h2>
            </div>
            <p className="mb-3">
              Le système de vote est conçu pour être équitable, transparent et sécurisé. Chaque vote attribue des points à l&apos;artiste sélectionné dans la catégorie choisie.
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-400">
              <li>Tout vote confirmé est irrévocable et ne peut être annulé.</li>
              <li>Un artiste ne peut pas utiliser son propre compte pour voter pour son profil (règle anti-auto-vote).</li>
              <li>Toute tentative de manipulation technique des votes est automatiquement bloquée par le système.</li>
            </ul>
          </section>

          {/* 6. Classements et résultats */}
          <section className="rounded-2xl bg-[#0A0E1A] border border-white/[0.06] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
                <Trophy className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">6. Classements et résultats</h2>
            </div>
            <p>
              Les classements affichés sur la page officielle reflètent les points cumulés en direct par chaque artiste nommé. À la clôture officielle de la période de vote, les résultats finaux seront validés et proclamés lors de la cérémonie officielle.
            </p>
          </section>

          {/* 7. Comptes artistes */}
          <section className="rounded-2xl bg-[#0A0E1A] border border-white/[0.06] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
                <Mic2 className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">7. Comptes artistes</h2>
            </div>
            <p>
              Les artistes officiellement nommés disposent d&apos;un espace dédié pour suivre leurs performances (points reçus, nombre de votes, rang par catégorie) et enrichir leur profil éditorial (biographie, liens musicaux et réseaux sociaux). Les artistes sont responsables du contenu qu&apos;ils publient sur leur fiche.
            </p>
          </section>

          {/* 8. Comportements interdits */}
          <section className="rounded-2xl bg-[#0A0E1A] border border-white/[0.06] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
                <Ban className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">8. Comportements interdits</h2>
            </div>
            <p className="mb-3">Sont formellement interdits sur la plateforme :</p>
            <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-400">
              <li>Toute tentative d&apos;intrusion, d&apos;attaque par déni de service ou d&apos;altération du code.</li>
              <li>L&apos;utilisation de robots, scripts automatisés ou failles pour générer des votes frauduleux.</li>
              <li>L&apos;usurpation d&apos;identité d&apos;un tiers, d&apos;un artiste ou de l&apos;administration.</li>
              <li>La publication de contenus injurieux, diffamatoires ou contraires aux valeurs chrétiennes de l&apos;événement.</li>
            </ul>
          </section>

          {/* 9. Suspension ou fermeture de compte */}
          <section className="rounded-2xl bg-[#0A0E1A] border border-white/[0.06] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">9. Suspension ou fermeture de compte</h2>
            </div>
            <p>
              En cas de non-respect des présentes conditions, d&apos;activité frauduleuse avérée ou de comportement abusif, Gospel Awards RDC se réserve le droit de suspendre ou de fermer le compte concerné, et d&apos;annuler les votes frauduleux le cas échéant.
            </p>
          </section>

          {/* 10. Évolution des services */}
          <section className="rounded-2xl bg-[#0A0E1A] border border-white/[0.06] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">10. Évolution des services et des règles</h2>
            </div>
            <p>
              Les présentes conditions d&apos;utilisation peuvent être adaptées pour accompagner l&apos;évolution de la plateforme. La version en vigueur est celle publiée sur cette page.
            </p>
          </section>

          {/* 11. Contact */}
          <section className="rounded-2xl bg-[#0A0E1A] border border-white/[0.06] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
                <Mail className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">11. Contact</h2>
            </div>
            <p className="mb-3">
              Pour toute question relative aux présentes conditions ou au fonctionnement de la plateforme, vous pouvez nous écrire à :
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
