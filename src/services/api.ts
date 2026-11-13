import type { AdminOverview, Article, AssistantResponse, CustomerOrder, OrderCreateInput, Shop, User } from '../types';

export const API_BASE = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? `${window.location.protocol}//${window.location.host}`
    : 'http://localhost:8000'
);

export function resolveImageUrl(path: string | null | undefined): string {
  if (!path) return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}

export async function fetchArticles(params?: {
  category?: string;
  query?: string;
  radiusM?: number;
}): Promise<Article[]> {
  const query = new URLSearchParams();
  if (params?.category && params.category !== 'Tout') {
    query.append('category', params.category);
  }
  if (params?.query && params.query.trim()) {
    query.append('q', params.query.trim());
  }
  if (params?.radiusM) {
    query.append('radius_m', params.radiusM.toString());
  }

  const url = `${API_BASE}/articles${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Erreur récupération articles (${res.status})`);
  }
  return res.json();
}

export async function fetchArticle(id: number): Promise<Article> {
  const res = await fetch(`${API_BASE}/articles/${id}`);
  if (!res.ok) {
    throw new Error(`Article ${id} introuvable`);
  }
  return res.json();
}

export async function searchByVision(imageFile: File): Promise<AssistantResponse> {
  const formData = new FormData();
  formData.append('file', imageFile);

  const res = await fetch(`${API_BASE}/ai/assistant-image`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Erreur lors de la recherche visuelle');
  }

  return res.json();
}

export async function askAssistant(
  message: string,
  history: { role: string; content: string }[] = []
): Promise<AssistantResponse> {
  const res = await fetch(`${API_BASE}/ai/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      history,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Erreur de réponse de l'assistant IA");
  }

  return res.json();
}

export async function createOrder(orderData: OrderCreateInput): Promise<any> {
  const payload = {
    mode: orderData.mode || orderData.delivery_type || 'pickup',
    items: orderData.items.map((i) => ({
      article_id: Number(i.article_id),
      qty: Number(i.qty || i.quantity || 1),
    })),
    customer_id: orderData.customer_id ?? null,
    customer_name: orderData.customer_name ?? null,
    customer_phone: orderData.customer_phone ?? null,
    customer_address: orderData.customer_address || orderData.delivery_address || null,
  };

  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Erreur lors de la création de la commande');
  }

  return res.json();
}

export async function suggestCategoryFromImage(imageFile: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', imageFile);

  const res = await fetch(`${API_BASE}/ai/category-image`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error('Erreur classification photo');
  }

  return res.json();
}

export async function generateProductDescription(title: string, category?: string, price?: number): Promise<string> {
  const res = await fetch(`${API_BASE}/ai/generate-description`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, category, price }),
  });

  if (!res.ok) {
    return `Excellent article disponible dès maintenant dans votre quartier. Qualité garantie et livraison rapide.`;
  }

  const data = await res.json();
  return data.description;
}

export async function fetchShops(): Promise<Shop[]> {
  try {
    const res = await fetch(`${API_BASE}/shops`);
    if (!res.ok) {
      return [];
    }
    return res.json();
  } catch {
    return [];
  }
}

export async function loginCustomer(credentials: { email?: string; phone?: string; password?: string }): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/customer/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Identifiant ou mot de passe incorrect.');
  }
  const data = await res.json();
  return {
    id: data.id,
    name: data.name,
    phone: data.phone,
    email: data.email || undefined,
    address: data.address || undefined,
    role: 'client',
  };
}

export async function registerCustomer(data: { name: string; phone: string; address: string; email?: string; password?: string }): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/customer/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de l'inscription client.");
  }
  const result = await res.json();
  return {
    id: result.id,
    name: result.name,
    phone: result.phone,
    email: result.email || undefined,
    address: result.address || undefined,
    role: 'client',
  };
}

export async function updateCustomer(id: number, data: { name?: string; phone?: string; address?: string; email?: string }): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/customer/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Erreur lors de la mise à jour du profil.');
  }
  const result = await res.json();
  return {
    id: result.id,
    name: result.name,
    phone: result.phone,
    email: result.email || undefined,
    address: result.address || undefined,
    role: 'client',
  };
}

export async function loginMerchant(credentials: { email?: string; phone?: string; password?: string }): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/merchant/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Identifiants commerçant incorrects.');
  }
  const data = await res.json();
  return {
    id: data.id,
    name: data.owner_name || data.name,
    phone: data.phone,
    email: data.email || undefined,
    address: data.address || undefined,
    role: 'commercant',
    shop_id: data.id,
    shop_name: data.name,
    is_open: data.is_open,
  };
}

export async function registerMerchant(data: {
  shop_name: string;
  owner_name: string;
  phone: string;
  address: string;
  email?: string;
  password?: string;
  lat?: number;
  lng?: number;
}): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/merchant/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la création de la boutique.");
  }
  const result = await res.json();
  return {
    id: result.id,
    name: result.owner_name || result.name,
    phone: result.phone,
    email: result.email || undefined,
    address: result.address || undefined,
    role: 'commercant',
    shop_id: result.id,
    shop_name: result.name,
    is_open: result.is_open,
  };
}

export async function fetchCustomerOrders(customerId: number): Promise<CustomerOrder[]> {
  try {
    const res = await fetch(`${API_BASE}/customers/${customerId}/orders`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function fetchShopOrders(shopId: number): Promise<CustomerOrder[]> {
  try {
    const res = await fetch(`${API_BASE}/shops/me/orders`, {
      headers: { 'x-shop-id': shopId.toString() },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function fetchShopArticles(shopId: number): Promise<Article[]> {
  try {
    const res = await fetch(`${API_BASE}/shops/me/articles`, {
      headers: { 'x-shop-id': shopId.toString() },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function suggestCategoryFromText(title: string): Promise<any> {
  const res = await fetch(`${API_BASE}/ai/category`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function updateShopInfo(
  shopId: number,
  data: {
    name?: string;
    owner_name?: string;
    phone?: string;
    address?: string;
    is_open?: boolean;
    lat?: number;
    lng?: number;
  }
): Promise<any> {
  const res = await fetch(`${API_BASE}/shops/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-shop-id': shopId.toString(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Erreur lors de la mise à jour de la boutique');
  }
  return res.json();
}

export async function updateArticleItem(
  articleId: number,
  data: Partial<{
    name: string;
    price: number;
    category: string;
    description: string;
    negotiable: boolean;
    hidden: boolean;
    out_of_stock: boolean;
  }>,
  shopId: number
): Promise<Article> {
  const res = await fetch(`${API_BASE}/articles/${articleId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-shop-id': shopId.toString(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la mise à jour de l'article");
  }
  return res.json();
}

export async function deleteArticleItem(articleId: number, shopId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/articles/${articleId}`, {
    method: 'DELETE',
    headers: {
      'x-shop-id': shopId.toString(),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la suppression de l'article");
  }
}

export async function updateOrderStatus(orderId: number, status: string, shopId: number): Promise<CustomerOrder> {
  const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-shop-id': shopId.toString(),
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Erreur changement statut commande');
  }
  return res.json();
}

export async function validatePickupCode(orderId: number, code: string, shopId: number): Promise<CustomerOrder> {
  const res = await fetch(`${API_BASE}/orders/${orderId}/validate-pickup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-shop-id': shopId.toString(),
    },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Code de retrait incorrect');
  }
  return res.json();
}

export async function handoverYangoPackage(orderId: number, shopId: number): Promise<CustomerOrder> {
  const res = await fetch(`${API_BASE}/orders/${orderId}/handover-package`, {
    method: 'POST',
    headers: {
      'x-shop-id': shopId.toString(),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Erreur lors de la remise du colis au livreur');
  }
  return res.json();
}

export async function fetchOrder(orderId: number): Promise<CustomerOrder> {
  const res = await fetch(`${API_BASE}/orders/${orderId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Impossible de charger la commande');
  }
  return res.json();
}

export async function cancelCustomerOrder(orderId: number): Promise<CustomerOrder> {
  const res = await fetch(`${API_BASE}/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Impossible d'annuler cette commande");
  }
  return res.json();
}

export async function tryAdminLogin(email: string, password: string): Promise<User | null> {
  try {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: data.id ?? 0,
      name: data.name || 'Super Administrateur',
      phone: data.phone || '0700000000',
      email: data.email,
      role: 'admin',
    };
  } catch {
    return null;
  }
}

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const res = await fetch(`${API_BASE}/admin/overview`);
  if (!res.ok) {
    throw new Error('Impossible de charger les données administrateur');
  }
  return res.json();
}

export async function adminCreateArticle(data: {
  name: string;
  price: number;
  category: string;
  description?: string;
  photo_url?: string;
  photos?: string[];
  shop_id?: number;
  shop_name?: string;
  shop_phone?: string;
  shop_address?: string;
  negotiable?: boolean;
}): Promise<Article> {
  const res = await fetch(`${API_BASE}/admin/articles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de l'ajout de l'article");
  }
  return res.json();
}

export async function adminUpdateArticle(
  articleId: number,
  data: {
    name?: string;
    price?: number;
    category?: string;
    description?: string;
    photo_url?: string;
    photos?: string[];
    shop_id?: number;
    shop_name?: string;
    shop_phone?: string;
    shop_address?: string;
    negotiable?: boolean;
  }
): Promise<Article> {
  const res = await fetch(`${API_BASE}/admin/articles/${articleId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la modification de l'article");
  }
  return res.json();
}

export async function adminDeleteArticle(articleId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/articles/${articleId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error("Erreur lors de la suppression de l'article");
  }
}

export async function adminCreateShop(data: {
  name: string;
  owner_name?: string;
  phone: string;
  address?: string;
  email?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/admin/shops`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Erreur lors de la création de la boutique');
  }
  return res.json();
}

export async function adminUpdateShop(
  shopId: number,
  data: {
    name?: string;
    owner_name?: string;
    phone?: string;
    address?: string;
    email?: string;
    is_open?: boolean;
  }
): Promise<any> {
  const res = await fetch(`${API_BASE}/admin/shops/${shopId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Erreur lors de la modification de la boutique');
  }
  return res.json();
}

export async function adminDeleteShop(shopId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/shops/${shopId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error('Erreur lors de la suppression de la boutique');
  }
}

export async function adminUpdateOrderStatus(orderId: number, status: string): Promise<CustomerOrder> {
  const res = await fetch(`${API_BASE}/admin/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    throw new Error('Erreur lors de la mise à jour du statut');
  }
  return res.json();
}

export async function adminDeleteOrder(orderId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/orders/${orderId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error('Erreur lors de la suppression de la commande');
  }
}

export async function adminDeleteCustomer(customerId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/customers/${customerId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error('Erreur lors de la suppression du client');
  }
}

export async function adminSeedDemo(): Promise<{ status: string; added_articles: number }> {
  const res = await fetch(`${API_BASE}/admin/seed-demo`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error("Erreur lors de l'injection des articles de test");
  }
  return res.json();
}

export async function adminResetAll(): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/admin/reset-all`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error('Erreur lors de la purge des données');
  }
  return res.json();
}



