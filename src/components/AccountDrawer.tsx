import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Store,
  Phone,
  Mail,
  MapPin,
  Lock,
  LogOut,
  Clock,
  CheckCircle2,
  Edit2,
  Check,
  ChevronRight,
  Loader2,
  AlertCircle,
  Navigation
} from 'lucide-react';
import type { User as UserType, CustomerOrder } from '../types';
import {
  loginCustomer,
  registerCustomer,
  updateCustomer,
  loginMerchant,
  registerMerchant,
  fetchCustomerOrders,
  fetchShopOrders,
  tryAdminLogin
} from '../services/api';

interface AccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType | null;
  onLoginSuccess: (user: UserType) => void;
  onLogout: () => void;
  onOpenMerchantView?: () => void;
  onTrackOrder?: (orderId: number) => void;
}

export const AccountDrawer: React.FC<AccountDrawerProps> = ({
  isOpen,
  onClose,
  user,
  onLoginSuccess,
  onLogout,
  onTrackOrder,
}) => {
  // Auth Form State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authRole, setAuthRole] = useState<'client' | 'commercant'>('client');

  // Input Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Status & Orders
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Profile Edit Mode
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Synchronize profile fields when user changes
  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditPhone(user.phone || '');
      setEditAddress(user.address || '');
      setEditEmail(user.email || '');
      loadOrders();
    }
  }, [user]);

  // Load orders for customer or merchant
  const loadOrders = async () => {
    if (!user || user.role === 'admin') return;
    setLoadingOrders(true);
    try {
      if (user.role === 'commercant' && user.shop_id) {
        const data = await fetchShopOrders(user.shop_id);
        setOrders(data);
      } else {
        const data = await fetchCustomerOrders(user.id);
        setOrders(data);
      }
    } catch {
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  if (!isOpen) return null;

  // Handle Login (Exclusivement par Adresse Email)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Veuillez renseigner une adresse email valide (ex: utilisateur@domaine.ci).');
      return;
    }

    if (!password) {
      setError('Veuillez saisir votre mot de passe.');
      return;
    }

    setLoading(true);

    try {
      // 1. Vérification transparente Super-Administrateur (sans bouton visible)
      const adminUser = await tryAdminLogin(cleanEmail, password.trim());
      if (adminUser) {
        onLoginSuccess(adminUser);
        onClose();
        return;
      }

      // 2. Connexion standard Client ou Commerçant
      let loggedUser: UserType;
      if (authRole === 'commercant') {
        loggedUser = await loginMerchant({
          email: cleanEmail,
          password: password.trim(),
        });
      } else {
        loggedUser = await loginCustomer({
          email: cleanEmail,
          password: password.trim(),
        });
      }
      onLoginSuccess(loggedUser);
      setSuccessMessage(`Bienvenue, ${loggedUser.name} !`);
    } catch (err: any) {
      setError(err.message || 'Adresse email ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  // Détection de la position GPS actuelle
  const handleDetectLocation = (target: 'register' | 'profile' = 'register') => {
    if (!navigator.geolocation) {
      setError("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    setDetectingLoc(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const suburb = addr.suburb || addr.neighbourhood || addr.quarter || addr.district || '';
            const road = addr.road || '';
            const city = addr.city || addr.town || addr.municipality || 'Abidjan';

            const parts = [road, suburb, city].filter(Boolean);
            const addressText = parts.length > 0 ? parts.join(', ') : `Position GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            if (target === 'register') {
              setAddress(addressText);
            } else {
              setEditAddress(addressText);
            }
          } else {
            const gpsText = `Position GPS : ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            if (target === 'register') setAddress(gpsText); else setEditAddress(gpsText);
          }
        } catch {
          const fallbackText = `Abidjan (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
          if (target === 'register') setAddress(fallbackText); else setEditAddress(fallbackText);
        } finally {
          setDetectingLoc(false);
        }
      },
      (err) => {
        setDetectingLoc(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError("Veuillez autoriser l'accès GPS dans votre navigateur pour détecter votre position.");
        } else {
          setError("Impossible d'obtenir votre position GPS. Veuillez renseigner votre adresse manuellement.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Veuillez renseigner une adresse email valide (ex: utilisateur@domaine.ci).');
      return;
    }

    if (!password || password.length < 6) {
      setError('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    setLoading(true);

    try {
      let newUser: UserType;
      if (authRole === 'commercant') {
        if (!shopName.trim() || !name.trim() || !phone.trim() || !address.trim()) {
          setError('Veuillez renseigner tous les champs obligatoires (*).');
          setLoading(false);
          return;
        }
        newUser = await registerMerchant({
          shop_name: shopName.trim(),
          owner_name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          email: cleanEmail,
          password: password.trim(),
          lat: coords?.lat,
          lng: coords?.lng,
        });
      } else {
        if (!name.trim() || !phone.trim() || !address.trim()) {
          setError('Veuillez renseigner tous les champs obligatoires (*).');
          setLoading(false);
          return;
        }
        newUser = await registerCustomer({
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          email: cleanEmail,
          password: password.trim(),
        });
      }
      onLoginSuccess(newUser);
      setSuccessMessage('Compte créé avec succès !');
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création du compte.");
    } finally {
      setLoading(false);
    }
  };

  // Save profile updates
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const updated = await updateCustomer(user.id, {
        name: editName,
        phone: editPhone,
        address: editAddress,
        email: editEmail,
      });
      onLoginSuccess({ ...user, ...updated });
      setIsEditingProfile(false);
      setSuccessMessage('Profil mis à jour avec succès.');
    } catch {
      // Mise à jour locale
      onLoginSuccess({
        ...user,
        name: editName,
        phone: editPhone,
        address: editAddress,
        email: editEmail,
      });
      setIsEditingProfile(false);
      setSuccessMessage('Profil mis à jour localement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn select-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-0">
          
          {/* Header Slide-Over Sans Contour */}
          <div className="p-5 sm:p-6 bg-white flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border-0 ${
                user
                  ? user.role === 'commercant'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-blue-50 text-blue-600'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {user ? (
                  user.role === 'commercant' ? <Store className="w-5 h-5" /> : <User className="w-5 h-5" />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 leading-tight">
                  {user
                    ? user.role === 'commercant'
                      ? 'Espace Commerçant'
                      : 'Mon Espace Client'
                    : 'Espace Client & Commerçant'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {user ? (user.role === 'commercant' ? user.shop_name || 'Boutique Partenaire' : user.phone) : 'Commerce de proximité propulsé par l’IA'}
                </p>
              </div>
            </div>

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

          {/* Feedback Messages */}
          {error && (
            <div className="mx-5 mt-4 p-3 bg-rose-50 text-rose-700 rounded-2xl text-xs flex items-center gap-2 border-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {successMessage && (
            <div className="mx-5 mt-4 p-3 bg-emerald-50 text-emerald-700 rounded-2xl text-xs flex items-center gap-2 border-0">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            
            {/* ============================================================== */}
            {/* CAS 1 : NON CONNECTÉ -> METHODES CONNEXION & CRÉATION COMPTE */}
            {/* ============================================================== */}
            {!user ? (
              <div className="space-y-5">
                
                {/* 1. Choix du mode : Connexion vs Création de compte */}
                <div className="flex bg-slate-100 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setError(null);
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer border-0 ${
                      authMode === 'login'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Connexion
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setError(null);
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer border-0 ${
                      authMode === 'register'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Créer un compte
                  </button>
                </div>

                {/* 2. Choix du Rôle : Client vs Commerçant */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Vous êtes :
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAuthRole('client')}
                      className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 text-xs font-bold transition border-0 cursor-pointer ${
                        authRole === 'client'
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <User className="w-4 h-4" />
                      <span>Client Acheteur</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthRole('commercant')}
                      className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 text-xs font-bold transition border-0 cursor-pointer ${
                        authRole === 'commercant'
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Store className="w-4 h-4" />
                      <span>Commerçant Vendeur</span>
                    </button>
                  </div>
                </div>

                {/* 3. Formulaire de Connexion par Email */}
                {authMode === 'login' && (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Adresse email {authRole === 'commercant' ? 'de la boutique' : 'de votre compte'}
                      </label>
                      <div className="relative flex items-center">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder={authRole === 'commercant' ? 'boutique@exemple.ci' : 'votre.email@exemple.ci'}
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 text-xs rounded-2xl border-0 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition text-slate-900"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Mot de passe
                      </label>
                      <div className="relative flex items-center">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 text-xs rounded-2xl border-0 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition text-slate-900"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className={`w-full py-3 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg transition flex items-center justify-center gap-2 border-0 cursor-pointer active:scale-[0.98] ${
                        authRole === 'commercant'
                          ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                          : 'bg-[#2563EB] hover:bg-[#1D4ED8] shadow-blue-600/25'
                      }`}
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>Se connecter</span>
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* 4. Formulaire de Création de Compte */}
                {authMode === 'register' && (
                  <form onSubmit={handleRegister} className="space-y-3.5">
                    {authRole === 'commercant' ? (
                      <>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-700">Nom de la boutique *</label>
                          <div className="relative flex items-center">
                            <Store className="w-3.5 h-3.5 text-slate-400 absolute left-3.5" />
                            <input
                              type="text"
                              value={shopName}
                              onChange={(e) => setShopName(e.target.value)}
                              placeholder="Ex: Épicerie du Bon Marché"
                              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 text-xs rounded-2xl border-0 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition text-slate-900"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-700">Nom du gérant / commerçant *</label>
                          <div className="relative flex items-center">
                            <User className="w-3.5 h-3.5 text-slate-400 absolute left-3.5" />
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="Ex: Bakary Konaté"
                              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 text-xs rounded-2xl border-0 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition text-slate-900"
                              required
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">Nom complet *</label>
                        <div className="relative flex items-center">
                          <User className="w-3.5 h-3.5 text-slate-400 absolute left-3.5" />
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Kouamé N'Guessan"
                            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 text-xs rounded-2xl border-0 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition text-slate-900"
                            required
                          />
                        </div>
                      </div>
                    )}

                    {/* Adresse email obligatoire */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700">Adresse email *</label>
                      <div className="relative flex items-center">
                        <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3.5" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="votre.email@exemple.ci"
                          className="w-full pl-9 pr-3.5 py-2 bg-slate-50 text-xs rounded-2xl border-0 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition text-slate-900"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700">Numéro de téléphone *</label>
                      <div className="relative flex items-center">
                        <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3.5" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Ex: 07 01 02 03 04"
                          className="w-full pl-9 pr-3.5 py-2 bg-slate-50 text-xs rounded-2xl border-0 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition text-slate-900"
                          required
                        />
                      </div>
                    </div>

                    {/* Adresse avec bouton de récupération de la position actuelle */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-slate-700">
                          {authRole === 'commercant' ? 'Commune & Emplacement boutique *' : 'Quartier / Adresse de livraison *'}
                        </label>
                        <button
                          type="button"
                          onClick={() => handleDetectLocation('register')}
                          disabled={detectingLoc}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 transition border-0 bg-transparent cursor-pointer disabled:opacity-50"
                          title="Récupérer ma position GPS actuelle"
                        >
                          {detectingLoc ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                              <span>Position...</span>
                            </>
                          ) : (
                            <>
                              <Navigation className="w-3 h-3 text-blue-600" />
                              <span>Position actuelle</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="relative flex items-center">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3.5" />
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder={authRole === 'commercant' ? 'Ex: Marcory, Boulevard du Gabon' : 'Ex: Cocody Angré 8ème Tranche'}
                          className="w-full pl-9 pr-3.5 py-2 bg-slate-50 text-xs rounded-2xl border-0 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition text-slate-900"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700">Mot de passe *</label>
                      <div className="relative flex items-center">
                        <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3.5" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Au moins 6 caractères"
                          className="w-full pl-9 pr-3.5 py-2 bg-slate-50 text-xs rounded-2xl border-0 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition text-slate-900"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className={`w-full py-3 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg transition flex items-center justify-center gap-2 border-0 cursor-pointer active:scale-[0.98] ${
                        authRole === 'commercant'
                          ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                          : 'bg-[#2563EB] hover:bg-[#1D4ED8] shadow-blue-600/25'
                      }`}
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <span>Créer mon compte</span>
                      )}
                    </button>
                  </form>
                )}

              </div>
            ) : (
              /* ============================================================== */
              /* CAS 2 : CONNECTÉ -> ESPACE CLIENT OU ESPACE COMMERÇANT */
              /* ============================================================== */
              <div className="space-y-6">
                
                {/* 1. Carte de profil utilisateur */}
                <div className={`p-4 rounded-3xl border-0 shadow-sm ${
                  user.role === 'commercant' ? 'bg-emerald-50/70' : 'bg-blue-50/70'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-md ${
                        user.role === 'commercant' ? 'bg-emerald-600' : 'bg-blue-600'
                      }`}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-sm text-slate-900">{user.name}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            user.role === 'commercant'
                              ? 'bg-emerald-200 text-emerald-900'
                              : 'bg-blue-200 text-blue-900'
                          }`}>
                            {user.role === 'commercant' ? 'Commerçant' : 'Client'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">{user.phone}</p>
                        {user.address && (
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{user.address}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Modification du Profil */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Informations du Profil
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(!isEditingProfile)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 border-0 cursor-pointer bg-transparent"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>{isEditingProfile ? 'Annuler' : 'Modifier'}</span>
                    </button>
                  </div>

                  {isEditingProfile ? (
                    <form onSubmit={handleSaveProfile} className="p-4 bg-slate-50 rounded-2xl space-y-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600">Nom</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white text-xs rounded-xl border-0 text-slate-900"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600">Téléphone</label>
                        <input
                          type="tel"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white text-xs rounded-xl border-0 text-slate-900"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-slate-600">Adresse / Quartier</label>
                          <button
                            type="button"
                            onClick={() => handleDetectLocation('profile')}
                            disabled={detectingLoc}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 transition border-0 bg-transparent cursor-pointer disabled:opacity-50"
                            title="Mettre à jour avec la position GPS actuelle"
                          >
                            <Navigation className="w-3 h-3 text-blue-600" />
                            <span>GPS actuel</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white text-xs rounded-xl border-0 text-slate-900"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600">Email</label>
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white text-xs rounded-xl border-0 text-slate-900"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5 border-0 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Enregistrer les modifications</span>
                      </button>
                    </form>
                  ) : (
                    <div className="p-3.5 bg-slate-50 rounded-2xl space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">Nom :</span>
                        <span className="font-bold text-slate-900">{user.name}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">Téléphone :</span>
                        <span className="font-bold text-slate-900">{user.phone}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">Adresse :</span>
                        <span className="font-bold text-slate-900">{user.address || 'Non renseignée'}</span>
                      </div>
                      {user.email && (
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-slate-400">Email :</span>
                          <span className="font-bold text-slate-900">{user.email}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Historique des Commandes */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {user.role === 'commercant' ? 'Commandes reçues' : 'Historique des commandes'}
                    </h4>
                    <span className="text-[11px] text-slate-400 font-semibold">
                      {orders.length} commande(s)
                    </span>
                  </div>

                  {loadingOrders ? (
                    <div className="p-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Chargement des commandes...</span>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="p-6 bg-slate-50 rounded-2xl text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mx-auto text-slate-400 shadow-sm">
                        <Clock className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">Aucune commande pour l’instant</p>
                      <p className="text-[11px] text-slate-500">
                        {user.role === 'commercant'
                          ? 'Les commandes passées dans votre boutique apparaîtront ici.'
                          : 'Vos commandes passées auprès des commerçants de votre quartier apparaîtront ici.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {orders.map((ord) => {
                        const isPending = ord.status === 'pending';
                        const isAccepted = ord.status === 'accepted';
                        const isCompleted = ord.status === 'completed';
                        const isCancelled = ord.status === 'cancelled';
                        const isRefused = ord.status === 'refused';

                        return (
                          <div
                            key={ord.id}
                            className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl transition border border-slate-200/60 space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-black text-xs text-slate-900">
                                Commande #{ord.id}
                              </span>
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

                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <div className="flex items-center gap-1.5">
                                <Store className="w-3.5 h-3.5 text-blue-600" />
                                <span className="font-medium text-slate-700">{ord.shop || 'Retrait boutique'}</span>
                              </div>
                              <span className="font-black text-blue-600">
                                {new Intl.NumberFormat('fr-FR').format(ord.total_price || ord.total || 0)} FCFA
                              </span>
                            </div>

                            {/* Action de suivi pour le client */}
                            {user.role === 'client' && onTrackOrder && (
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onTrackOrder(ord.id);
                                }}
                                className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                  isPending
                                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                                    : 'bg-white hover:bg-slate-50 text-blue-600 border border-slate-200 shadow-2xs'
                                }`}
                              >
                                <Clock className="w-3.5 h-3.5" />
                                <span>{isPending ? 'Suivre en direct / Annuler' : 'Suivre la commande'}</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 4. Bouton de Déconnexion */}
                <div className="pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      onLogout();
                      setSuccessMessage(null);
                    }}
                    className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs uppercase tracking-wider rounded-2xl transition flex items-center justify-center gap-2 border-0 cursor-pointer active:scale-[0.98]"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Se déconnecter</span>
                  </button>
                </div>

              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
};
