import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Plus, 
  Sparkles, 
  Upload, 
  Check, 
  AlertCircle, 
  Loader2,
  LogOut,
  Phone,
  MapPin,
  Copy,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  PackageX,
  PackageCheck,
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Key,
  ShieldCheck,
  RefreshCw,
  X,
  Navigation,
  Settings
} from 'lucide-react';
import type { Article, User as UserType, CustomerOrder } from '../types';
import { 
  API_BASE, 
  suggestCategoryFromImage, 
  suggestCategoryFromText,
  generateProductDescription, 
  resolveImageUrl,
  fetchShopOrders,
  fetchShopArticles,
  updateShopInfo,
  updateArticleItem,
  deleteArticleItem,
  updateOrderStatus,
  validatePickupCode,
  handoverYangoPackage
} from '../services/api';

interface MerchantDashboardProps {
  articles: Article[];
  onRefreshArticles: () => void;
  user?: UserType | null;
  onLogout?: () => void;
  searchFilter?: string;
  onExitMerchantView?: () => void;
}

export const MerchantDashboard: React.FC<MerchantDashboardProps> = ({
  onRefreshArticles,
  user,
  onLogout,
  searchFilter = '',
}) => {
  const shopId = user?.shop_id || 1;

  // Active Main Tab: 'inventory' | 'orders' | 'settings'
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'settings'>('inventory');

  // Shop Open / Closed State
  const [isOpen, setIsOpen] = useState(user?.is_open ?? true);
  const [updatingShopStatus, setUpdatingShopStatus] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Shop Local Articles (including hidden & out of stock)
  const [shopArticles, setShopArticles] = useState<Article[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);

  // Orders State
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'accepted' | 'completed'>('all');
  const [pickupCodeInput, setPickupCodeInput] = useState<{ [orderId: number]: string }>({});
  const [validatingPickup, setValidatingPickup] = useState<{ [orderId: number]: boolean }>({});

  // Add Article Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Alimentation');
  const [description, setDescription] = useState('');
  const [negotiable, setNegotiable] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);

  // AI Multimodal Classification States
  const [imageCategory, setImageCategory] = useState<string | null>(null);
  const [textCategory, setTextCategory] = useState<string | null>(null);
  const [suggestingCategory, setSuggestingCategory] = useState(false);
  const [analyzingText, setAnalyzingText] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dismissClosedAlert, setDismissClosedAlert] = useState(false);

  // Fermeture automatique des notifications pop-up après 4.5 secondes
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      setMessage(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [message]);

  // Si la boutique est réouverte, réinitialiser la fermeture de l'alerte
  useEffect(() => {
    if (isOpen) {
      setDismissClosedAlert(false);
    }
  }, [isOpen]);

  // Edit Article Modal State
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editNegotiable, setEditNegotiable] = useState(false);
  const [savingEditArticle, setSavingEditArticle] = useState(false);

  // Shop Settings State
  const [shopName, setShopName] = useState(user?.shop_name || 'Boutique');
  const [ownerName, setOwnerName] = useState(user?.name || 'Gérant');
  const [shopPhone, setShopPhone] = useState(user?.phone || '');
  const [shopAddress, setShopAddress] = useState(user?.address || '');
  const [savingSettings, setSavingSettings] = useState(false);
  const [detectingLoc, setDetectingLoc] = useState(false);

  // Load shop articles from API
  const loadShopArticles = async () => {
    setLoadingArticles(true);
    try {
      const data = await fetchShopArticles(shopId);
      setShopArticles(data || []);
    } catch {
      setShopArticles([]);
    } finally {
      setLoadingArticles(false);
    }
  };

  // Load shop orders from API
  const loadShopOrders = async () => {
    setLoadingOrders(true);
    try {
      const data = await fetchShopOrders(shopId);
      setOrders(data);
    } catch {
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadShopArticles();
    loadShopOrders();
  }, [shopId]);

  // Initialisation au montage du composant
  useEffect(() => {
    loadShopArticles();
  }, [shopId]);

  // Auto-detect NLP category when typing article title
  useEffect(() => {
    if (title.trim().length < 3) {
      setTextCategory(null);
      return;
    }
    setAnalyzingText(true);
    const timer = setTimeout(async () => {
      try {
        const res = await suggestCategoryFromText(title.trim());
        if (res && res.category) {
          setTextCategory(res.category);
          // Si l'utilisateur n'a pas encore choisi manuellement, appliquer
          if (!imageCategory) {
            setCategory(res.category);
          }
        }
      } catch {
        // ignore
      } finally {
        setAnalyzingText(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [title]);

  // Photos Selection (Multiples) & MobileNetV2 Vision Classification sur la 1ère photo
  const handlePhotosSelect = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const remainingSlots = 5 - photoFiles.length;
    if (remainingSlots <= 0) {
      setMessage({ type: 'error', text: 'Limite atteinte : 5 photos maximum par article.' });
      return;
    }

    const toAdd = fileArray.slice(0, remainingSlots);
    const newPreviews = toAdd.map((f) => URL.createObjectURL(f));

    const wasEmpty = photoFiles.length === 0;
    const updatedFiles = [...photoFiles, ...toAdd];
    const updatedPreviews = [...photoPreviews, ...newPreviews];

    setPhotoFiles(updatedFiles);
    setPhotoPreviews(updatedPreviews);

    // Détection automatique de la catégorie par MobileNetV2 sur la première photo
    if (wasEmpty && toAdd.length > 0) {
      const firstFile = toAdd[0];
      setSuggestingCategory(true);
      try {
        const result = await suggestCategoryFromImage(firstFile);
        if (result && result.category) {
          setImageCategory(result.category);
          setCategory(result.category);
          setMessage({
            type: 'success',
            text: `IA Vision MobileNetV2 : Catégorie "${result.category}" auto-détectée (${result.classe_image || 'Reconnaissance d\'image'}).`,
          });
        }
      } catch {
        // ignore
      } finally {
        setSuggestingCategory(false);
      }
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    const updatedFiles = photoFiles.filter((_, i) => i !== indexToRemove);
    const updatedPreviews = photoPreviews.filter((_, i) => i !== indexToRemove);
    setPhotoFiles(updatedFiles);
    setPhotoPreviews(updatedPreviews);

    if (selectedPhotoIndex >= updatedFiles.length) {
      setSelectedPhotoIndex(Math.max(0, updatedFiles.length - 1));
    }
    if (updatedFiles.length === 0) {
      setImageCategory(null);
    }
  };

  const handleSetMainPhoto = (index: number) => {
    if (index === 0 || index >= photoFiles.length) return;
    const file = photoFiles[index];
    const preview = photoPreviews[index];

    const newFiles = [file, ...photoFiles.filter((_, i) => i !== index)];
    const newPreviews = [preview, ...photoPreviews.filter((_, i) => i !== index)];

    setPhotoFiles(newFiles);
    setPhotoPreviews(newPreviews);
    setSelectedPhotoIndex(0);
  };

  // Generate Commercial Description with LLM Llama 3.3
  const handleGenerateDescription = async () => {
    if (!title.trim()) {
      setMessage({ type: 'error', text: "Veuillez d'abord saisir le nom de l'article." });
      return;
    }
    setGeneratingDesc(true);
    try {
      const desc = await generateProductDescription(title, category, parseInt(price) || undefined);
      setDescription(desc);
      setMessage({ type: 'success', text: "Description commerciale générée par l'IA Llama 3.3 !" });
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de la génération de description.' });
    } finally {
      setGeneratingDesc(false);
    }
  };

  // Create Article Submission
  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !price) {
      setMessage({ type: 'error', text: 'Titre et prix obligatoires.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      let uploadedPhotoUrls: string[] = [];

      // 1. Upload de toutes les photos
      if (photoFiles.length > 0) {
        for (const file of photoFiles) {
          const formData = new FormData();
          formData.append('file', file);
          const uploadRes = await fetch(`${API_BASE}/uploads`, {
            method: 'POST',
            body: formData,
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            uploadedPhotoUrls.push(uploadData.url);
          }
        }
      }

      // 2. Création de l'article via l'API (avec liste photos_json et photo_url principale)
      const articlePayload = {
        name: title.trim(),
        price: parseInt(price),
        category,
        description: description.trim() || null,
        negotiable,
        photo_url: uploadedPhotoUrls[0] || null,
        photos: uploadedPhotoUrls,
      };

      const res = await fetch(`${API_BASE}/articles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shop-Id': String(shopId),
        },
        body: JSON.stringify(articlePayload),
      });

      if (!res.ok) {
        throw new Error("Erreur lors de l'enregistrement de l'article");
      }

      setMessage({ type: 'success', text: 'Article publié avec succès dans votre boutique !' });
      setTitle('');
      setPrice('');
      setDescription('');
      setPhotoFiles([]);
      setPhotoPreviews([]);
      setSelectedPhotoIndex(0);
      setImageCategory(null);
      setTextCategory(null);
      setShowAddForm(false);
      loadShopArticles();
      onRefreshArticles();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erreur lors de la publication' });
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Shop Open / Closed Status
  const handleToggleShopStatus = async () => {
    setUpdatingShopStatus(true);
    const newStatus = !isOpen;
    try {
      await updateShopInfo(shopId, { is_open: newStatus });
      setIsOpen(newStatus);
      setMessage({
        type: 'success',
        text: newStatus
          ? 'Boutique ouverte ! Vos articles sont désormais visibles par les clients.'
          : 'Boutique fermée. Vos articles sont temporairement masqués aux clients.',
      });
      onRefreshArticles();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erreur changement statut boutique' });
    } finally {
      setUpdatingShopStatus(false);
    }
  };

  // Copy Shop Direct Link
  const handleCopyShopLink = () => {
    const slug = (user?.shop_name || 'maboutique').toLowerCase().replace(/[^a-z0-9]/g, '');
    const url = `https://lafi.ci/shop/${slug}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Quick Article Status Toggles
  const handleToggleHidden = async (article: Article) => {
    const newHidden = !article.hidden;
    try {
      await updateArticleItem(article.id, { hidden: newHidden }, shopId);
      setShopArticles((prev) =>
        prev.map((a) => (a.id === article.id ? { ...a, hidden: newHidden } : a))
      );
      onRefreshArticles();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || "Erreur mise à jour de l'article" });
    }
  };

  const handleToggleOutOfStock = async (article: Article) => {
    const newStock = !article.out_of_stock;
    try {
      await updateArticleItem(article.id, { out_of_stock: newStock }, shopId);
      setShopArticles((prev) =>
        prev.map((a) => (a.id === article.id ? { ...a, out_of_stock: newStock } : a))
      );
      onRefreshArticles();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || "Erreur mise à jour de l'article" });
    }
  };

  const handleDeleteArticle = async (article: Article) => {
    if (!window.confirm(`Confirmez-vous la suppression définitive de "${article.name}" ?`)) {
      return;
    }
    try {
      await deleteArticleItem(article.id, shopId);
      setShopArticles((prev) => prev.filter((a) => a.id !== article.id));
      onRefreshArticles();
      setMessage({ type: 'success', text: `Article "${article.name}" supprimé.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || "Erreur suppression de l'article" });
    }
  };

  // Edit Article Modal Open
  const handleOpenEditArticle = (art: Article) => {
    setEditingArticle(art);
    setEditName(art.name);
    setEditPrice(String(art.price));
    setEditCategory(art.category);
    setEditNegotiable(Boolean(art.negotiable));
  };

  const handleSaveEditArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle) return;
    setSavingEditArticle(true);
    try {
      const updated = await updateArticleItem(
        editingArticle.id,
        {
          name: editName.trim(),
          price: parseInt(editPrice),
          category: editCategory,
          negotiable: editNegotiable,
        },
        shopId
      );
      setShopArticles((prev) =>
        prev.map((a) => (a.id === editingArticle.id ? { ...a, ...updated } : a))
      );
      setEditingArticle(null);
      setMessage({ type: 'success', text: 'Article mis à jour avec succès.' });
      onRefreshArticles();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || "Erreur enregistrement de l'article" });
    } finally {
      setSavingEditArticle(false);
    }
  };

  // Save Shop Settings
  const handleSaveShopSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await updateShopInfo(shopId, {
        name: shopName.trim(),
        owner_name: ownerName.trim(),
        phone: shopPhone.trim(),
        address: shopAddress.trim(),
      });
      setMessage({ type: 'success', text: 'Paramètres de la boutique enregistrés !' });
      onRefreshArticles();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erreur mise à jour boutique' });
    } finally {
      setSavingSettings(false);
    }
  };

  // GPS Location Detection for Shop Address
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setMessage({ type: 'error', text: "La géolocalisation n'est pas supportée par votre navigateur." });
      return;
    }
    setDetectingLoc(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`
          );
          if (res.ok) {
            const data = await res.json();
            const addr =
              data.address.suburb ||
              data.address.neighbourhood ||
              data.address.city_district ||
              data.address.city ||
              'Abidjan';
            setShopAddress(`${addr}, Abidjan`);
          }
        } catch {
          setShopAddress(`Abidjan (GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        } finally {
          setDetectingLoc(false);
        }
      },
      () => {
        setDetectingLoc(false);
        setMessage({ type: 'error', text: 'Impossible de récupérer la position GPS.' });
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Order Management Actions
  const handleAcceptOrder = async (orderId: number) => {
    try {
      await updateOrderStatus(orderId, 'accepted', shopId);
      loadShopOrders();
      setMessage({ type: 'success', text: `Commande #${orderId} acceptée.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erreur acceptation commande' });
    }
  };

  const handleRefuseOrder = async (orderId: number) => {
    if (!window.confirm(`Voulez-vous vraiment refuser la commande #${orderId} ?`)) return;
    try {
      await updateOrderStatus(orderId, 'refused', shopId);
      loadShopOrders();
      setMessage({ type: 'error', text: `Commande #${orderId} refusée.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erreur refus commande' });
    }
  };

  const handleValidatePickup = async (orderId: number) => {
    const code = pickupCodeInput[orderId];
    if (!code || code.trim().length !== 4) {
      setMessage({ type: 'error', text: 'Veuillez saisir le code de retrait à 4 chiffres fourni par le client.' });
      return;
    }
    setValidatingPickup((prev) => ({ ...prev, [orderId]: true }));
    try {
      await validatePickupCode(orderId, code.trim(), shopId);
      loadShopOrders();
      setPickupCodeInput((prev) => ({ ...prev, [orderId]: '' }));
      setMessage({ type: 'success', text: `Retrait validé avec succès pour la commande #${orderId} !` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Code de retrait incorrect.' });
    } finally {
      setValidatingPickup((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleHandoverPackage = async (orderId: number) => {
    try {
      await handoverYangoPackage(orderId, shopId);
      loadShopOrders();
      setMessage({ type: 'success', text: `Colis de la commande #${orderId} remis au livreur Yango.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erreur remise du colis' });
    }
  };

  const handleCompleteOrder = async (orderId: number) => {
    try {
      await updateOrderStatus(orderId, 'completed', shopId);
      loadShopOrders();
      setMessage({ type: 'success', text: `Commande #${orderId} marquée comme terminée.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erreur clôture commande' });
    }
  };

  // Filtered Articles according to searchFilter
  const displayedArticles = shopArticles.filter((art) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return art.name.toLowerCase().includes(q) || art.category.toLowerCase().includes(q);
  });

  // Filtered Orders
  const pendingOrdersCount = orders.filter((o) => o.status === 'pending').length;
  const displayedOrders = orders.filter((o) => {
    if (orderFilter === 'all') return true;
    return o.status === orderFilter;
  });

  // Check Multimodal Agreement between Vision & Text
  const isMultimodalAgreement =
    Boolean(imageCategory && textCategory && imageCategory.toLowerCase() === textCategory.toLowerCase());

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fadeIn select-none">
      
      {/* 2. Barre d'Onglets de Gestion (Style Identique à l'Espace Client) */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 flex-wrap gap-3">
        <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto">
          {/* Onglet Inventaire */}
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold transition relative flex items-center gap-2 border-0 cursor-pointer bg-transparent ${
              activeTab === 'inventory' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Mon Inventaire</span>
            <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {shopArticles.length}
            </span>
            {activeTab === 'inventory' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>

          {/* Onglet Commandes reçues */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('orders');
              loadShopOrders();
            }}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold transition relative flex items-center gap-2 border-0 cursor-pointer bg-transparent ${
              activeTab === 'orders' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Commandes reçues</span>
            {pendingOrdersCount > 0 ? (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white animate-pulse">
                {pendingOrdersCount} en attente
              </span>
            ) : (
              <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {orders.length}
              </span>
            )}
            {activeTab === 'orders' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>

          {/* Onglet Paramètres Boutique */}
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold transition relative flex items-center gap-2 border-0 cursor-pointer bg-transparent ${
              activeTab === 'settings' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Coordonnées & GPS</span>
            {activeTab === 'settings' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
        </div>

        {/* Actions Rapides Droite */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {/* Bouton Toggle Switch : Boutique Ouverte / Fermée */}
          <div className="flex items-center gap-2.5 bg-slate-50 px-3 py-1 rounded-full border border-slate-200/60 shadow-sm">
            <span className={`text-xs font-bold select-none transition-colors ${
              isOpen ? 'text-emerald-700' : 'text-slate-500'
            }`}>
              {isOpen ? 'Ouverte' : 'Fermée'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isOpen}
              onClick={handleToggleShopStatus}
              disabled={updatingShopStatus}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                isOpen ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
              title={isOpen ? "Boutique Ouverte (cliquer pour fermer)" : "Boutique Fermée (cliquer pour ouvrir)"}
            >
              <span className="sr-only">Bascule Boutique Ouverte ou Fermée</span>
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                  isOpen ? 'translate-x-5' : 'translate-x-0'
                }`}
              >
                {updatingShopStatus ? (
                  <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
                ) : (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isOpen ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                  />
                )}
              </span>
            </button>
          </div>

          {/* Bouton d'action Rapide : Ajouter un article */}
          {activeTab === 'inventory' && (
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-xs font-bold shadow-md shadow-blue-500/20 transition border-0 cursor-pointer active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">
                {showAddForm ? 'Fermer le formulaire' : 'Ajouter un article (IA)'}
              </span>
              <span className="sm:hidden">Ajouter</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* ONGLET 1 : MON INVENTAIRE & PUBLICATION RAPIDE AVEC IA */}
      {/* ============================================================== */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          
          {/* Formulaire Dépliable d'Ajout d'Article Assisté par IA */}
          {showAddForm && (
            <form
              onSubmit={handleCreateArticle}
              className="bg-white p-6 sm:p-8 rounded-3xl border-0 shadow-md space-y-6 animate-fadeIn"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Nouvel Article avec Assistance IA Multimodale</h3>
                    <p className="text-xs text-slate-400">MobileNetV2 (Vision) & Llama 3.3 (Rédaction commerciale)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition border-0 bg-transparent cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Colonne Gauche : Photos Multiples (jusqu'à 5) & Classification MobileNetV2 */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <span>Photos du produit</span>
                      <span className="text-[11px] font-normal text-slate-400">
                        ({photoFiles.length}/5)
                      </span>
                    </label>
                    {suggestingCategory && (
                      <span className="text-[11px] text-blue-600 flex items-center gap-1 font-semibold">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Analyse MobileNetV2...
                      </span>
                    )}
                  </div>

                  {photoPreviews.length > 0 ? (
                    <div className="space-y-3">
                      {/* Photo active / affichée en grand */}
                      <div className="relative h-56 sm:h-64 rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center shadow-inner group">
                        <img
                          src={photoPreviews[selectedPhotoIndex] || photoPreviews[0]}
                          alt={`Aperçu ${selectedPhotoIndex + 1}`}
                          className="w-full h-full object-contain"
                        />
                        
                        {/* Badge Photo Principale */}
                        {selectedPhotoIndex === 0 ? (
                          <span className="absolute top-3 left-3 bg-blue-600/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide shadow-sm flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            <span>Photo Principale</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetMainPhoto(selectedPhotoIndex)}
                            className="absolute top-3 left-3 bg-slate-900/80 hover:bg-blue-600 text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm transition border-0 cursor-pointer"
                            title="Définir comme photo principale"
                          >
                            Définir comme principale
                          </button>
                        )}

                        {/* Bouton Supprimer la photo affichée */}
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(selectedPhotoIndex)}
                          className="absolute top-3 right-3 p-1.5 bg-slate-900/80 text-white rounded-full hover:bg-rose-600 transition border-0 cursor-pointer"
                          title="Supprimer cette photo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Galerie des miniatures & Bouton d'ajout */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {photoPreviews.map((preview, idx) => (
                          <div
                            key={preview}
                            className={`relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition cursor-pointer group ${
                              selectedPhotoIndex === idx
                                ? 'border-blue-600 shadow-md ring-2 ring-blue-500/20'
                                : 'border-slate-200 hover:border-slate-400'
                            }`}
                            onClick={() => setSelectedPhotoIndex(idx)}
                          >
                            <img src={preview} alt="" className="w-full h-full object-cover" />
                            {idx === 0 && (
                              <span className="absolute bottom-0 left-0 right-0 bg-blue-600 text-white text-[8px] font-black text-center py-0.5">
                                1ère
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemovePhoto(idx);
                              }}
                              className="absolute top-1 right-1 p-0.5 bg-black/70 hover:bg-rose-600 text-white rounded-full transition opacity-0 group-hover:opacity-100 border-0 cursor-pointer"
                              title="Retirer"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}

                        {/* Bouton pour ajouter d'autres photos si < 5 */}
                        {photoFiles.length < 5 && (
                          <label className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/30 transition flex flex-col items-center justify-center cursor-pointer shrink-0 text-slate-500 hover:text-blue-600">
                            <Plus className="w-4 h-4" />
                            <span className="text-[9px] font-bold mt-0.5">Ajouter</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e) => e.target.files && handlePhotosSelect(e.target.files)}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl h-60 flex flex-col items-center justify-center cursor-pointer bg-slate-50 hover:bg-blue-50/20 transition space-y-2.5">
                      <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm text-slate-400">
                        <Upload className="w-6 h-6 text-blue-600" />
                      </div>
                      <span className="text-xs font-bold text-slate-700">Choisir ou photographier des produits</span>
                      <span className="text-[11px] text-slate-400 text-center px-4 leading-relaxed">
                        Sélectionnez jusqu'à <strong>5 photos</strong> à la fois.
                        <br />
                        L'IA Vision MobileNetV2 analysera la 1ère photo pour déterminer la catégorie.
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => e.target.files && handlePhotosSelect(e.target.files)}
                      />
                    </label>
                  )}

                  {/* Badge d'Accord Multimodal */}
                  {isMultimodalAgreement && (
                    <div className="p-3 bg-emerald-50 text-emerald-800 rounded-2xl text-xs flex items-center gap-2 border-0 shadow-sm animate-fadeIn">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <p className="font-bold">Accord IA Multimodale !</p>
                        <p className="text-[11px] text-emerald-700">
                          La vision par ordinateur et l'analyse du titre confirment la catégorie <strong>« {category} »</strong>.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Colonne Droite : Titre, Prix, Catégorie, Description */}
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700">Nom / Titre du produit *</label>
                      {analyzingText && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Analyse NLP...
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: Sac de Riz Parfumé 25kg"
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl text-xs border-0 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-slate-900 transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Prix (FCFA) *</label>
                      <input
                        type="number"
                        required
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="Ex: 17500"
                        className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl text-xs border-0 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-slate-900 transition"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Catégorie *</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl text-xs border-0 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-slate-900 transition"
                      >
                        {['Alimentation', 'Mode', 'Beauté', 'Électronique', 'Maison', 'Bébé'].map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Description avec Génération IA */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700">Description commerciale</label>
                      <button
                        type="button"
                        onClick={handleGenerateDescription}
                        disabled={generatingDesc}
                        className="text-[11px] text-blue-600 font-bold hover:text-blue-800 flex items-center gap-1 border-0 bg-transparent cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>{generatingDesc ? 'Génération en cours...' : 'Rédiger avec IA'}</span>
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Description du produit ou cliquez sur 'Rédiger avec IA'..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl text-xs border-0 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-slate-900 transition"
                    />
                  </div>

                  {/* Négociable WhatsApp */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="negotiable"
                      checked={negotiable}
                      onChange={(e) => setNegotiable(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="negotiable" className="text-xs text-slate-700 cursor-pointer select-none">
                      Prix négociable (autoriser les offres sur WhatsApp)
                    </label>
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-2xl transition border-0 cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow-md transition flex items-center gap-2 border-0 cursor-pointer"
                    >
                      {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>Publier l'article</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* Tableau de l'Inventaire des Articles */}
          <div id="inventory-table" className="bg-white rounded-3xl border-0 shadow-sm overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Articles en catalogue</h3>
                <p className="text-xs text-slate-400">
                  {displayedArticles.length} article(s) trouvé(s)
                </p>
              </div>
              <button
                type="button"
                onClick={loadShopArticles}
                className="p-2 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 transition border-0 cursor-pointer"
                title="Actualiser l'inventaire"
              >
                <RefreshCw className={`w-4 h-4 ${loadingArticles ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>

            <div className="overflow-x-auto">
              {displayedArticles.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto text-slate-400">
                    <Store className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-slate-700">Aucun article dans l'inventaire</p>
                  <p className="text-slate-400">Cliquez sur « Ajouter un article » pour enrichir votre boutique.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50/80 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="py-3.5 px-5">Produit</th>
                      <th className="py-3.5 px-4">Catégorie</th>
                      <th className="py-3.5 px-4">Prix</th>
                      <th className="py-3.5 px-4">Statut</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedArticles.map((art) => (
                      <tr key={art.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-5 flex items-center gap-3">
                          <img
                            src={resolveImageUrl(art.photo_url)}
                            alt={art.name}
                            className="w-11 h-11 rounded-2xl object-cover bg-slate-100 shrink-0"
                          />
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{art.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">ID #{art.id} • {art.negotiable ? 'Prix négociable' : 'Prix fixe'}</p>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                            {art.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-black text-slate-900">
                          {new Intl.NumberFormat('fr-FR').format(art.price)} FCFA
                        </td>

                        <td className="py-3.5 px-4">
                          {art.hidden ? (
                            <span className="inline-flex items-center gap-1.5 text-slate-500 font-semibold text-[11px] px-2 py-0.5 rounded-full bg-slate-100">
                              <EyeOff className="w-3 h-3 text-slate-400" />
                              Masqué
                            </span>
                          ) : art.out_of_stock ? (
                            <span className="inline-flex items-center gap-1.5 text-amber-700 font-semibold text-[11px] px-2 py-0.5 rounded-full bg-amber-50">
                              <PackageX className="w-3 h-3 text-amber-600" />
                              Hors stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px] px-2 py-0.5 rounded-full bg-emerald-50">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              En ligne
                            </span>
                          )}
                        </td>

                        {/* Actions Rapides en 1 Clic */}
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Modifier */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditArticle(art)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition border-0 bg-transparent cursor-pointer"
                              title="Modifier les informations"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Masquer / Démasquer */}
                            <button
                              type="button"
                              onClick={() => handleToggleHidden(art)}
                              className={`p-1.5 rounded-xl transition border-0 bg-transparent cursor-pointer ${
                                art.hidden
                                  ? 'text-blue-600 hover:bg-blue-50'
                                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                              }`}
                              title={art.hidden ? "Rendre visible aux clients" : "Masquer aux clients"}
                            >
                              {art.hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>

                            {/* Hors stock / En stock */}
                            <button
                              type="button"
                              onClick={() => handleToggleOutOfStock(art)}
                              className={`p-1.5 rounded-xl transition border-0 bg-transparent cursor-pointer ${
                                art.out_of_stock
                                  ? 'text-emerald-600 hover:bg-emerald-50'
                                  : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                              }`}
                              title={art.out_of_stock ? "Remettre en stock" : "Marquer comme épuisé (Hors stock)"}
                            >
                              {art.out_of_stock ? <PackageCheck className="w-3.5 h-3.5" /> : <PackageX className="w-3.5 h-3.5" />}
                            </button>

                            {/* Supprimer */}
                            <button
                              type="button"
                              onClick={() => handleDeleteArticle(art)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition border-0 bg-transparent cursor-pointer"
                              title="Supprimer l'article"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ONGLET 2 : GESTION DES COMMANDES REÇUES EN DIRECT */}
      {/* ============================================================== */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          
          {/* Filtres de statut de commandes */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              {[
                { id: 'all', label: 'Toutes les commandes' },
                { id: 'pending', label: 'En attente' },
                { id: 'accepted', label: 'En cours' },
                { id: 'completed', label: 'Terminées' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setOrderFilter(f.id as any)}
                  className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition border-0 cursor-pointer ${
                    orderFilter === f.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={loadShopOrders}
              className="p-2 bg-white text-slate-400 hover:text-slate-800 rounded-2xl hover:bg-slate-50 transition border-0 shadow-sm cursor-pointer"
              title="Rafraîchir les commandes"
            >
              <RefreshCw className={`w-4 h-4 ${loadingOrders ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>

          {/* Liste des commandes */}
          {loadingOrders ? (
            <div className="bg-white p-12 rounded-3xl text-center space-y-2 border-0 shadow-sm">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
              <p className="text-xs text-slate-500">Chargement des commandes reçues...</p>
            </div>
          ) : displayedOrders.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl text-center space-y-2 border-0 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto text-slate-400">
                <Clock className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-800 text-sm">Aucune commande pour ce filtre</p>
              <p className="text-xs text-slate-400">Les nouvelles commandes passées par vos clients apparaîtront ici.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {displayedOrders.map((ord) => {
                const isPending = ord.status === 'pending';
                const isAccepted = ord.status === 'accepted';
                const isCompleted = ord.status === 'completed';
                const isPickup = ord.mode === 'pickup' || ord.delivery_type === 'pickup';

                return (
                  <div
                    key={ord.id}
                    className="bg-white rounded-3xl p-6 border-0 shadow-sm space-y-4 hover:shadow-md transition"
                  >
                    {/* En-tête de la commande */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-slate-900">Commande #{ord.id}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isPending
                                ? 'bg-amber-100 text-amber-800'
                                : isAccepted
                                ? 'bg-blue-100 text-blue-800'
                                : isCompleted
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {ord.status === 'pending'
                              ? 'En attente'
                              : ord.status === 'accepted'
                              ? 'En cours'
                              : ord.status === 'completed'
                              ? 'Terminée'
                              : 'Refusée'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {ord.created_at ? new Date(ord.created_at).toLocaleString('fr-FR') : 'Récemment'}
                        </p>
                      </div>

                      {/* Mode de livraison */}
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-xl text-xs font-semibold text-slate-700">
                        {isPickup ? (
                          <>
                            <Store className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Retrait Boutique</span>
                          </>
                        ) : (
                          <>
                            <Truck className="w-3.5 h-3.5 text-blue-600" />
                            <span>Yango Express</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Coordonnées Client */}
                    <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Client :</span>
                        <span className="font-bold text-slate-900">{ord.customer_name || 'Client Lafi'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Téléphone :</span>
                        <a
                          href={`tel:${ord.customer_phone}`}
                          className="font-bold text-blue-600 hover:underline"
                        >
                          {ord.customer_phone || 'Non renseigné'}
                        </a>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Lieu :</span>
                        <span className="text-slate-700 font-medium">{ord.customer_address || ord.delivery_address || 'Abidjan'}</span>
                      </div>
                    </div>

                    {/* Articles de la commande */}
                    <div className="space-y-1.5 text-xs">
                      {ord.items && ord.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-slate-600">
                          <span>
                            {item.name || item.article_name || 'Article'} × {item.quantity || item.qty || 1}
                          </span>
                          <span className="font-bold text-slate-900">
                            {new Intl.NumberFormat('fr-FR').format((item.price || item.unit_price || 0) * (item.quantity || item.qty || 1))} FCFA
                          </span>
                        </div>
                      ))}
                      <div className="border-t border-slate-100 pt-2 flex items-center justify-between font-black text-sm text-slate-900">
                        <span>Total</span>
                        <span className="text-blue-600">
                          {new Intl.NumberFormat('fr-FR').format(ord.total || ord.total_price || 0)} FCFA
                        </span>
                      </div>
                    </div>

                    {/* Actions de Traitement de la Commande */}
                    <div className="pt-2 border-t border-slate-100">
                      {/* 1. Statut PENDING : Accepter ou Refuser */}
                      {isPending && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAcceptOrder(ord.id)}
                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-sm transition flex items-center justify-center gap-1.5 border-0 cursor-pointer active:scale-95"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Accepter</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRefuseOrder(ord.id)}
                            className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-2xl transition border-0 cursor-pointer active:scale-95"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Refuser</span>
                          </button>
                        </div>
                      )}

                      {/* 2. Statut ACCEPTED & Retrait Boutique : Saisie Code Secret Client */}
                      {isAccepted && isPickup && (
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                            <Key className="w-3.5 h-3.5 text-blue-600" />
                            <span>Code de retrait à 4 chiffres du client :</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              maxLength={4}
                              placeholder="Ex: 1234"
                              value={pickupCodeInput[ord.id] || ''}
                              onChange={(e) =>
                                setPickupCodeInput((prev) => ({ ...prev, [ord.id]: e.target.value }))
                              }
                              className="w-24 px-3 py-2 bg-slate-50 text-center font-black tracking-widest text-sm rounded-xl border-0 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => handleValidatePickup(ord.id)}
                              disabled={validatingPickup[ord.id]}
                              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition border-0 cursor-pointer disabled:opacity-50"
                            >
                              {validatingPickup[ord.id] ? 'Vérification...' : 'Valider la remise'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 3. Statut ACCEPTED & Livraison Yango : Suivi Livreur et Remise Colis */}
                      {isAccepted && !isPickup && (
                        <div className="space-y-2">
                          {!ord.driver_dispatched ? (
                            <div className="p-3 bg-amber-50 rounded-2xl text-[11px] text-amber-800 space-y-1">
                              <p className="font-bold flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                En attente de commande du livreur par le client
                              </p>
                              <p className="text-slate-600">
                                Le client prépare l'envoi de son chauffeur Yango. Dès confirmation, vous pourrez lui remettre le paquet.
                              </p>
                            </div>
                          ) : !ord.package_handed_over ? (
                            <div className="space-y-2">
                              <div className="p-3 bg-blue-50 rounded-2xl text-[11px] text-blue-800 flex items-center gap-2">
                                <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                                <span>Livreur Yango en route vers votre boutique !</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleHandoverPackage(ord.id)}
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow transition border-0 cursor-pointer"
                              >
                                Remettre le colis au livreur Yango
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="p-3 bg-emerald-50 rounded-2xl text-[11px] text-emerald-800 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>Colis remis au livreur Yango (en cours d'acheminement)</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCompleteOrder(ord.id)}
                                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow transition border-0 cursor-pointer"
                              >
                                Clôturer la commande
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 4. Statut COMPLETED */}
                      {isCompleted && (
                        <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Commande livrée avec succès</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* ONGLET 3 : COORDONNÉES & GÉOLOCALISATION GPS DE LA BOUTIQUE */}
      {/* ============================================================== */}
      {activeTab === 'settings' && (
        <form
          onSubmit={handleSaveShopSettings}
          className="bg-white p-6 sm:p-8 rounded-3xl border-0 shadow-sm space-y-6 max-w-2xl animate-fadeIn"
        >
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Coordonnées de la Boutique</h3>
              <p className="text-xs text-slate-400">Positionnement GPS et informations visibles par vos clients</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Nom commercial de la boutique *</label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border-0 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Nom du gérant / propriétaire *</label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border-0 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                <Phone className="w-3.5 h-3.5 text-slate-400 inline mr-1.5" />
                Numéro WhatsApp de contact *
              </label>
              <input
                type="tel"
                required
                value={shopPhone}
                onChange={(e) => setShopPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border-0 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 inline mr-1.5" />
                  Adresse / Quartier de la boutique *
                </label>
                <button
                  type="button"
                  onClick={handleDetectGPS}
                  disabled={detectingLoc}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition border-0 bg-transparent cursor-pointer disabled:opacity-50"
                  title="Capturer les coordonnées GPS exactes pour l'itinéraire Yango"
                >
                  <Navigation className="w-3.5 h-3.5 text-blue-600" />
                  <span>{detectingLoc ? 'GPS en cours...' : 'Position GPS actuelle'}</span>
                </button>
              </div>
              <input
                type="text"
                required
                value={shopAddress}
                onChange={(e) => setShopAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl border-0 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition"
              />
            </div>

            {/* Partage du lien direct de la boutique */}
            <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-slate-800 text-xs">Lien direct de votre boutique</p>
                <p className="text-[11px] text-slate-400">Partagez ce lien à vos clients sur WhatsApp</p>
              </div>
              <button
                type="button"
                onClick={handleCopyShopLink}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 border-0 shadow-sm cursor-pointer active:scale-95 shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copiedLink ? 'Lien Copié !' : 'Copier le lien'}</span>
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            {onLogout ? (
              <button
                type="button"
                onClick={onLogout}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs rounded-xl transition flex items-center gap-1.5 border-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Déconnexion</span>
              </button>
            ) : <div />}

            <button
              type="submit"
              disabled={savingSettings}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md transition flex items-center gap-2 border-0 cursor-pointer disabled:opacity-50"
            >
              {savingSettings && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Enregistrer les coordonnées</span>
            </button>
          </div>
        </form>
      )}

      {/* ============================================================== */}
      {/* MODAL DE MODIFICATION RAPIDE D'UN ARTICLE (EditArticleModal) */}
      {/* ============================================================== */}
      {editingArticle && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-5 shadow-2xl border-0">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                <span>Modifier l'article #{editingArticle.id}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingArticle(null)}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 transition border-0 bg-transparent cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditArticle} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nom du produit</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 rounded-2xl border-0 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Prix (FCFA)</label>
                  <input
                    type="number"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 rounded-2xl border-0 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Catégorie</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 rounded-2xl border-0 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  >
                    {['Alimentation', 'Mode', 'Beauté', 'Électronique', 'Maison', 'Bébé'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editNegotiable"
                  checked={editNegotiable}
                  onChange={(e) => setEditNegotiable(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="editNegotiable" className="text-slate-700 cursor-pointer">
                  Prix négociable sur WhatsApp
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingArticle(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold border-0 bg-transparent cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingEditArticle}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition border-0 cursor-pointer"
                >
                  {savingEditArticle ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* POP-UPS D'ALERTE ET NOTIFICATIONS EN BAS À DROITE (TOASTS)     */}
      {/* ============================================================== */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full px-4 sm:px-0 pointer-events-none">
        
        {/* Alerte discrète si boutique fermée */}
        {!isOpen && !dismissClosedAlert && (
          <div className="pointer-events-auto bg-white border border-amber-200/90 rounded-2xl p-4 shadow-2xl shadow-amber-950/10 flex items-start gap-3.5 text-xs text-slate-800 animate-slideUp">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <p className="font-bold text-xs text-amber-950">Boutique fermée</p>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                Vos articles sont actuellement masqués aux clients sur le catalogue.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDismissClosedAlert(true)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition border-0 bg-transparent cursor-pointer shrink-0"
              title="Masquer cette alerte"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Pop-up de notification / feedback d'action (Succès ou Erreur) */}
        {message && (
          <div
            role="status"
            className={`pointer-events-auto bg-white rounded-2xl p-4 shadow-2xl flex items-start gap-3.5 text-xs border animate-slideUp transition-all ${
              message.type === 'success'
                ? 'border-emerald-200/90 shadow-emerald-950/10'
                : 'border-rose-200/90 shadow-rose-950/10'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                message.type === 'success'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              {message.type === 'success' ? (
                <Check className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <p
                className={`font-bold text-xs ${
                  message.type === 'success' ? 'text-emerald-950' : 'text-rose-950'
                }`}
              >
                {message.type === 'success' ? 'Opération réussie' : 'Attention'}
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                {message.text}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMessage(null)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition border-0 bg-transparent cursor-pointer shrink-0"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>

    </div>
  );
};
