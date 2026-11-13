import React, { useState, useEffect } from 'react';
import { 
  Search, 
  User, 
  ShoppingBag, 
  X,
  Store,
  Bell,
  Monitor
} from 'lucide-react';
import { LafiLogo } from './LafiLogo';
import type { User as UserType } from '../types';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenVisionSearch?: () => void;
  cartCount: number;
  onOpenCart: () => void;
  isMerchantView?: boolean;
  onToggleMerchantView?: () => void;
  activeNav: string;
  onSelectNav: (nav: string) => void;
  user: UserType | null;
  onOpenAccount: () => void;
  onOpenNotifications: () => void;
  unreadNotificationsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  cartCount,
  onOpenCart,
  activeNav,
  onSelectNav,
  user,
  onOpenAccount,
  onOpenNotifications,
  unreadNotificationsCount = 0,
}) => {
  const isSeller = Boolean(user && user.role === 'commercant');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallDesktopPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const navLinks = isSeller
    ? []
    : [
        { id: 'home', label: 'Accueil' },
        { id: 'shop', label: 'Boutiques' },
        { id: 'map', label: 'Carte Interactive' },
      ];

  return (
    <header className="sticky top-0 z-50 bg-[#070B14] text-white border-b border-white/5 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4 sm:gap-6">
        {/* Vector SVG Official Lafi Logo */}
        <div 
          className="flex items-center cursor-pointer select-none group shrink-0" 
          onClick={() => {
            onSelectNav(isSeller ? 'dashboard' : 'home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <LafiLogo 
            variant="dark"
            className="h-9 sm:h-11 w-auto transition-transform duration-200 group-hover:scale-105" 
          />
        </div>

        {/* Center Navigation Links (masqué en mode vendeur) */}
        {navLinks.length > 0 && (
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => onSelectNav(link.id)}
                className={`text-sm font-medium transition-colors relative py-1 ${
                  activeNav === link.id
                    ? 'text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {link.label}
                {activeNav === link.id && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-full" />
                )}
              </button>
            ))}
          </nav>
        )}

        {/* Right Section: Always-Visible Search Bar & Action Icons */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Always Visible Search Bar */}
          <div className="relative flex items-center bg-slate-900/90 border border-slate-700/80 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 rounded-full px-3.5 py-1.5 transition-all w-36 sm:w-56 md:w-64 lg:w-72">
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={isSeller ? "Filtrer mes articles..." : "Rechercher un article..."}
              className="bg-transparent text-xs text-white outline-none w-full placeholder-slate-400 font-normal"
            />
            {searchQuery && (
              <button 
                onClick={() => onSearchChange('')}
                className="text-slate-400 hover:text-white ml-1 p-0.5"
                title="Effacer la recherche"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Bouton d'installation PWA Desktop (PC / Mac uniquement) */}
          {deferredPrompt && (
            <button
              type="button"
              onClick={handleInstallDesktopPwa}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-bold transition cursor-pointer shrink-0"
              title="Installer Lafi comme application de bureau sur votre ordinateur"
            >
              <Monitor className="w-3.5 h-3.5" />
              App Bureau
            </button>
          )}

          {/* Cloche de Notification - Accessible Client & Commerçant */}
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative text-slate-300 hover:text-white p-2 rounded-full hover:bg-white/5 transition border-0 cursor-pointer"
            title={unreadNotificationsCount > 0 ? `${unreadNotificationsCount} notification(s) non lue(s)` : "Notifications"}
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-slate-300 hover:text-white transition-colors" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-0 right-0 bg-rose-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-lg shadow-rose-500/50">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* User / Merchant Account Drawer Trigger - même couleur que l'icône panier (text-slate-300 hover:text-white) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenAccount}
              className={`p-2 rounded-full transition flex items-center gap-1.5 border-0 cursor-pointer group ${
                isSeller
                  ? 'text-slate-300 hover:text-white hover:bg-white/5'
                  : user
                  ? 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
              title={
                isSeller
                  ? `${user?.shop_name || user?.name} (Boutique) - Ouvrir l'espace`
                  : user
                  ? `${user.name} (Client) - Ouvrir l'espace`
                  : 'Espace Client & Commerçant'
              }
              aria-label={isSeller ? "Espace Commerçant" : "Espace Client et Commerçant"}
            >
              {isSeller ? (
                <Store className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
              ) : (
                <User className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
              )}
              {user && (
                <span className="hidden lg:inline text-xs font-semibold max-w-[120px] truncate text-slate-300 group-hover:text-white transition-colors">
                  {isSeller ? user.shop_name || user.name : user.name}
                </span>
              )}
            </button>
          </div>

          {/* Cart Icon - Masqué pour le vendeur pour étanchéité totale */}
          {!isSeller && (
            <button
              type="button"
              onClick={onOpenCart}
              className="relative text-slate-300 hover:text-white p-2 rounded-full hover:bg-white/5 transition border-0 cursor-pointer"
              title="Panier d'achats"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/50">
                  {cartCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
