import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bell,
  X,
  CheckCheck,
  Store,
  Truck,
  Package,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import type { User as UserType, CustomerOrder } from '../types';
import { fetchCustomerOrders, fetchShopOrders } from '../services/api';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  timestamp: number;
  type: 'order_pending' | 'order_accepted' | 'order_yango' | 'order_completed' | 'order_refused' | 'info';
  icon: 'store' | 'truck' | 'package' | 'sparkles' | 'shopping' | 'alert';
  actionType?: 'open_orders' | 'open_account' | 'open_cart';
}

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType | null;
  onNavigateToOrders?: () => void;
  onOpenAccount?: () => void;
}

const STORAGE_KEY = 'lafi_read_notifications';

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  user,
  onNavigateToOrders,
  onOpenAccount,
}) => {
  const isSeller = Boolean(user && user.role === 'commercant');

  // Stored read notification IDs
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  // Save read notification IDs to localStorage
  const saveReadIds = useCallback((newIds: string[]) => {
    setReadIds(newIds);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newIds));
    } catch {
      // ignore
    }
  }, []);

  // Fetch orders when open or user changes
  useEffect(() => {
    if (!isOpen) return;
    const loadOrders = async () => {
      try {
        if (isSeller && user?.shop_id) {
          const data = await fetchShopOrders(user.shop_id);
          setOrders(data);
        } else if (user?.id) {
          const data = await fetchCustomerOrders(user.id);
          setOrders(data);
        }
      } catch {
        setOrders([]);
      }
    };
    loadOrders();
  }, [isOpen, isSeller, user]);

  // Compute dynamic notification list
  const notifications = useMemo<NotificationItem[]>(() => {
    const list: NotificationItem[] = [];

    if (isSeller) {
      // 1. Alertes Vendeur / Commerçant
      orders.forEach((o) => {
        const orderTime = o.created_at ? new Date(o.created_at).getTime() : Date.now();
        const formattedTotal = new Intl.NumberFormat('fr-FR').format(o.total || o.total_price || 0);

        if (o.status === 'pending') {
          list.push({
            id: `merchant-pending-${o.id}`,
            title: `Nouvelle commande reçue #${o.id}`,
            message: `${o.customer_name || 'Un client'} a passé commande pour ${formattedTotal} FCFA. Cliquez pour valider.`,
            time: 'En attente',
            timestamp: orderTime,
            type: 'order_pending',
            icon: 'shopping',
            actionType: 'open_orders',
          });
        } else if (o.status === 'accepted') {
          const isPickup = o.mode === 'pickup' || o.delivery_type === 'pickup';
          if (isPickup) {
            list.push({
              id: `merchant-accepted-pickup-${o.id}`,
              title: `Retrait en boutique #${o.id}`,
              message: `Articles prêts. En attente du client avec son code secret de retrait.`,
              time: 'En cours',
              timestamp: orderTime,
              type: 'order_accepted',
              icon: 'store',
              actionType: 'open_orders',
            });
          } else if (o.driver_dispatched && !o.package_handed_over) {
            list.push({
              id: `merchant-yango-enroute-${o.id}`,
              title: `Livreur Yango en route ! (#${o.id})`,
              message: `Le client a confirmé l'envoi de son livreur. Confiez-lui le colis à son arrivée.`,
              time: 'Livreur en route',
              timestamp: orderTime,
              type: 'order_yango',
              icon: 'truck',
              actionType: 'open_orders',
            });
          }
        } else if (o.status === 'completed') {
          list.push({
            id: `merchant-completed-${o.id}`,
            title: `Commande #${o.id} clôturée`,
            message: `Paiement et commande pour ${o.customer_name || 'le client'} (${formattedTotal} FCFA) finalisés.`,
            time: 'Terminée',
            timestamp: orderTime,
            type: 'order_completed',
            icon: 'package',
            actionType: 'open_orders',
          });
        }
      });

      // Notification permanente commerçant
      list.push({
        id: 'merchant-welcome-network',
        title: 'Boutique connectée au réseau Lafi',
        message: 'Votre catalogue, vos prix et vos livraisons express Yango sont actifs en temps réel.',
        time: 'Actif',
        timestamp: Date.now() - 3600000,
        type: 'info',
        icon: 'store',
      });

    } else {
      // 2. Alertes Client / Acheteur
      if (user && orders.length > 0) {
        orders.forEach((o) => {
          const orderTime = o.created_at ? new Date(o.created_at).getTime() : Date.now();
          const isPickup = o.mode === 'pickup' || o.delivery_type === 'pickup';

          if (o.status === 'accepted') {
            if (isPickup) {
              list.push({
                id: `client-pickup-ready-${o.id}`,
                title: `Commande #${o.id} prête en boutique !`,
                message: `La boutique prépare vos articles. Présentez votre code secret ${o.pickup_code ? `« ${o.pickup_code} »` : ''} au comptoir.`,
                time: 'Prête',
                timestamp: orderTime,
                type: 'order_accepted',
                icon: 'store',
                actionType: 'open_account',
              });
            } else {
              list.push({
                id: `client-yango-accepted-${o.id}`,
                title: `Commande #${o.id} validée !`,
                message: `Votre commande est acceptée. Le livreur Yango Express prendra en charge votre colis.`,
                time: 'En cours',
                timestamp: orderTime,
                type: 'order_yango',
                icon: 'truck',
                actionType: 'open_account',
              });
            }
          } else if (o.status === 'completed') {
            list.push({
              id: `client-completed-${o.id}`,
              title: `Commande #${o.id} livrée`,
              message: `Vos articles ont été réceptionnés avec succès. Merci d'avoir choisi le commerce de proximité !`,
              time: 'Livrée',
              timestamp: orderTime,
              type: 'order_completed',
              icon: 'package',
              actionType: 'open_account',
            });
          } else if (o.status === 'pending') {
            list.push({
              id: `client-pending-${o.id}`,
              title: `Commande #${o.id} transmise`,
              message: `En attente de confirmation par le commerçant de votre quartier.`,
              time: 'En attente',
              timestamp: orderTime,
              type: 'order_pending',
              icon: 'shopping',
              actionType: 'open_account',
            });
          }
        });
      }

      // Notification de bienvenue & bon plan client
      list.push({
        id: 'client-welcome-community',
        title: 'Bienvenue sur Lafi E-Commerce',
        message: 'Trouvez tous vos articles de proximité et profitez de la livraison express Yango en 30 minutes.',
        time: 'Info',
        timestamp: Date.now() - 86400000,
        type: 'info',
        icon: 'sparkles',
      });
    }

    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [isSeller, orders, user]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !readIds.includes(n.id)).length;
  }, [notifications, readIds]);

  const displayedNotifications = useMemo(() => {
    if (activeTab === 'unread') {
      return notifications.filter((n) => !readIds.includes(n.id));
    }
    return notifications;
  }, [notifications, readIds, activeTab]);

  const handleMarkAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    saveReadIds(Array.from(new Set([...readIds, ...allIds])));
  };

  const handleNotificationClick = (item: NotificationItem) => {
    if (!readIds.includes(item.id)) {
      saveReadIds([...readIds, item.id]);
    }
    if (item.actionType === 'open_orders' && onNavigateToOrders) {
      onNavigateToOrders();
      onClose();
    } else if (item.actionType === 'open_account' && onOpenAccount) {
      onOpenAccount();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn select-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-0">
          
          {/* Header Volet Notifications */}
          <div className="p-5 sm:p-6 bg-white flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-900 leading-tight">
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500 text-white">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isSeller ? 'Alertes boutique et commandes reçues' : 'Suivi de commandes et nouveautés'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="p-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold rounded-xl hover:bg-blue-50 transition border-0 bg-transparent cursor-pointer flex items-center gap-1"
                  title="Tout marquer comme lu"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Tout lire</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 transition border-0 cursor-pointer"
                title="Fermer"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filtres Toutes / Non lues */}
          <div className="px-5 pt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition border-0 cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Toutes ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('unread')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition border-0 cursor-pointer ${
                activeTab === 'unread'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Non lues ({unreadCount})
            </button>
          </div>

          {/* Liste des Notifications */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3">
            {displayedNotifications.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto text-slate-400">
                  <Bell className="w-6 h-6" />
                </div>
                <p className="font-bold text-slate-800 text-sm">Aucune notification</p>
                <p className="text-slate-400 text-[11px]">
                  {activeTab === 'unread'
                    ? 'Toutes vos notifications ont été lues.'
                    : 'Vos futures alertes en temps réel s’afficheront ici.'}
                </p>
              </div>
            ) : (
              displayedNotifications.map((item) => {
                const isUnread = !readIds.includes(item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`p-4 rounded-3xl transition border-0 cursor-pointer relative flex items-start gap-3.5 ${
                      isUnread
                        ? 'bg-blue-50/50 hover:bg-blue-50/80 shadow-sm'
                        : 'bg-slate-50/80 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    {/* Icône thématique */}
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border-0 ${
                      item.type === 'order_pending'
                        ? 'bg-amber-100 text-amber-700'
                        : item.type === 'order_accepted'
                        ? 'bg-blue-100 text-blue-700'
                        : item.type === 'order_yango'
                        ? 'bg-blue-100 text-blue-600'
                        : item.type === 'order_completed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {item.icon === 'store' && <Store className="w-5 h-5" />}
                      {item.icon === 'truck' && <Truck className="w-5 h-5" />}
                      {item.icon === 'package' && <Package className="w-5 h-5" />}
                      {item.icon === 'sparkles' && <Sparkles className="w-5 h-5" />}
                      {item.icon === 'shopping' && <ShoppingBag className="w-5 h-5" />}
                      {item.icon === 'alert' && <AlertCircle className="w-5 h-5" />}
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={`text-xs font-bold leading-tight truncate ${
                          isUnread ? 'text-slate-900' : 'text-slate-700'
                        }`}>
                          {item.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium shrink-0">
                          {item.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        {item.message}
                      </p>
                      {item.actionType && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 mt-2 hover:underline">
                          <span>Voir le détail</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>

                    {/* Pastille non lue */}
                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5 shadow-sm" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Pied de volet */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Système d'alertes temps réel Lafi</span>
            </span>
            <span>{isSeller ? 'Mode Vendeur' : 'Mode Client'}</span>
          </div>

        </div>
      </div>
    </div>
  );
};
