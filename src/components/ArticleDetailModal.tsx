import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  MapPin,
  Store,
  Phone,
  ShoppingBag,
  Plus,
  Minus,
  Check,
  Truck,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Trash2
} from 'lucide-react';
import type { Article } from '../types';
import { resolveImageUrl } from '../services/api';

interface ArticleDetailModalProps {
  article: Article | null;
  onClose: () => void;
  onSetCartQuantity: (article: Article, quantity: number) => void;
  onRemoveFromCart: (articleId: number) => void;
  cartQuantity: number;
}

export const ArticleDetailModal: React.FC<ArticleDetailModalProps> = ({
  article,
  onClose,
  onSetCartQuantity,
  onRemoveFromCart,
  cartQuantity,
}) => {
  const [quantity, setQuantity] = useState(cartQuantity > 0 ? cartQuantity : 1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Synchronisation stricte de la quantité avec le panier
  useEffect(() => {
    setQuantity(cartQuantity > 0 ? cartQuantity : 1);
  }, [cartQuantity, article?.id]);

  // Fermer avec la touche Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Réinitialiser la vue image quand l'article change
  useEffect(() => {
    setActiveImageIndex(0);
  }, [article?.id]);

  // Construire la liste de toutes les images disponibles pour la fiche produit
  const images = useMemo(() => {
    if (!article) return [];
    const list: string[] = [];

    // Photos multiples si présentes
    if (article.photos && Array.isArray(article.photos) && article.photos.length > 0) {
      article.photos.forEach((p) => {
        if (p && typeof p === 'string' && p.trim()) list.push(p.trim());
      });
    }

    // Photo principale
    if (article.photo_url && !list.includes(article.photo_url)) {
      list.unshift(article.photo_url);
    }

    // Fallback par défaut si aucune image
    if (list.length === 0) {
      list.push('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80');
    }

    // Si une seule image est disponible, on propose 2 vues de détails complémentaires
    if (list.length === 1) {
      list.push(
        `${list[0]}&view=detail`,
        `${list[0]}&view=pack`
      );
    }

    return list;
  }, [article]);

  if (!article) return null;

  const isInCart = cartQuantity > 0;
  const currentImage = images[activeImageIndex] || images[0];
  const formattedPrice = new Intl.NumberFormat('fr-FR').format(article.price) + ' FCFA';
  const distanceFormatted =
    article.distance_m < 1000
      ? `${Math.round(article.distance_m)} m`
      : `${(article.distance_m / 1000).toFixed(1)} km`;

  // Navigation images
  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  // Gestion de la quantité
  const handleIncrement = () => {
    setQuantity((prev) => prev + 1);
  };

  const handleDecrement = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleSaveCart = () => {
    if (!article) return;
    onSetCartQuantity(article, quantity);
    onClose();
  };

  const handleRemove = () => {
    if (!article) return;
    onRemoveFromCart(article.id);
    setQuantity(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      {/* Modal Card Sans Contour (border-0) */}
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl overflow-hidden flex flex-col md:flex-row border-0 ring-0">

        {/* Left: Image Showcase with Next / Prev buttons */}
        <div className="md:w-1/2 bg-[#F8FAFC] relative min-h-[300px] md:min-h-[440px] flex flex-col items-center justify-between p-4 sm:p-5 select-none">

          {/* Top Floating Badges */}
          <div className="w-full flex items-center justify-between z-10 mb-2">
            <div className="bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-slate-700 shadow-sm flex items-center gap-1.5 border-0">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>{distanceFormatted}</span>
            </div>

            <div className="bg-slate-900/85 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white shadow-sm border-0">
              {article.category}
            </div>
          </div>

          {/* Central Active Image with Left/Right Navigation Buttons */}
          <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden my-auto">
            <img
              src={resolveImageUrl(currentImage)}
              alt={`${article.name} - Vue ${activeImageIndex + 1}`}
              className="w-full h-full max-h-[290px] object-contain transition-all duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
              }}
            />

            {/* Bouton Image Précédente */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={handlePrevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-20 border-0 cursor-pointer"
                title="Image précédente"
                aria-label="Image précédente"
              >
                <ChevronLeft className="w-5 h-5 -ml-0.5 text-slate-700" />
              </button>
            )}

            {/* Bouton Image Suivante */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={handleNextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-20 border-0 cursor-pointer"
                title="Image suivante"
                aria-label="Image suivante"
              >
                <ChevronRight className="w-5 h-5 -mr-0.5 text-slate-700" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails / Indicators */}
          <div className="w-full flex items-center justify-center gap-2 mt-3 z-10 pt-1">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveImageIndex(idx)}
                className={`relative rounded-xl overflow-hidden bg-white shadow-sm transition-all cursor-pointer border-0 ${activeImageIndex === idx
                  ? 'ring-2 ring-blue-600 scale-105 opacity-100 w-11 h-11'
                  : 'opacity-50 hover:opacity-100 w-10 h-10'
                  }`}
                title={`Afficher image ${idx + 1}`}
              >
                <img
                  src={resolveImageUrl(img)}
                  alt={`Vignette ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Right: Details & Buying Actions */}
        <div className="md:w-1/2 p-6 sm:p-8 flex flex-col justify-between space-y-5 bg-white">
          <div className="space-y-4">

            {/* Top Close & Boutique Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                <Store className="w-4 h-4 text-blue-600" />
                <span className="truncate">{article.shop}</span>
                {article.open && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 transition border-0"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Title & Price */}
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                {article.name}
              </h2>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-2xl font-black text-blue-600">{formattedPrice}</span>
                {article.negotiable && (
                  <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded-full border-0">
                    Prix négociable
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                {article.description || "Article de qualité en vente dans la boutique partenaire. Livraison disponible en express à Abidjan."}
              </p>
            </div>

            {/* Shop Contact (Sans Contour) */}
            <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between text-xs border-0">
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-4 h-4 text-blue-500" />
                <span>Contact boutique :</span>
              </div>
              <a
                href={`tel:${article.shop_phone}`}
                className="font-bold text-slate-900 hover:text-blue-600 transition"
              >
                {article.shop_phone}
              </a>
            </div>

            {/* Delivery highlights */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1">
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Yango Express 30 min</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Paiement à la livraison</span>
              </div>
            </div>
          </div>

          {/* Action Row Sans Contour synchronisée avec le panier */}
          <div className="pt-4 flex items-center gap-2.5">
            {/* Sélecteur de quantité synchronisé avec le panier */}
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-2.5 rounded-2xl border-0 shrink-0">
              <button
                type="button"
                onClick={handleDecrement}
                className="p-1 text-slate-600 hover:text-slate-900 border-0 cursor-pointer transition"
                title="Diminuer la quantité"
                aria-label="Diminuer la quantité"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-bold text-slate-900 w-5 text-center select-none">
                {quantity}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                className="p-1 text-slate-600 hover:text-slate-900 border-0 cursor-pointer transition"
                title="Augmenter la quantité"
                aria-label="Augmenter la quantité"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Bouton Mettre à jour le panier / Ajouter au panier */}
            <button
              type="button"
              onClick={handleSaveCart}
              className={`flex-1 py-3 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98] cursor-pointer border-0 ${isInCart
                ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20'
                : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-blue-600/25'
                }`}
            >
              {isInCart ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Mettre à jour</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>Ajouter au panier</span>
                </>
              )}
            </button>

            {/* Bouton de suppression : uniquement l'icône poubelle sans aucun texte, à droite */}
            {isInCart && (
              <button
                type="button"
                onClick={handleRemove}
                className="p-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl transition flex items-center justify-center border-0 cursor-pointer shrink-0 hover:scale-105 active:scale-95 shadow-sm"
                title="Supprimer cet article du panier"
                aria-label="Supprimer cet article du panier"
              >
                <Trash2 className="w-5 h-5 text-rose-500" />
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
