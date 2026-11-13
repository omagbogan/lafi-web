import React from 'react';
import { ArrowRight } from 'lucide-react';

interface HeroBannerProps {
  onExplore: () => void;
  onOpenVisionSearch?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onExplore,
}) => {
  return (
    <section className="relative overflow-hidden bg-[#070B14] text-white pt-8 pb-16 lg:pt-14 lg:pb-24">
      {/* Background Ambient Radial Glow */}
      <div className="absolute top-1/2 right-[20%] -translate-y-1/2 w-[580px] h-[580px] bg-blue-600/20 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        {/* Left Column: Headlines & Single Blue CTA Button */}
        <div className="lg:col-span-6 space-y-6 z-10">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-[#3B82F6]">
            COMMERCE DE PROXIMITÉ & IA
          </p>

          <h1 className="text-4xl sm:text-5xl lg:text-[64px] font-black tracking-[-0.03em] text-white leading-[1.08]">
            Le Commerce Local. <br />
            Propulsé par l'IA.
          </h1>

          <p className="text-slate-400 text-sm sm:text-[15px] leading-relaxed max-w-md font-normal">
            Trouvez en un instant les meilleurs produits de vos commerçants de quartier, comparez les prix et faites-vous livrer en express avec Lafi.
          </p>

          <div className="pt-2">
            <button
              onClick={onExplore}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs sm:text-sm px-7 py-3.5 rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 transition-all flex items-center gap-2.5 transform active:scale-[0.98]"
            >
              <span>Explorer les Rayons</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Slider Pagination Dots (Matching screenshot) */}
          <div className="flex items-center gap-2 pt-6">
            <span className="w-6 h-1.5 bg-[#2563EB] rounded-full transition-all" />
            <span className="w-1.5 h-1.5 bg-slate-700 hover:bg-slate-500 cursor-pointer rounded-full transition-all" />
            <span className="w-1.5 h-1.5 bg-slate-700 hover:bg-slate-500 cursor-pointer rounded-full transition-all" />
          </div>
        </div>

        {/* Right Column: Clean 3D Product Showcase on Pedestal (Without badges) */}
        <div className="lg:col-span-6 relative flex items-center justify-center">
          <div className="relative w-full max-w-lg flex flex-col items-center">
            <div className="relative z-10 w-full flex items-center justify-center">
              <div className="relative group">
                <img
                  src="https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop&q=80"
                  alt="Présentation des articles connectés"
                  className="w-full max-h-[440px] object-cover rounded-3xl drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] border border-white/10 transition-transform duration-500 group-hover:scale-[1.02]"
                />

                <div className="absolute -inset-1 bg-gradient-to-t from-blue-500/20 via-transparent to-transparent rounded-3xl -z-10 blur-lg" />
              </div>
            </div>

            <div className="w-3/4 h-8 bg-black/60 rounded-full blur-xl -mt-4" />
          </div>
        </div>
      </div>
    </section>
  );
};
