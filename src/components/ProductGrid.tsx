import React from 'react';
import type { Article } from '../types';
import { ProductCard } from './ProductCard';
import { ArrowRight, ShoppingBag, RefreshCw, AlertCircle } from 'lucide-react';

interface ProductGridProps {
  articles: Article[];
  loading: boolean;
  error: string | null;
  onAddToCart: (article: Article) => void;
  onSelectArticle: (article: Article) => void;
  cartArticleIds: Set<number>;
  onResetFilters: () => void;
  title?: string;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  articles,
  loading,
  error,
  onAddToCart,
  onSelectArticle,
  cartArticleIds,
  onResetFilters,
  title = "Sélection Coup de Cœur",
}) => {
  if (loading) {
    return (
      <section className="py-6 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse space-y-4">
                <div className="w-full aspect-square bg-slate-100 rounded-xl" />
                <div className="h-4 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
                <div className="h-9 bg-slate-100 rounded-xl w-full" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-8 bg-white">
        <div className="max-w-md mx-auto p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">Erreur de chargement</h3>
          <p className="text-xs text-slate-500">{error}</p>
          <button
            onClick={onResetFilters}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Réessayer</span>
          </button>
        </div>
      </section>
    );
  }

  if (articles.length === 0) {
    return (
      <section className="py-12 bg-white">
        <div className="max-w-md mx-auto text-center space-y-4 p-8 bg-slate-50 rounded-3xl border border-slate-200/60">
          <ShoppingBag className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Aucun produit trouvé</h3>
          <p className="text-xs text-slate-500">
            Aucun article ne correspond à vos critères de recherche dans cette sélection.
          </p>
          <button
            onClick={onResetFilters}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
          >
            Voir tous les produits
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="py-6 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header in French */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {title}
          </h2>
          <button
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 group transition"
          >
            <span>Tout Afficher</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* 4 Columns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {articles.slice(0, 8).map((article) => (
            <ProductCard
              key={article.id}
              article={article}
              onAddToCart={onAddToCart}
              onSelect={onSelectArticle}
              isInCart={cartArticleIds.has(article.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
