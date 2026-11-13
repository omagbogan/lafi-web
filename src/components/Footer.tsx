import React from 'react';
import { Download } from 'lucide-react';
import { LafiLogo } from './LafiLogo';

const CURRENT_YEAR = new Date().getFullYear();

interface FooterProps {
  isSeller?: boolean;
  onSelectCategory?: (category: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ isSeller, onSelectCategory }) => {
  if (isSeller) {
    return (
      <footer className="bg-[#070B14] text-white py-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LafiLogo variant="dark" className="h-8 w-auto" />
            <span className="text-xs text-slate-400 font-medium px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">
              Espace réservé aux vendeurs et commerçants partenaires
            </span>
          </div>
          <p className="text-xs text-slate-500">
            © {CURRENT_YEAR} Lafi Local. Tous droits réservés.
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-[#070B14] text-white pt-16 pb-8 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-slate-800/80">
          {/* Brand in French */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center">
              <LafiLogo variant="dark" className="h-9 sm:h-10 w-auto" />
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm font-normal">
              La marketplace de proximité d'Abidjan qui réunit vos commerçants de quartier en toute simplicité.
            </p>
          </div>

          {/* Catégories officielles Lafi */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Catégories
            </h4>
            <ul className="space-y-2 text-xs text-slate-400 font-normal">
              {['Alimentation', 'Mode', 'Beauté', 'Électronique', 'Maison', 'Bébé'].map((cat) => (
                <li key={cat}>
                  <button
                    type="button"
                    onClick={() => onSelectCategory?.(cat)}
                    className="hover:text-white transition bg-transparent border-0 p-0 text-xs text-slate-400 cursor-pointer text-left font-normal"
                  >
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Téléchargement Application Mobile Lafi */}
          <div className="lg:col-span-4 space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Application Mobile Lafi
            </h4>

            <p className="text-xs text-slate-400 leading-relaxed font-normal">
              Installez l'application officielle sur votre smartphone Android pour profiter de la livraison Yango.
            </p>

            <div className="pt-1">
              {/* Bouton de Téléchargement Direct APK */}
              <a
                href="/lafi.apk"
                download="lafi.apk"
                className="flex items-center gap-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white px-4 py-3 rounded-2xl transition shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 group w-full sm:w-fit min-w-[220px] no-underline border-0 cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5 text-white group-hover:translate-y-0.5 transition" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] uppercase font-bold text-blue-100 tracking-wider leading-none">
                    Installation Directe Android
                  </p>
                  <p className="text-xs font-black text-white leading-tight mt-1 flex items-center gap-1.5">
                    <span>Télécharger l'APK Lafi</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-white/20 rounded-md">v1.0</span>
                  </p>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Copyright in French */}
        <div className="pt-8 text-center text-xs text-slate-400">
          <p>© {CURRENT_YEAR} Lafi. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
};
