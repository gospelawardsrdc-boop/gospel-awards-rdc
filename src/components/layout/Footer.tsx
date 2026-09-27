import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="relative border-t border-white/[0.04] bg-[#060912] pb-20 lg:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          {/* Brand */}
          <div className="md:col-span-5">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-10 h-10 rounded-lg gold-gradient flex items-center justify-center text-[#0A0E1A] font-black text-sm">
                GA
              </div>
              <div>
                <span className="text-base font-bold tracking-wide gold-text">GOSPEL AWARDS</span>
                <span className="text-[10px] block text-gray-600 tracking-[0.2em] -mt-0.5">RÉPUBLIQUE DÉM. DU CONGO</span>
              </div>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed max-w-sm">
              La plateforme de référence pour célébrer et soutenir les artistes et musiciens chrétiens
              de la République Démocratique du Congo.
            </p>
          </div>

          {/* Navigation */}
          <div className="md:col-span-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.15em] mb-4">
              Navigation
            </h3>
            <ul className="space-y-3">
              {[
                { href: '/', label: 'Accueil' },
                { href: '/edition', label: 'Édition' },
                { href: '/categories', label: 'Catégories' },
                { href: '/artistes', label: 'Artistes' },
                { href: '/classements', label: 'Classements' },
                { href: '/voter', label: 'Voter' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-500 hover:text-gold transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Compte */}
          <div className="md:col-span-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.15em] mb-4">
              Compte
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/connexion" className="text-sm text-gray-500 hover:text-gold transition-colors">
                  Connexion
                </Link>
              </li>
              <li>
                <Link href="/inscription" className="text-sm text-gray-500 hover:text-gold transition-colors">
                  Inscription
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="md:col-span-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.15em] mb-4">
              Légal
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/mentions-legales" className="text-sm text-gray-500 hover:text-gold transition-colors">
                  Conditions d&apos;utilisation
                </Link>
              </li>
              <li>
                <Link href="/confidentialite" className="text-sm text-gray-500 hover:text-gold transition-colors">
                  Confidentialité
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-gray-500 hover:text-gold transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/[0.04] mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-600 text-xs">
            © 2026 Gospel Awards RDC. Tous droits réservés.
          </p>
          <p className="text-gray-700 text-xs">
            Célébrons les voix qui inspirent la RDC 🇨🇩
          </p>
        </div>
      </div>
    </footer>
  )
}
