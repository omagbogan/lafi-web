export interface Article {
  id: number;
  name: string;
  price: number;
  category: 'Alimentation' | 'Mode' | 'Beauté' | 'Électronique' | 'Maison' | 'Bébé' | string;
  description: string | null;
  negotiable: boolean;
  hidden: boolean;
  out_of_stock: boolean;
  color: string | null;
  photo_url: string | null;
  photos: string[];
  shop_id: number;
  shop: string;
  shop_phone: string;
  open: boolean;
  distance_m: number;
  shop_lat: number;
  shop_lng: number;
}

export interface CartItem {
  article: Article;
  quantity: number;
}

export interface AssistantResponse {
  reply: string;
  recommended_articles: Article[];
  intent: string;
  source: string;
  accepte: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image_url?: string;
  recommended_articles?: Article[];
  timestamp: string;
}

export interface User {
  id: number;
  name: string;
  phone: string;
  role: 'client' | 'commercant' | 'admin';
  email?: string;
  address?: string;
  shop_id?: number;
  shop_name?: string;
  is_open?: boolean;
}

export interface AdminOverview {
  stats: {
    total_revenue: number;
    pending_revenue: number;
    orders_total: number;
    orders_pending: number;
    orders_accepted: number;
    orders_completed: number;
    orders_cancelled: number;
    shops_total: number;
    shops_open: number;
    customers_total: number;
    articles_total: number;
    articles_in_stock: number;
  };
  ai_status: {
    category_model_ready: boolean;
    vision_model_ready: boolean;
    llm_agent_ready: boolean;
  };
  shops: Array<{
    id: number;
    name: string;
    owner_name?: string | null;
    phone: string;
    email?: string | null;
    address?: string | null;
    is_open: boolean;
    lat: number;
    lng: number;
    articles_count: number;
  }>;
  customers: Array<{
    id: number;
    name: string;
    phone: string;
    email?: string | null;
    address: string;
    created_at: number;
    orders_count: number;
  }>;
  articles: Article[];
  orders: CustomerOrder[];
}

export interface OrderItemDetail {
  id?: number;
  article_id: number;
  name?: string;
  article_name?: string;
  quantity?: number;
  qty?: number;
  price?: number;
  unit_price?: number;
}

export interface CustomerOrder {
  id: number;
  created_at?: string | number;
  status: string;
  total?: number;
  total_price?: number;
  subtotal?: number;
  delivery_fee?: number;
  mode?: 'pickup' | 'yango';
  delivery_type?: 'pickup' | 'yango';
  delivery_address?: string;
  customer_address?: string;
  payment_method?: string;
  customer_name?: string;
  customer_phone?: string;
  pickup_code?: string;
  driver_dispatched?: boolean;
  package_handed_over?: boolean;
  shop_id?: number;
  shop?: string;
  shop_phone?: string;
  items?: OrderItemDetail[];
}

export interface OrderItemInput {
  article_id: number;
  quantity?: number;
  qty?: number;
}

export interface OrderCreateInput {
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_id?: number | null;
  mode?: 'pickup' | 'yango';
  delivery_type?: 'pickup' | 'yango';
  delivery_address?: string;
  payment_method?: 'wave' | 'orange_money' | 'mtn' | 'cash' | string;
  notes?: string;
  items: OrderItemInput[];
}

export interface Shop {
  id: number;
  name: string;
  phone: string;
  is_open: boolean;
  owner_name?: string | null;
  address?: string | null;
  email?: string | null;
  lat: number;
  lng: number;
  articlesCount?: number;
  distance_m?: number;
}

