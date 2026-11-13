import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  Truck, 
  Store, 
  CheckCircle2, 
  Loader2,
  User as UserIcon,
  Phone,
  MapPin,
  AlertCircle,
  ChevronRight,
  Clock
} from 'lucide-react';
import type { CartItem, User } from '../types';
import { createOrder, resolveImageUrl } from '../services/api';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (articleId: number, delta: number) => void;
  onRemoveItem: (articleId: number) => void;
  onClearCart: () => void;
  user?: User | null;
  onOpenAccount?: () => void;
  onTrackOrder?: (orderId: number) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  user,
  onOpenAccount,
  onTrackOrder,
}) => {
  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  const deliveryType = 'pickup' as const;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<any>(null);

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.article.price * item.quantity, 0);
  const deliveryFee = 0; // Retrait boutique gratuit
  const total = subtotal + deliveryFee;

  const handleGoToCheckout = () => {
    if (!user) {
      if (onOpenAccount) {
        onOpenAccount();
      }
      return;
    }
    setStep('checkout');
  };

  const handleCheckoutSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) {
      if (onOpenAccount) onOpenAccount();
      return;
    }

    if (!user.name || !user.phone) {
      setError('Votre compte client doit comporter un nom et un numéro de téléphone.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const orderData = {
        customer_id: user.id,
        customer_name: user.name,
        customer_phone: user.phone,
        customer_address: user.address || 'Abidjan',
        mode: deliveryType,
        delivery_type: deliveryType,
        delivery_address: user.address || 'Retrait en boutique',
        items: items.map((i) => ({
          article_id: i.article.id,
          quantity: i.quantity,
          qty: i.quantity,
        })),
      };

      const res = await createOrder(orderData);
      setOrderResult(res);
      setStep('success');
      onClearCart();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement de la commande.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('cart');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-0">
          {/* Header */}
          <div className="p-6 flex items-center justify-between border-0 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                {step === 'cart' ? 'Votre Panier' : step === 'checkout' ? 'Récapitulatif de commande' : 'Commande Confirmée !'}
              </h2>
            </div>
            <button
              onClick={step === 'success' ? handleReset : onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {step === 'cart' && (
              <>
                {items.length === 0 ? (
                  <div className="text-center py-16 space-y-4">
                    <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">Votre panier est vide</p>
                    <p className="text-xs text-slate-400">
                      Explorez le catalogue ou utilisez la recherche par photo pour ajouter des articles.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Alerte si client non connecté */}
                    {!user && (
                      <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-amber-950">Connexion requise pour commander</p>
                          <p className="text-[11px] text-amber-700 mt-0.5 leading-snug">
                            Connectez-vous ou créez votre compte client en 1 minute pour finaliser votre commande.
                          </p>
                          <button
                            type="button"
                            onClick={onOpenAccount}
                            className="mt-2.5 inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-xl transition shadow-sm cursor-pointer"
                          >
                            <span>Se connecter ou créer un compte</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Liste des articles du panier */}
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div
                          key={item.article.id}
                          className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80"
                        >
                          <img
                            src={resolveImageUrl(item.article.photo_url)}
                            alt={item.article.name}
                            className="w-16 h-16 rounded-xl object-cover bg-white shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{item.article.name}</p>
                            <p className="text-[11px] text-slate-500 truncate">{item.article.shop}</p>
                            <p className="text-xs font-black text-blue-600 mt-0.5">
                              {new Intl.NumberFormat('fr-FR').format(item.article.price)} FCFA
                            </p>
                          </div>

                          {/* Contrôle des quantités */}
                          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-2xs">
                            <button
                              onClick={() => onUpdateQuantity(item.article.id, -1)}
                              className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold text-slate-800 w-4 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => onUpdateQuantity(item.article.id, 1)}
                              className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            onClick={() => onRemoveItem(item.article.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {step === 'checkout' && (
              <div className="space-y-4">
                {/* 1. Coordonnées du client (enregistrées dans son compte) */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Vos coordonnées de contact
                    </span>
                    {user && (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        Compte client
                      </span>
                    )}
                  </div>

                  {user ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2.5 text-slate-900">
                        <UserIcon className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="font-bold">{user.name}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-slate-700">
                        <Phone className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>{user.phone}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-slate-600">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{user.address ? `Adresse : ${user.address}` : 'Abidjan'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                      <div className="flex items-start gap-2 text-amber-900">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs font-semibold">Inscription requise pour commander</p>
                      </div>
                      <p className="text-[11px] text-amber-700 leading-snug">
                        Connectez-vous pour utiliser les coordonnées enregistrées sur votre compte client.
                      </p>
                      <button
                        type="button"
                        onClick={onOpenAccount}
                        className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                      >
                        Se connecter / Créer un compte
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Boutique commerçante */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Boutique partenaire</p>
                      <p className="font-bold text-slate-900">{items[0]?.article.shop || 'Commerçant Lafi'}</p>
                    </div>
                  </div>
                </div>

                {/* 3. Mode de réception */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                    Mode de réception
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Retrait en boutique : Sélectionné */}
                    <div className="p-3 rounded-2xl border-2 border-blue-600 bg-blue-50/50 text-slate-900 flex items-start gap-2.5">
                      <Store className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold">Retrait Boutique</p>
                        <p className="text-[11px] text-emerald-600 font-bold mt-0.5">Gratuit</p>
                        <p className="text-[10px] text-slate-500 leading-tight mt-0.5">Au comptoir commerçant</p>
                      </div>
                    </div>

                    {/* Livraison Yango : Grisé & Indisponible sur Web */}
                    <div className="p-3 rounded-2xl border border-slate-200 bg-slate-100 text-slate-400 flex items-start gap-2.5 opacity-60 cursor-not-allowed select-none">
                      <Truck className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-600 line-through">Livraison Yango</p>
                        <p className="text-[10px] font-bold text-amber-700 mt-0.5 leading-tight">
                          Sur mobile uniquement
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Détail des articles commandés */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Articles ({items.length})
                    </span>
                    <span className="text-xs font-bold text-slate-600">
                      {items.reduce((s, it) => s + it.quantity, 0)} unité(s)
                    </span>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {items.map((item) => (
                      <div key={item.article.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                          <img
                            src={resolveImageUrl(item.article.photo_url)}
                            alt={item.article.name}
                            className="w-8 h-8 rounded-lg object-cover bg-white shrink-0"
                          />
                          <span className="truncate text-slate-800 font-medium">
                            {item.article.name} <span className="text-slate-400 font-bold">× {item.quantity}</span>
                          </span>
                        </div>
                        <span className="font-bold text-slate-900 shrink-0">
                          {new Intl.NumberFormat('fr-FR').format(item.article.price * item.quantity)} FCFA
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Note explicative de retrait */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2.5">
                  <Store className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Règlement en direct au commerçant lors du retrait au comptoir (via Mobile Money ou en espèces). Aucun paiement en ligne préalable.
                  </p>
                </div>

                {error && (
                  <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200">{error}</p>
                )}
              </div>
            )}

            {step === 'success' && (
              <div className="text-center py-6 space-y-5 animate-fadeIn">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Commande validée avec succès !</h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Merci {user?.name || 'cher client'} ! Votre commande #{orderResult?.id || '101'} a bien été transmise à la boutique commerçante.
                  </p>
                </div>

                {/* Code secret de retrait (OTP) */}
                {orderResult?.pickup_code && (
                  <div className="bg-blue-50 border-2 border-dashed border-blue-400 p-4 rounded-2xl text-center space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                      Votre Code Secret de Retrait
                    </p>
                    <p className="text-3xl font-black tracking-widest text-blue-900">
                      {orderResult.pickup_code}
                    </p>
                    <p className="text-[11px] text-blue-600 leading-snug">
                      Présentez ce code à 4 chiffres au commerçant lors de votre passage pour retirer vos articles.
                    </p>
                  </div>
                )}

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-left space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Boutique partenaire :</span>
                    <span className="font-bold text-slate-800">{orderResult?.shop || items[0]?.article.shop || 'Commerçant Lafi'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Client :</span>
                    <span className="font-bold text-slate-800">{user?.name} ({user?.phone})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Mode de réception :</span>
                    <span className="font-bold text-emerald-700">Retrait en boutique (Gratuit)</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between">
                    <span className="text-slate-700 font-bold">Total à régler au comptoir :</span>
                    <span className="font-black text-blue-600">{new Intl.NumberFormat('fr-FR').format(total)} FCFA</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Totals & Action */}
          {items.length > 0 && step !== 'success' && (
            <div className="p-6 border-t border-slate-100 bg-slate-50 space-y-4">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Sous-total articles</span>
                  <span>{new Intl.NumberFormat('fr-FR').format(subtotal)} FCFA</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Frais de livraison</span>
                  <span className="text-emerald-600 font-semibold">Gratuit (Retrait boutique)</span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total à payer</span>
                  <span className="text-blue-600">{new Intl.NumberFormat('fr-FR').format(total)} FCFA</span>
                </div>
              </div>

              {step === 'cart' ? (
                <button
                  onClick={handleGoToCheckout}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-600/25 transition cursor-pointer"
                >
                  Passer la commande
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('cart')}
                    className="px-4 py-3 bg-white border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50 transition cursor-pointer"
                  >
                    Retour
                  </button>
                  
                  {!user ? (
                    <button
                      type="button"
                      onClick={onOpenAccount}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <UserIcon className="w-4 h-4" />
                      <span>Se connecter pour commander</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleCheckoutSubmit()}
                      disabled={loading}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Transmission au commerçant...</span>
                        </>
                      ) : (
                        <span>Confirmer la commande</span>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 'success' && (
            <div className="p-6 border-t border-slate-100 bg-slate-50 space-y-2.5">
              {orderResult?.id && onTrackOrder && (
                <button
                  type="button"
                  onClick={() => {
                    const id = Number(orderResult.id);
                    handleReset();
                    onTrackOrder(id);
                  }}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-600/25 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  <span>Suivre ma commande en direct</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleReset}
                className="w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-2xl shadow-xs transition cursor-pointer"
              >
                Continuer mes achats
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
