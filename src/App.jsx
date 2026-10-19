import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Package, ShoppingBag, PlusCircle, Trash2, Edit3, MapPin, 
  CheckCircle, Clock, Truck, XCircle, ExternalLink, RefreshCw, 
  LogOut, Shield, Search, Printer, ChevronRight, AlertCircle,
  Settings, PhoneCall, MessageCircle, ArrowLeft, Eye, Copy, QrCode, X, Sparkles,
  Calendar, Layers, Tag, EyeOff, Check, Sliders, ShieldCheck
} from 'lucide-react';

const ADMIN_SECRET_HASH = "1e1ec10313f898399e5a8bc5bebb8b668ce09e13d711b7a2d677846cf3486c8f";

const computeSha256 = async (inputStr) => {
  const enc = new TextEncoder().encode(inputStr);
  const hashBuf = await crypto.subtle.digest('SHA-256', enc);
  const arr = Array.from(new Uint8Array(hashBuf));
  return arr.map(b => b.toString(16).padStart(2, '0')).join('');
};

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
    if (!document.getElementById('bmart-print-stylesheet')) {
      const style = document.createElement('style');
      style.id = 'bmart-print-stylesheet';
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

  const [selectedScreenshot, setSelectedScreenshot] = useState(null);
  const [selectedDamagePhoto, setSelectedDamagePhoto] = useState(null);
  const [printOrder, setPrintOrder] = useState(null);
  const [hideItemInPrint, setHideItemInPrint] = useState(false);
  const [previewProduct, setPreviewProduct] = useState(null);

  const [appAlert, setAppAlert] = useState(null);
  const showNotification = (title, msg, type = 'info') => {
    setAppAlert({ title, msg, type });
    setTimeout(() => setAppAlert(null), 3500);
  };

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

  const handleLogin = async (e) => {
    e.preventDefault();
    const clean = passwordInput.trim();
    if (!clean) return showNotification("Error", "Password enter karein!", "error");

    try {
      const hashed = await computeSha256(clean);
      if (hashed === ADMIN_SECRET_HASH) {
        setIsAuthenticated(true);
        localStorage.setItem('bmart_seller_logged', 'true');
        setPasswordInput('');
        showNotification("Swagat Hai!", "BMart Seller App me login safal raha.", "success");
      } else {
        showNotification("Access Denied", "Galat Master Password!", "error");
      }
    } catch (err) {
      showNotification("Error", "Crypto verification me dikkat aayi.", "error");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('bmart_seller_logged');
  };

  const handleDeleteProduct = async (id) => {
    const confirmDelete = window.confirm("⚠️ Kya aap is product ko database se hamesha ke liye hatana chahte hain?");
    if (!confirmDelete) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) {
        showNotification("Delete Blocked", "Supabase policy error: " + error.message, "error");
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
    const handleDeleteOrder = async (orderId) => {
    const confirmDelete = window.confirm(
      `⚠️ Kya aap Order #${orderId} ko hamesha ke liye DELETE karna chahte hain?\n\nIsse payment screenshot aur sara data Supabase se hat jayega aur database storage khali ho jayegi.`
    );
    if (!confirmDelete) return;

    try {
      setLoading(true);
      const { error } = await supabase.from('orders').delete().eq('id', orderId);
      if (error) {
        showNotification("Delete Error", error.message, "error");
      } else {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        showNotification("Order Deleted!", `Order #${orderId} delete ho gaya aur space khali ho gaya.`, "success");
      }
    } catch (err) {
      showNotification("Error", err.message, "error");
    } finally {
      setLoading(false);
    }
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans select-none">
        {appAlert && (
          <div className="fixed top-5 left-4 right-4 max-w-xs mx-auto z-50 animate-bounce">
            <div className={`p-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-white ${
              appAlert.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
            }`}>
              <AlertCircle size={20} className="shrink-0" />
              <div className="text-xs font-bold">
                <p>{appAlert.title}</p>
                <p className="opacity-90">{appAlert.msg}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="bg-slate-900 border border-slate-800 w-full max-w-xs rounded-3xl p-6 text-white shadow-2xl flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-3">
            <Shield className="text-white" size={32} />
          </div>
          <h2 className="text-xl font-black text-emerald-400">BMart Seller OS</h2>
          <p className="text-[11px] text-slate-400 mb-6 font-medium text-center">Central Store & Operations Portal</p>
          <div className="w-full mb-4">
            <label className="text-[11px] font-bold text-slate-300 block mb-1.5">Seller Master Password</label>
            <input 
              type="password" 
              placeholder="Master key enter karein" 
              value={passwordInput} 
              onChange={(e) => setPasswordInput(e.target.value)} 
              className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-xs outline-none focus:border-emerald-400 text-white font-mono tracking-wider transition"
            />
          </div>
          <button type="submit" className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 font-black text-xs rounded-2xl shadow-lg active:scale-95 transition flex items-center justify-center gap-2">
            <Sparkles size={16} /> Secure Portal Login
          </button>
        </form>
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col max-w-md mx-auto shadow-2xl relative pb-20 font-sans select-none">
      <header className="bg-slate-900/90 backdrop-blur-md p-4 sticky top-0 z-40 border-b border-slate-800 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md">
            <Package className="text-white" size={20} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black text-white leading-none">BMart Seller</h1>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Barijan Mart 15 Villages Network</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={fetchOrders} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition">
            <RefreshCw size={15} className={loading ? "animate-spin text-emerald-400" : ""} />
          </button>
          <button onClick={handleLogout} className="p-2 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white rounded-xl transition" title="Logout">
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {appAlert && (
        <div className="fixed top-16 left-4 right-4 max-w-xs mx-auto z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`p-3 rounded-2xl shadow-2xl flex items-center justify-between text-white ${
            appAlert.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
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

      <main className="p-3.5 flex-1">
        {activeTab === 'orders' && (
          <div className="flex flex-col gap-3">
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
              <div className="text-center bg-slate-900/50 rounded-3xl p-10 border border-dashed border-slate-800">
                <Package className="mx-auto text-slate-600 mb-2" size={32} />
                <p className="text-slate-400 text-xs font-bold">Koi live order nahi mila.</p>
              </div>
            ) : (
              filteredOrders.map((o) => (
                <div key={o.id} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col gap-3">
                  <div className="flex justify-between items-start border-b border-slate-800 pb-2.5">
                    <div>
                      <span className="font-black text-xs text-emerald-400">#{o.id}</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">{new Date(o.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                      o.status === 'Delivered' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      o.status === 'Shipped' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                      o.status === 'Cancelled' || o.status === 'Cancel Approved' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 
                      'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {o.status || 'Order Placed'}
                    </span>
                  </div>

                  <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 text-xs flex flex-col gap-1">
                    <p className="font-black text-sm text-white">{o.customer_name}</p>
                    <div className="flex gap-2 text-slate-400 text-[11px]">
                      <span>📞 <a href={"tel:" + o.customer_phone} className="text-emerald-400 font-bold underline">{o.customer_phone}</a></span>
                      {o.alt_phone && <span>(Alt: <a href={"tel:" + o.alt_phone} className="underline text-slate-300">{o.alt_phone}</a>)</span>}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">🏡 {o.full_address}</p>
                  </div>

                  <div className="flex flex-col gap-1.5 bg-slate-950/40 border border-slate-800/80 rounded-2xl p-2.5">
                    {o.items?.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1 border-b last:border-none border-slate-800">
                        <div className="flex items-center gap-2">
                          <img src={it.images?.[0] || 'https://via.placeholder.com/40'} className="w-8 h-8 rounded-lg object-contain bg-slate-900 border border-slate-800" alt="prod" />
                          <span className="font-bold text-slate-200 text-[11px] truncate max-w-[160px]">{it.title} ({it.size || 'Std'})</span>
                        </div>
                        <span className="text-[11px] font-black text-slate-300">x{it.quantity || 1} = ₹{it.price * (it.quantity || 1)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center text-xs px-1">
                    <span className="text-slate-400">Adv Fee: <b className="text-emerald-400 font-bold">₹{o.delivery_fee_paid || 0}</b></span>
                    <span className="text-slate-400">COD Collect: <b className="text-white font-black text-sm">₹{o.total_price || 0}</b></span>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button 
                      onClick={() => { setHideItemInPrint(false); setPrintOrder(o); }}
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
                    >
                      <Printer size={14} /> 🏷️ Print Parcel Sticker
                    </button>

                    <button 
                      onClick={() => handleDeleteOrder(o.id)}
                      className="px-3 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition active:scale-95"
                      title="Database se permanent delete karein"
                    >
                      <Trash2 size={14} /> Delete
                    </button>

                    {o.screenshot && (
                      <button onClick={() => setSelectedScreenshot(o.screenshot)} className="px-3 py-2 bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold">
                        Slip
                      </button>
                    )}
                    {o.location?.mapsUrl && (
                      <a href={o.location.mapsUrl} target="_blank" rel="noreferrer" className="px-3 py-2 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold">
                        GPS
                      </a>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-800">
                    <button onClick={() => updateOrderStatus(o.id, 'Processing')} className="py-1.5 bg-amber-500/20 text-amber-300 rounded-xl text-[10px] font-black">Processing</button>
                    <button onClick={() => updateOrderStatus(o.id, 'Shipped')} className="py-1.5 bg-blue-500/20 text-blue-300 rounded-xl text-[10px] font-black">Shipped</button>
                    <button onClick={() => updateOrderStatus(o.id, 'Delivered')} className="py-1.5 bg-emerald-500/20 text-emerald-300 rounded-xl text-[10px] font-black">Delivered</button>
                    <button onClick={() => updateOrderStatus(o.id, 'Cancelled')} className="py-1.5 bg-rose-500/20 text-rose-300 rounded-xl text-[10px] font-black">Cancel</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
                {/* 2. RETURNS & REPLACEMENT VIEW */}
        {activeTab === 'returns' && (
          <div className="flex flex-col gap-3">
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs font-bold flex items-center justify-between">
              <span>⚠️ Return / Replacement Requests</span>
              <span className="bg-rose-600 text-white px-2 py-0.5 rounded-full text-[10px] font-black">{returnRequests.length}</span>
            </div>

            {returnRequests.length === 0 ? (
              <div className="text-center bg-slate-900/50 rounded-3xl p-12 border border-dashed border-slate-800">
                <CheckCircle className="mx-auto text-emerald-400 mb-2" size={32} />
                <p className="text-slate-400 text-xs font-bold">Koi pending Return ya Replacement nahi hai.</p>
              </div>
            ) : (
              returnRequests.map((o) => (
                <div key={o.id} className="bg-slate-900 border-2 border-rose-500/30 p-4 rounded-3xl shadow-xl flex flex-col gap-2.5">
                  <div className="flex justify-between items-start border-b border-slate-800 pb-2">
                    <div>
                      <span className="font-black text-xs text-rose-400">#{o.id}</span>
                      <p className="text-[10px] text-slate-400">{o.customer_name} (📞 {o.customer_phone})</p>
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {o.return_info?.type || o.status}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-950/70 rounded-xl text-xs">
                    <p className="font-bold text-slate-300">Karan (Reason):</p>
                    <p className="text-[11px] text-slate-400 italic mt-0.5">{o.return_info?.reason || 'Karan likha nahi hai'}</p>
                  </div>

                  {o.return_info?.product_photo && (
                    <div className="flex items-center justify-between p-2 bg-rose-950/30 rounded-2xl border border-rose-500/20">
                      <div className="flex items-center gap-2">
                        <img src={o.return_info.product_photo} className="w-10 h-10 rounded-xl object-cover border border-rose-500/40" alt="Damage" />
                        <span className="text-[11px] font-bold text-rose-300">Customer Damage Photo</span>
                      </div>
                      <button onClick={() => setSelectedDamagePhoto(o.return_info.product_photo)} className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black">
                        Badi Photo Dekhein
                      </button>
                    </div>
                  )}

                  {o.return_info?.type?.includes('वापस') && (
                    <div className="p-2.5 bg-emerald-950/30 rounded-2xl border border-emerald-500/30 text-xs">
                      <p className="font-bold text-emerald-400">Refund Method: {o.return_info?.refund_method?.toUpperCase()}</p>
                      {o.return_info?.refund_method === 'upi' ? (
                        <p className="text-emerald-300 font-mono font-bold mt-0.5">UPI ID: {o.return_info?.refund_details?.upi}</p>
                      ) : (
                        <div className="text-[10px] text-emerald-300 font-mono mt-0.5 leading-tight">
                          <p>A/C: {o.return_info?.refund_details?.accountNo}</p>
                          <p>IFSC: {o.return_info?.refund_details?.ifsc} | Name: {o.return_info?.refund_details?.holderName}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button onClick={() => updateOrderStatus(o.id, 'Return Approved & Refunded')} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md">
                      ✓ Approve Refund
                    </button>
                    <button onClick={() => updateOrderStatus(o.id, 'Replacement Shipped')} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md">
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
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-black text-slate-300">Catalog ({products.length} Products)</span>
              <button 
                onClick={() => { setEditingId(null); setIsCustomCategory(false); setActiveTab('add_product'); }} 
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl flex items-center gap-1 shadow-md"
              >
                <PlusCircle size={14} /> Naya Saman Jodein
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {products.map((p) => (
                <div key={p.id} className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex gap-3 items-center justify-between shadow-md">
                  <img 
                    src={p.images?.[0] || 'https://via.placeholder.com/60'} 
                    alt={p.title} 
                    onClick={() => setPreviewProduct(p)}
                    className="w-14 h-14 rounded-xl object-contain bg-slate-950 border border-slate-800 cursor-pointer hover:scale-105 transition" 
                  />
                  <div className="flex-1 min-w-0 text-xs cursor-pointer" onClick={() => setPreviewProduct(p)}>
                    <h4 className="font-bold text-white truncate flex items-center gap-1.5">
                      {p.title} <Eye size={12} className="text-slate-400" />
                    </h4>
                    <p className="text-slate-400 text-[11px]">Price: <b className="text-emerald-400">₹{p.price}</b> | Min Qty: <b>{p.min_quantity || 1}</b></p>
                    <span className="text-[10px] bg-slate-800 text-emerald-300 px-2 py-0.5 rounded-full font-medium inline-block mt-0.5">
                      {p.category}
                    </span>
                  </div>
                  <div className="flex gap-1">
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
                      className="p-2 text-slate-300 hover:bg-slate-800 rounded-xl"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-rose-400 hover:bg-rose-500/20 rounded-xl">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
                {/* 4. ADD / EDIT PRODUCT FORM */}
        {activeTab === 'add_product' && (
          <form onSubmit={handleSaveProduct} className="bg-slate-900 p-4 rounded-3xl border border-slate-800 shadow-2xl flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-black text-xs text-emerald-400">{editingId ? 'Edit Product Item' : 'Naya Catalog Product Jodein'}</h3>
              <button type="button" onClick={() => setActiveTab('products')} className="text-xs font-bold text-slate-400">Cancel</button>
            </div>

            <input 
              type="text" 
              placeholder="Product Title *" 
              value={prodForm.title} 
              onChange={(e) => setProdForm({ ...prodForm, title: e.target.value })} 
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500" 
            />

            <textarea 
              placeholder="Product Description (Quality, usage, features)..." 
              value={prodForm.description} 
              onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })} 
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500" 
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
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white font-medium"
              >
                {SYSTEM_CATEGORIES.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {isCustomCategory && (
              <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl">
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
                <input type="number" value={prodForm.price} onChange={(e) => setProdForm({ ...prodForm, price: e.target.value })} className="w-full px-2 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-bold" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400">MRP (₹)</label>
                <input type="number" value={prodForm.mrp} onChange={(e) => setProdForm({ ...prodForm, mrp: e.target.value })} className="w-full px-2 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-300" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400">Min Order Qty *</label>
                <input type="number" value={prodForm.min_quantity} onChange={(e) => setProdForm({ ...prodForm, min_quantity: e.target.value })} className="w-full px-2 py-1.5 text-xs bg-amber-950/40 border border-amber-500/40 rounded-xl text-amber-300 font-bold" />
              </div>
            </div>

            {(prodForm.category?.includes('Fashion') || customCategoryText.toLowerCase().includes('kapde')) && (
              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400">Sizes (comma separated)</label>
                    <input type="text" value={Array.isArray(prodForm.sizes) ? prodForm.sizes.join(', ') : prodForm.sizes} onChange={(e) => setProdForm({ ...prodForm, sizes: e.target.value })} className="w-full px-2 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400">Fabric / Material</label>
                    <select 
                      value={prodForm.fabric || 'Pure Cotton'} 
                      onChange={(e) => setProdForm({ ...prodForm, fabric: e.target.value })} 
                      className="w-full px-2 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white font-medium"
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

              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-300">Order Cancellation Allowed?</span>
                  <button 
                    type="button" 
                    onClick={() => setProdForm({ ...prodForm, allow_cancel: !prodForm.allow_cancel })}
                    className={`px-2.5 py-0.5 rounded-full text-[9px] font-black transition ${
                      prodForm.allow_cancel ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'
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
                        className="flex-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-bold" 
                      />
                      <span className="text-xs font-bold text-slate-400">Ghante (Hours)</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-300">Return / Replacement Allowed?</span>
                  <button 
                    type="button" 
                    onClick={() => setProdForm({ ...prodForm, allow_return: !prodForm.allow_return })}
                    className={`px-2.5 py-0.5 rounded-full text-[9px] font-black transition ${
                      prodForm.allow_return ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'
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
                        className="flex-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-bold" 
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
                <input type="number" value={prodForm.delivery_fee} onChange={(e) => setProdForm({ ...prodForm, delivery_fee: e.target.value })} className="w-full px-2 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400">UPI ID</label>
                <input type="text" value={prodForm.upi_id || 'Barijanmart@upi'} onChange={(e) => setProdForm({ ...prodForm, upi_id: e.target.value })} className="w-full px-2 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white font-mono" />
              </div>
            </div>

            <label className="p-3.5 border-2 border-dashed border-emerald-500/40 rounded-2xl cursor-pointer text-center text-xs text-emerald-400 font-bold bg-emerald-950/20 hover:bg-emerald-950/30 transition">
              📷 Click to Upload Product Photos ({prodForm.images?.length || 0} Chuni Gayi)
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
            </label>

            <button type="submit" disabled={loading} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl shadow-lg transition active:scale-95">
              {loading ? "Syncing..." : (editingId ? "Update Product" : "Publish to Customer App")}
            </button>
          </form>
        )}
                {/* 5. APP SETTINGS VIEW */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="bg-slate-900 p-4 rounded-3xl border border-slate-800 shadow-xl flex flex-col gap-3">
            <h3 className="font-black text-xs text-emerald-400 border-b border-slate-800 pb-2">Customer Care & Store Settings</h3>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Support Calling Phone Number *</label>
              <input 
                type="tel" 
                value={settingsForm.support_phone} 
                onChange={(e) => setSettingsForm({ ...settingsForm, support_phone: e.target.value })} 
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold" 
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Official WhatsApp Link *</label>
              <input 
                type="text" 
                value={settingsForm.whatsapp_url} 
                onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp_url: e.target.value })} 
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-[11px]" 
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Facebook Page URL</label>
              <input 
                type="text" 
                value={settingsForm.facebook_url} 
                onChange={(e) => setSettingsForm({ ...settingsForm, facebook_url: e.target.value })} 
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-[11px]" 
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Instagram Page URL</label>
              <input 
                type="text" 
                value={settingsForm.instagram_url} 
                onChange={(e) => setSettingsForm({ ...settingsForm, instagram_url: e.target.value })} 
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-[11px]" 
              />
            </div>

            <button type="submit" disabled={settingsSaving} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl shadow-md transition active:scale-95">
              {settingsSaving ? "Saving..." : "Save Store Details"}
            </button>
          </form>
        )}
      </main>

      {/* BIG PRODUCT PREVIEW MODAL */}
      {previewProduct && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewProduct(null)}>
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-4 shadow-2xl flex flex-col gap-3 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="font-black text-xs text-emerald-400">Catalog Product Preview</span>
              <button onClick={() => setPreviewProduct(null)} className="p-1 text-slate-400 hover:text-white"><X size={16} /></button>
            </div>

            <div className="w-full h-56 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800">
              <img src={previewProduct.images?.[0] || 'https://via.placeholder.com/300'} alt={previewProduct.title} className="w-full h-full object-contain" />
            </div>

            <div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">{previewProduct.category}</span>
              <h3 className="font-black text-base text-white mt-1.5 leading-snug">{previewProduct.title}</h3>
              <p className="text-xs text-slate-400 mt-1 whitespace-pre-line leading-relaxed">{previewProduct.description}</p>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between"><span>Sell Price:</span><b className="text-emerald-400 text-sm">₹{previewProduct.price}</b></div>
              {previewProduct.mrp > previewProduct.price && <div className="flex justify-between text-slate-400"><span>MRP:</span><del>₹{previewProduct.mrp}</del></div>}
              <div className="flex justify-between"><span>Min Order Qty:</span><b>{previewProduct.min_quantity || 1} Piece</b></div>
              {previewProduct.fabric && <div className="flex justify-between"><span>Fabric / Material:</span><b className="text-amber-300">{previewProduct.fabric}</b></div>}
              {previewProduct.mfg_date && <div className="flex justify-between"><span>Mfg Date:</span><b>{previewProduct.mfg_date}</b></div>}
              {previewProduct.expiry_date && <div className="flex justify-between"><span>Expiry Date:</span><b className="text-rose-400">{previewProduct.expiry_date}</b></div>}
              <div className="flex justify-between border-t border-slate-800 pt-1 text-[11px] text-slate-400">
                <span>Auto Cancel: {Number(previewProduct.cancel_hours || 0) > 0 ? `${previewProduct.cancel_hours} Ghante` : 'Not Allowed'}</span>
                <span>Return: {Number(previewProduct.return_days || 0) > 0 ? `${previewProduct.return_days} Din` : 'Not Allowed'}</span>
              </div>
            </div>

            <button onClick={() => setPreviewProduct(null)} className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold">
              Close Preview
            </button>
          </div>
        </div>
      )}
            {/* 1-PAGE EXACT PRINT MODAL (WITH PRIVACY TOGGLE) */}
      {printOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-white text-slate-900 w-full max-w-sm rounded-3xl p-4 shadow-2xl flex flex-col gap-3 max-h-[95vh] overflow-y-auto">
            
            <div className="flex items-center justify-between bg-slate-100 p-2 rounded-xl text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                {hideItemInPrint ? <EyeOff size={14} className="text-rose-600" /> : <Eye size={14} className="text-emerald-600" />}
                Item Name on Label:
              </span>
              <button 
                onClick={() => setHideItemInPrint(!hideItemInPrint)} 
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition ${
                  hideItemInPrint ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-800'
                }`}
              >
                {hideItemInPrint ? "Hidden (Private)" : "Show Item Name"}
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
              <button onClick={() => setPrintOrder(null)} className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4" onClick={() => setSelectedScreenshot(null)}>
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-3xl max-w-xs shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <img src={selectedScreenshot} alt="Payment Proof" className="w-full h-auto object-contain rounded-2xl max-h-[70vh]" />
            <button onClick={() => setSelectedScreenshot(null)} className="w-full mt-2.5 py-2.5 bg-slate-800 text-white text-xs font-bold rounded-xl">Band Karein</button>
          </div>
        </div>
      )}

      {selectedDamagePhoto && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4" onClick={() => setSelectedDamagePhoto(null)}>
          <div className="bg-slate-900 border border-rose-500/30 p-3 rounded-3xl max-w-xs shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-black text-rose-400 mb-2">Customer Damage Item Photo:</p>
            <img src={selectedDamagePhoto} alt="Damage Proof" className="w-full h-auto object-contain rounded-2xl max-h-[70vh]" />
            <button onClick={() => setSelectedDamagePhoto(null)} className="w-full mt-2.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl">Band Karein</button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 flex justify-around py-2.5 z-40 text-slate-400">
        <button onClick={() => setActiveTab('orders')} className={`flex flex-col items-center gap-1 relative ${activeTab === 'orders' ? 'text-emerald-400 font-black' : ''}`}>
          <Package size={19} />
          <span className="text-[10px]">Orders</span>
          {normalOrders.length > 0 && <span className="absolute -top-1 -right-2 bg-emerald-500 text-slate-950 text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">{normalOrders.length}</span>}
        </button>

        <button onClick={() => setActiveTab('returns')} className={`flex flex-col items-center gap-1 relative ${activeTab === 'returns' ? 'text-rose-400 font-black' : ''}`}>
          <RefreshCw size={19} />
          <span className="text-[10px]">Returns</span>
          {returnRequests.length > 0 && <span className="absolute -top-1 -right-2 bg-rose-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-ping">{returnRequests.length}</span>}
        </button>

        <button onClick={() => setActiveTab('products')} className={`flex flex-col items-center gap-1 ${activeTab === 'products' || activeTab === 'add_product' ? 'text-emerald-400 font-black' : ''}`}>
          <ShoppingBag size={19} />
          <span className="text-[10px]">Catalog</span>
        </button>

        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 ${activeTab === 'settings' ? 'text-emerald-400 font-black' : ''}`}>
          <Settings size={19} />
          <span className="text-[10px]">Settings</span>
        </button>
      </nav>
    </div>
  );
                  }
          
      
                                          
                        
                    
  
    
      
  
    
