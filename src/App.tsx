import { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { TrustBar } from './components/TrustBar';
import { CategoryCards } from './components/CategoryCards';
import { ProductGrid } from './components/ProductGrid';
import { Footer } from './components/Footer';
import { VisionSearchModal } from './components/VisionSearchModal';
import { CartDrawer } from './components/CartDrawer';
import { AccountDrawer } from './components/AccountDrawer';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { ArticleDetailModal } from './components/ArticleDetailModal';
import { AiAssistantWidget } from './components/AiAssistantWidget';
import { MerchantDashboard } from './components/MerchantDashboard';
import { InteractiveMapModal } from './components/InteractiveMapModal';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { AdminDashboard } from './components/AdminDashboard';
import type { Article, CartItem, User } from './types';
import { fetchArticles, fetchCustomerOrders, fetchShopOrders } from './services/api';

export function App() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [selectedCategory, setSelectedCategory] = useState<string>('Tout');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeNav, setActiveNav] = useState<string>('home');

  // Modals & Panels
  const [isVisionSearchOpen, setIsVisionSearchOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAccountDrawerOpen, setIsAccountDrawerOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<number | null>(null);

  // User Authentication State with LocalStorage
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('lafi_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Vendeur connecté : étanchéité totale par rapport à l'espace client
  const isSeller = Boolean(user && user.role === 'commercant');
  const isAdmin = Boolean(user && user.role === 'admin');
  const [showAdminDashboard, setShowAdminDashboard] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('lafi_user');
      const parsed = saved ? JSON.parse(saved) : null;
      return parsed?.role === 'admin';
    } catch {
      return false;
    }
  });

  // Mise à jour automatique du badge de notifications non lues
  useEffect(() => {
    const updateUnreadCount = async () => {
      try {
        let count = 0;
        const raw = localStorage.getItem('lafi_read_notifications');
        const readIds: string[] = raw ? JSON.parse(raw) : [];

        if (user?.role === 'commercant' && user?.shop_id) {
          const shopOrders = await fetchShopOrders(user.shop_id);
          const pending = shopOrders.filter((o) => o.status === 'pending');
          const unreadPending = pending.filter((o) => !readIds.includes(`merchant-pending-${o.id}`));
          count = unreadPending.length;
        } else if (user?.id) {
          const custOrders = await fetchCustomerOrders(user.id);
          const activeOrders = custOrders.filter((o) => o.status === 'accepted' || o.status === 'pending');
          const unreadActive = activeOrders.filter(
            (o) => !readIds.includes(`client-pickup-ready-${o.id}`) && !readIds.includes(`client-pending-${o.id}`)
          );
          count = unreadActive.length;
        } else {
          if (!readIds.includes('client-welcome-community')) {
            count = 1;
          }
        }
        setUnreadNotificationsCount(count);
      } catch {
        // ignore
      }
    };

    updateUnreadCount();
    const interval = setInterval(updateUnreadCount, 15000);
    return () => clearInterval(interval);
  }, [user, isNotificationsOpen]);

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('lafi_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('lafi_user');
      }
    } catch {
      // ignore
    }
  }, [user]);

  const handleLoginSuccess = (loggedUser: User) => {
    setUser(loggedUser);
    setIsAccountDrawerOpen(false);
    if (loggedUser.role === 'admin') {
      setShowAdminDashboard(true);
    } else if (loggedUser.role === 'commercant') {
      setActiveNav('dashboard');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setShowAdminDashboard(false);
    setIsAccountDrawerOpen(false);
    setActiveNav('home');
  };

  // Cart State with LocalStorage
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('lafi_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('lafi_cart', JSON.stringify(cartItems));
    } catch {
      // ignore
    }
  }, [cartItems]);

  const cartArticleIds = useMemo(() => new Set(cartItems.map((i) => i.article.id)), [cartItems]);
  const cartTotalCount = useMemo(() => cartItems.reduce((acc, i) => acc + i.quantity, 0), [cartItems]);

  // Fetch articles from API
  const loadArticles = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchArticles({
        category: selectedCategory === 'Tout' ? undefined : selectedCategory,
        query: searchQuery || undefined,
      });
      setArticles(data);
    } catch (err: any) {
      setError(err.message || 'Impossible de joindre le serveur Lafi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadArticles();
    }, 200);
    return () => clearTimeout(timer);
  }, [selectedCategory, searchQuery]);

  // Cart handlers
  const handleAddToCart = (article: Article, quantity: number = 1) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.article.id === article.id);
      if (existing) {
        return prev.map((item) =>
          item.article.id === article.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { article, quantity }];
    });
  };

  const handleUpdateQuantity = (articleId: number, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.article.id === articleId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveFromCart = (articleId: number) => {
    setCartItems((prev) => prev.filter((item) => item.article.id !== articleId));
  };

  const handleSetCartQuantity = (article: Article, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(article.id);
      return;
    }
    setCartItems((prev) => {
      const existing = prev.find((item) => item.article.id === article.id);
      if (existing) {
        return prev.map((item) =>
          item.article.id === article.id ? { ...item, quantity } : item
        );
      }
      return [...prev, { article, quantity }];
    });
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleResetFilters = () => {
    setSelectedCategory('Tout');
    setSearchQuery('');
  };

  const handleExploreCatalog = () => {
    const el = document.getElementById('top-picks-section');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  if (isAdmin && showAdminDashboard && user) {
    return (
      <AdminDashboard
        user={user}
        onExitAdminView={() => setShowAdminDashboard(false)}
        onLogout={handleLogout}
        onRefreshCatalogue={loadArticles}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans selection:bg-blue-600 selection:text-white">
      {isAdmin && (
        <div className="bg-blue-600 text-white px-4 py-2 text-xs font-extrabold flex items-center justify-between">
          <span>Mode aperçu vitrine (Connecté en Super-Administrateur)</span>
          <button
            onClick={() => setShowAdminDashboard(true)}
            className="px-3 py-1 rounded-lg bg-white text-blue-700 font-black hover:bg-blue-50 transition"
          >
            Retourner au Dashboard Admin →
          </button>
        </div>
      )}
      {/* 1. Dark Top Navigation Header */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenVisionSearch={() => setIsVisionSearchOpen(true)}
        cartCount={cartTotalCount}
        onOpenCart={() => setIsCartOpen(true)}
        activeNav={activeNav}
        onSelectNav={(nav) => {
          setActiveNav(nav);
          if (isSeller) {
            if (nav === 'inventory') {
              const el = document.getElementById('inventory-table');
              el?.scrollIntoView({ behavior: 'smooth' });
            } else {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          } else {
            if (nav === 'map') {
              setIsMapModalOpen(true);
            } else if (nav === 'shop' || nav === 'deals' || nav === 'new') {
              handleExploreCatalog();
            }
          }
        }}
        user={user}
        onOpenAccount={() => setIsAccountDrawerOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        unreadNotificationsCount={unreadNotificationsCount}
      />

      {/* Main View: Merchant Dashboard ou Layout E-Commerce Client */}
      {isSeller ? (
        <main className="flex-1 bg-slate-50 py-8">
          <MerchantDashboard
            articles={articles}
            onRefreshArticles={loadArticles}
            user={user}
            onLogout={handleLogout}
            searchFilter={searchQuery}
          />
        </main>
      ) : (
        <main className="flex-1">
          {/* 2. Dark Hero Section with 3D product showcase */}
          <HeroBanner
            onExplore={handleExploreCatalog}
            onOpenVisionSearch={() => setIsVisionSearchOpen(true)}
          />

          {/* 3. White Trust Bar with 4 value propositions */}
          <TrustBar />

          {/* 4. 6 Official Lafi Category Cards on a single line */}
          <CategoryCards
            selectedCategory={selectedCategory}
            onSelectCategory={(category) => {
              setSelectedCategory(category);
              handleExploreCatalog();
            }}
          />

          {/* 5. "Top Picks" Product Grid with badges & blue Add to Cart buttons */}
          <div id="top-picks-section">
            <ProductGrid
              articles={articles}
              loading={loading}
              error={error}
              onAddToCart={handleAddToCart}
              onSelectArticle={setSelectedArticle}
              cartArticleIds={cartArticleIds}
              onResetFilters={handleResetFilters}
              title={selectedCategory === 'Tout' ? 'Boutique' : `Rayon : ${selectedCategory}`}
            />
          </div>
        </main>
      )}

      {/* 9. Dark Modern Footer with Columns and Badges (adapté vendeur si isSeller) */}
      <Footer
        isSeller={isSeller}
        onSelectCategory={(category) => {
          setSelectedCategory(category);
          handleExploreCatalog();
        }}
      />

      {/* Outils & Modaux strictement réservés aux Acheteurs / Clients */}
      {!isSeller && (
        <>
          {/* Interactive AI Floating Widget (Llama 3.3 70B) */}
          <AiAssistantWidget
            onAddToCart={handleAddToCart}
            cartArticleIds={cartArticleIds}
          />

          {/* AI Vision Search Modal (MobileNetV2) */}
          <VisionSearchModal
            isOpen={isVisionSearchOpen}
            onClose={() => setIsVisionSearchOpen(false)}
            onAddToCart={handleAddToCart}
            cartArticleIds={cartArticleIds}
          />

          {/* Cart & Checkout Slide-Over Drawer */}
          <CartDrawer
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            items={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveFromCart}
            onClearCart={handleClearCart}
            user={user}
            onOpenAccount={() => setIsAccountDrawerOpen(true)}
            onTrackOrder={(id) => {
              setIsCartOpen(false);
              setTrackingOrderId(id);
            }}
          />

          {/* Article Detail Modal */}
          <ArticleDetailModal
            article={selectedArticle}
            onClose={() => setSelectedArticle(null)}
            onSetCartQuantity={handleSetCartQuantity}
            onRemoveFromCart={handleRemoveFromCart}
            cartQuantity={
              selectedArticle
                ? cartItems.find((i) => i.article.id === selectedArticle.id)?.quantity || 0
                : 0
            }
          />

          {/* Interactive Map Modal (Leaflet / OpenStreetMap Abidjan) */}
          <InteractiveMapModal
            isOpen={isMapModalOpen}
            onClose={() => {
              setIsMapModalOpen(false);
              setActiveNav('home');
            }}
            onSelectShopFilter={(shopName) => {
              setSearchQuery(shopName);
              handleExploreCatalog();
            }}
            articles={articles}
          />
        </>
      )}

      {/* Account & Authentication Slide-Over Drawer */}
      <AccountDrawer
        isOpen={isAccountDrawerOpen}
        onClose={() => setIsAccountDrawerOpen(false)}
        user={user}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
        onOpenMerchantView={() => {}}
        onTrackOrder={(id) => {
          setIsAccountDrawerOpen(false);
          setTrackingOrderId(id);
        }}
      />

      {/* Real-time Order Tracking Modal with Instant Cancellation */}
      <OrderTrackingModal
        isOpen={trackingOrderId !== null}
        onClose={() => setTrackingOrderId(null)}
        orderId={trackingOrderId}
      />

      {/* Notifications Slide-Over Drawer (Côté Client & Côté Vendeur) */}
      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        user={user}
        onNavigateToOrders={() => {
          setIsNotificationsOpen(false);
          const el = document.getElementById('inventory-table');
          el?.scrollIntoView({ behavior: 'smooth' });
        }}
        onOpenAccount={() => {
          setIsNotificationsOpen(false);
          setIsAccountDrawerOpen(true);
        }}
      />
    </div>
  );
}

export default App;
