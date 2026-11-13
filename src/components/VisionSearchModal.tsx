import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Sparkles, Loader2, ShoppingBag, Check } from 'lucide-react';
import type { Article, AssistantResponse } from '../types';
import { searchByVision, resolveImageUrl } from '../services/api';

interface VisionSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (article: Article) => void;
  cartArticleIds: Set<number>;
}

export const VisionSearchModal: React.FC<VisionSearchModalProps> = ({
  isOpen,
  onClose,
  onAddToCart,
  cartArticleIds,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AssistantResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setAnalyzing(true);
    setError(null);

    try {
      const response = await searchByVision(selectedFile);
      setResult(response);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'analyse de l'image");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      {/* Modal Card Sans Contour (border-0) */}
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-0 flex flex-col">
        {/* Header Sans Contour */}
        <div className="p-6 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10 border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Recherche Visuelle par IA</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border-0">
                  MobileNetV2
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Glissez une photo pour trouver instantanément les boutiques qui vendent cet article.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 border-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          {!previewUrl ? (
            /* Drag and Drop Zone */
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-3xl p-10 text-center cursor-pointer bg-slate-50 hover:bg-brand-50/30 transition group space-y-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              />
              <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-200 text-slate-500 group-hover:text-brand-600 group-hover:scale-110 flex items-center justify-center mx-auto transition">
                <Upload className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                Déposez votre photo ici ou <span className="text-brand-600 underline">parcourez vos fichiers</span>
              </p>
              <p className="text-xs text-slate-400">JPG, PNG ou WEBP jusqu'à 8 Mo</p>
            </div>
          ) : (
            /* Image Preview & Analysis controls */
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 max-h-64 flex items-center justify-center border border-slate-200">
                <img src={previewUrl} alt="Preview" className="max-h-64 object-contain" />
                <button
                  onClick={handleReset}
                  className="absolute top-3 right-3 p-1.5 bg-slate-900/80 text-white rounded-full hover:bg-rose-600 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!result && (
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Changer de photo
                  </button>
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 transition"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Analyse par le modèle IA...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-accent-amber" />
                        <span>Identifier et trouver les boutiques</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* Analysis Results Display */}
          {result && (
            <div className="space-y-4 pt-4 border-t border-slate-100 animate-fadeIn">
              <div className="p-4 bg-brand-50/70 border border-brand-200 rounded-2xl space-y-1">
                <div className="flex items-center gap-2 text-brand-800 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-accent-amber" />
                  <span>Résultat de l'analyse visuelle</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">{result.reply}</p>
              </div>

              {result.recommended_articles.length > 0 ? (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Articles correspondants trouvés ({result.recommended_articles.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {result.recommended_articles.map((art) => {
                      const isInCart = cartArticleIds.has(art.id);
                      return (
                        <div
                          key={art.id}
                          className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-2xl hover:border-brand-300 transition"
                        >
                          <img
                            src={resolveImageUrl(art.photo_url)}
                            alt={art.name}
                            className="w-16 h-16 rounded-xl object-cover bg-slate-100 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-xs text-slate-900 truncate">{art.name}</p>
                            <p className="text-[11px] text-slate-500 truncate">{art.shop}</p>
                            <p className="text-xs font-black text-brand-600 mt-0.5">
                              {new Intl.NumberFormat('fr-FR').format(art.price)} FCFA
                            </p>
                          </div>
                          <button
                            onClick={() => onAddToCart(art)}
                            className={`p-2 rounded-xl transition ${
                              isInCart
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-300'
                                : 'bg-brand-50 text-brand-600 hover:bg-brand-500 hover:text-white'
                            }`}
                            title="Ajouter au panier"
                          >
                            {isInCart ? <Check className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  Aucun article actuellement en stock pour cette catégorie dans les boutiques ouvertes.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
