import React from 'react';
import { ShoppingBag, Check } from 'lucide-react';
import type { Article } from '../types';
import { resolveImageUrl } from '../services/api';

interface ProductCardProps {
  article: Article;
  onAddToCart: (article: Article) => void;
  onSelect: (article: Article) => void;
  isInCart?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  article,
  onAddToCart,
  onSelect,
  isInCart = false,
}) => {
  const formattedPrice = new Intl.NumberFormat('fr-FR').format(article.price) + ' FCFA';
  const originalPrice = article.negotiable
    ? new Intl.NumberFormat('fr-FR').format(Math.round(article.price * 1.25)) + ' FCFA'
    : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 flex flex-col justify-between hover:shadow-xl hover:border-slate-200 transition-all duration-300 group">
      {/* Top Image Box */}
      <div 
        className="relative w-full aspect-square bg-[#F8FAFC] rounded-2xl overflow-hidden mb-4 flex items-center justify-center cursor-pointer p-4 group-hover:bg-slate-100/70 transition-colors"
        onClick={() => onSelect(article)}
      >
        <img
          src={resolveImageUrl(article.photo_url)}
          alt={article.name}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80';
          }}
        />
      </div>

      {/* Product Details (Title, Subtitle/Category, Price) */}
      <div className="space-y-1 mb-4 flex-1">
        <h3
          onClick={() => onSelect(article)}
          className="font-bold text-slate-900 text-sm line-clamp-1 hover:text-[#2563EB] cursor-pointer transition-colors"
          title={article.name}
        >
          {article.name}
        </h3>
        <p className="text-xs text-slate-400 font-normal truncate">
          {article.shop} • {article.category}
        </p>

        {/* Price Row */}
        <div className="flex items-baseline gap-2 pt-1.5">
          <span className="font-extrabold text-slate-900 text-sm">
            {formattedPrice}
          </span>
          {originalPrice && (
            <span className="text-xs text-slate-400 line-through font-normal">
              {originalPrice}
            </span>
          )}
        </div>
      </div>

      {/* Button in French */}
      <button
        onClick={() => onAddToCart(article)}
        className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm ${
          isInCart
            ? 'bg-[#16A34A] text-white hover:bg-emerald-700'
            : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-blue-600/20 hover:shadow-md'
        } active:scale-[0.98]`}
      >
        {isInCart ? (
          <>
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Ajouté au Panier</span>
          </>
        ) : (
          <>
            <ShoppingBag className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Ajouter au Panier</span>
          </>
        )}
      </button>
    </div>
  );
};
