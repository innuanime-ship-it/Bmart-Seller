import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Package, ShoppingBag, PlusCircle, Trash2, Edit3, MapPin, 
  CheckCircle, Clock, Truck, XCircle, ExternalLink, RefreshCw, 
  LogOut, Shield, Search, Printer, ChevronRight, AlertCircle,
  Settings, PhoneCall, MessageCircle, ArrowLeft, Eye, Copy, QrCode, X, Sparkles,
  Calendar, Layers, Tag, EyeOff, Check, Sliders, ShieldCheck, Lock, ArrowRight,
  MessageSquare, Image as ImageIcon
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

const getDynamicDate = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + (Number(days) || 0));
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
export default function App() {
  useEffect(() => {
    if (!document.getElementById('bmart-native-print-css')) {
      const style = document.createElement('style');
      style.id = 'bmart-native-print-css';
      style.innerHTML = `
        @media print {
          body * { visibility: hidden !important; }
          #printable-sticker, #printable-sticker * { visibility: visible !important; }
          #printable-sticker {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 100% !important; max-width: 380px !important; padding: 10px !important;
            border: 2px dashed #000 !important; margin: 0 !important;
          }
          @page { size: auto; margin: 3mm; }
        }
      `;
      document.head.appendChild(style);
    }
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('bmart_seller_logged') === 'true');
  const [passwordInput, setPasswordInput] = useState('');
  const [activeTab, setActiveTab] = useState('orders');

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & UI States
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);
  const [selectedDamagePhoto, setSelectedDamagePhoto] = useState(null);
  const [printOrder, setPrintOrder] = useState(null);
  const [hideItemInPrint, setHideItemInPrint] = useState(false);
  const [previewProduct, setPreviewProduct] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [appAlert, setAppAlert] = useState(null); 
  
  // Custom Status Update Modal State
  const [statusModal, setStatusModal] = useState({ isOpen: false, orderId: null, newStatus: '', message: '' });

  const showNotification = (title, msg, type = 'info') => {
    setAppAlert({ title, msg, type });
    setTimeout(() => setAppAlert(null), 3500);
  };
    const [editingId, setEditingId] = useState(null);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryText, setCustomCategoryText] = useState('');

  const [prodForm, setProdForm] = useState({
    title: '', description: '', category: 'Fashion (Kapde)', price: '', mrp: '', min_quantity: '1',
    delivery_fee: '49', sizes: 'S, M, L, XL', fabric: 'Pure Cotton', mfg_date: '', expiry_date: '',
    delivery_days: '2', allow_cancel: true, cancel_hours: '12', allow_return: true, return_days: '7', 
    images: [], seller_code: 'BM-01', upi_id: 'Barijanmart@upi'
  });

  const [settingsForm, setSettingsForm] = useState({
    support_phone: '9204184716', whatsapp_url: 'https://wa.me/919204184716',
    facebook_url: 'https://facebook.com', instagram_url: 'https://instagram.com'
  });
  const [settingsSaving, setSettingsSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchOrders(); fetchProducts(); fetchAppSettings();

    const ordersChannel = supabase.channel('bmart-orders-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders).subscribe();
    const productsChannel = supabase.channel('bmart-products-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchProducts).subscribe();

    return () => { supabase.removeChannel(ordersChannel); supabase.removeChannel(productsChannel); };
  }, [isAuthenticated]);

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (data) setOrders(data);
    setLoading(false);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (data) setProducts(data);
  };

  const fetchAppSettings = async () => {
    const { data } = await supabase.from('app_settings').select('*').single();
    if (data) setSettingsForm({ ...settingsForm, ...data });
  };
    const handleLogin = (e) => {
    e.preventDefault();
    const clean = passwordInput.trim();
    if (!clean) return showNotification("Error", "Password box khali hai!", "error");
    if (clean === ADMIN_PASS || clean.toUpperCase() === ADMIN_PASS) {
      setIsAuthenticated(true); localStorage.setItem('bmart_seller_logged', 'true'); setPasswordInput('');
      showNotification("Login Safal", "BMart Seller App me swagat hai.", "success");
    } else { showNotification("Access Denied", "Galat Master Password!", "error"); }
  };

  const handleLogout = () => {
    setConfirmDialog({
      title: "Logout Confirmation", msg: "Kya aap Seller App se bahar aana chahte hain?",
      onConfirm: () => { setIsAuthenticated(false); localStorage.removeItem('bmart_seller_logged'); setConfirmDialog(null); }
    });
  };

  const handleDeleteProduct = (id) => {
    setConfirmDialog({
      title: "Product Delete Karein?", msg: "Yeh product catalog se hamesha ke liye hat jayega.",
      onConfirm: async () => {
        setConfirmDialog(null); setLoading(true);
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) showNotification("Error", error.message, "error");
        else { setProducts(prev => prev.filter(p => p.id !== id)); showNotification("Deleted", "Product permanently delete ho gaya.", "success"); }
        setLoading(false); fetchProducts();
      }
    });
  };

  const handleDeleteOrder = (orderId) => {
    setConfirmDialog({
      title: "Permanent Delete Order?", msg: `Order #${orderId} ko delete karne par storage clean ho jayegi.`,
      onConfirm: async () => {
        setConfirmDialog(null); setLoading(true);
        const { error } = await supabase.from('orders').delete().eq('id', orderId);
        if (error) showNotification("Delete Error", error.message, "error");
        else { setOrders(prev => prev.filter(o => o.id !== orderId)); showNotification("Order Deleted!", "Storage clean ho gayi.", "success"); }
        setLoading(false);
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
          let width = img.width, height = img.height;
          if (width > height && width > 800) { height *= 800 / width; width = 800; } 
          else if (height > 800) { width *= 800 / height; height = 800; }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
          setProdForm((prev) => ({ ...prev, images: [...prev.images, canvas.toDataURL('image/jpeg', 0.65)] }));
        };
        img.src = readerEvent.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!prodForm.title || !prodForm.price || !prodForm.images.length) return showNotification("Adhoora Form", "Title, Price aur 1 Photo anivarya hai!", "error");
    
    const finalCategory = isCustomCategory ? (customCategoryText.trim() || 'General') : prodForm.category;
    const cancelHoursVal = prodForm.allow_cancel ? Number(prodForm.cancel_hours || 0) : 0;
    const returnDaysVal = prodForm.allow_return ? Number(prodForm.return_days || 0) : 0;
    const dynamicReturnPolicy = returnDaysVal > 0 ? `${returnDaysVal} Din Return / Replacement Policy` : "Return Not Allowed";

    const payload = {
      id: editingId || ('p_' + Date.now()), title: prodForm.title, description: prodForm.description, category: finalCategory,
      price: Number(prodForm.price), mrp: Number(prodForm.mrp || prodForm.price * 2), min_quantity: Number(prodForm.min_quantity || 1), 
      delivery_fee: Number(prodForm.delivery_fee || 0), delivery_days: Number(prodForm.delivery_days || 2),
      sizes: typeof prodForm.sizes === 'string' ? prodForm.sizes.split(',').map(s => s.trim()).filter(Boolean) : prodForm.sizes,
      fabric: prodForm.fabric || null, mfg_date: prodForm.mfg_date || null, expiry_date: prodForm.expiry_date || null,
      cancel_hours: cancelHoursVal, return_days: returnDaysVal, return_policy: dynamicReturnPolicy,
      images: prodForm.images, seller_code: prodForm.seller_code || 'BM-01', upi_id: prodForm.upi_id || 'Barijanmart@upi'
    };

    setLoading(true); const { error } = await supabase.from('products').upsert([payload]); setLoading(false);
    if (error) showNotification("Error", error.message, "error");
    else {
      showNotification("Safal", "Product Update/Publish Ho Gaya!", "success");
      setEditingId(null); setIsCustomCategory(false); setCustomCategoryText('');
      setProdForm({ title: '', description: '', category: 'Fashion (Kapde)', price: '', mrp: '', min_quantity: '1', delivery_fee: '49', delivery_days: '2', sizes: 'S, M, L, XL', fabric: 'Pure Cotton', mfg_date: '', expiry_date: '', allow_cancel: true, cancel_hours: '12', allow_return: true, return_days: '7', images: [], seller_code: 'BM-01', upi_id: 'Barijanmart@upi' });
      setActiveTab('products'); fetchProducts();
    }
  };

  const handleStatusUpdateSubmit = async () => {
    setLoading(true);
    const payload = { 
      status: statusModal.newStatus, 
      status_msg: statusModal.message || null, 
      status_time: new Date().toISOString() 
    };
    const { error } = await supabase.from('orders').update(payload).eq('id', statusModal.orderId);
    setLoading(false);
    if (error) showNotification("Error", error.message, "error");
    else {
      showNotification("Success", `Status updated to ${statusModal.newStatus}`, "success");
      setStatusModal({ isOpen: false, orderId: null, newStatus: '', message: '' });
      fetchOrders();
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      const { error } = await supabase.from('app_settings').upsert([{ id: 1, ...settingsForm }]);
      if (error) throw error;
      showNotification("Success", "Settings update ho gaye!", "success");
    } catch (err) {
      showNotification("Error", err.message, "error");
    } finally {
      setSettingsSaving(false);
    }
  };
    if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-between items-center p-6 font-sans select-none relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-emerald-500/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none"></div>
        {appAlert && (
          <div className="absolute top-10 left-4 right-4 z-50 animate-bounce">
            <div className={`p-4 rounded-2xl shadow-2xl flex items-center gap-3 text-white ${appAlert.type === 'error' ? 'bg-gradient-to-r from-rose-600 to-red-600' : 'bg-gradient-to-r from-emerald-600 to-teal-600'}`}>
              <AlertCircle size={22} className="shrink-0" />
              <div className="text-xs font-bold"><p>{appAlert.title}</p><p className="opacity-90">{appAlert.msg}</p></div>
            </div>
          </div>
        )}
        <div className="w-full max-w-xs z-10 flex flex-col items-center my-auto">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 flex items-center justify-center shadow-2xl ring-4 ring-emerald-500/20"><Shield className="text-white drop-shadow-md" size={44} /></div>
            <div className="absolute -bottom-1.5 -right-1.5 bg-slate-900 border-2 border-slate-800 p-1.5 rounded-xl"><Lock size={14} className="text-emerald-400" /></div>
          </div>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400 tracking-tight text-center">Seller Station</h2>
          <p className="text-xs text-slate-400 font-medium text-center mt-1 mb-8">Central Store Operations Portal</p>
          <form onSubmit={handleLogin} className="w-full flex flex-col gap-3.5">
            <div className="relative">
              <Lock size={15} className="absolute left-4 top-3.5 text-slate-500" />
              <input type="password" placeholder="Enter Master Password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-900/90 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 font-mono tracking-widest shadow-inner transition" />
            </div>
            <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 active:scale-95 text-slate-950 font-black text-xs rounded-2xl flex items-center justify-center gap-2"><span>Unlock Store Station</span><ArrowRight size={15} /></button>
          </form>
        </div>
      </div>
    );
  }

  const returnRequests = orders.filter(o => o.status && o.status.includes('Requested'));
  const normalOrders = orders.filter(o => !(o.status && o.status.includes('Requested')));
  const filteredOrders = normalOrders.filter((o) => o.id.toLowerCase().includes(searchQuery.toLowerCase()) || o.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) || o.customer_phone?.includes(searchQuery));
    return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col max-w-md mx-auto shadow-2xl relative pb-24 font-sans select-none">
      <header className="bg-slate-900/80 backdrop-blur-xl p-4 sticky top-0 z-40 border-b border-slate-800/80 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center"><Package className="text-white" size={20} /></div>
          <div><div className="flex items-center gap-1.5"><h1 className="text-sm font-black text-white leading-none">BMart Hub</h1></div><p className="text-[10px] text-slate-400 font-semibold mt-0.5">Rural Doorstep Commerce</p></div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={fetchOrders} className="p-2.5 bg-slate-800/90 text-slate-300 rounded-2xl active:scale-95"><RefreshCw size={14} className={loading ? "animate-spin text-emerald-400" : ""} /></button>
          <button onClick={handleLogout} className="p-2.5 bg-rose-500/10 text-rose-400 rounded-2xl active:scale-95"><LogOut size={14} /></button>
        </div>
      </header>

      {/* Global In-App Alert */}
      {appAlert && (
        <div className="fixed top-20 left-4 right-4 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`p-3.5 rounded-2xl shadow-2xl flex items-center justify-between text-white border border-white/10 ${appAlert.type === 'error' ? 'bg-gradient-to-r from-rose-600 to-red-600' : 'bg-gradient-to-r from-emerald-600 to-teal-600'}`}>
            <div className="flex items-center gap-3 text-xs font-bold"><Sparkles size={18} /><div><p className="leading-tight text-sm">{appAlert.title}</p><p className="text-[10px] opacity-90">{appAlert.msg}</p></div></div>
            <button onClick={() => setAppAlert(null)} className="p-1 opacity-70 hover:opacity-100"><X size={16} /></button>
          </div>
        </div>
      )}

      {/* Global In-App Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl max-w-xs shadow-2xl flex flex-col gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto"><AlertCircle size={24} /></div>
            <h4 className="font-black text-sm text-white">{confirmDialog.title}</h4>
            <p className="text-xs text-slate-400 leading-relaxed">{confirmDialog.msg}</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setConfirmDialog(null)} className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-2xl">Cancel</button>
              <button onClick={confirmDialog.onConfirm} className="flex-1 py-2.5 bg-rose-600 text-white font-black text-xs rounded-2xl">Yes, Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM STATUS UPDATE MODAL */}
      {statusModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xs rounded-3xl p-5 shadow-2xl flex flex-col gap-3">
            <h4 className="font-black text-sm text-emerald-400 flex items-center gap-1.5"><MessageSquare size={16} /> Mark as {statusModal.newStatus}</h4>
            <p className="text-xs text-slate-400">Order #{statusModal.orderId}</p>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Customer ke liye custom message (Optional)</label>
              <textarea placeholder="e.g. Aaj sham 5 baje tak deliver ho jayega, ya cancel ka karan..." value={statusModal.message} onChange={(e) => setStatusModal({ ...statusModal, message: e.target.value })} className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-emerald-500" rows={3} />
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setStatusModal({ isOpen: false, orderId: null, newStatus: '', message: '' })} className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-2xl">Cancel</button>
              <button onClick={handleStatusUpdateSubmit} className="flex-1 py-2.5 bg-emerald-600 text-white font-black text-xs rounded-2xl">{loading ? 'Saving...' : 'Update Status'}</button>
            </div>
          </div>
        </div>
      )}
            <main className="p-4 flex-1">
        {/* ORDERS VIEW */}
        {activeTab === 'orders' && (
          <div className="flex flex-col gap-3.5">
            <div className="relative">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={15} />
              <input type="text" placeholder="Search Order ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white outline-none focus:border-emerald-500" />
            </div>
            {filteredOrders.map((o) => (
              <div key={o.id} className="bg-gradient-to-b from-slate-900 to-slate-900/90 border border-slate-800/80 rounded-3xl p-4 shadow-xl flex flex-col gap-3">
                <div className="flex justify-between items-start border-b border-slate-800/60 pb-2.5">
                  <div>
                    <span className="font-black text-xs text-emerald-400">#{o.id}</span>
                    <p className="text-[10px] text-slate-400 mt-1">{new Date(o.created_at).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 text-emerald-300">{o.status || 'Placed'}</span>
                    {o.status_time && <p className="text-[9px] text-slate-500 mt-1">Updated at:<br/>{new Date(o.status_time).toLocaleString('en-IN')}</p>}
                  </div>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 text-xs"><p className="font-black text-sm text-white">{o.customer_name}</p><p className="text-slate-400 text-[11px] font-medium">📞 {o.customer_phone}</p><p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">🏡 {o.full_address}</p></div>
                <div className="flex justify-between text-xs px-1"><span className="text-slate-400">Adv: <b className="text-emerald-400 font-bold">₹{o.delivery_fee_paid || 0}</b></span><span className="text-slate-400">COD Due: <b className="text-white font-black text-sm">₹{o.total_price || 0}</b></span></div>
                {o.status_msg && <div className="p-2 bg-blue-900/20 border border-blue-500/30 rounded-xl text-[10px] text-blue-300"><span className="font-bold">Your Msg:</span> {o.status_msg}</div>}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => { setHideItemInPrint(false); setPrintOrder(o); }} className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-2xl text-xs font-black"><Printer size={14} className="inline mr-1" />Print</button>
                  <button onClick={() => handleDeleteOrder(o.id)} className="px-3.5 py-2 bg-rose-500/10 text-rose-400 rounded-2xl text-xs font-bold"><Trash2 size={14} className="inline mr-1" />Delete</button>
                  {o.screenshot && <button onClick={() => setSelectedScreenshot(o.screenshot)} className="px-3 py-2 bg-emerald-500/10 text-emerald-300 rounded-2xl text-xs font-bold">Slip</button>}
                </div>
                <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-800/80">
                  <button onClick={() => setStatusModal({ isOpen: true, orderId: o.id, newStatus: 'Processing', message: '' })} className="py-1.5 bg-amber-500/10 text-amber-300 rounded-xl text-[10px] font-black">Process</button>
                  <button onClick={() => setStatusModal({ isOpen: true, orderId: o.id, newStatus: 'Shipped', message: '' })} className="py-1.5 bg-blue-500/10 text-blue-300 rounded-xl text-[10px] font-black">Ship</button>
                  <button onClick={() => setStatusModal({ isOpen: true, orderId: o.id, newStatus: 'Delivered', message: '' })} className="py-1.5 bg-emerald-500/10 text-emerald-300 rounded-xl text-[10px] font-black">Deliver</button>
                  <button onClick={() => setStatusModal({ isOpen: true, orderId: o.id, newStatus: 'Cancelled', message: '' })} className="py-1.5 bg-rose-500/10 text-rose-300 rounded-xl text-[10px] font-black">Cancel</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RETURNS VIEW */}
        {activeTab === 'returns' && (
          <div className="flex flex-col gap-3.5">
            {returnRequests.map((o) => (
              <div key={o.id} className="bg-slate-900 border-2 border-rose-500/30 p-4 rounded-3xl shadow-xl flex flex-col gap-3">
                <div className="flex justify-between items-start border-b border-slate-800 pb-2"><div><span className="font-black text-xs text-rose-400">#{o.id}</span></div><span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300">{o.return_info?.type}</span></div>
                <div className="p-2.5 bg-slate-950/70 rounded-2xl text-xs"><p className="font-bold text-slate-300">Reason:</p><p className="text-[11px] text-slate-400 italic mt-0.5">{o.return_info?.reason}</p></div>
                {o.return_info?.product_photo && <button onClick={() => setSelectedDamagePhoto(o.return_info.product_photo)} className="py-1.5 bg-rose-600 text-white rounded-xl text-[10px] font-black">View Photo</button>}
                <div className="flex gap-2 pt-1"><button onClick={() => setStatusModal({ isOpen: true, orderId: o.id, newStatus: 'Return Approved & Refunded', message: '' })} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-2xl text-xs font-black">✓ Approve</button></div>
              </div>
            ))}
          </div>
        )}
                      {/* ADD PRODUCT FORM */}
        {(activeTab === 'add_product' || activeTab === 'products') && (
          <div className="flex flex-col gap-3.5">
            {activeTab === 'products' ? (
              <>
                <div className="flex justify-between items-center"><h3 className="text-xs font-black text-white">Catalog</h3><button onClick={() => { setEditingId(null); setActiveTab('add_product'); }} className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-black rounded-2xl"><PlusCircle size={15} className="inline mr-1"/> Add Item</button></div>
                {products.map((p) => (
                  <div key={p.id} className="bg-slate-900 border border-slate-800 p-3.5 rounded-3xl flex gap-3.5 items-center">
                    <img src={p.images?.[0]} onClick={() => setPreviewProduct(p)} className="w-16 h-16 rounded-2xl object-cover bg-slate-950 border border-slate-800" alt="p" />
                    <div className="flex-1 min-w-0 text-xs" onClick={() => setPreviewProduct(p)}>
                      <h4 className="font-bold text-white truncate">{p.title}</h4>
                      <p className="text-slate-400 text-[11px]">₹{p.price} | Del: {p.delivery_days} Days</p>
                    </div>
                    <button onClick={() => { setEditingId(p.id); setProdForm({...p}); setActiveTab('add_product'); }} className="p-2.5 text-slate-300 bg-slate-800 rounded-2xl"><Edit3 size={15} /></button>
                    <button onClick={() => handleDeleteProduct(p.id)} className="p-2.5 text-rose-400 bg-rose-500/10 rounded-2xl"><Trash2 size={15} /></button>
                  </div>
                ))}
              </>
            ) : (
              <form onSubmit={handleSaveProduct} className="bg-slate-900 p-4 rounded-3xl border border-slate-800 flex flex-col gap-3.5">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2.5"><h3 className="font-black text-xs text-emerald-400">Product Details</h3><button type="button" onClick={() => setActiveTab('products')} className="text-xs font-bold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-xl">Cancel</button></div>
                <input type="text" placeholder="Product Title *" value={prodForm.title} onChange={(e) => setProdForm({ ...prodForm, title: e.target.value })} className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-2xl text-white outline-none" />
                <textarea placeholder="Product Description..." value={prodForm.description} onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })} className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-2xl text-white outline-none" rows={2} />
                
                <select value={isCustomCategory ? "Custom / Nayi Category Likhein" : prodForm.category} onChange={(e) => { if (e.target.value === "Custom / Nayi Category Likhein") setIsCustomCategory(true); else { setIsCustomCategory(false); setProdForm({ ...prodForm, category: e.target.value }); } }} className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-2xl text-white font-medium outline-none">
                  {SYSTEM_CATEGORIES.map((c, i) => <option key={i} value={c}>{c}</option>)}
                </select>
                {isCustomCategory && (
                  <input type="text" placeholder="Nayi Category ka naam likhein..." value={customCategoryText} onChange={(e) => setCustomCategoryText(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-950 border border-emerald-500 rounded-xl text-white" />
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div><label className="text-[9px] font-bold text-slate-400">Price (₹) *</label><input type="number" value={prodForm.price} onChange={(e) => setProdForm({ ...prodForm, price: e.target.value })} className="w-full px-2.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-2xl text-emerald-400 font-bold" /></div>
                  <div><label className="text-[9px] font-bold text-slate-400">MRP (₹)</label><input type="number" value={prodForm.mrp} onChange={(e) => setProdForm({ ...prodForm, mrp: e.target.value })} className="w-full px-2.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-2xl text-slate-300" /></div>
                  <div><label className="text-[9px] font-bold text-slate-400">Min Qty *</label><input type="number" value={prodForm.min_quantity} onChange={(e) => setProdForm({ ...prodForm, min_quantity: e.target.value })} className="w-full px-2.5 py-2 text-xs bg-amber-950/40 border border-amber-500/40 rounded-2xl text-amber-300 font-bold" /></div>
                </div>

                {/* Expiry & Fabric Logic */}
                <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 grid grid-cols-2 gap-2">
                  <div><label className="text-[9px] font-bold text-slate-400">Mfg Date (Optional)</label><input type="date" value={prodForm.mfg_date || ''} onChange={(e) => setProdForm({ ...prodForm, mfg_date: e.target.value })} className="w-full px-2 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white" /></div>
                  <div><label className="text-[9px] font-bold text-slate-400">Expiry Date (Optional)</label><input type="date" value={prodForm.expiry_date || ''} onChange={(e) => setProdForm({ ...prodForm, expiry_date: e.target.value })} className="w-full px-2 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-xl text-rose-300 font-bold" /></div>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col gap-2.5">
                  <div><label className="text-[9px] font-bold text-slate-400">Estimated Delivery (Days) *</label><input type="number" min="1" value={prodForm.delivery_days} onChange={(e) => setProdForm({ ...prodForm, delivery_days: e.target.value })} className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-emerald-400 font-bold" /></div>
                  <div className="flex items-center gap-2"><input type="number" min="0" placeholder="Cancel Hours" value={prodForm.cancel_hours} onChange={(e) => setProdForm({ ...prodForm, cancel_hours: e.target.value })} className="flex-1 px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-emerald-400 font-bold" /><span className="text-[10px] text-slate-400">Hrs Cancel limit</span></div>
                  <div className="flex items-center gap-2"><input type="number" min="0" placeholder="Return Days" value={prodForm.return_days} onChange={(e) => setProdForm({ ...prodForm, return_days: e.target.value })} className="flex-1 px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-emerald-400 font-bold" /><span className="text-[10px] text-slate-400">Days Return limit</span></div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-[9px] font-bold text-slate-400">Adv Fee (₹)</label><input type="number" value={prodForm.delivery_fee} onChange={(e) => setProdForm({ ...prodForm, delivery_fee: e.target.value })} className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white" /></div>
                  <div><label className="text-[9px] font-bold text-slate-400">UPI ID</label><input type="text" value={prodForm.upi_id} onChange={(e) => setProdForm({ ...prodForm, upi_id: e.target.value })} className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white font-mono" /></div>
                </div>

                <label className="p-4 border-2 border-dashed border-emerald-500/40 rounded-3xl text-center text-xs text-emerald-400 font-bold bg-emerald-950/20 active:scale-95 transition">Upload Photos ({prodForm.images?.length || 0}) <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} /></label>
                <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs rounded-2xl active:scale-95">{loading ? "Saving..." : "Save Product"}</button>
              </form>
            )}
          </div>
        )}
                    </main>

      {/* BIG PRODUCT PREVIEW MODAL */}
      {previewProduct && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-5 shadow-2xl flex flex-col gap-3.5">
            <div className="w-full h-56 bg-slate-950 rounded-2xl overflow-hidden"><img src={previewProduct.images?.[0]} alt="img" className="w-full h-full object-contain rounded-xl" /></div>
            <div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">{previewProduct.category}</span>
              <h3 className="font-black text-base text-white mt-1.5">{previewProduct.title}</h3>
            </div>
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col gap-2 text-xs">
              <div className="flex justify-between"><span>Price:</span><b className="text-emerald-400 text-sm">₹{previewProduct.price}</b></div>
              <div className="flex justify-between"><span>Estimated Delivery:</span><b className="text-blue-400">By {getDynamicDate(previewProduct.delivery_days || 2)}</b></div>
              {previewProduct.mfg_date && <div className="flex justify-between"><span>Mfg Date:</span><b>{previewProduct.mfg_date}</b></div>}
              {previewProduct.expiry_date && <div className="flex justify-between"><span>Expiry Date:</span><b className="text-rose-400">{previewProduct.expiry_date}</b></div>}
              <div className="flex justify-between border-t border-slate-800 pt-2 text-[11px] text-slate-400">
                <span>Cancel: {Number(previewProduct.cancel_hours || 0) > 0 ? `${previewProduct.cancel_hours} Hrs` : 'No'}</span>
                <span>Return: {Number(previewProduct.return_days || 0) > 0 ? `${previewProduct.return_days} Days` : 'No'}</span>
              </div>
            </div>
            <button onClick={() => setPreviewProduct(null)} className="w-full py-3 bg-slate-800 text-white rounded-2xl text-xs font-bold">Close Preview</button>
          </div>
        </div>
      )}

      {/* 1-PAGE EXACT PRINT MODAL */}
      {printOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3">
          <div className="bg-white text-slate-900 w-full max-w-sm rounded-3xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-2xl text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5"><Eye size={15} /> Privacy:</span>
              <button onClick={() => setHideItemInPrint(!hideItemInPrint)} className={`px-3 py-1 rounded-xl text-[10px] font-black ${hideItemInPrint ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-800'}`}>{hideItemInPrint ? "Hidden" : "Show Name"}</button>
            </div>
            <div id="printable-sticker" className="border-2 border-dashed border-slate-900 p-3.5 rounded-2xl bg-white font-sans">
              <div className="border-b-2 border-slate-900 pb-2 mb-2 flex justify-between items-center">
                <div><h2 className="text-base font-black text-red-700">BARIJAN MART</h2></div>
                <div className="text-right"><span className="text-[9px] font-black border border-slate-900 px-1 py-0.5 rounded bg-slate-100">EXP-PARCEL</span></div>
              </div>
              <div className="border-b border-slate-300 pb-2 mb-2 text-xs">
                <span className="text-[8px] font-black text-slate-500 uppercase block">DELIVER TO:</span>
                <p className="font-black text-xs text-slate-900">{printOrder.customer_name} (📞 {printOrder.customer_phone})</p>
                <p className="text-[9px] text-slate-700 mt-0.5">{printOrder.full_address}</p>
              </div>
              <div className="border-b border-slate-300 pb-2 mb-2 text-xs">
                <span className="text-[8px] font-black text-slate-500 uppercase block mb-0.5">CONTENTS:</span>
                {hideItemInPrint ? <div className="p-1.5 bg-slate-100 rounded text-[9px] font-mono font-bold text-slate-600 text-center">🔒 CONFIDENTIAL PARCEL</div> : printOrder.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-[9px] py-0.5 font-medium"><span className="truncate max-w-[170px]">{it.title}</span><span className="font-black">Qty: {it.quantity || 1}</span></div>
                ))}
              </div>
              <div className="p-2 bg-slate-100 rounded-xl border border-slate-300 flex justify-between items-center mb-1.5">
                <div><span className="text-[8px] font-black text-slate-600 block">COD:</span><span className="text-base font-black text-slate-900">₹{printOrder.total_price || 0}</span></div>
                <div className="text-right"><span className="text-[8px] font-bold text-emerald-800">ADV PAID</span><p className="text-[11px] font-black text-emerald-700">✓ ₹{printOrder.delivery_fee_paid || 0}</p></div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="flex-1 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black"><Printer size={15} className="inline mr-1" /> Exact Print</button>
              <button onClick={() => setPrintOrder(null)} className="px-4 py-3 bg-slate-100 rounded-2xl text-xs font-bold">Close</button>
            </div>
          </div>
        </div>
      )}

      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4" onClick={() => setSelectedScreenshot(null)}>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl max-w-xs shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <img src={selectedScreenshot} alt="Slip" className="w-full h-auto object-contain rounded-2xl max-h-[70vh]" />
            <button onClick={() => setSelectedScreenshot(null)} className="w-full mt-3 py-2.5 bg-slate-800 text-white text-xs font-bold rounded-2xl">Band Karein</button>
          </div>
        </div>
      )}

      {/* Modern App Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/90 backdrop-blur-2xl border-t border-slate-800/80 flex justify-around py-2.5 z-40 text-slate-400 shadow-2xl">
        <button onClick={() => setActiveTab('orders')} className={`flex flex-col items-center gap-1 relative px-3 py-1 rounded-2xl transition ${activeTab === 'orders' ? 'text-emerald-400 font-black' : 'hover:text-slate-200'}`}>
          <Package size={20} />
          <span className="text-[10px]">Orders</span>
        </button>
        <button onClick={() => setActiveTab('returns')} className={`flex flex-col items-center gap-1 relative px-3 py-1 rounded-2xl transition ${activeTab === 'returns' ? 'text-rose-400 font-black' : 'hover:text-slate-200'}`}>
          <RefreshCw size={20} />
          <span className="text-[10px]">Returns</span>
        </button>
        <button onClick={() => setActiveTab('products')} className={`flex flex-col items-center gap-1 px-3 py-1 rounded-2xl transition ${activeTab === 'products' || activeTab === 'add_product' ? 'text-emerald-400 font-black' : 'hover:text-slate-200'}`}>
          <ShoppingBag size={20} />
          <span className="text-[10px]">Catalog</span>
        </button>
      </nav>
    </div>
  );
          }

        
                
      
  
                        
  
  
  
