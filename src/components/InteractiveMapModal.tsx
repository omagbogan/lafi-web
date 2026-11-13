import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  MapPin, 
  Store, 
  Phone, 
  Navigation, 
  Search, 
  ChevronRight
} from 'lucide-react';
import type { Article, Shop } from '../types';
import { fetchShops } from '../services/api';

interface InteractiveMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectShopFilter: (shopName: string) => void;
  articles: Article[];
}

// Position par défaut du client : Cocody, Abidjan (conforme à DEFAULT_LAT / DEFAULT_LNG du backend)
const CLIENT_LOCATION = {
  lat: 5.3600,
  lng: -3.9900,
  label: 'Cocody, Abidjan',
};

// Formule de Haversine pour calculer la distance exacte en mètres
function calculateDistanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = 6371000;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dp / 2) ** 2 +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return Math.round(2 * r * Math.asin(Math.sqrt(a)));
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

// Boutiques partenaires de référence à Abidjan (garantit une expérience complète en démo/soutenance)
const DEFAULT_PARTNER_SHOPS: Shop[] = [
  {
    id: 1,
    name: 'Zeus Store',
    phone: '+225 05 03 88 88 64',
    is_open: true,
    owner_name: 'Zeus Tech',
    address: 'Angré 8ème Tranche, Cocody',
    lat: 5.39235,
    lng: -3.98016,
  },
  {
    id: 2,
    name: 'Midev Électronique',
    phone: '+225 01 72 72 32 92',
    is_open: true,
    owner_name: 'Michel Dev',
    address: 'Zone 4, Marcory, Lagunes',
    lat: 5.29582,
    lng: -3.97835,
  },
  {
    id: 3,
    name: 'Chez Aïcha Mode & Wax',
    phone: '+225 07 00 00 00 01',
    is_open: true,
    owner_name: 'Aïcha Coulibaly',
    address: 'Avenue Chardy, Le Plateau',
    lat: 5.3265,
    lng: -4.0195,
  },
  {
    id: 4,
    name: 'Maman Awa Saveurs Locales',
    phone: '+225 07 00 00 00 02',
    is_open: true,
    owner_name: 'Awa Traoré',
    address: 'Marché de Cocody Centre',
    lat: 5.3480,
    lng: -3.9920,
  },
  {
    id: 5,
    name: 'Beauté Naturelle & Karité',
    phone: '+225 07 00 00 00 03',
    is_open: false,
    owner_name: 'Fatou K.',
    address: 'Boulevard Latrille, II Plateaux',
    lat: 5.3720,
    lng: -3.9985,
  },
  {
    id: 6,
    name: 'Tech Ivoire Yopougon',
    phone: '+225 07 00 00 00 04',
    is_open: true,
    owner_name: 'Karim B.',
    address: 'Quartier Selmer, Yopougon',
    lat: 5.3390,
    lng: -4.0720,
  },
];

export const InteractiveMapModal: React.FC<InteractiveMapModalProps> = ({
  isOpen,
  onClose,
  onSelectShopFilter,
  articles,
}) => {
  const [shops, setShops] = useState<Shop[]>(DEFAULT_PARTNER_SHOPS);
  const [selectedShopId, setSelectedShopId] = useState<number | null>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'open' | 'near'>('all');
  const [viewMode, setViewMode] = useState<'both' | 'map' | 'list'>('both');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<number, any>>(new Map());

  // Fermer avec Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Charger les boutiques réelles depuis l'API /shops
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    fetchShops().then((apiShops) => {
      if (!isMounted) return;

      // Combiner les boutiques de l'API avec les partenaires de référence
      const mergedMap = new Map<string, Shop>();

      // D'abord les partenaires de référence
      DEFAULT_PARTNER_SHOPS.forEach((s) => mergedMap.set(s.name.toLowerCase(), s));

      // Ensuite les boutiques reçues de l'API (prennent la priorité si même nom)
      apiShops.forEach((s) => {
        mergedMap.set(s.name.toLowerCase(), s);
      });

      // Extraire également les boutiques depuis les articles chargés s'il en manque
      articles.forEach((art) => {
        const key = art.shop.toLowerCase();
        if (!mergedMap.has(key)) {
          mergedMap.set(key, {
            id: art.shop_id || Math.floor(Math.random() * 10000 + 100),
            name: art.shop,
            phone: art.shop_phone || '+225 07 00 00 00',
            is_open: art.open,
            address: 'Abidjan',
            lat: art.shop_lat || (5.3500 + (Math.random() - 0.5) * 0.04),
            lng: art.shop_lng || (-3.9900 + (Math.random() - 0.5) * 0.04),
          });
        }
      });

      // Enrichir avec la distance et le nombre d'articles
      const enriched = Array.from(mergedMap.values()).map((shop) => {
        const dist = calculateDistanceM(
          CLIENT_LOCATION.lat,
          CLIENT_LOCATION.lng,
          shop.lat,
          shop.lng
        );
        const count = articles.filter((a) => a.shop.toLowerCase() === shop.name.toLowerCase()).length;
        return {
          ...shop,
          distance_m: dist,
          articlesCount: count,
        };
      });

      // Trier par proximité immédiate (Haversine)
      enriched.sort((a, b) => (a.distance_m || 0) - (b.distance_m || 0));

      setShops(enriched);
      if (enriched.length > 0 && selectedShopId === null) {
        setSelectedShopId(enriched[0].id);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, articles]);

  // Filtrage des boutiques selon la recherche et les filtres
  const filteredShops = useMemo(() => {
    return shops.filter((shop) => {
      if (filterMode === 'open' && !shop.is_open) return false;
      if (filterMode === 'near' && (shop.distance_m || 0) > 3000) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = shop.name.toLowerCase().includes(q);
        const matchAddress = (shop.address || '').toLowerCase().includes(q);
        return matchName || matchAddress;
      }

      return true;
    });
  }, [shops, filterMode, searchQuery]);

  // Initialisation et gestion de Leaflet
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) {
      console.warn('Leaflet non disponible sur window.L');
      return;
    }

    // Si la carte n'est pas encore initialisée
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [CLIENT_LOCATION.lat, CLIENT_LOCATION.lng],
        zoom: 13,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Fond de carte OpenStreetMap haute précision
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Marqueur position client (Cocody) avec pulsation bleue
      const clientIcon = L.divIcon({
        className: 'custom-client-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute w-7 h-7 bg-blue-500 rounded-full opacity-40 animate-ping"></span>
            <div class="w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
              <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      L.marker([CLIENT_LOCATION.lat, CLIENT_LOCATION.lng], { icon: clientIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: 'Gabarito', sans-serif; font-size: 12px; padding: 4px;">
            <strong style="color: #2563EB;">📍 Vous êtes ici</strong>
            <p style="margin: 2px 0 0 0; color: #64748B;">Cocody, Abidjan</p>
          </div>
        `);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Nettoyer les anciens marqueurs de boutiques
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    // Ajouter les marqueurs de boutiques
    filteredShops.forEach((shop) => {
      const isSelected = selectedShopId === shop.id;
      const isOpenShop = shop.is_open;
      const pinBgColor = isSelected ? '#2563EB' : isOpenShop ? '#07B472' : '#64748B';

      const shopIcon = L.divIcon({
        className: `custom-shop-marker-${shop.id}`,
        html: `
          <div class="relative flex flex-col items-center group cursor-pointer transition-transform duration-200 ${isSelected ? 'scale-125 z-50' : 'hover:scale-110'}">
            <div style="background-color: ${pinBgColor};" class="w-9 h-9 rounded-2xl flex items-center justify-center text-white shadow-md border-2 border-white transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div style="border-top-color: ${pinBgColor};" class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[7px] -mt-0.5"></div>
            ${isOpenShop ? '<span class="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white"></span>' : ''}
          </div>
        `,
        iconSize: [36, 42],
        iconAnchor: [18, 42],
        popupAnchor: [0, -42],
      });

      const popupContent = document.createElement('div');
      popupContent.style.fontFamily = "'Gabarito', sans-serif";
      popupContent.style.minWidth = '200px';
      popupContent.innerHTML = `
        <div style="padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <h4 style="margin: 0; font-size: 14px; font-weight: 700; color: #0F172A;">${shop.name}</h4>
            <span style="font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 9999px; background-color: ${isOpenShop ? '#DCFCE7' : '#F1F5F9'}; color: ${isOpenShop ? '#15803D' : '#64748B'};">
              ${isOpenShop ? 'Ouvert' : 'Fermé'}
            </span>
          </div>
          <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748B;">📍 ${shop.address || 'Abidjan'}</p>
          <p style="margin: 0 0 8px 0; font-size: 11px; color: #2563EB; font-weight: 600;">⚡ À ${formatDistance(shop.distance_m || 0)} de vous</p>
          <div style="display: flex; gap: 6px; margin-top: 8px;">
            <a href="tel:${shop.phone}" style="display: inline-flex; align-items: center; justify-content: center; flex: 1; padding: 6px; background: #F1F5F9; color: #0F172A; text-decoration: none; border-radius: 8px; font-size: 11px; font-weight: 600;">
              📞 Appeler
            </a>
            <button id="btn-see-articles-${shop.id}" style="display: inline-flex; align-items: center; justify-content: center; flex: 1.5; padding: 6px; background: #2563EB; color: #ffffff; border: none; cursor: pointer; border-radius: 8px; font-size: 11px; font-weight: 600;">
              Voir articles →
            </button>
          </div>
        </div>
      `;

      // Brancher le clic sur le bouton du popup
      popupContent.querySelector(`#btn-see-articles-${shop.id}`)?.addEventListener('click', () => {
        onSelectShopFilter(shop.name);
        onClose();
      });

      const marker = L.marker([shop.lat, shop.lng], { icon: shopIcon })
        .addTo(map)
        .bindPopup(popupContent);

      marker.on('click', () => {
        setSelectedShopId(shop.id);
      });

      markersRef.current.set(shop.id, marker);
    });

    // Timeout pour recalculer la taille de la carte Leaflet lors de l'ouverture du modal
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => clearTimeout(timer);
  }, [isOpen, filteredShops, selectedShopId]);

  // Zoomer sur la boutique sélectionnée
  const handleSelectShop = (shop: Shop) => {
    setSelectedShopId(shop.id);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([shop.lat, shop.lng], 16, {
        animate: true,
        duration: 0.8,
      });
      const marker = markersRef.current.get(shop.id);
      if (marker) {
        marker.openPopup();
      }
    }
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([CLIENT_LOCATION.lat, CLIENT_LOCATION.lng], 13, {
        animate: true,
        duration: 0.8,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      {/* Modal Card Sans Contour (border-0) - Même style que fiche produit */}
      <div className="bg-white rounded-3xl max-w-6xl w-full h-[90vh] max-h-[820px] shadow-2xl overflow-hidden flex flex-col md:flex-row border-0 ring-0 relative">
        
        {/* Left Sidebar: Header, Search, Filters & Boutiques List */}
        <div 
          className={`w-full md:w-96 lg:w-[420px] bg-white flex flex-col shrink-0 overflow-hidden border-0 border-r border-slate-100/80 ${
            viewMode === 'map' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header Minimaliste Blanc de la Sidebar (Sans Bannière Sombre) */}
          <div className="p-4 sm:p-5 pb-3 bg-white flex items-center justify-between border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Store className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-base font-bold text-slate-900 leading-tight">
                    Boutiques de Quartier
                  </h2>
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                    Abidjan
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Commerçants locaux et points de retrait
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Mobile View Toggle */}
              <div className="flex md:hidden bg-slate-100 rounded-xl p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                    viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500'
                  }`}
                >
                  Liste
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('map')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                    viewMode === 'map' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500'
                  }`}
                >
                  Carte
                </button>
              </div>

              {/* Bouton Fermer sur Mobile */}
              <button
                type="button"
                onClick={onClose}
                className="md:hidden p-1.5 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 transition cursor-pointer border-0"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Input Sans Contour */}
          <div className="p-4 bg-white space-y-3 shrink-0 border-0 shadow-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher boutique, quartier..."
                className="w-full bg-slate-100 pl-9 pr-4 py-2 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none border-0 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Toutes ({shops.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('open')}
                className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition cursor-pointer ${
                  filterMode === 'open'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Ouvertes ({shops.filter((s) => s.is_open).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('near')}
                className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition cursor-pointer ${
                  filterMode === 'near'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                &lt; 3 km
              </button>
            </div>
          </div>

          {/* Scrollable Shops List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/60">
            {filteredShops.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Store className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                Aucune boutique ne correspond à vos filtres.
              </div>
            ) : (
              filteredShops.map((shop) => {
                const isSelected = selectedShopId === shop.id;
                return (
                  <div
                    key={shop.id}
                    onClick={() => handleSelectShop(shop)}
                    className={`p-3.5 rounded-2xl transition-all cursor-pointer border-0 ${
                      isSelected
                        ? 'bg-blue-50/80 shadow-md ring-2 ring-blue-500/30'
                        : 'bg-white shadow-xs hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border-0 ${
                          shop.is_open ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <Store className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-slate-900 leading-tight">
                            {shop.name}
                          </h3>
                          <span className="text-[10px] text-slate-500">
                            {shop.address || 'Abidjan'}
                          </span>
                        </div>
                      </div>

                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 border-0 ${
                        shop.is_open 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {shop.is_open ? 'Ouvert' : 'Fermé'}
                      </span>
                    </div>

                    {/* Distance and Quick Actions */}
                    <div className="mt-2.5 pt-2 flex items-center justify-between text-[11px] border-0">
                      <span className="text-blue-600 font-semibold flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {formatDistance(shop.distance_m || 0)}
                      </span>

                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${shop.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition border-0"
                          title={`Appeler ${shop.phone}`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectShopFilter(shop.name);
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition flex items-center gap-1 text-[10px] border-0 cursor-pointer"
                        >
                          Articles
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Bar: GPS Location Info */}
          <div className="p-3 bg-white flex items-center justify-between text-xs text-slate-500 shrink-0 border-t border-slate-100 shadow-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              Position : <strong>{CLIENT_LOCATION.label}</strong>
            </span>
            <button
              type="button"
              onClick={handleRecenter}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 border-0 cursor-pointer"
            >
              <Navigation className="w-3 h-3" />
              Recentrer
            </button>
          </div>
        </div>

        {/* Right Area: Interactive Leaflet Map */}
        <div 
          className={`flex-1 relative bg-slate-100 overflow-hidden border-0 ${
            viewMode === 'list' ? 'hidden md:block' : 'block'
          }`}
        >
          {/* Bouton Fermer Flottant Desktop (Même style que fiche produit) */}
          <button
            type="button"
            onClick={onClose}
            className="hidden md:flex absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/95 hover:bg-white text-slate-600 hover:text-slate-900 shadow-md items-center justify-center transition border-0 cursor-pointer hover:scale-105 active:scale-95"
            title="Fermer la carte"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Commandes Flottantes Mobile en vue Carte */}
          <div className="md:hidden absolute top-4 right-4 z-20 flex items-center gap-2">
            <div className="bg-white/95 backdrop-blur-md rounded-xl p-0.5 shadow-md text-xs flex">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="px-2.5 py-1 rounded-lg font-medium text-slate-600 cursor-pointer"
              >
                Liste
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className="px-2.5 py-1 rounded-lg font-bold bg-blue-600 text-white shadow-xs cursor-pointer"
              >
                Carte
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/95 hover:bg-white text-slate-600 shadow-md flex items-center justify-center transition border-0 cursor-pointer"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* The Leaflet Map Container */}
          <div 
            ref={mapContainerRef} 
            id="leaflet-map-container"
            className="w-full h-full z-0 border-0" 
          />

          {/* Floating Badges on Map */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
            <div className="bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-md flex items-center gap-2 text-xs font-bold text-slate-800 border-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>{filteredShops.filter((s) => s.is_open).length} Boutiques Ouvertes</span>
              <span className="text-slate-300">|</span>
              <span className="text-xs text-slate-500 font-normal">Retrait boutique</span>
            </div>
          </div>

          {/* Recenter Button on Map */}
          <div className="absolute bottom-6 right-4 z-10">
            <button
              type="button"
              onClick={handleRecenter}
              className="p-3 bg-white hover:bg-slate-50 text-slate-800 rounded-2xl shadow-md transition flex items-center gap-2 text-xs font-bold border-0 cursor-pointer hover:scale-105 active:scale-95"
              title="Recentrer sur Cocody"
            >
              <Navigation className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">Recentrer</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
