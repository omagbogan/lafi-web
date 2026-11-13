import React from 'react';
import { Truck, RotateCcw, ShieldCheck, Headphones } from 'lucide-react';

export const TrustBar: React.FC = () => {
  const items = [
    {
      icon: Truck,
      title: 'Livraison Express',
      desc: 'En 30 min avec Yango',
    },
    {
      icon: RotateCcw,
      title: 'Retrait Facile',
      desc: 'Disponible direct en boutique',
    },
    {
      icon: ShieldCheck,
      title: 'Paiements Sécurisés',
      desc: 'Paiement à la livraison',
    },
    {
      icon: Headphones,
      title: 'Support IA 24/7',
      desc: 'Agent Lafi actif 24h/24',
    },
  ];

  return (
    <section className="bg-white border-b border-slate-100 py-7">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50/70 text-[#2563EB] flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 stroke-[1.6]" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 leading-tight">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug font-normal">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
