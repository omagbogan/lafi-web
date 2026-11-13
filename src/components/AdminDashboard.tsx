import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  Plus,
  Trash2,
  Package,
  ShoppingBag,
  Store,
  Users,
  Sparkles,
  CheckCircle2,
  XCircle,
  Upload,
  Loader2,
  Eye,
  LogOut,
  AlertTriangle,
  Cpu,
  TrendingUp,
  Key
} from 'lucide-react';
import type { AdminOverview, User as UserType } from '../types';
import {
  API_BASE,
  fetchAdminOverview,
  adminCreateArticle,
  adminDeleteArticle,
  adminCreateShop,
  adminDeleteShop,
  adminUpdateOrderStatus,
  adminDeleteOrder,
  adminDeleteCustomer,
  adminSeedDemo,
  adminResetAll,
  suggestCategoryFromText,
  suggestCategoryFromImage,
  generateProductDescription,
  resolveImageUrl
} from '../services/api';

const CATEGORIES = ['Alimentation', 'Mode', 'Beauté', 'Électronique', 'Maison', 'Bébé'] as const;

interface AdminDashboardProps {
  user: UserType;
  onExitAdminView: () => void;
  onLogout: () => void;
  onRefreshCatalogue: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  onExitAdminView,
  onLogout,
  onRefreshCatalogue,
}) => {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'articles' | 'orders' | 'shops' | 'customers'>('articles');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Formulaire d'ajout d'article de test
  const [artName, setArtName] = useState('');
  const [artPrice, setArtPrice] = useState('');
  const [artCategory, setArtCategory] = useState<string>('Alimentation');
  const [artDescription, setArtDescription] = useState('');
  const [artPhotoUrl, setArtPhotoUrl] = useState('');
  const [artShopName, setArtShopName] = useState('Boutique Officielle Lafi');
  const [artShopPhone, setArtShopPhone] = useState('0700000001');
  const [artShopAddress, setArtShopAddress] = useState('Cocody, Abidjan');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // Formulaire d'ajout de boutique
  const [newShopName, setNewShopName] = useState('');
  const [newShopOwner, setNewShopOwner] = useState('');
  const [newShopPhone, setNewShopPhone] = useState('');
  const [newShopAddress, setNewShopAddress] = useState('Abidjan');

  const showMessage = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchAdminOverview();
      setOverview(data);
      setLastUpdated(new Date().toLocaleTimeString('fr-FR'));
    } catch {
      if (!silent) showMessage('error', 'Impossible de joindre le serveur API.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Temps réel : actualisation automatique toutes les 3 secondes
  useEffect(() => {
    loadData(false);
    const interval = setInterval(() => {
      loadData(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Téléversement d'une photo + classification IA automatique
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/uploads`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Erreur téléversement image');
      const uploaded = await res.json();
      const url = uploaded.enhanced_url || uploaded.url;
      setArtPhotoUrl(url);

      // Classification visuelle MobileNetV2
      try {
        const visionRes = await suggestCategoryFromImage(file);
        if (visionRes?.category && CATEGORIES.includes(visionRes.category)) {
          setArtCategory(visionRes.category);
          showMessage('success', `Photo téléversée · Catégorie IA détectée : ${visionRes.category}`);
        } else {
          showMessage('success', 'Photo téléversée avec succès.');
        }
      } catch {
        showMessage('success', 'Photo téléversée avec succès.');
      }
    } catch {
      showMessage('error', "Échec de l'envoi de la photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Suggestion IA de catégorie + génération de description
  const handleAiAssist = async () => {
    if (!artName.trim()) {
      showMessage('error', "Saisissez d'abord le nom de l'article.");
      return;
    }
    setAiLoading(true);
    try {
      let detectedCat = artCategory;
      const catRes = await suggestCategoryFromText(artName.trim());
      if (catRes?.category && CATEGORIES.includes(catRes.category)) {
        detectedCat = catRes.category;
        setArtCategory(detectedCat);
      }
      const desc = await generateProductDescription(
        artName.trim(),
        detectedCat,
        Number(artPrice) || undefined
      );
      setArtDescription(desc);
      showMessage('success', `IA : Catégorie « ${detectedCat} » et description générées.`);
    } catch {
      showMessage('error', "Erreur lors de l'assistance IA.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artName.trim() || !artPrice || Number(artPrice) <= 0) {
      showMessage('error', 'Veuillez renseigner un nom et un prix valide en FCFA.');
      return;
    }
    setActionLoading(true);
    try {
      await adminCreateArticle({
        name: artName.trim(),
        price: Number(artPrice),
        category: artCategory,
        description: artDescription.trim() || undefined,
        photo_url: artPhotoUrl.trim() || undefined,
        shop_name: artShopName.trim() || 'Boutique Officielle Lafi',
        shop_phone: artShopPhone.trim() || '0700000001',
        shop_address: artShopAddress.trim() || 'Cocody, Abidjan',
      });
      setArtName('');
      setArtPrice('');
      setArtDescription('');
      setArtPhotoUrl('');
      await loadData(true);
      onRefreshCatalogue();
      showMessage('success', 'Article ajouté et publié en direct sur la plateforme !');
    } catch (err: any) {
      showMessage('error', err.message || "Erreur lors de l'ajout de l'article.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSeedDemo = async () => {
    setActionLoading(true);
    try {
      const res = await adminSeedDemo();
      await loadData(true);
      onRefreshCatalogue();
      showMessage('success', `${res.added_articles} articles de test ont été injectés dans les 6 catégories !`);
    } catch (err: any) {
      showMessage('error', err.message || "Erreur lors de l'injection des articles de test.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetAll = async () => {
    setActionLoading(true);
    try {
      await adminResetAll();
      setConfirmReset(false);
      await loadData(true);
      onRefreshCatalogue();
      showMessage('success', 'Toutes les données ont été effacées. La base est 100 % vierge.');
    } catch (err: any) {
      showMessage('error', err.message || 'Erreur lors de la purge.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim() || !newShopPhone.trim()) {
      showMessage('error', 'Nom de boutique et téléphone obligatoires.');
      return;
    }
    setActionLoading(true);
    try {
      await adminCreateShop({
        name: newShopName.trim(),
        owner_name: newShopOwner.trim() || 'Administrateur',
        phone: newShopPhone.trim(),
        address: newShopAddress.trim() || 'Abidjan',
      });
      setNewShopName('');
      setNewShopOwner('');
      setNewShopPhone('');
      await loadData(true);
      onRefreshCatalogue();
      showMessage('success', 'Boutique créée avec succès.');
    } catch (err: any) {
      showMessage('error', err.message || 'Erreur création boutique.');
    } finally {
      setActionLoading(false);
    }
  };

  const stats = overview?.stats;
  const aiStatus = overview?.ai_status;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Barre supérieure Super-Administrateur */}
      <div className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg sm:text-xl font-black tracking-tight">
                  Centre de Contrôle Super-Admin
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  TEMPS RÉEL ({lastUpdated || 'synchro...'})
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Connecté en tant que <span className="text-slate-200 font-semibold">{user.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => loadData(false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
              title="Rafraîchir maintenant"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
            <button
              onClick={onExitAdminView}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm"
            >
              <Eye className="w-4 h-4" />
              Voir la vitrine client
            </button>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Notification flottante */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between text-sm font-bold shadow-sm ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <span>{feedback.text}</span>
            <button onClick={() => setFeedback(null)} className="text-xs underline ml-4">
              Fermer
            </button>
          </div>
        )}

        {/* 4 Cartes KPI Temps Réel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Chiffre d&apos;Affaires Validé
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {(stats?.total_revenue ?? 0).toLocaleString('fr-FR')} FCFA
            </div>
            <p className="text-xs text-slate-500 mt-1">
              En attente : <span className="font-bold text-amber-600">{(stats?.pending_revenue ?? 0).toLocaleString('fr-FR')} FCFA</span>
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Commandes en Direct
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {stats?.orders_total ?? 0} commandes
            </div>
            <p className="text-xs text-slate-500 mt-1">
              <span className="text-amber-600 font-bold">{stats?.orders_pending ?? 0} en attente</span> ·{' '}
              <span className="text-emerald-600 font-bold">{(stats?.orders_accepted ?? 0) + (stats?.orders_completed ?? 0)} validées</span>
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Catalogue & Boutiques
              </span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {stats?.articles_total ?? 0} articles
            </div>
            <p className="text-xs text-slate-500 mt-1">
              <span className="font-bold text-slate-700">{stats?.shops_total ?? 0} boutiques</span> ·{' '}
              <span className="font-bold text-slate-700">{stats?.customers_total ?? 0} clients inscrits</span>
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Moteurs IA (5 Blocs)
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
            </div>
            <div className="space-y-1.5 mt-2 text-xs font-bold">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Scikit-Learn TF-IDF :</span>
                <span className={aiStatus?.category_model_ready ? 'text-emerald-600' : 'text-amber-600'}>
                  {aiStatus?.category_model_ready ? '● Actif' : '○ Chargement'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">PyTorch MobileNetV2 :</span>
                <span className={aiStatus?.vision_model_ready ? 'text-emerald-600' : 'text-amber-600'}>
                  {aiStatus?.vision_model_ready ? '● Actif' : '○ Chargement'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Agent LLM (Groq) :</span>
                <span className={aiStatus?.llm_agent_ready ? 'text-emerald-600' : 'text-amber-600'}>
                  {aiStatus?.llm_agent_ready ? '● Connecté' : '○ Clé requise'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Barre d'outils rapides pour les données de test */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-black text-slate-900">
              Outils de Simulation & Données de Test
            </h2>
            <p className="text-xs text-slate-500">
              Injectez un catalogue complet de démonstration en 1 clic ou videz la base à tout moment.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleSeedDemo}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-extrabold transition disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              Injecter 6 articles de test (6 catégories)
            </button>

            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-extrabold transition disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Vider toute la base de données
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span className="text-xs font-bold text-rose-800">Confirmer la suppression totale ?</span>
                <button
                  onClick={handleResetAll}
                  disabled={actionLoading}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
                >
                  Oui, tout effacer
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="px-2 py-1 rounded-lg bg-white text-slate-600 text-xs font-bold border border-slate-200"
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation par onglets */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveTab('articles')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition ${
              activeTab === 'articles'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Package className="w-4 h-4" />
            Articles & Ajout de Test ({overview?.articles.length ?? 0})
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition ${
              activeTab === 'orders'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Commandes Temps Réel ({overview?.orders.length ?? 0})
          </button>

          <button
            onClick={() => setActiveTab('shops')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition ${
              activeTab === 'shops'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Store className="w-4 h-4" />
            Boutiques ({overview?.shops.length ?? 0})
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition ${
              activeTab === 'customers'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Clients Inscrits ({overview?.customers.length ?? 0})
          </button>
        </div>

        {/* ONGLET 1 : ARTICLES & AJOUT D'ARTICLES DE TEST */}
        {activeTab === 'articles' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Formulaire d'ajout d'article */}
            <div className="lg:col-span-5">
              <form
                onSubmit={handleCreateArticle}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4 sticky top-24"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-blue-600" />
                    Ajouter un article de test
                  </h3>
                  <button
                    type="button"
                    onClick={handleAiAssist}
                    disabled={aiLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition"
                  >
                    {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Remplissage IA
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nom de l&apos;article *
                  </label>
                  <input
                    type="text"
                    required
                    value={artName}
                    onChange={(e) => setArtName(e.target.value)}
                    placeholder="Ex: Attiéké Poisson Braisé, Sac en cuir..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Prix (FCFA) *
                    </label>
                    <input
                      type="number"
                      required
                      min={100}
                      value={artPrice}
                      onChange={(e) => setArtPrice(e.target.value)}
                      placeholder="Ex: 5000"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Catégorie (6 officielles)
                    </label>
                    <select
                      value={artCategory}
                      onChange={(e) => setArtCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Photo (téléversement fichier ou URL) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Photo du produit (Fichier ou URL)
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition shrink-0">
                      {uploadingPhoto ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      Choisir une photo
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                    <input
                      type="text"
                      value={artPhotoUrl}
                      onChange={(e) => setArtPhotoUrl(e.target.value)}
                      placeholder="Ou coller une URL https://..."
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Boutique associée */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Boutique associée</span>
                    {overview && overview.shops.length > 0 && (
                      <select
                        onChange={(e) => {
                          const found = overview.shops.find((s) => s.name === e.target.value);
                          if (found) {
                            setArtShopName(found.name);
                            setArtShopPhone(found.phone);
                            setArtShopAddress(found.address || 'Abidjan');
                          }
                        }}
                        value={artShopName}
                        className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1"
                      >
                        {overview.shops.map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <input
                    type="text"
                    value={artShopName}
                    onChange={(e) => setArtShopName(e.target.value)}
                    placeholder="Nom de la boutique (créée automatiquement si nouvelle)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={artShopPhone}
                      onChange={(e) => setArtShopPhone(e.target.value)}
                      placeholder="Téléphone boutique"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                    />
                    <input
                      type="text"
                      value={artShopAddress}
                      onChange={(e) => setArtShopAddress(e.target.value)}
                      placeholder="Quartier (ex: Cocody)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Description (optionnelle)
                  </label>
                  <textarea
                    rows={2}
                    value={artDescription}
                    onChange={(e) => setArtDescription(e.target.value)}
                    placeholder="Description du produit..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  Publier l&apos;article maintenant
                </button>
              </form>
            </div>

            {/* Liste des articles en ligne */}
            <div className="lg:col-span-7 space-y-3">
              {overview?.articles.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 border border-slate-200/80 text-center space-y-3">
                  <Package className="w-12 h-12 text-slate-300 mx-auto" />
                  <h3 className="text-base font-black text-slate-800">
                    Aucun article dans la base de données
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Utilisez le formulaire ci-contre pour ajouter votre premier article ou cliquez sur « Injecter 6 articles de test » en haut.
                  </p>
                </div>
              ) : (
                overview?.articles.map((art) => (
                  <div
                    key={art.id}
                    className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={resolveImageUrl(art.photo_url)}
                        alt={art.name}
                        className="w-16 h-16 rounded-xl object-cover bg-slate-100 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold">
                            {art.category}
                          </span>
                          <span className="text-xs text-slate-400 font-semibold truncate">
                            Boutique : {art.shop}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-slate-900 truncate mt-0.5">
                          {art.name}
                        </h4>
                        <p className="text-sm font-extrabold text-blue-600">
                          {art.price.toLocaleString('fr-FR')} FCFA
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        await adminDeleteArticle(art.id);
                        await loadData(true);
                        onRefreshCatalogue();
                        showMessage('success', `Article « ${art.name} » supprimé.`);
                      }}
                      className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition shrink-0"
                      title="Supprimer cet article"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ONGLET 2 : COMMANDES EN TEMPS RÉEL */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {overview?.orders.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 border border-slate-200/80 text-center space-y-2">
                <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-black text-slate-800">Aucune commande pour le moment</h3>
                <p className="text-xs text-slate-500">
                  Dès qu&apos;un client passe commande sur le Web ou sur l&apos;APK mobile, elle apparaît ici en moins de 3 secondes.
                </p>
              </div>
            ) : (
              overview?.orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-sm font-black text-slate-900">
                        Commande #{order.id}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                        Boutique : {order.shop}
                      </span>
                      {order.pickup_code && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-200">
                          <Key className="w-3 h-3" /> Code retrait : {order.pickup_code}
                        </span>
                      )}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          order.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : order.status === 'accepted'
                            ? 'bg-blue-100 text-blue-800'
                            : order.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {order.status === 'pending'
                          ? 'En attente'
                          : order.status === 'accepted'
                          ? 'Acceptée'
                          : order.status === 'completed'
                          ? 'Retirée / Livrée'
                          : 'Annulée / Refusée'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600">
                      Client : <span className="font-bold">{order.customer_name || 'Client'}</span> ({order.customer_phone || 'N/A'}) · Quartier : {order.customer_address || 'Abidjan'}
                    </p>

                    <div className="text-xs text-slate-500">
                      Articles :{' '}
                      {order.items?.map((it, idx) => (
                        <span key={idx} className="font-semibold text-slate-700 mr-2">
                          {it.qty || it.quantity}x {it.name} ({(it.price || 0).toLocaleString('fr-FR')} FCFA)
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right mr-3">
                      <div className="text-base font-black text-blue-600">
                        {(order.total || 0).toLocaleString('fr-FR')} FCFA
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {order.mode === 'yango' ? 'Livraison Yango' : 'Retrait en boutique'}
                      </div>
                    </div>

                    {order.status === 'pending' && (
                      <button
                        onClick={async () => {
                          await adminUpdateOrderStatus(order.id, 'accepted');
                          await loadData(true);
                          showMessage('success', `Commande #${order.id} acceptée.`);
                        }}
                        className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Accepter
                      </button>
                    )}

                    {order.status === 'accepted' && (
                      <button
                        onClick={async () => {
                          await adminUpdateOrderStatus(order.id, 'completed');
                          await loadData(true);
                          showMessage('success', `Commande #${order.id} marquée comme livrée/retirée.`);
                        }}
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Terminer
                      </button>
                    )}

                    {order.status === 'pending' && (
                      <button
                        onClick={async () => {
                          await adminUpdateOrderStatus(order.id, 'cancelled');
                          await loadData(true);
                          showMessage('success', `Commande #${order.id} annulée.`);
                        }}
                        className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold inline-flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Annuler
                      </button>
                    )}

                    <button
                      onClick={async () => {
                        await adminDeleteOrder(order.id);
                        await loadData(true);
                        showMessage('success', `Commande #${order.id} supprimée.`);
                      }}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600"
                      title="Supprimer la commande"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ONGLET 3 : BOUTIQUES COMMERÇANTES */}
        {activeTab === 'shops' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4">
              <form
                onSubmit={handleCreateShop}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4"
              >
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Store className="w-5 h-5 text-blue-600" />
                  Créer une boutique
                </h3>
                <input
                  type="text"
                  required
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  placeholder="Nom de la boutique *"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
                <input
                  type="text"
                  value={newShopOwner}
                  onChange={(e) => setNewShopOwner(e.target.value)}
                  placeholder="Nom du gérant"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
                <input
                  type="text"
                  required
                  value={newShopPhone}
                  onChange={(e) => setNewShopPhone(e.target.value)}
                  placeholder="Téléphone (ex: 0701020304) *"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
                <input
                  type="text"
                  value={newShopAddress}
                  onChange={(e) => setNewShopAddress(e.target.value)}
                  placeholder="Quartier / Adresse à Abidjan"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm"
                >
                  Ajouter la boutique
                </button>
              </form>
            </div>

            <div className="lg:col-span-8 space-y-3">
              {overview?.shops.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 border border-slate-200/80 text-center text-sm text-slate-500">
                  Aucune boutique enregistrée.
                </div>
              ) : (
                overview?.shops.map((shop) => (
                  <div
                    key={shop.id}
                    className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900">{shop.name}</h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            shop.is_open ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {shop.is_open ? 'Ouverte' : 'Fermée'}
                        </span>
                        <span className="text-xs font-bold text-blue-600">
                          {shop.articles_count} article(s)
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Gérant : {shop.owner_name || 'N/A'} · Tél : {shop.phone} · {shop.address || 'Abidjan'}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        await adminDeleteShop(shop.id);
                        await loadData(true);
                        onRefreshCatalogue();
                        showMessage('success', `Boutique « ${shop.name} » supprimée.`);
                      }}
                      className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600"
                      title="Supprimer cette boutique et ses articles"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ONGLET 4 : CLIENTS INSCRITS */}
        {activeTab === 'customers' && (
          <div className="space-y-3">
            {overview?.customers.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 border border-slate-200/80 text-center space-y-2">
                <Users className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-black text-slate-800">Aucun client inscrit</h3>
                <p className="text-xs text-slate-500">
                  Les comptes clients créés sur le Web ou sur l&apos;APK mobile s&apos;afficheront ici en temps réel.
                </p>
              </div>
            ) : (
              overview?.customers.map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-slate-900">{c.name}</h4>
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold">
                        {c.orders_count} commande(s)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Email : {c.email || 'Non renseigné'} · Tél : {c.phone} · Adresse : {c.address}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      await adminDeleteCustomer(c.id);
                      await loadData(true);
                      showMessage('success', `Client « ${c.name} » supprimé.`);
                    }}
                    className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600"
                    title="Supprimer ce client"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

