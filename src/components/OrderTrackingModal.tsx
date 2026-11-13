import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  CheckCircle2, 
  Store, 
  Loader2, 
  Ban, 
  ShoppingBag,
  RotateCcw
} from 'lucide-react';
import type { CustomerOrder } from '../types';
import { fetchOrder, cancelCustomerOrder } from '../services/api';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number | null;
  onOrderCancelled?: (order: CustomerOrder) => void;
}

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  orderId,
  onOrderCancelled,
}) => {
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  // Charger et actualiser la commande en temps réel
  useEffect(() => {
    if (!isOpen || !orderId) {
      setOrder(null);
      setError(null);
      setShowConfirmCancel(false);
      return;
    }

    let isMounted = true;

    const loadOrderData = async () => {
      try {
        const data = await fetchOrder(orderId);
        if (isMounted) {
          setOrder(data);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Impossible de charger la commande.');
        }
      }
    };

    setLoading(true);
    loadOrderData().finally(() => {
      if (isMounted) setLoading(false);
    });

    // Polling toutes les 4 secondes pour voir si le commerçant accepte en direct
    const timer = setInterval(loadOrderData, 4000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [isOpen, orderId]);

  if (!isOpen) return null;

  const handleCancel = async () => {
    if (!orderId || cancelling) return;
    setCancelling(true);
    setError(null);

    try {
      const updated = await cancelCustomerOrder(orderId);
      setOrder(updated);
      setShowConfirmCancel(false);
      if (onOrderCancelled) {
        onOrderCancelled(updated);
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'annulation de la commande.");
    } finally {
      setCancelling(false);
    }
  };

  const status = order?.status || 'pending';
  const isPending = status === 'pending';
  const isAccepted = status === 'accepted';
  const isCompleted = status === 'completed';
  const isCancelled = status === 'cancelled';
  const isRefused = status === 'refused';

  // L'annulation n'est permise QUE si la commande n'a pas encore été acceptée
  const canCancel = isPending;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto animate-fadeIn flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Suivi Commande #{orderId}
                </h3>
                {/* Badge d'état dynamique */}
                {isPending && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    En attente
                  </span>
                )}
                {isAccepted && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    Acceptée
                  </span>
                )}
                {isCompleted && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Terminée
                  </span>
                )}
                {isCancelled && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                    Annulée
                  </span>
                )}
                {isRefused && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                    Refusée
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {order?.shop ? `Boutique : ${order.shop}` : 'Mise à jour en temps réel'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading && !order ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-xs font-semibold">Récupération des informations de suivi...</p>
            </div>
          ) : error && !order ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-2">
              <p className="text-xs text-rose-700 font-semibold">{error}</p>
              <button
                onClick={() => fetchOrder(orderId!)}
                className="inline-flex items-center gap-1.5 text-xs text-rose-800 underline font-bold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Réessayer</span>
              </button>
            </div>
          ) : order ? (
            <>
              {/* 1. Timeline de Progression */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  État d'avancement
                </span>

                <div className="space-y-4 relative before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                  {/* Étape 1 : Commande transmise */}
                  <div className="flex items-start gap-3 relative">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 z-10 shadow-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Commande transmise</p>
                      <p className="text-[11px] text-slate-500">Transmise à la boutique commerçante</p>
                    </div>
                  </div>

                  {/* Étape 2 : Statut commerçant */}
                  <div className="flex items-start gap-3 relative">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 shadow-xs ${
                      isCompleted || isAccepted
                        ? 'bg-emerald-500 text-white'
                        : isCancelled || isRefused
                        ? 'bg-rose-500 text-white'
                        : 'bg-amber-500 text-white animate-pulse'
                    }`}>
                      {isCompleted || isAccepted ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : isCancelled || isRefused ? (
                        <X className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {isAccepted || isCompleted
                          ? 'Commande acceptée par le commerçant'
                          : isCancelled
                          ? 'Commande annulée'
                          : isRefused
                          ? 'Commande refusée par le commerçant'
                          : 'En attente de confirmation par le commerçant'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {isAccepted
                          ? 'Le commerçant prépare actuellement vos articles en boutique.'
                          : isCompleted
                          ? 'Articles vérifiés et retirés au comptoir.'
                          : isCancelled
                          ? 'La commande a été annulée.'
                          : isRefused
                          ? 'Le commerçant ne peut pas honorer cette commande.'
                          : 'Le commerçant examine la disponibilité de vos articles.'}
                      </p>
                    </div>
                  </div>

                  {/* Étape 3 : Retrait en boutique */}
                  <div className="flex items-start gap-3 relative">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 shadow-xs ${
                      isCompleted
                        ? 'bg-emerald-500 text-white'
                        : isAccepted
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-400'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <Store className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {isCompleted ? 'Commande retirée' : 'Retrait en boutique'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {isCompleted
                          ? 'Retrait effectué avec succès.'
                          : isAccepted
                          ? 'Passez en boutique pour retirer vos articles avec votre code secret.'
                          : 'Disponible dès validation par le commerçant.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Code secret de retrait OTP */}
              {order.pickup_code && !isCancelled && !isRefused && (
                <div className="bg-blue-50 border-2 border-dashed border-blue-400 p-4 rounded-2xl text-center space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                    Votre Code Secret de Retrait
                  </p>
                  <p className="text-3xl font-black tracking-widest text-blue-900">
                    {order.pickup_code}
                  </p>
                  <p className="text-[11px] text-blue-600 leading-snug">
                    Présentez ce code à 4 chiffres au commerçant lors de votre passage pour retirer vos articles.
                  </p>
                </div>
              )}

              {/* 3. Coordonnées & Boutique */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-bold uppercase tracking-wider text-slate-500">Boutique partenaire</span>
                  <span className="font-bold text-slate-900">{order.shop || 'Commerçant Lafi'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Client :</span>
                  <span className="font-bold text-slate-800">{order.customer_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Téléphone :</span>
                  <span className="font-bold text-slate-800">{order.customer_phone}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Lieu de retrait :</span>
                  <span className="font-bold text-slate-800">{order.customer_address || 'Au comptoir de la boutique'}</span>
                </div>
              </div>

              {/* 4. Détail des articles */}
              {order.items && order.items.length > 0 && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block pb-1 border-b border-slate-200">
                    Articles commandés ({order.items.length})
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {order.items.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-slate-700">
                          {it.name || it.article_name || `Article #${it.article_id}`} <span className="font-bold text-slate-400">× {it.qty || it.quantity || 1}</span>
                        </span>
                        <span className="font-bold text-slate-900">
                          {new Intl.NumberFormat('fr-FR').format((it.price || it.unit_price || 0) * (it.qty || it.quantity || 1))} FCFA
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between text-xs">
                    <span className="font-bold text-slate-700">Total :</span>
                    <span className="font-black text-blue-600">
                      {new Intl.NumberFormat('fr-FR').format(order.total || order.total_price || 0)} FCFA
                    </span>
                  </div>
                </div>
              )}

              {/* 5. ZONE D'ANNULATION */}
              {canCancel && (
                <div className="pt-2 space-y-3">
                  {!showConfirmCancel ? (
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => setShowConfirmCancel(true)}
                        className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 border border-rose-200 cursor-pointer"
                      >
                        <Ban className="w-4 h-4" />
                        <span>Annuler la commande</span>
                      </button>
                      <p className="text-[11px] text-slate-400 text-center">
                        Vous pouvez annuler sans frais tant que la commande n'a pas encore été acceptée par le commerçant.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3 animate-fadeIn">
                      <div className="flex items-start gap-2.5">
                        <Ban className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-rose-950">Confirmer l'annulation ?</p>
                          <p className="text-[11px] text-rose-700 leading-snug mt-0.5">
                            Cette commande sera immédiatement annulée et le commerçant en sera informé.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowConfirmCancel(false)}
                          className="flex-1 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition cursor-pointer"
                        >
                          Garder la commande
                        </button>
                        <button
                          type="button"
                          onClick={handleCancel}
                          disabled={cancelling}
                          className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {cancelling ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Annulation...</span>
                            </>
                          ) : (
                            <span>Oui, annuler</span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Si la commande est déjà acceptée : information d'impossibilité d'annulation */}
              {isAccepted && (
                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-center text-xs text-blue-900 space-y-0.5">
                  <p className="font-bold">Commande en cours de préparation</p>
                  <p className="text-[11px] text-blue-700">
                    Cette commande a été acceptée par la boutique et ne peut plus être annulée en ligne.
                  </p>
                </div>
              )}

              {/* Si annulée */}
              {isCancelled && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-center text-xs text-rose-700 space-y-0.5">
                  <p className="font-bold">Commande annulée</p>
                  <p className="text-[11px] text-rose-600">
                    Cette commande a été annulée avec succès.
                  </p>
                </div>
              )}

              {error && (
                <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200 text-center">{error}</p>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Fermer le suivi
          </button>
        </div>
      </div>
    </div>
  );
};
