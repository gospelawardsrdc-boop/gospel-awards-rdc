import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Mail,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  MessageCircle,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Contact | Gospel Awards RDC',
  description: 'Contactez l\'équipe d\'organisation de Gospel Awards RDC.',
}

export default function ContactPage() {
  const email = 'gospelawardsrdc@gmail.com'
  const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}`
  const mailtoUrl = `mailto:${email}`

  return (
    <div className="min-h-screen bg-[#060912] text-white pt-28 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
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
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Équipe d&apos;organisation
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
            Contactez <span className="gold-text">Gospel Awards RDC</span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
            Pour toute demande d&apos;information, proposition de partenariat, question sur les votes ou assistance liée à la plateforme, nous sommes à votre écoute.
          </p>
        </div>

        {/* Carte de contact principale */}
        <div className="rounded-3xl bg-[#0A0E1A] border border-white/[0.08] p-8 sm:p-12 text-center relative overflow-hidden shadow-2xl">
          {/* Décoration d'arrière-plan */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-gold/5 blur-3xl pointer-events-none" />

          {/* Logo / Icône */}
          <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold mx-auto mb-6 shadow-inner">
            <Mail className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            Gospel Awards RDC
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Canal de communication officiel
          </p>

          {/* Bloc adresse email */}
          <div className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-[#060912] border border-white/[0.06] mb-8 max-w-full">
            <span className="text-gold font-mono text-base sm:text-lg font-bold select-all break-all">
              {email}
            </span>
          </div>

          {/* Boutons d'action */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            {/* Bouton Gmail */}
            <a
              href={gmailComposeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-gold-gradient text-[#0A0E1A] font-bold text-sm hover:opacity-95 active:scale-[0.99] transition-all shadow-lg shadow-gold/10"
            >
              <ExternalLink className="w-4 h-4" />
              Nous contacter par Gmail
            </a>

            {/* Bouton Mailto universel */}
            <a
              href={mailtoUrl}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white font-semibold text-sm hover:bg-white/[0.08] transition-all"
            >
              <MessageCircle className="w-4 h-4 text-gray-400" />
              Autre messagerie
            </a>
          </div>

          {/* Informations complémentaires */}
          <div className="mt-10 pt-8 border-t border-white/[0.04] text-xs text-gray-500 space-y-1">
            <p>Notre équipe traite les messages par ordre de réception.</p>
            <p>République Démocratique du Congo 🇨🇩</p>
          </div>
        </div>

        {/* Note artistes */}
        <div className="mt-8 rounded-2xl bg-[#0A0E1A] border border-white/[0.06] p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <h3 className="text-white font-semibold text-sm">
              Vous êtes un artiste nommé ?
            </h3>
            <p className="text-gray-400 text-xs mt-0.5">
              Gérez votre biographie, photo et liens officiels directement depuis votre espace.
            </p>
          </div>
          <Link
            href="/artiste"
            className="px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-gold/10 hover:text-gold text-gray-300 font-semibold text-xs border border-white/[0.08] transition-all whitespace-nowrap"
          >
            Accéder à l&apos;espace artiste →
          </Link>
        </div>
      </div>
    </div>
  )
}
