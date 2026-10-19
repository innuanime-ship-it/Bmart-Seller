import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from './supabaseClient';
import {
  Package, ShoppingBag, PlusCircle, Trash2, Edit3, RefreshCw, LogOut, Search, Printer,
  AlertCircle, Settings, Eye, EyeOff, X, CheckCircle, Lock, Mail, Image as ImageIcon,
  Phone, MapPin, Clock, Loader2, Store
} from 'lucide-react';

/* ───────────── Config ───────────── */
const BUCKET = 'product-images'; // Supabase Storage → public bucket
const DEFAULT_UPI = 'Barijanmart@upi';
const ADVANCE_ALREADY_IN_TOTAL = false; // true → COD = total_price − advance
const CUSTOM = 'Custom / Nayi Category Likhein';

const CATEGORIES = [
  'Fashion (Kapde)', 'Footwear (Joote / Chappal)', 'Groceries (Rashan / Kirana)',
  'Beauty & Personal Care', 'Electronics & Mobile Accessories', 'Kitchen & Home Appliances',
  'Baby Care & Toys', 'Stationery & Books', 'Agriculture / Kheti-Badi Seeds & Tools',
  'Pooja Samagri & Festives', 'Hardware & Tools', CUSTOM
];
const FABRICS = ['Pure Cotton', 'Linen', 'Denim / Jeans', 'Silk', 'Rayon', 'Polyester', 'Chiffon',
  'Georgette', 'Woolen (Garam Kapda)', 'Nylon', 'Cotton Blend / Mixed', 'Other Fabric'];

const ORDER_COLS = 'id,created_at,status,customer_name,customer_phone,alt_phone,full_address,items,delivery_fee_paid,total_price,location,return_info';
const FILTERS = [['all', 'Sab'], ['new', 'Naye'], ['process', 'Processing'], ['ship', 'Shipped'], ['deliver', 'Delivered'], ['cancel', 'Cancelled']];

const EMPTY_FORM = {
  title: '', description: '', category: CATEGORIES[0], price: '', mrp: '', min_quantity: '1',
  delivery_fee: '49', sizes: 'S, M, L, XL', fabric: FABRICS[0], mfg_date: '', expiry_date: '',
  allow_cancel: true, cancel_hours: '12', allow_return: true, return_days: '7',
  images: [], seller_code: 'BM-01', upi_id: DEFAULT_UPI
};

const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#1e293b"/><text x="40" y="48" font-size="26" text-anchor="middle">📦</text></svg>'
);

const PRINT_CSS = `@media print{body *{visibility:hidden!important}#printable-sticker,#printable-sticker *{visibility:visible!important}
#printable-sticker{position:absolute!important;left:0;top:0;width:100%;max-width:380px;border:2px dashed #000!important}
.print-shell{position:static!important;overflow:visible!important;max-height:none!important;background:#fff!important}
@page{size:auto;margin:3mm}}`;

/* ───────────── Helpers ───────────── */
const rupee = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const isRequest = (o) => /request/i.test(o.status || '');
const codDue = (o) => Math.max(0, Number(o.total_price || 0) - (ADVANCE_ALREADY_IN_TOTAL ? Number(o.delivery_fee_paid || 0) : 0));
const matchFilter = (o, f) => f === 'all' ||
  (f === 'new' ? !o.status || /placed|new/i.test(o.status) : (o.status || '').toLowerCase().includes(f));

const statusStyle = (s = '') => {
  const t = s.toLowerCase();
  if (t.includes('cancel') || t.includes('reject')) return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
  if (t.includes('deliver') || t.includes('refunded')) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  if (t.includes('ship')) return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
  if (t.includes('request')) return 'bg-orange-500/15 text-orange-300 border-orange-500/30';
  if (t.includes('process')) return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
};

const beep = () => {
  try {
    const c = new (window.AudioContext || window.webkitAudioContext)();
    const o = c.createOscillator(); const g = c.createGain();
    o.connect(g); g.connect(c.destination); o.frequency.value = 880; g.gain.value = 0.08;
    o.start(); o.stop(c.currentTime + 0.25);
  } catch { /* sound optional */ }
};

const compress = (file) => new Promise((res, rej) => {
  const img = new Image(); const url = URL.createObjectURL(file);
  img.onload = () => {
    const r = Math.min(1, 900 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    c.toBlob((b) => (b ? res(b) : rej(new Error('Photo compress nahi hui'))), 'image/jpeg', 0.75);
  };
  img.onerror = () => rej(new Error('Photo khul nahi saki'));
  img.src = url;
});
const toDataUrl = (blob) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });

/* ───────────── Small UI parts ───────────── */
const inputCls = 'w-full px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition';
const Field = ({ label, children }) => (
  <label className="block"><span className="text-[11px] font-semibold text-slate-400 mb-1 block">{label}</span>{children}</label>
);
const Badge = ({ status }) => (
  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${statusStyle(status)}`}>{status || 'Order Placed'}</span>
);
const Empty = ({ icon: Icon, title, hint }) => (
  <div className="text-center rounded-2xl p-10 border border-dashed border-slate-800 bg-slate-900/40 flex flex-col items-center">
    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3 text-slate-500"><Icon size={24} /></div>
    <p className="text-sm font-semibold text-slate-300">{title}</p>
    <p className="text-xs text-slate-500 mt-1">{hint}</p>
  </div>
);
const Modal = ({ onClose, children, light }) => (
  <div className="print-shell fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
    <div className={`print-shell w-full max-w-sm max-h-[92vh] overflow-y-auto rounded-2xl p-5 shadow-2xl ${light ? 'bg-white text-slate-900' : 'bg-slate-900 border border-slate-800 text-slate-100'}`} onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  </div>
);
const Toast = ({ t, onClose }) => t && (
  <div className="fixed top-3 left-3 right-3 max-w-sm mx-auto z-[60]">
    <div className={`p-3 rounded-xl shadow-2xl flex items-start justify-between gap-2 text-white border border-white/10 ${t.type === 'error' ? 'bg-rose-600' : t.type === 'success' ? 'bg-emerald-600' : 'bg-slate-700'}`}>
      <div className="text-sm"><p className="font-semibold leading-tight">{t.title}</p>{t.msg && <p className="text-xs opacity-90 mt-0.5">{t.msg}</p>}</div>
      <button onClick={onClose} className="p-1 opacity-70 hover:opacity-100"><X size={14} /></button>
    </div>
  </div>
);

/* ───────────── Main App ───────────── */
export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [login, setLogin] = useState({ email: '', password: '' });
  const [loggingIn, setLoggingIn] = useState(false);

  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const [slip, setSlip] = useState(null);
  const [damage, setDamage] = useState(null);
  const [printOrder, setPrintOrder] = useState(null);
  const [hideItems, setHideItems] = useState(false);
  const [preview, setPreview] = useState(null);
  const [dialog, setDialog] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [customCat, setCustomCat] = useState('');
  const [settings, setSettings] = useState({ support_phone: '9204184716', whatsapp_url: 'https://wa.me/919204184716', facebook_url: '', instagram_url: '' });

  const [toastData, setToastData] = useState(null);
  const timer = useRef(); const seenIds = useRef(null);
  const toast = useCallback((title, msg = '', type = 'info') => {
    clearTimeout(timer.current); setToastData({ title, msg, type });
    timer.current = setTimeout(() => setToastData(null), 3500);
  }, []);
  const ask = (title, msg, onConfirm, label = 'Haan, Confirm') => setDialog({ title, msg, onConfirm, label });

  /* Auth */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!login.email.trim() || !login.password) return toast('Details adhoori hain', 'Email aur password dono bharein.', 'error');
    setLoggingIn(true);
    const { error } = await supabase.auth.signInWithPassword({ email: login.email.trim(), password: login.password });
    setLoggingIn(false);
    if (error) toast('Login nahi hua', 'Email ya password galat hai.', 'error');
    else setLogin({ email: '', password: '' });
  };
  const handleLogout = () => ask('Logout karein?', 'Aap seller account se bahar ho jayenge.', () => supabase.auth.signOut(), 'Logout');

  /* Data */
  const fetchOrders = useCallback(async (silent = true) => {
    if (!silent) setLoading(true);
    const { data, error } = await supabase.from('orders').select(ORDER_COLS).order('created_at', { ascending: false });
    if (error) toast('Orders load nahi hue', error.message, 'error');
    else {
      if (seenIds.current) {
        const fresh = data.filter((o) => !seenIds.current.has(o.id));
        if (fresh.length) { toast('Naya order aaya', `${fresh.length} naya order mila hai.`, 'success'); beep(); }
      }
      seenIds.current = new Set(data.map((o) => o.id)); setOrders(data);
    }
    if (!silent) setLoading(false);
  }, [toast]);

  const fetchProducts = useCallback(async () => {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) toast('Catalog load nahi hua', error.message, 'error'); else setProducts(data || []);
  }, [toast]);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle();
    if (data) setSettings((s) => ({ ...s, support_phone: data.support_phone || s.support_phone, whatsapp_url: data.whatsapp_url || s.whatsapp_url, facebook_url: data.facebook_url || '', instagram_url: data.instagram_url || '' }));
  }, []);

  useEffect(() => {
    if (!session) return;
    seenIds.current = null; fetchOrders(false); fetchProducts(); fetchSettings();
    const oc = supabase.channel('bmart-orders').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders(true)).subscribe();
    const pc = supabase.channel('bmart-products').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchProducts()).subscribe();
    return () => { supabase.removeChannel(oc); supabase.removeChannel(pc); };
  }, [session, fetchOrders, fetchProducts, fetchSettings]);

  /* Derived */
  const requests = useMemo(() => orders.filter(isRequest), [orders]);
  const normal = useMemo(() => orders.filter((o) => !isRequest(o)), [orders]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return normal.filter((o) => matchFilter(o, filter) && (!q ||
      String(o.id).toLowerCase().includes(q) || (o.customer_name || '').toLowerCase().includes(q) || (o.customer_phone || '').includes(q)));
  }, [normal, query, filter]);
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const active = normal.filter((o) => !/deliver|cancel/i.test(o.status || ''));
    return { today: normal.filter((o) => new Date(o.created_at).toDateString() === today).length, active: active.length, cod: active.reduce((s, o) => s + codDue(o), 0) };
  }, [normal]);

  /* Order actions */
  const updateStatus = async (id, status) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) toast('Status badla nahi', error.message, 'error');
    else { toast('Status badal gaya', `Order ab "${status}" hai.`, 'success'); fetchOrders(true); }
  };
  const changeStatus = (o, status) => {
    if (o.status === status) return;
    if (['Delivered', 'Cancelled'].includes(status)) ask(`Order ${status} karein?`, `#${o.id} ka status "${status}" ho jayega.`, () => updateStatus(o.id, status));
    else updateStatus(o.id, status);
  };
  const viewSlip = async (id) => {
    const { data } = await supabase.from('orders').select('screenshot').eq('id', id).maybeSingle();
    if (data?.screenshot) setSlip(data.screenshot); else toast('Slip nahi mili', 'Is order mein payment slip upload nahi hui.', 'error');
  };
  const deleteRow = (table, id, title, msg, after) => ask(title, msg, async () => {
    const { data, error } = await supabase.from(table).delete().eq('id', id).select('id');
    if (error) toast('Delete nahi hua', error.message, 'error');
    else if (!data?.length) toast('Delete nahi hua', 'Permission (RLS) check karein.', 'error');
    else { toast('Delete ho gaya', '', 'success'); after(); }
  }, 'Haan, Delete');

  /* Product form */
  const isCustom = form.category === CUSTOM;
  const catText = isCustom ? customCat : form.category;
  const hasSizes = /fashion|footwear|kapde|cloth/i.test(catText);
  const hasFabric = /fashion|kapde|cloth/i.test(catText);
  const isFood = /grocer|beauty|food|doodh|dairy/i.test(catText);
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const newProduct = () => { setEditingId(null); setForm(EMPTY_FORM); setCustomCat(''); setTab('add_product'); };
  const editProduct = (p) => {
    const known = CATEGORIES.includes(p.category);
    setEditingId(p.id); setCustomCat(known ? '' : p.category || '');
    setForm({
      ...EMPTY_FORM, title: p.title || '', description: p.description || '', category: known ? p.category : CUSTOM,
      price: p.price ?? '', mrp: p.mrp ?? '', min_quantity: p.min_quantity ?? 1, delivery_fee: p.delivery_fee ?? 0,
      sizes: (Array.isArray(p.sizes) ? p.sizes.join(', ') : p.sizes) || '', fabric: p.fabric || FABRICS[0],
      mfg_date: p.mfg_date || '', expiry_date: p.expiry_date || '',
      allow_cancel: Number(p.cancel_hours) > 0, cancel_hours: p.cancel_hours || '12',
      allow_return: Number(p.return_days) > 0, return_days: p.return_days || '7',
      images: p.images || [], seller_code: p.seller_code || 'BM-01', upi_id: p.upi_id || DEFAULT_UPI
    });
    setTab('add_product');
  };
  const closeForm = () => { setEditingId(null); setForm(EMPTY_FORM); setCustomCat(''); setTab('products'); };

  const uploadPhotos = async (e) => {
    const files = Array.from(e.target.files || []); e.target.value = '';
    if (!files.length) return;
    setUploading(true); const urls = []; let fallback = false;
    for (const file of files) {
      try {
        const blob = await compress(file);
        const path = `products/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' });
        if (error) { fallback = true; urls.push(await toDataUrl(blob)); }
        else urls.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
      } catch (err) { toast('Photo skip hui', err.message, 'error'); }
    }
    setForm((f) => ({ ...f, images: [...f.images, ...urls] })); setUploading(false);
    if (fallback) toast('Storage bucket nahi mila', `"${BUCKET}" bucket banayein, tab tak photo database mein save hogi.`, 'error');
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    const price = Number(form.price), mrp = form.mrp === '' ? price : Number(form.mrp), minQ = Number(form.min_quantity);
    const err = !form.title.trim() ? 'Product title likhein.' : !(price > 0) ? 'Sahi selling price daalein.' :
      mrp < price ? 'MRP, selling price se kam nahi ho sakta.' : !(minQ >= 1) ? 'Minimum quantity kam se kam 1 honi chahiye.' :
      isCustom && !customCat.trim() ? 'Nayi category ka naam likhein.' :
      form.allow_cancel && !(Number(form.cancel_hours) >= 1) ? 'Cancel ke ghante daalein.' :
      form.allow_return && !(Number(form.return_days) >= 1) ? 'Return ke din daalein.' :
      !form.images.length ? 'Kam se kam 1 photo upload karein.' : '';
    if (err) return toast('Form adhoora hai', err, 'error');

    const returnDays = form.allow_return ? Number(form.return_days) : 0;
    const payload = {
      id: editingId || 'p_' + Date.now(), title: form.title.trim(), description: form.description.trim(),
      category: isCustom ? customCat.trim() : form.category, price, mrp, min_quantity: minQ,
      delivery_fee: Number(form.delivery_fee || 0),
      sizes: hasSizes ? form.sizes.split(',').map((s) => s.trim()).filter(Boolean) : [],
      fabric: hasFabric ? form.fabric : null,
      mfg_date: isFood ? form.mfg_date || null : null, expiry_date: isFood ? form.expiry_date || null : null,
      cancel_hours: form.allow_cancel ? Number(form.cancel_hours) : 0, return_days: returnDays,
      return_policy: returnDays > 0 ? `${returnDays} Din Return / Replacement Policy` : 'Return Not Allowed',
      images: form.images, seller_code: form.seller_code || 'BM-01', upi_id: form.upi_id || DEFAULT_UPI
    };
    setSaving(true);
    const { error } = await supabase.from('products').upsert([payload]);
    setSaving(false);
    if (error) return toast('Save nahi hua', error.message, 'error');
    toast(editingId ? 'Product update hua' : 'Product publish hua', '', 'success');
    closeForm(); fetchProducts();
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(settings.support_phone.trim())) return toast('Galat number', '10 digit ka phone number daalein.', 'error');
    setSaving(true);
    const { error } = await supabase.from('app_settings').upsert([{ id: 1, ...settings }]);
    setSaving(false);
    if (error) toast('Settings save nahi hui', error.message, 'error'); else toast('Settings save ho gayi', '', 'success');
  };

  /* ───────── Auth screens ───────── */
  if (authLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-emerald-400"><Loader2 className="animate-spin" size={28} /></div>;

  if (!session) return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <Toast t={toastData} onClose={() => setToastData(null)} />
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-emerald-500/15 rounded-full blur-[100px]" />
      <div className="w-full max-w-xs z-10 flex flex-col items-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-xl shadow-emerald-500/20 mb-5"><Store className="text-white" size={36} /></div>
        <h1 className="text-2xl font-bold tracking-tight">Barijan Mart</h1>
        <p className="text-sm text-slate-400 mt-1 mb-7">Seller login</p>
        <form onSubmit={handleLogin} className="w-full flex flex-col gap-3">
          <div className="relative"><Mail size={15} className="absolute left-3.5 top-3.5 text-slate-500" />
            <input type="email" autoComplete="username" placeholder="Seller email" value={login.email} onChange={(e) => setLogin({ ...login, email: e.target.value })} className={inputCls + ' pl-10'} /></div>
          <div className="relative"><Lock size={15} className="absolute left-3.5 top-3.5 text-slate-500" />
            <input type="password" autoComplete="current-password" placeholder="Password" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} className={inputCls + ' pl-10'} /></div>
          <button type="submit" disabled={loggingIn} className="w-full py-3 mt-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition">
            {loggingIn ? <Loader2 size={16} className="animate-spin" /> : null}{loggingIn ? 'Login ho raha hai...' : 'Login karein'}
          </button>
        </form>
        <p className="text-[11px] text-slate-500 mt-6 text-center">15 gaon ka doorstep delivery store</p>
      </div>
    </div>
  );

  /* ───────── Main UI ───────── */
  const navItem = (id, Icon, label, badge, tone = 'emerald', match = [id]) => {
    const on = match.includes(tab);
    return (
      <button onClick={() => setTab(id)} className={`relative flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition select-none ${on ? (tone === 'rose' ? 'text-rose-400' : 'text-emerald-400') : 'text-slate-500 hover:text-slate-300'}`}>
        <Icon size={20} /><span className="text-[10px] font-semibold">{label}</span>
        {badge > 0 && <span className={`absolute -top-1 right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center ${tone === 'rose' ? 'bg-rose-600 text-white' : 'bg-emerald-500 text-slate-950'}`}>{badge}</span>}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 max-w-md mx-auto pb-24 font-sans relative">
      <style>{PRINT_CSS}</style>
      <Toast t={toastData} onClose={() => setToastData(null)} />

      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shrink-0"><Store className="text-white" size={18} /></div>
          <div className="min-w-0"><h1 className="text-sm font-bold leading-none">BMart Seller</h1><p className="text-[11px] text-slate-500 mt-1 truncate">{session.user.email}</p></div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { fetchOrders(false); fetchProducts(); }} aria-label="Refresh" className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 active:scale-95"><RefreshCw size={15} className={loading ? 'animate-spin text-emerald-400' : ''} /></button>
          <button onClick={handleLogout} aria-label="Logout" className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-rose-400 active:scale-95"><LogOut size={15} /></button>
        </div>
      </header>

      <main className="p-4 flex flex-col gap-4">
        {/* ORDERS */}
        {tab === 'orders' && (<>
          <div className="grid grid-cols-3 gap-2">
            {[['Aaj ke orders', stats.today], ['Pending', stats.active], ['COD baaki', rupee(stats.cod)]].map(([l, v]) => (
              <div key={l} className="bg-slate-900 border border-slate-800 rounded-xl p-3"><p className="text-[11px] text-slate-400">{l}</p><p className="text-base font-bold text-white mt-0.5 truncate">{v}</p></div>
            ))}
          </div>
          <div className="relative"><Search className="absolute left-3.5 top-3 text-slate-500" size={15} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Order ID, naam ya mobile se khojein" className={inputCls + ' pl-10'} /></div>
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
            {FILTERS.map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition ${filter === k ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>{l}</button>
            ))}
          </div>
          {visible.length === 0 ? <Empty icon={Package} title="Koi order nahi mila" hint="Naye orders aate hi yahan dikhenge." /> : visible.map((o) => (
            <div key={o.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-sm text-emerald-400 select-text">#{o.id}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{new Date(o.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <Badge status={o.status} />
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm select-text">
                <p className="font-semibold text-white">{o.customer_name}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs">
                  <a href={`tel:${o.customer_phone}`} className="text-emerald-400 font-semibold inline-flex items-center gap-1"><Phone size={12} />{o.customer_phone}</a>
                  {o.alt_phone && <a href={`tel:${o.alt_phone}`} className="text-slate-400 inline-flex items-center gap-1"><Phone size={12} />{o.alt_phone}</a>}
                </div>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed flex gap-1.5"><MapPin size={13} className="shrink-0 mt-0.5" />{o.full_address}</p>
              </div>
              <div className="flex flex-col divide-y divide-slate-800">
                {o.items?.map((it, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 py-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={it.images?.[0] || PLACEHOLDER} onError={(e) => { e.currentTarget.src = PLACEHOLDER; }} className="w-9 h-9 rounded-lg object-cover bg-slate-950 border border-slate-800" alt="" />
                      <span className="truncate text-slate-200 font-medium">{it.title} ({it.size || 'Std'})</span>
                    </div>
                    <span className="font-semibold text-slate-300 whitespace-nowrap">x{it.quantity || 1} = {rupee(it.price * (it.quantity || 1))}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs">
                <span className="text-slate-400">Advance mila: <b className="text-emerald-400">{rupee(o.delivery_fee_paid)}</b></span>
                <span className="text-slate-400">COD lena hai: <b className="text-white text-sm">{rupee(codDue(o))}</b></span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[['Processing', 'Processing'], ['Shipped', 'Shipped'], ['Delivered', 'Delivered'], ['Cancelled', 'Cancel']].map(([s, l]) => (
                  <button key={s} onClick={() => changeStatus(o, s)} className={`py-2 rounded-lg text-[11px] font-semibold border transition active:scale-95 ${o.status === s ? statusStyle(s) : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'}`}>{l}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setHideItems(false); setPrintOrder(o); }} className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition"><Printer size={14} />Parcel sticker</button>
                <button onClick={() => viewSlip(o.id)} className="px-3.5 py-2.5 bg-slate-950 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold active:scale-95">Slip</button>
                {o.location?.mapsUrl && <a href={o.location.mapsUrl} target="_blank" rel="noreferrer" className="px-3.5 py-2.5 bg-slate-950 border border-slate-800 text-sky-300 rounded-xl text-xs font-semibold active:scale-95">Map</a>}
                <button onClick={() => deleteRow('orders', o.id, 'Order delete karein?', `#${o.id} aur uska payment proof hamesha ke liye hat jayega.`, () => setOrders((p) => p.filter((x) => x.id !== o.id)))} aria-label="Delete order" className="px-3 py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl active:scale-95"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </>)}

        {/* RETURNS */}
        {tab === 'returns' && (<>
          <div className="flex items-center justify-between"><h2 className="text-base font-bold">Return aur cancel requests</h2><span className="text-xs font-bold bg-rose-600 px-2.5 py-0.5 rounded-full">{requests.length}</span></div>
          {requests.length === 0 ? <Empty icon={CheckCircle} title="Koi pending request nahi" hint="Saari requests clear hain." /> : requests.map((o) => {
            const ri = o.return_info || {}; const cancel = /cancel/i.test(o.status || '');
            return (
              <div key={o.id} className="bg-slate-900 border border-orange-500/30 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div><p className="font-bold text-sm text-orange-300 select-text">#{o.id}</p><p className="text-xs text-slate-400 mt-0.5 select-text">{o.customer_name} · {o.customer_phone}</p></div>
                  <Badge status={ri.type || o.status} />
                </div>
                <div className="bg-slate-950 rounded-xl p-3 text-xs"><p className="font-semibold text-slate-300">Karan</p><p className="text-slate-400 mt-0.5 select-text">{ri.reason || 'Karan likha nahi hai'}</p></div>
                {ri.product_photo && (
                  <button onClick={() => setDamage(ri.product_photo)} className="flex items-center gap-3 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-left active:scale-[0.99]">
                    <img src={ri.product_photo} className="w-12 h-12 rounded-lg object-cover" alt="" /><div><p className="text-xs font-semibold text-slate-200">Customer ki photo</p><p className="text-[11px] text-slate-500">Badi photo dekhne ke liye dabayein</p></div>
                  </button>
                )}
                {ri.refund_method && (
                  <div className="bg-slate-950 border border-emerald-500/20 rounded-xl p-3 text-xs select-text">
                    <p className="font-semibold text-emerald-400">Refund: {String(ri.refund_method).toUpperCase()}</p>
                    {ri.refund_method === 'upi' ? <p className="font-mono text-slate-300 mt-1">{ri.refund_details?.upi}</p> : (
                      <div className="font-mono text-slate-300 mt-1 leading-relaxed"><p>A/C: {ri.refund_details?.accountNo}</p><p>IFSC: {ri.refund_details?.ifsc}</p><p>Naam: {ri.refund_details?.holderName}</p></div>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  {cancel ? (<>
                    <button onClick={() => ask('Cancel approve karein?', `#${o.id} cancel ho jayega.`, () => updateStatus(o.id, 'Cancel Approved'))} className="flex-1 py-2.5 bg-emerald-500 text-slate-950 rounded-xl text-xs font-bold active:scale-95">Cancel approve</button>
                    <button onClick={() => updateStatus(o.id, 'Processing')} className="flex-1 py-2.5 bg-slate-800 text-slate-200 rounded-xl text-xs font-bold active:scale-95">Reject, order chalu rakhein</button>
                  </>) : (<>
                    <button onClick={() => ask('Refund approve karein?', 'Refund bhej dene ke baad hi approve karein.', () => updateStatus(o.id, 'Return Approved & Refunded'))} className="flex-1 py-2.5 bg-emerald-500 text-slate-950 rounded-xl text-xs font-bold active:scale-95">Refund approve</button>
                    <button onClick={() => updateStatus(o.id, 'Replacement Shipped')} className="flex-1 py-2.5 bg-sky-500 text-slate-950 rounded-xl text-xs font-bold active:scale-95">Replacement bhejein</button>
                  </>)}
                </div>
              </div>
            );
          })}
        </>)}

        {/* CATALOG */}
        {tab === 'products' && (<>
          <div className="flex items-center justify-between">
            <div><h2 className="text-base font-bold">Catalog</h2><p className="text-xs text-slate-500">{products.length} products live</p></div>
            <button onClick={newProduct} className="px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 active:scale-95"><PlusCircle size={15} />Naya product</button>
          </div>
          {products.length === 0 ? <Empty icon={ShoppingBag} title="Catalog khali hai" hint="Pehla product jodkar bikri shuru karein." /> : products.map((p) => (
            <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex gap-3 items-center">
              <img src={p.images?.[0] || PLACEHOLDER} onError={(e) => { e.currentTarget.src = PLACEHOLDER; }} onClick={() => setPreview(p)} className="w-16 h-16 rounded-xl object-cover bg-slate-950 border border-slate-800 cursor-pointer" alt={p.title} />
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setPreview(p)}>
                <h3 className="text-sm font-semibold text-white truncate">{p.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5"><b className="text-emerald-400">{rupee(p.price)}</b>{p.mrp > p.price && <del className="ml-1.5 text-slate-600">{rupee(p.mrp)}</del>} · Min {p.min_quantity || 1}</p>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full inline-block mt-1.5 truncate max-w-full">{p.category}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <button onClick={() => editProduct(p)} aria-label="Edit" className="p-2 bg-slate-800 text-slate-300 rounded-lg active:scale-90"><Edit3 size={14} /></button>
                <button onClick={() => deleteRow('products', p.id, 'Product delete karein?', `"${p.title}" catalog se hamesha ke liye hat jayega.`, () => setProducts((x) => x.filter((i) => i.id !== p.id)))} aria-label="Delete" className="p-2 bg-rose-500/10 text-rose-400 rounded-lg active:scale-90"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </>)}

        {/* ADD / EDIT */}
        {tab === 'add_product' && (
          <form onSubmit={saveProduct} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3.5">
            <div className="flex items-center justify-between"><h2 className="text-base font-bold">{editingId ? 'Product edit karein' : 'Naya product jodein'}</h2>
              <button type="button" onClick={closeForm} className="text-xs font-semibold text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg">Cancel</button></div>
            <Field label="Product ka naam *"><input value={form.title} onChange={(e) => setF('title', e.target.value)} className={inputCls} /></Field>
            <Field label="Description"><textarea rows={3} value={form.description} onChange={(e) => setF('description', e.target.value)} placeholder="Quality, use, khaasiyat..." className={inputCls} /></Field>
            <Field label="Category *">
              <select value={form.category} onChange={(e) => setF('category', e.target.value)} className={inputCls}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            </Field>
            {isCustom && <Field label="Nayi category ka naam *"><input value={customCat} onChange={(e) => setCustomCat(e.target.value)} placeholder="jaise Doodh / Dairy" className={inputCls} /></Field>}
            <div className="grid grid-cols-3 gap-2">
              <Field label="Bikri price ₹ *"><input type="number" inputMode="decimal" min="0" value={form.price} onChange={(e) => setF('price', e.target.value)} className={inputCls} /></Field>
              <Field label="MRP ₹"><input type="number" inputMode="decimal" min="0" value={form.mrp} onChange={(e) => setF('mrp', e.target.value)} className={inputCls} /></Field>
              <Field label="Min qty *"><input type="number" inputMode="numeric" min="1" value={form.min_quantity} onChange={(e) => setF('min_quantity', e.target.value)} className={inputCls} /></Field>
            </div>
            {hasSizes && (
              <div className={`grid gap-2 ${hasFabric ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <Field label="Sizes (comma se alag)"><input value={form.sizes} onChange={(e) => setF('sizes', e.target.value)} className={inputCls} /></Field>
                {hasFabric && <Field label="Kapda"><select value={form.fabric} onChange={(e) => setF('fabric', e.target.value)} className={inputCls}>{FABRICS.map((f) => <option key={f}>{f}</option>)}</select></Field>}
              </div>
            )}
            {isFood && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Banane ki tareekh"><input type="date" value={form.mfg_date} onChange={(e) => setF('mfg_date', e.target.value)} className={inputCls} /></Field>
                <Field label="Expiry tareekh"><input type="date" value={form.expiry_date} onChange={(e) => setF('expiry_date', e.target.value)} className={inputCls} /></Field>
              </div>
            )}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-3">
              <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5"><Clock size={13} />Cancel aur return ke niyam</p>
              {[['allow_cancel', 'Order cancel ho sakta hai', 'cancel_hours', 'Kitne ghante tak?', 'ghante'], ['allow_return', 'Return / replacement ho sakta hai', 'return_days', 'Delivery ke kitne din tak?', 'din']].map(([flag, label, key, q, unit]) => (
                <div key={flag} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between"><span className="text-xs text-slate-300">{label}</span>
                    <button type="button" onClick={() => setF(flag, !form[flag])} className={`px-3 py-1 rounded-full text-[11px] font-bold ${form[flag] ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>{form[flag] ? 'Haan' : 'Nahi'}</button></div>
                  {form[flag] && <Field label={q}><div className="flex items-center gap-2"><input type="number" inputMode="numeric" min="1" value={form[key]} onChange={(e) => setF(key, e.target.value)} className={inputCls} /><span className="text-xs text-slate-400">{unit}</span></div></Field>}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Advance delivery fee ₹"><input type="number" inputMode="numeric" min="0" value={form.delivery_fee} onChange={(e) => setF('delivery_fee', e.target.value)} className={inputCls} /></Field>
              <Field label="UPI ID"><input value={form.upi_id} onChange={(e) => setF('upi_id', e.target.value)} className={inputCls + ' font-mono'} /></Field>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 mb-1.5">Photos * (pehli photo cover banegi)</p>
              <div className="grid grid-cols-4 gap-2">
                {form.images.map((src, i) => (
                  <div key={i} className="relative aspect-square">
                    <img src={src} className="w-full h-full object-cover rounded-lg border border-slate-800" alt="" />
                    <button type="button" aria-label="Photo hataayein" onClick={() => setF('images', form.images.filter((_, x) => x !== i))} className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-0.5"><X size={12} /></button>
                  </div>
                ))}
                <label className="aspect-square border-2 border-dashed border-emerald-500/40 rounded-lg flex items-center justify-center text-emerald-400 cursor-pointer hover:bg-emerald-500/5">
                  {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={uploadPhotos} disabled={uploading} />
                </label>
              </div>
            </div>
            <button type="submit" disabled={saving || uploading} className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold text-sm rounded-xl active:scale-[0.98] flex items-center justify-center gap-2">
              {saving && <Loader2 size={16} className="animate-spin" />}{saving ? 'Save ho raha hai...' : editingId ? 'Changes save karein' : 'Customer app par publish karein'}
            </button>
          </form>
        )}

        {/* SETTINGS */}
        {tab === 'settings' && (
          <form onSubmit={saveSettings} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3.5">
            <h2 className="text-base font-bold">Store settings</h2>
            <Field label="Customer care phone *"><input type="tel" inputMode="numeric" maxLength={10} value={settings.support_phone} onChange={(e) => setSettings({ ...settings, support_phone: e.target.value })} className={inputCls + ' font-mono'} /></Field>
            <Field label="WhatsApp link"><input value={settings.whatsapp_url} onChange={(e) => setSettings({ ...settings, whatsapp_url: e.target.value })} className={inputCls + ' font-mono text-xs'} /></Field>
            <Field label="Facebook page"><input value={settings.facebook_url} onChange={(e) => setSettings({ ...settings, facebook_url: e.target.value })} className={inputCls + ' font-mono text-xs'} /></Field>
            <Field label="Instagram page"><input value={settings.instagram_url} onChange={(e) => setSettings({ ...settings, instagram_url: e.target.value })} className={inputCls + ' font-mono text-xs'} /></Field>
            <button type="submit" disabled={saving} className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold text-sm rounded-xl active:scale-[0.98]">{saving ? 'Save ho raha hai...' : 'Settings save karein'}</button>
          </form>
        )}
      </main>

      {/* Product preview */}
      {preview && (
        <Modal onClose={() => setPreview(null)}>
          <div className="flex justify-between items-center mb-3"><span className="text-xs font-semibold text-emerald-400">Product preview</span><button onClick={() => setPreview(null)} aria-label="Band karein" className="p-1.5 bg-slate-800 rounded-lg"><X size={14} /></button></div>
          <div className="flex gap-2 overflow-x-auto snap-x mb-3">
            {(preview.images?.length ? preview.images : [PLACEHOLDER]).map((src, i) => <img key={i} src={src} className="snap-center w-full max-h-64 shrink-0 object-contain bg-slate-950 rounded-xl" alt="" />)}
          </div>
          <span className="text-[10px] bg-emerald-500/15 text-emerald-300 px-2.5 py-0.5 rounded-full font-semibold">{preview.category}</span>
          <h3 className="font-bold text-base mt-2">{preview.title}</h3>
          <p className="text-xs text-slate-400 mt-1 whitespace-pre-line leading-relaxed">{preview.description}</p>
          <div className="mt-3 bg-slate-950 rounded-xl p-3 text-xs flex flex-col gap-1.5">
            <div className="flex justify-between"><span>Bikri price</span><b className="text-emerald-400">{rupee(preview.price)}</b></div>
            {preview.mrp > preview.price && <div className="flex justify-between text-slate-500"><span>MRP</span><del>{rupee(preview.mrp)}</del></div>}
            <div className="flex justify-between"><span>Minimum order</span><b>{preview.min_quantity || 1}</b></div>
            {preview.sizes?.length > 0 && <div className="flex justify-between"><span>Sizes</span><b>{preview.sizes.join(', ')}</b></div>}
            {preview.fabric && <div className="flex justify-between"><span>Kapda</span><b>{preview.fabric}</b></div>}
            {preview.expiry_date && <div className="flex justify-between"><span>Expiry</span><b className="text-rose-400">{preview.expiry_date}</b></div>}
            <div className="flex justify-between border-t border-slate-800 pt-2 text-slate-400"><span>Cancel: {Number(preview.cancel_hours) > 0 ? `${preview.cancel_hours} ghante` : 'Nahi'}</span><span>Return: {Number(preview.return_days) > 0 ? `${preview.return_days} din` : 'Nahi'}</span></div>
          </div>
        </Modal>
      )}

      {/* Print sticker */}
      {printOrder && (
        <Modal light onClose={() => setPrintOrder(null)}>
          <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-xl text-xs mb-3">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">{hideItems ? <EyeOff size={14} /> : <Eye size={14} />}Saman ka naam sticker par</span>
            <button onClick={() => setHideItems(!hideItems)} className={`px-3 py-1 rounded-lg text-[11px] font-bold ${hideItems ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-800'}`}>{hideItems ? 'Chhupa hua' : 'Dikhayein'}</button>
          </div>
          <div id="printable-sticker" className="border-2 border-dashed border-slate-900 p-3.5 rounded-xl bg-white text-slate-900">
            <div className="border-b-2 border-slate-900 pb-2 mb-2 flex justify-between items-center">
              <div><h2 className="text-base font-black leading-none text-red-700">BARIJAN MART</h2><p className="text-[9px] font-semibold text-slate-600 mt-0.5">Doorstep delivery · 15 gaon</p></div>
              <p className="text-[10px] font-mono font-bold">#{printOrder.id}</p>
            </div>
            <div className="border-b border-slate-300 pb-2 mb-2">
              <p className="text-[9px] font-bold text-slate-500">DELIVER TO</p>
              <p className="font-black text-sm">{printOrder.customer_name}</p>
              <p className="font-bold text-xs mt-0.5">{printOrder.customer_phone}{printOrder.alt_phone && ` / ${printOrder.alt_phone}`}</p>
              <p className="text-[10px] text-slate-700 mt-0.5 leading-snug whitespace-pre-line">{printOrder.full_address}</p>
            </div>
            <div className="border-b border-slate-300 pb-2 mb-2">
              <p className="text-[9px] font-bold text-slate-500">PARCEL CONTENTS</p>
              {hideItems ? <p className="mt-1 p-1.5 bg-slate-100 rounded text-[10px] font-mono font-bold text-center">CONFIDENTIAL PARCEL · BM-{printOrder.id}</p> :
                printOrder.items?.map((it, i) => <div key={i} className="flex justify-between text-[10px] py-0.5"><span className="truncate max-w-[200px]">{it.title} ({it.size || 'Std'})</span><b>Qty {it.quantity || 1}</b></div>)}
            </div>
            <div className="p-2 bg-slate-100 rounded-lg border border-slate-300 flex justify-between items-center">
              <div><p className="text-[9px] font-bold text-slate-600">CASH ON DELIVERY</p><p className="text-lg font-black">{rupee(codDue(printOrder))}</p></div>
              <div className="text-right"><p className="text-[9px] font-bold text-emerald-800">ADVANCE PAID</p><p className="text-xs font-black text-emerald-700">{rupee(printOrder.delivery_fee_paid)}</p></div>
            </div>
            <p className="text-center text-[9px] font-semibold mt-2">Customer care: {settings.support_phone}</p>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => window.print()} className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95"><Printer size={15} />Print karein</button>
            <button onClick={() => setPrintOrder(null)} className="px-5 py-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold">Band</button>
          </div>
        </Modal>
      )}

      {slip && <Modal onClose={() => setSlip(null)}><p className="text-xs font-semibold text-emerald-400 mb-2">Payment slip</p><img src={slip} alt="Payment proof" className="w-full rounded-xl max-h-[65vh] object-contain" /><button onClick={() => setSlip(null)} className="w-full mt-3 py-2.5 bg-slate-800 rounded-xl text-xs font-semibold">Band karein</button></Modal>}
      {damage && <Modal onClose={() => setDamage(null)}><p className="text-xs font-semibold text-rose-400 mb-2">Customer ki photo</p><img src={damage} alt="Damage proof" className="w-full rounded-xl max-h-[65vh] object-contain" /><button onClick={() => setDamage(null)} className="w-full mt-3 py-2.5 bg-slate-800 rounded-xl text-xs font-semibold">Band karein</button></Modal>}

      {dialog && (
        <Modal onClose={() => setDialog(null)}>
          <div className="text-center flex flex-col items-center gap-2">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20"><AlertCircle size={22} /></div>
            <h3 className="font-bold text-sm">{dialog.title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{dialog.msg}</p>
            <div className="flex gap-2 w-full mt-2">
              <button onClick={() => setDialog(null)} className="flex-1 py-2.5 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl">Nahi</button>
              <button onClick={() => { const fn = dialog.onConfirm; setDialog(null); fn(); }} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl">{dialog.label}</button>
            </div>
          </div>
        </Modal>
      )}

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-950/95 backdrop-blur border-t border-slate-800 flex justify-around py-2 z-40">
        {navItem('orders', Package, 'Orders', normal.filter((o) => !o.status || /placed|new/i.test(o.status)).length)}
        {navItem('returns', RefreshCw, 'Requests', requests.length, 'rose')}
        {navItem('products', ShoppingBag, 'Catalog', 0, 'emerald', ['products', 'add_product'])}
        {navItem('settings', Settings, 'Settings', 0)}
      </nav>
    </div>
  );
}
