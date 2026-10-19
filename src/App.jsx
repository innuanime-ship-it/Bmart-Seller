import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Package, ShoppingBag, PlusCircle, Trash2, Edit3, MapPin, 
  CheckCircle, Clock, Truck, XCircle, ExternalLink, RefreshCw, 
  LogOut, Shield, Search, Printer, ChevronRight, AlertCircle,
  Settings, PhoneCall, MessageCircle, ArrowLeft, Eye, Copy, QrCode, X, Sparkles,
  Calendar, Layers, Tag, EyeOff, Check, Sliders, ShieldCheck, Lock, ArrowRight,
  TrendingUp, Bell, Zap, Image as ImageIcon
} from 'lucide-react';

const ADMIN_PASS = "IN1511RNB2008";

const SYSTEM_CATEGORIES = [
  "Fashion (Kapde)",
  "Footwear (Joote / Chappal)",
  "Groceries (Rashan / Kirana)",
  "Beauty & Personal Care",
  "Electronics & Mobile Accessories",
  "Kitchen & Home Appliances",
  "Baby Care & Toys",
  "Stationery & Books",
  "Agriculture / Kheti-Badi Seeds & Tools",
  "Pooja Samagri & Festives",
  "Hardware & Tools",
  "Custom / Nayi Category Likhein"
];

const FABRIC_OPTIONS = [
  "Pure Cotton",
  "Linen (Lenin)",
  "Denim / Jeans",
  "Silk",
  "Rayon",
  "Polyester",
  "Chiffon",
  "Georgette",
  "Woolen (Garam Kapda)",
  "Nylon",
  "Cotton Blend / Mixed",
  "Other Fabric"
];
export default function App() {
  useEffect(() => {
    if (!document.getElementById('bmart-native-print-css')) {
      const style = document.createElement('style');
      style.id = 'bmart-native-print-css';
      style.innerHTML = `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-sticker, #printable-sticker * {
            visibility: visible !important;
          }
          #printable-sticker {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 380px !important;
            margin: 0 auto !important;
            padding: 10px !important;
            box-shadow: none !important;
            border: 2px dashed #000 !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          @page {
            size: auto;
            margin: 3mm;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('bmart_seller_logged') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [activeTab, setActiveTab] = useState('orders');

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals States
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);
  const [selectedDamagePhoto, setSelectedDamagePhoto] = useState(null);
  const [printOrder, setPrintOrder] = useState(null);
  const [hideItemInPrint, setHideItemInPrint] = useState(false);
  const [previewProduct, setPreviewProduct] = useState(null);

  // In-App Modern Colorful Toast Notification
  const [appAlert, setAppAlert] = useState(null);
  const showNotification = (title, msg, type = 'info') => {
    setAppAlert({ title, msg, type });
    setTimeout(() => setAppAlert(null), 3500);
  };

  // Modern In-App Confirmation Popup Modal (No browser alerts)
  const [confirmDialog, setConfirmDialog] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryText, setCustomCategoryText] = useState('');

  const [prodForm, setProdForm] = useState({
    title: '',
    description: '',
    category: 'Fashion (Kapde)',
    price: '',
    mrp: '',
    min_quantity: '1',
    delivery_fee: '49',
    sizes: 'S, M, L, XL',
    fabric: 'Pure Cotton',
    mfg_date: '',
    expiry_date: '',
    allow_cancel: true,
    cancel_hours: '12',
    allow_return: true,
    return_days: '7',
    images: [],
    seller_code: 'BM-01',
    upi_id: 'Barijanmart@upi'
  });

  const [settingsForm, setSettingsForm] = useState({
    support_phone: '9204184716',
    whatsapp_url: 'https://wa.me/919204184716',
    facebook_url: 'https://facebook.com',
    instagram_url: 'https://instagram.com'
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
    useEffect(() => {
    if (!isAuthenticated) return;
    fetchOrders();
    fetchProducts();
    fetchAppSettings();

    const ordersChannel = supabase
      .channel('bmart-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    const productsChannel = supabase
      .channel('bmart-products-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(productsChannel);
    };
  }, [isAuthenticated]);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (!error && data) setOrders(data);
    setLoading(false);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (!error && data) setProducts(data);
  };

  const fetchAppSettings = async () => {
    const { data, error } = await supabase.from('app_settings').select('*').single();
    if (!error && data) {
      setSettingsForm({
        support_phone: data.support_phone || '9204184716',
        whatsapp_url: data.whatsapp_url || 'https://wa.me/919204184716',
        facebook_url: data.facebook_url || 'https://facebook.com',
        instagram_url: data.instagram_url || 'https://instagram.com'
      });
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const clean = passwordInput.trim();
    if (!clean) {
      return showNotification("Error", "Password enter karein!", "error");
    }

    if (clean === ADMIN_PASS || clean.toUpperCase() === ADMIN_PASS) {
      setIsAuthenticated(true);
      localStorage.setItem('bmart_seller_logged', 'true');
      setPasswordInput('');
      showNotification("Swagat Hai!", "BMart Seller App me login safal raha.", "success");
    } else {
      showNotification("Access Denied", "Galat Master Password!", "error");
    }
  };

  const handleLogout = () => {
    setConfirmDialog({
      title: "Logout Confirmation",
      msg: "Kya aap seller account se logout karna chahte hain?",
      onConfirm: () => {
        setIsAuthenticated(false);
        localStorage.removeItem('bmart_seller_logged');
        setConfirmDialog(null);
      }
    });
  };

  const handleDeleteProduct = (id) => {
    setConfirmDialog({
      title: "Product Delete Karein?",
      msg: "Yeh product catalog se hamesha ke liye delete ho jayega.",
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          setLoading(true);
          const { error } = await supabase.from('products').delete().eq('id', id);
          if (error) {
            showNotification("Delete Blocked", "Supabase error: " + error.message, "error");
          } else {
            setProducts((prev) => prev.filter((p) => p.id !== id));
            showNotification("Deleted!", "Product permanently delete ho gaya.", "success");
          }
        } catch (err) {
          showNotification("Error", err.message, "error");
        } finally {
          setLoading(false);
          fetchProducts();
        }
      }
    });
  };
    const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 800;
          let width = img.width;
          let height = img.height;
          if (width > height && width > maxDim) {
            height *= maxDim / width;
            width = maxDim;
          } else if (height > maxDim) {
            width *= maxDim / height;
            height = maxDim;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.65);
          setProdForm((prev) => ({ ...prev, images: [...prev.images, compressed] }));
        };
        img.src = readerEvent.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!prodForm.title || !prodForm.price || !prodForm.images.length) {
      return showNotification("Adhoora Form", "Title, Price aur kam se kam 1 Photo anivarya hai!", "error");
    }

    const finalCategory = isCustomCategory ? (customCategoryText.trim() || 'General') : prodForm.category;
    const cancelHoursVal = prodForm.allow_cancel ? Number(prodForm.cancel_hours || 0) : 0;
    const returnDaysVal = prodForm.allow_return ? Number(prodForm.return_days || 0) : 0;

    let dynamicReturnPolicy = "Return Not Allowed";
    if (returnDaysVal > 0) {
      dynamicReturnPolicy = `${returnDaysVal} Din Return / Replacement Policy`;
    }

    const payload = {
      id: editingId || ('p_' + Date.now()),
      title: prodForm.title,
      description: prodForm.description,
      category: finalCategory,
      price: Number(prodForm.price),
      mrp: Number(prodForm.mrp || prodForm.price * 2),
      min_quantity: Number(prodForm.min_quantity || 1),
      delivery_fee: Number(prodForm.delivery_fee || 0),
      sizes: typeof prodForm.sizes === 'string' 
        ? prodForm.sizes.split(',').map((s) => s.trim()).filter(Boolean) 
        : prodForm.sizes,
      fabric: prodForm.fabric || null,
      mfg_date: prodForm.mfg_date || null,
      expiry_date: prodForm.expiry_date || null,
      cancel_hours: cancelHoursVal,
      return_days: returnDaysVal,
      return_policy: dynamicReturnPolicy,
      images: prodForm.images,
      seller_code: prodForm.seller_code || 'BM-01',
      upi_id: prodForm.upi_id || 'Barijanmart@upi'
    };

    setLoading(true);
    const { error } = await supabase.from('products').upsert([payload]);
    setLoading(false);

    if (error) {
      showNotification("Database Error", error.message, "error");
    } else {
      showNotification("Safal", editingId ? "Product Update Ho Gaya!" : "Naya Product Publish Ho Gaya!", "success");
      setEditingId(null);
      setIsCustomCategory(false);
      setCustomCategoryText('');
      setProdForm({
        title: '', description: '', category: 'Fashion (Kapde)', price: '', mrp: '', min_quantity: '1', delivery_fee: '49',
        sizes: 'S, M, L, XL', fabric: 'Pure Cotton', mfg_date: '', expiry_date: '', allow_cancel: true, cancel_hours: '12', 
        allow_return: true, return_days: '7', images: [], seller_code: 'BM-01', upi_id: 'Barijanmart@upi'
      });
      setActiveTab('products');
      fetchProducts();
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) showNotification("Status Error", error.message, "error");
    else {
      showNotification("Updated", `Order status ab "${newStatus}" ho gaya.`, "success");
      fetchOrders();
    }
  };
    const handleDeleteOrder = (orderId) => {
    setConfirmDialog({
      title: "Order Delete Karein?",
      msg: `Order #${orderId} ko delete karne par payment proof aur data hamesha ke liye hat jayega aur database storage khali ho jayegi.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          setLoading(true);
          const { error } = await supabase.from('orders').delete().eq('id', orderId);
          if (error) {
            showNotification("Delete Error", error.message, "error");
          } else {
            setOrders((prev) => prev.filter((o) => o.id !== orderId));
            showNotification("Order Deleted!", `Order #${orderId} delete ho gaya aur space clean ho gaya.`, "success");
          }
        } catch (err) {
          showNotification("Error", err.message, "error");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      const { error } = await supabase.from('app_settings').upsert([{ id: 1, ...settingsForm }]);
      if (error) throw error;
      showNotification("Success", "Customer Care aur Links update ho gaye!", "success");
    } catch (err) {
      showNotification("Settings Error", err.message, "error");
    } finally {
      setSettingsSaving(false);
    }
  };

  // Ultra-Professional Native Mobile App Login UI
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-between items-center p-6 font-sans select-none relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-emerald-500/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Top App Branding */}
        <div className="w-full flex justify-between items-center z-10 pt-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400/80">BMart Core v3.0</span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/60">Barijan Mart</span>
        </div>

        {/* Central Card */}
        <div className="w-full max-w-xs z-10 flex flex-col items-center my-auto">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 flex items-center justify-center shadow-2xl shadow-emerald-500/30 ring-4 ring-emerald-500/20 transform hover:scale-105 transition duration-300">
              <Shield className="text-white drop-shadow-md" size={44} />
            </div>
            <div className="absolute -bottom-1.5 -right-1.5 bg-slate-900 border-2 border-slate-800 p-1.5 rounded-xl shadow">
              <Lock size={14} className="text-emerald-400" />
            </div>
          </div>

          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400 tracking-tight text-center">
            Seller Station
          </h2>
          <p className="text-xs text-slate-400 font-medium text-center mt-1 mb-8 max-w-[220px]">
            Central Store Operations & 15 Rural Villages Hub
          </p>

          <form onSubmit={handleLogin} className="w-full flex flex-col gap-3.5">
            <div className="relative">
              <Lock size={15} className="absolute left-4 top-3.5 text-slate-500" />
              <input 
                type="password" 
                placeholder="Enter Master Password" 
                value={passwordInput} 
                onChange={(e) => setPasswordInput(e.target.value)} 
                className="w-full pl-11 pr-4 py-3 bg-slate-900/90 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-mono tracking-widest shadow-inner transition"
              />
            </div>

            <button 
              type="submit" 
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-slate-950 font-black text-xs rounded-2xl shadow-lg shadow-emerald-500/25 transition duration-200 flex items-center justify-center gap-2"
            >
              <span>Unlock Store Station</span>
              <ArrowRight size={15} />
            </button>
          </form>
        </div>

        {/* Bottom Security Banner */}
        <div className="z-10 text-center pb-2">
          <p className="text-[10px] text-slate-500 font-bold flex items-center justify-center gap-1">
            <ShieldCheck size={12} className="text-emerald-400" /> End-to-End Encrypted Session
          </p>
        </div>
      </div>
    );
  }

  const returnRequests = orders.filter(o => o.status && o.status.includes('Requested'));
  const normalOrders = orders.filter(o => !(o.status && o.status.includes('Requested')));
  const filteredOrders = normalOrders.filter((o) => 
    o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.customer_phone?.includes(searchQuery)
  );
    return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col max-w-md mx-auto shadow-2xl relative pb-24 font-sans select-none">
      
      {/* Native App Top Bar */}
      <header className="bg-slate-900/80 backdrop-blur-xl p-4 sticky top-0 z-40 border-b border-slate-800/80 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-white/10">
            <Package className="text-white" size={20} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black text-white leading-none">BMart Hub</h1>
              <span className="w-2 h-2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20"></span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Rural Doorstep Commerce</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={fetchOrders} className="p-2.5 bg-slate-800/90 hover:bg-slate-800 text-slate-300 rounded-2xl border border-slate-750 active:scale-95 transition">
            <RefreshCw size={14} className={loading ? "animate-spin text-emerald-400" : ""} />
          </button>
          <button onClick={handleLogout} className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/20 active:scale-95 transition" title="Logout">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Floating Animated Toast */}
      {appAlert && (
        <div className="fixed top-16 left-4 right-4 max-w-xs mx-auto z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`p-3 rounded-2xl shadow-2xl flex items-center justify-between text-white border border-white/10 ${
            appAlert.type === 'error' ? 'bg-gradient-to-r from-rose-600 to-red-600 shadow-rose-600/30' : 
            appAlert.type === 'success' ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-600/30' :
            'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-600/30'
          }`}>
            <div className="flex items-center gap-2.5 text-xs font-bold">
              <Sparkles size={16} />
              <div>
                <p className="leading-tight">{appAlert.title}</p>
                <p className="text-[10px] opacity-90">{appAlert.msg}</p>
              </div>
            </div>
            <button onClick={() => setAppAlert(null)} className="p-1 opacity-70 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Main App Content Viewport */}
      <main className="p-4 flex-1">
        {/* 1. ORDERS VIEW */}
        {activeTab === 'orders' && (
          <div className="flex flex-col gap-3.5">
            <div className="relative">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={15} />
              <input 
                type="text" 
                placeholder="Order ID, Name ya Mobile se khojein..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white outline-none focus:border-emerald-500 shadow-inner"
              />
            </div>

            {filteredOrders.length === 0 ? (
              <div className="text-center bg-slate-900/50 rounded-3xl p-12 border border-dashed border-slate-800 flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-slate-800/80 flex items-center justify-center mb-3 text-slate-500">
                  <Package size={28} />
                </div>
                <p className="text-slate-300 text-xs font-black">Koi live order nahi hai</p>
                <p className="text-slate-500 text-[10px] mt-0.5">Naye orders aate hi realtime update hoga</p>
              </div>
            ) : (
              filteredOrders.map((o) => (
                <div key={o.id} className="bg-gradient-to-b from-slate-900 to-slate-900/90 border border-slate-800/80 rounded-3xl p-4 shadow-xl flex flex-col gap-3 relative overflow-hidden">
                  <div className="flex justify-between items-start border-b border-slate-800/60 pb-2.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-xs text-emerald-400 tracking-wider">#{o.id}</span>
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded-md">COD</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">{new Date(o.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                      o.status === 'Delivered' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
                      o.status === 'Shipped' ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' :
                      o.status === 'Cancelled' || o.status === 'Cancel Approved' ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' : 
                      'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}>
                      {o.status || 'Order Placed'}
                    </span>
                  </div>

                  {/* Customer Card */}
                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 text-xs flex flex-col gap-1">
                    <p className="font-black text-sm text-white">{o.customer_name}</p>
                    <div className="flex gap-2 text-slate-400 text-[11px] font-medium">
                      <span>📞 <a href={"tel:" + o.customer_phone} className="text-emerald-400 font-bold underline">{o.customer_phone}</a></span>
                      {o.alt_phone && <span>(Alt: <a href={"tel:" + o.alt_phone} className="underline text-slate-300">{o.alt_phone}</a>)</span>}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">🏡 {o.full_address}</p>
                  </div>

                  {/* Order Contents */}
                  <div className="flex flex-col gap-1.5 bg-slate-950/40 border border-slate-800/80 rounded-2xl p-2.5">
                    {o.items?.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1 border-b last:border-none border-slate-800/60">
                        <div className="flex items-center gap-2">
                          <img src={it.images?.[0] || 'https://via.placeholder.com/40'} className="w-8 h-8 rounded-lg object-contain bg-slate-900 border border-slate-800" alt="prod" />
                          <span className="font-bold text-slate-200 text-[11px] truncate max-w-[160px]">{it.title} ({it.size || 'Std'})</span>
                        </div>
                        <span className="text-[11px] font-black text-slate-300">x{it.quantity || 1} = ₹{it.price * (it.quantity || 1)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center text-xs px-1">
                    <span className="text-slate-400">Advance Paid: <b className="text-emerald-400 font-bold">₹{o.delivery_fee_paid || 0}</b></span>
                    <span className="text-slate-400">COD Due: <b className="text-white font-black text-sm">₹{o.total_price || 0}</b></span>
                  </div>

                  {/* Primary App Buttons */}
                  <div className="flex gap-2 pt-1">
                    <button 
                      onClick={() => { setHideItemInPrint(false); setPrintOrder(o); }}
                      className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/20 active:scale-95 transition"
                    >
                      <Printer size={14} /> 🏷️ Print Parcel Sticker
                    </button>

                    <button 
                      onClick={() => handleDeleteOrder(o.id)}
                      className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-2xl text-xs font-bold flex items-center gap-1 active:scale-95 transition"
                      title="Permanent Delete"
                    >
                      <Trash2 size={14} /> Delete
                    </button>

                    {o.screenshot && (
                      <button onClick={() => setSelectedScreenshot(o.screenshot)} className="px-3 py-2 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-2xl text-xs font-bold active:scale-95">
                        Slip
                      </button>
                    )}
                    {o.location?.mapsUrl && (
                      <a href={o.location.mapsUrl} target="_blank" rel="noreferrer" className="px-3 py-2 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-2xl text-xs font-bold active:scale-95">
                        GPS
                      </a>
                    )}
                  </div>

                  {/* Quick Status Buttons */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-800/80">
                    <button onClick={() => updateOrderStatus(o.id, 'Processing')} className="py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 rounded-xl text-[10px] font-black transition">Processing</button>
                    <button onClick={() => updateOrderStatus(o.id, 'Shipped')} className="py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 rounded-xl text-[10px] font-black transition">Shipped</button>
                    <button onClick={() => updateOrderStatus(o.id, 'Delivered')} className="py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 rounded-xl text-[10px] font-black transition">Delivered</button>
                    <button onClick={() => updateOrderStatus(o.id, 'Cancelled')} className="py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded-xl text-[10px] font-black transition">Cancel</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
                {/* 2. RETURNS & REPLACEMENT VIEW */}
        {activeTab === 'returns' && (
          <div className="flex flex-col gap-3.5">
            <div className="p-3.5 bg-gradient-to-r from-rose-500/20 to-red-500/10 border border-rose-500/30 rounded-3xl text-rose-300 text-xs font-bold flex items-center justify-between shadow-lg shadow-rose-950/30">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-rose-500/20 text-rose-400"><RefreshCw size={14} /></span>
                <span>Return & Replacement Desk</span>
              </div>
              <span className="bg-rose-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-black shadow">{returnRequests.length}</span>
            </div>

            {returnRequests.length === 0 ? (
              <div className="text-center bg-slate-900/50 rounded-3xl p-12 border border-dashed border-slate-800 flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-slate-800/80 flex items-center justify-center mb-3 text-emerald-400">
                  <CheckCircle size={28} />
                </div>
                <p className="text-slate-300 text-xs font-black">Koi pending request nahi hai</p>
                <p className="text-slate-500 text-[10px] mt-0.5">Sabhi returns aur replacements clear hain</p>
              </div>
            ) : (
              returnRequests.map((o) => (
                <div key={o.id} className="bg-slate-900 border-2 border-rose-500/30 p-4 rounded-3xl shadow-xl flex flex-col gap-3">
                  <div className="flex justify-between items-start border-b border-slate-800 pb-2">
                    <div>
                      <span className="font-black text-xs text-rose-400">#{o.id}</span>
                      <p className="text-[10px] text-slate-400">{o.customer_name} (📞 {o.customer_phone})</p>
                    </div>
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {o.return_info?.type || o.status}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-950/70 rounded-2xl text-xs">
                    <p className="font-bold text-slate-300">Karan (Reason):</p>
                    <p className="text-[11px] text-slate-400 italic mt-0.5">{o.return_info?.reason || 'Karan likha nahi hai'}</p>
                  </div>

                  {o.return_info?.product_photo && (
                    <div className="flex items-center justify-between p-2.5 bg-rose-950/20 rounded-2xl border border-rose-500/20">
                      <div className="flex items-center gap-2">
                        <img src={o.return_info.product_photo} className="w-11 h-11 rounded-xl object-cover border border-rose-500/40" alt="Damage" />
                        <div>
                          <p className="text-[11px] font-black text-rose-300">Product Damage Slip</p>
                          <p className="text-[9px] text-slate-400">Customer proof photo</p>
                        </div>
                      </div>
                      <button onClick={() => setSelectedDamagePhoto(o.return_info.product_photo)} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-black active:scale-95 transition">
                        Badi Photo
                      </button>
                    </div>
                  )}

                  {o.return_info?.type?.includes('वापस') && (
                    <div className="p-3 bg-emerald-950/30 rounded-2xl border border-emerald-500/30 text-xs">
                      <p className="font-bold text-emerald-400">Refund Method: {o.return_info?.refund_method?.toUpperCase()}</p>
                      {o.return_info?.refund_method === 'upi' ? (
                        <p className="text-emerald-300 font-mono font-bold mt-1">UPI ID: {o.return_info?.refund_details?.upi}</p>
                      ) : (
                        <div className="text-[10px] text-emerald-300 font-mono mt-1 leading-tight">
                          <p>A/C: {o.return_info?.refund_details?.accountNo}</p>
                          <p>IFSC: {o.return_info?.refund_details?.ifsc} | Name: {o.return_info?.refund_details?.holderName}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button onClick={() => updateOrderStatus(o.id, 'Return Approved & Refunded')} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-600/20 active:scale-95 transition">
                      ✓ Approve Refund
                    </button>
                    <button onClick={() => updateOrderStatus(o.id, 'Replacement Shipped')} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-blue-600/20 active:scale-95 transition">
                      🔄 Dispatch Replace
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 3. CATALOG PRODUCTS VIEW */}
        {activeTab === 'products' && (
          <div className="flex flex-col gap-3.5">
            <div className="flex justify-between items-center px-1">
              <div>
                <h3 className="text-xs font-black text-white">Store Catalog</h3>
                <p className="text-[10px] text-slate-400">{products.length} live products in database</p>
              </div>
              <button 
                onClick={() => { setEditingId(null); setIsCustomCategory(false); setActiveTab('add_product'); }} 
                className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 text-xs font-black rounded-2xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition"
              >
                <PlusCircle size={15} /> Naya Saman Jodein
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {products.map((p) => (
                <div key={p.id} className="bg-slate-900 border border-slate-800 p-3.5 rounded-3xl flex gap-3.5 items-center justify-between shadow-md hover:border-slate-750 transition">
                  <img 
                    src={p.images?.[0] || 'https://via.placeholder.com/60'} 
                    alt={p.title} 
                    onClick={() => setPreviewProduct(p)}
                    className="w-16 h-16 rounded-2xl object-contain bg-slate-950 border border-slate-800 cursor-pointer hover:scale-105 transition" 
                  />
                  <div className="flex-1 min-w-0 text-xs cursor-pointer" onClick={() => setPreviewProduct(p)}>
                    <h4 className="font-bold text-white truncate flex items-center gap-1.5">
                      {p.title} <Eye size={13} className="text-slate-400" />
                    </h4>
                    <p className="text-slate-400 text-[11px] mt-0.5">Price: <b className="text-emerald-400">₹{p.price}</b> | Min Qty: <b>{p.min_quantity || 1}</b></p>
                    <span className="text-[10px] bg-slate-800 text-emerald-300 px-2 py-0.5 rounded-full font-medium inline-block mt-1">
                      {p.category}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => {
                        setEditingId(p.id);
                        setProdForm({
                          ...p,
                          allow_cancel: Number(p.cancel_hours || 0) > 0,
                          allow_return: Number(p.return_days || 0) > 0
                        });
                        if (!SYSTEM_CATEGORIES.includes(p.category)) {
                          setIsCustomCategory(true);
                          setCustomCategoryText(p.category);
                        } else {
                          setIsCustomCategory(false);
                        }
                        setActiveTab('add_product');
                      }} 
                      className="p-2.5 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-2xl active:scale-90 transition"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button onClick={() => handleDeleteProduct(p.id)} className="p-2.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-2xl active:scale-90 transition">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
                {/* 4. ADD / EDIT PRODUCT FORM */}
        {activeTab === 'add_product' && (
          <form onSubmit={handleSaveProduct} className="bg-slate-900 p-4 rounded-3xl border border-slate-800 shadow-2xl flex flex-col gap-3.5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
              <div>
                <h3 className="font-black text-xs text-emerald-400">{editingId ? 'Edit Product Item' : 'Naya Catalog Product Jodein'}</h3>
                <p className="text-[10px] text-slate-400">Doorstep delivery catalog listing</p>
              </div>
              <button type="button" onClick={() => setActiveTab('products')} className="text-xs font-bold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-xl">Cancel</button>
            </div>

            <input 
              type="text" 
              placeholder="Product Title *" 
              value={prodForm.title} 
              onChange={(e) => setProdForm({ ...prodForm, title: e.target.value })} 
              className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-2xl text-white outline-none focus:border-emerald-500" 
            />

            <textarea 
              placeholder="Product Description (Quality, usage, features)..." 
              value={prodForm.description} 
              onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })} 
              className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-2xl text-white outline-none focus:border-emerald-500" 
              rows={2} 
            />

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Select Category *</label>
              <select 
                value={isCustomCategory ? "Custom / Nayi Category Likhein" : prodForm.category} 
                onChange={(e) => {
                  if (e.target.value === "Custom / Nayi Category Likhein") {
                    setIsCustomCategory(true);
                  } else {
                    setIsCustomCategory(false);
                    setProdForm({ ...prodForm, category: e.target.value });
                  }
                }} 
                className="w-full px-3 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-2xl text-white font-medium outline-none"
              >
                {SYSTEM_CATEGORIES.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {isCustomCategory && (
              <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl">
                <label className="text-[10px] font-bold text-emerald-300 block mb-1">Apni Nayi Category Ka Naam Likhein *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Dairy / Doodh Products, Sports Gear..." 
                  value={customCategoryText} 
                  onChange={(e) => setCustomCategoryText(e.target.value)} 
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-emerald-500 rounded-xl text-white" 
                />
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[9px] font-bold text-slate-400">Sell Price (₹) *</label>
                <input type="number" value={prodForm.price} onChange={(e) => setProdForm({ ...prodForm, price: e.target.value })} className="w-full px-2.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-2xl text-emerald-400 font-bold" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400">MRP (₹)</label>
                <input type="number" value={prodForm.mrp} onChange={(e) => setProdForm({ ...prodForm, mrp: e.target.value })} className="w-full px-2.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-2xl text-slate-300" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400">Min Order Qty *</label>
                <input type="number" value={prodForm.min_quantity} onChange={(e) => setProdForm({ ...prodForm, min_quantity: e.target.value })} className="w-full px-2.5 py-2 text-xs bg-amber-950/40 border border-amber-500/40 rounded-2xl text-amber-300 font-bold" />
              </div>
            </div>

            {(prodForm.category?.includes('Fashion') || customCategoryText.toLowerCase().includes('kapde')) && (
              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400">Sizes (comma separated)</label>
                    <input type="text" value={Array.isArray(prodForm.sizes) ? prodForm.sizes.join(', ') : prodForm.sizes} onChange={(e) => setProdForm({ ...prodForm, sizes: e.target.value })} className="w-full px-2.5 py-2 text-xs bg-slate-900 border border-slate-800 rounded-2xl text-white" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400">Fabric / Material</label>
                    <select 
                      value={prodForm.fabric || 'Pure Cotton'} 
                      onChange={(e) => setProdForm({ ...prodForm, fabric: e.target.value })} 
                      className="w-full px-2.5 py-2 text-xs bg-slate-900 border border-slate-800 rounded-2xl text-white font-medium"
                    >
                      {FABRIC_OPTIONS.map((f, i) => (
                        <option key={i} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {(prodForm.category?.includes('Groceries') || prodForm.category?.includes('Beauty') || customCategoryText.toLowerCase().includes('food')) && (
              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1"><Calendar size={13} /> Food / Grocery Validity:</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400">Manufactured Date (Mfg)</label>
                    <input type="date" value={prodForm.mfg_date || ''} onChange={(e) => setProdForm({ ...prodForm, mfg_date: e.target.value })} className="w-full px-2 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400">Expiry Date (Exp)</label>
                    <input type="date" value={prodForm.expiry_date || ''} onChange={(e) => setProdForm({ ...prodForm, expiry_date: e.target.value })} className="w-full px-2 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-xl text-rose-300 font-bold" />
                  </div>
                </div>
              </div>
            )}

            <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col gap-2.5">
              <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1"><Clock size={13} /> Manchaha Time Limit Set Karein:</span>

              <div className="p-2.5 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-300">Order Cancellation Allowed?</span>
                  <button 
                    type="button" 
                    onClick={() => setProdForm({ ...prodForm, allow_cancel: !prodForm.allow_cancel })}
                    className={`px-3 py-1 rounded-full text-[9px] font-black transition ${
                      prodForm.allow_cancel ? 'bg-emerald-600 text-white' : 'bg-slate-750 text-slate-400'
                    }`}
                  >
                    {prodForm.allow_cancel ? "YES (Active)" : "NO (Disabled)"}
                  </button>
                </div>
                {prodForm.allow_cancel && (
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1">Kitne Ghante Tak Cancel Kar Sakega? (Hours Dalein)</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        min="1" 
                        placeholder="e.g. 2, 6, 18, 24" 
                        value={prodForm.cancel_hours} 
                        onChange={(e) => setProdForm({ ...prodForm, cancel_hours: e.target.value })} 
                        className="flex-1 px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-bold" 
                      />
                      <span className="text-xs font-bold text-slate-400">Ghante (Hours)</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-2.5 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-300">Return / Replacement Allowed?</span>
                  <button 
                    type="button" 
                    onClick={() => setProdForm({ ...prodForm, allow_return: !prodForm.allow_return })}
                    className={`px-3 py-1 rounded-full text-[9px] font-black transition ${
                      prodForm.allow_return ? 'bg-emerald-600 text-white' : 'bg-slate-750 text-slate-400'
                    }`}
                  >
                    {prodForm.allow_return ? "YES (Active)" : "NO (Disabled)"}
                  </button>
                </div>
                {prodForm.allow_return && (
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1">Delivery Ke Kitne Din Baad Tak Return Ho Sakega? (Days Dalein)</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        min="1" 
                        placeholder="e.g. 3, 5, 7, 15" 
                        value={prodForm.return_days} 
                        onChange={(e) => setProdForm({ ...prodForm, return_days: e.target.value })} 
                        className="flex-1 px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-bold" 
                      />
                      <span className="text-xs font-bold text-slate-400">Din (Days)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-bold text-slate-400">Advance Delivery Fee (₹)</label>
                <input type="number" value={prodForm.delivery_fee} onChange={(e) => setProdForm({ ...prodForm, delivery_fee: e.target.value })} className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400">UPI ID</label>
                <input type="text" value={prodForm.upi_id || 'Barijanmart@upi'} onChange={(e) => setProdForm({ ...prodForm, upi_id: e.target.value })} className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white font-mono" />
              </div>
            </div>

            <label className="p-4 border-2 border-dashed border-emerald-500/40 rounded-3xl cursor-pointer text-center text-xs text-emerald-400 font-bold bg-emerald-950/20 hover:bg-emerald-950/30 transition flex flex-col items-center gap-1">
              <ImageIcon size={20} />
              <span>Click to Upload Product Photos ({prodForm.images?.length || 0} Attached)</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
            </label>

            <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs rounded-2xl shadow-lg shadow-emerald-500/20 transition active:scale-95">
              {loading ? "Syncing..." : (editingId ? "Update Product" : "Publish to Customer App")}
            </button>
          </form>
        )}
                {/* 5. APP SETTINGS VIEW */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="bg-slate-900 p-4 rounded-3xl border border-slate-800 shadow-xl flex flex-col gap-3.5">
            <h3 className="font-black text-xs text-emerald-400 border-b border-slate-800 pb-2.5">Customer Care & Store Settings</h3>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Support Calling Phone Number *</label>
              <input 
                type="tel" 
                value={settingsForm.support_phone} 
                onChange={(e) => setSettingsForm({ ...settingsForm, support_phone: e.target.value })} 
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-2xl text-white font-mono font-bold" 
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Official WhatsApp Link *</label>
              <input 
                type="text" 
                value={settingsForm.whatsapp_url} 
                onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp_url: e.target.value })} 
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-2xl text-white font-mono text-[11px]" 
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Facebook Page URL</label>
              <input 
                type="text" 
                value={settingsForm.facebook_url} 
                onChange={(e) => setSettingsForm({ ...settingsForm, facebook_url: e.target.value })} 
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-2xl text-white font-mono text-[11px]" 
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Instagram Page URL</label>
              <input 
                type="text" 
                value={settingsForm.instagram_url} 
                onChange={(e) => setSettingsForm({ ...settingsForm, instagram_url: e.target.value })} 
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-2xl text-white font-mono text-[11px]" 
              />
            </div>

            <button type="submit" disabled={settingsSaving} className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition">
              {settingsSaving ? "Saving..." : "Save Store Details"}
            </button>
          </form>
        )}
      </main>

      {/* BIG PRODUCT PREVIEW MODAL */}
      {previewProduct && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setPreviewProduct(null)}>
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-5 shadow-2xl flex flex-col gap-3.5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
              <span className="font-black text-xs text-emerald-400">Product Visual Preview</span>
              <button onClick={() => setPreviewProduct(null)} className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-xl"><X size={15} /></button>
            </div>

            <div className="w-full h-64 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800 p-2">
              <img src={previewProduct.images?.[0] || 'https://via.placeholder.com/300'} alt={previewProduct.title} className="w-full h-full object-contain rounded-xl" />
            </div>

            <div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">{previewProduct.category}</span>
              <h3 className="font-black text-base text-white mt-1.5 leading-snug">{previewProduct.title}</h3>
              <p className="text-xs text-slate-400 mt-1 whitespace-pre-line leading-relaxed">{previewProduct.description}</p>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col gap-2 text-xs">
              <div className="flex justify-between"><span>Selling Price:</span><b className="text-emerald-400 text-sm">₹{previewProduct.price}</b></div>
              {previewProduct.mrp > previewProduct.price && <div className="flex justify-between text-slate-400"><span>MRP:</span><del>₹{previewProduct.mrp}</del></div>}
              <div className="flex justify-between"><span>Minimum Order:</span><b>{previewProduct.min_quantity || 1} Piece</b></div>
              {previewProduct.fabric && <div className="flex justify-between"><span>Fabric / Material:</span><b className="text-amber-300">{previewProduct.fabric}</b></div>}
              {previewProduct.mfg_date && <div className="flex justify-between"><span>Mfg Date:</span><b>{previewProduct.mfg_date}</b></div>}
              {previewProduct.expiry_date && <div className="flex justify-between"><span>Expiry Date:</span><b className="text-rose-400">{previewProduct.expiry_date}</b></div>}
              <div className="flex justify-between border-t border-slate-800 pt-2 text-[11px] text-slate-400">
                <span>Cancel Window: {Number(previewProduct.cancel_hours || 0) > 0 ? `${previewProduct.cancel_hours} Ghante` : 'Not Allowed'}</span>
                <span>Return Window: {Number(previewProduct.return_days || 0) > 0 ? `${previewProduct.return_days} Din` : 'Not Allowed'}</span>
              </div>
            </div>

            <button onClick={() => setPreviewProduct(null)} className="w-full py-3 bg-slate-800 hover:bg-slate-750 text-white rounded-2xl text-xs font-bold active:scale-95 transition">
              Close Preview
            </button>
          </div>
        </div>
      )}
            {/* 🏷️ 1-PAGE EXACT PRINT MODAL (WITH PRIVACY TOGGLE) */}
      {printOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-white text-slate-900 w-full max-w-sm rounded-3xl p-4 shadow-2xl flex flex-col gap-3 max-h-[95vh] overflow-y-auto">
            
            <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-2xl text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                {hideItemInPrint ? <EyeOff size={15} className="text-rose-600" /> : <Eye size={15} className="text-emerald-600" />}
                Parcel Label Privacy:
              </span>
              <button 
                onClick={() => setHideItemInPrint(!hideItemInPrint)} 
                className={`px-3 py-1 rounded-xl text-[10px] font-black transition ${
                  hideItemInPrint ? 'bg-rose-600 text-white shadow' : 'bg-slate-200 text-slate-800'
                }`}
              >
                {hideItemInPrint ? "Hidden (Confidential)" : "Show Item Name"}
              </button>
            </div>

            <div id="printable-sticker" className="border-2 border-dashed border-slate-900 p-3.5 rounded-2xl bg-white text-slate-900 font-sans">
              <div className="border-b-2 border-slate-900 pb-2 mb-2 flex justify-between items-center">
                <div>
                  <h2 className="text-base font-black tracking-tight leading-none text-red-700">BARIJAN MART</h2>
                  <p className="text-[8px] font-bold text-slate-600 uppercase mt-0.5">Rural Doorstep Commerce • 15 Villages</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black border border-slate-900 px-1 py-0.5 rounded bg-slate-100">EXP-PARCEL</span>
                  <p className="text-[8px] font-mono mt-0.5 font-bold">#{printOrder.id}</p>
                </div>
              </div>

              <div className="border-b border-slate-300 pb-2 mb-2 text-xs">
                <span className="text-[8px] font-black text-slate-500 uppercase block mb-0.5">DELIVER TO (CUSTOMER):</span>
                <p className="font-black text-xs text-slate-900">{printOrder.customer_name}</p>
                <p className="font-bold text-[10px] text-slate-800 mt-0.5">📞 {printOrder.customer_phone} {printOrder.alt_phone && ` / ${printOrder.alt_phone}`}</p>
                <p className="text-[9px] text-slate-700 mt-0.5 leading-snug font-medium whitespace-pre-line">{printOrder.full_address}</p>
              </div>

              <div className="border-b border-slate-300 pb-2 mb-2 text-xs">
                <span className="text-[8px] font-black text-slate-500 uppercase block mb-0.5">PARCEL CONTENTS:</span>
                {hideItemInPrint ? (
                  <div className="p-1.5 bg-slate-100 rounded text-[9px] font-mono font-bold text-slate-600 text-center">
                    🔒 CONFIDENTIAL PARCEL (BM-SECURE-{printOrder.id})
                  </div>
                ) : (
                  printOrder.items?.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-[9px] py-0.5 font-medium">
                      <span className="truncate max-w-[170px]">{it.title} ({it.size || 'Std'})</span>
                      <span className="font-black">Qty: {it.quantity || 1}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 bg-slate-100 rounded-xl border border-slate-300 flex justify-between items-center mb-1.5">
                <div>
                  <span className="text-[8px] font-black text-slate-600 uppercase block">CASH ON DELIVERY (COD):</span>
                  <span className="text-base font-black text-slate-900">₹{printOrder.total_price || 0}</span>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-bold text-emerald-800">ADV PAID</span>
                  <p className="text-[11px] font-black text-emerald-700">✓ ₹{printOrder.delivery_fee_paid || 0}</p>
                </div>
              </div>

              <div className="text-center pt-1 border-t border-slate-200">
                <p className="text-[8px] font-bold text-slate-800">Customer Care: {settingsForm.support_phone}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => window.print()}
                className="flex-1 py-3 bg-slate-900 hover:bg-black text-white rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
              >
                <Printer size={15} /> 1-Page Exact Print
              </button>
              <button onClick={() => setPrintOrder(null)} className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold active:scale-95">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slip Image View Modal */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setSelectedScreenshot(null)}>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl max-w-xs shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <img src={selectedScreenshot} alt="Payment Proof" className="w-full h-auto object-contain rounded-2xl max-h-[70vh]" />
            <button onClick={() => setSelectedScreenshot(null)} className="w-full mt-3 py-2.5 bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold rounded-2xl active:scale-95">Band Karein</button>
          </div>
        </div>
      )}

      {/* Customer Damage Photo Modal */}
      {selectedDamagePhoto && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setSelectedDamagePhoto(null)}>
          <div className="bg-slate-900 border border-rose-500/30 p-4 rounded-3xl max-w-xs shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-black text-rose-400 mb-2">Customer Damage Item Photo:</p>
            <img src={selectedDamagePhoto} alt="Damage Proof" className="w-full h-auto object-contain rounded-2xl max-h-[70vh]" />
            <button onClick={() => setSelectedDamagePhoto(null)} className="w-full mt-3 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-2xl active:scale-95">Band Karein</button>
          </div>
        </div>
      )}

      {/* Custom Confirmation Popup Modal (Replaces window.confirm) */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl max-w-xs shadow-2xl flex flex-col gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
              <AlertCircle size={24} />
            </div>
            <h4 className="font-black text-sm text-white">{confirmDialog.title}</h4>
            <p className="text-xs text-slate-400 leading-relaxed">{confirmDialog.msg}</p>
            <div className="flex gap-2 mt-2">
              <button 
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs rounded-2xl active:scale-95 transition"
              >
                Nahi
              </button>
              <button 
                onClick={confirmDialog.onConfirm}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-2xl shadow-lg shadow-rose-600/30 active:scale-95 transition"
              >
                Haan, Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern App Dock / Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/90 backdrop-blur-2xl border-t border-slate-800/80 flex justify-around py-2.5 z-40 text-slate-400 shadow-2xl">
        <button onClick={() => setActiveTab('orders')} className={`flex flex-col items-center gap-1 relative px-3 py-1 rounded-2xl transition ${activeTab === 'orders' ? 'text-emerald-400 font-black' : 'hover:text-slate-200'}`}>
          <Package size={20} className={activeTab === 'orders' ? 'drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]' : ''} />
          <span className="text-[10px]">Orders</span>
          {normalOrders.length > 0 && <span className="absolute -top-1 -right-0.5 bg-emerald-500 text-slate-950 text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow">{normalOrders.length}</span>}
        </button>

        <button onClick={() => setActiveTab('returns')} className={`flex flex-col items-center gap-1 relative px-3 py-1 rounded-2xl transition ${activeTab === 'returns' ? 'text-rose-400 font-black' : 'hover:text-slate-200'}`}>
          <RefreshCw size={20} className={activeTab === 'returns' ? 'drop-shadow-[0_0_8px_rgba(251,113,133,0.5)]' : ''} />
          <span className="text-[10px]">Returns</span>
          {returnRequests.length > 0 && <span className="absolute -top-1 -right-0.5 bg-rose-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow animate-pulse">{returnRequests.length}</span>}
        </button>

        <button onClick={() => setActiveTab('products')} className={`flex flex-col items-center gap-1 px-3 py-1 rounded-2xl transition ${activeTab === 'products' || activeTab === 'add_product' ? 'text-emerald-400 font-black' : 'hover:text-slate-200'}`}>
          <ShoppingBag size={20} className={activeTab === 'products' || activeTab === 'add_product' ? 'drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]' : ''} />
          <span className="text-[10px]">Catalog</span>
        </button>

        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 px-3 py-1 rounded-2xl transition ${activeTab === 'settings' ? 'text-emerald-400 font-black' : 'hover:text-slate-200'}`}>
          <Settings size={20} className={activeTab === 'settings' ? 'drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]' : ''} />
          <span className="text-[10px]">Settings</span>
        </button>
      </nav>
    </div>
  );
                  }
        
      
                
                                                 
                    
      
  
    
  

