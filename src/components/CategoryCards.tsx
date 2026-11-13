import React from 'react';
import { ArrowRight } from 'lucide-react';

interface CategoryCardsProps {
  onSelectCategory: (category: string) => void;
  selectedCategory?: string;
}

export const CategoryCards: React.FC<CategoryCardsProps> = ({
  onSelectCategory,
  selectedCategory,
}) => {
  // Les 6 catégories officielles supportées par Lafi
  const categories = [
    {
      id: 'alimentation',
      name: 'Alimentation',
      subtitle: 'Épicerie & Frais',
      image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=300&auto=format&fit=crop&q=80',
    },
    {
      id: 'mode',
      name: 'Mode',
      subtitle: 'Vêtements & Wax',
      image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=300&auto=format&fit=crop&q=80',
    },
    {
      id: 'beaute',
      name: 'Beauté',
      subtitle: 'Soins & Karité',
      image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&auto=format&fit=crop&q=80',
    },
    {
      id: 'electronique',
      name: 'Électronique',
      subtitle: 'Tech & Accessoires',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&auto=format&fit=crop&q=80',
    },
    {
      id: 'maison',
      name: 'Maison',
      subtitle: 'Déco & Intérieur',
      image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&auto=format&fit=crop&q=80',
    },
    {
      id: 'bebe',
      name: 'Bébé',
      subtitle: 'Éveil & Soins',
      image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=300&auto=format&fit=crop&q=80',
    },
  ];

  return (
    <section className="py-7 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête discret de la section */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
              Explorer par Catégorie
            </h2>
          </div>
          {selectedCategory && selectedCategory !== 'Tout' && (
            <button
              onClick={() => onSelectCategory('Tout')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 transition"
            >
              Afficher tout
            </button>
          )}
        </div>

        {/* Les 6 catégories de Lafi tiennent sur une seule ligne sur desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-3.5 lg:gap-4">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.name;
            return (
              <div
                key={cat.id}
                onClick={() => onSelectCategory(cat.name)}
                className={`group bg-white rounded-2xl p-3 sm:p-3.5 flex flex-col items-center text-center cursor-pointer border transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${isSelected
                    ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md bg-blue-50/20'
                    : 'border-slate-200/80 hover:border-blue-400'
                  }`}
              >
                {/* Belle image d'illustration sur fond blanc */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 mb-2.5 rounded-xl bg-white flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>

                {/* Nom et sous-titre de la catégorie */}
                <div className="w-full">
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
                    {cat.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">
                    {cat.subtitle}
                  </p>
                </div>

                {/* Micro-lien Découvrir */}
                <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 group-hover:text-blue-700">
                  <span>Découvrir</span>
                  <ArrowRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
