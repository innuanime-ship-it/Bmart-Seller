import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Package, ShoppingBag, PlusCircle, Trash2, Edit3, MapPin, 
  CheckCircle, Clock, Truck, XCircle, ExternalLink, RefreshCw, 
  LogOut, Shield, Search, Printer, ChevronRight, AlertCircle,
  Settings, PhoneCall, MessageCircle, ArrowLeft, Eye, Copy, QrCode
} from 'lucide-react';

// "IN1511RNB2008" ka SHA-256 cryptographic hash (Plaintext safe)
const ADMIN_HASH = "8ba7b3d3957ebc4c8d55fa4ec4301fa8fca16053f3e9c9d0d3c0e12e105e6080";

// Browser Native SHA-256 Hashing Function
const hashPassword = async (string) => {
  const utf8 = new TextEncoder().encode(string);
  const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((bytes) => bytes.toString(16).padStart(2, '0')).join('');
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('bmart_seller_logged') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  
  // App Navigation: 'orders' | 'returns' | 'products' | 'add_product' | 'settings'
  const [activeTab, setActiveTab] = useState('orders');

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals States
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);
  const [selectedDamagePhoto, setSelectedDamagePhoto] = useState(null);
  const [printOrder, setPrintOrder] = useState(null); // Shipping Label Print Modal

  // Product Form State
  const [editingId, setEditingId] = useState(null);
  const [prodForm, setProdForm] = useState({
    title: '',
    description: '',
    category: 'Fashion',
    price: '',
    mrp: '',
    min_quantity: '1',
    delivery_fee: '49',
    sizes: 'S, M, L, XL',
    images: [],
    seller_code: 'BM-01',
    return_policy: '7 Days Return / Replacement',
    upi_id: '9204184716@upi'
  });

  // App Settings State (Admin Support Links)
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
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setOrders(data);
    setLoading(false);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
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
    // Secure Hashed Login Handler
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      return alert("Kripya Master Password enter karein!");
    }

    const inputHash = await hashPassword(passwordInput.trim());
    if (inputHash === ADMIN_HASH) {
      setIsAuthenticated(true);
      localStorage.setItem('bmart_seller_logged', 'true');
      setPasswordInput('');
    } else {
      alert("Galat Master Password! Access Denied.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('bmart_seller_logged');
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
          setProdForm((prev) => ({
            ...prev,
            images: [...prev.images, compressed]
          }));
        };
        img.src = readerEvent.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!prodForm.title || !prodForm.price || !prodForm.images.length) {
      return alert("Title, Price aur kam se kam 1 Photo daalna zaroori hai!");
    }

    const payload = {
      id: editingId || ('p_' + Date.now()),
      title: prodForm.title,
      description: prodForm.description,
      category: prodForm.category,
      price: Number(prodForm.price),
      mrp: Number(prodForm.mrp || prodForm.price * 2),
      min_quantity: Number(prodForm.min_quantity || 1),
      delivery_fee: Number(prodForm.delivery_fee || 0),
      sizes: typeof prodForm.sizes === 'string' 
        ? prodForm.sizes.split(',').map((s) => s.trim()).filter(Boolean) 
        : prodForm.sizes,
      images: prodForm.images,
      seller_code: prodForm.seller_code,
      return_policy: prodForm.return_policy,
      upi_id: prodForm.upi_id
    };

    setLoading(true);
    const { error } = await supabase.from('products').upsert([payload]);
    setLoading(false);

    if (error) {
      alert("Error: " + error.message);
    } else {
      alert(editingId ? "Product Updated!" : "Product Published!");
      setEditingId(null);
      setProdForm({
        title: '', description: '', category: 'Fashion', price: '', mrp: '', min_quantity: '1', delivery_fee: '49',
        sizes: 'S, M, L, XL', images: [], seller_code: 'BM-01', return_policy: '7 Days Return / Replacement', upi_id: '9204184716@upi'
      });
      setActiveTab('products');
      fetchProducts();
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Kya aap ise catalog se hatana chahte hain?")) return;
    await supabase.from('products').delete().eq('id', id);
    fetchProducts();
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) alert("Status update error: " + error.message);
    else fetchOrders();
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      const { error } = await supabase.from('app_settings').upsert([{ id: 1, ...settingsForm }]);
      if (error) throw error;
      alert("BMart Support settings safalta se save ho gayi!");
    } catch (err) {
      alert("Settings save karne mein dikkat: " + err.message);
    } finally {
      setSettingsSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-slate-900 border border-slate-800 w-full max-w-xs rounded-3xl p-6 text-white shadow-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="text-emerald-500" size={24} />
            <h2 className="text-lg font-black text-emerald-400">BMart Seller OS</h2>
          </div>
          <p className="text-[11px] text-slate-400 mb-6">Central Store & Operations Portal</p>
          <label className="text-[10px] font-bold text-slate-400 block mb-1">Seller Master Password</label>
          <input 
            type="password" 
            placeholder="Master key enter karein" 
            value={passwordInput} 
            onChange={(e) => setPasswordInput(e.target.value)} 
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs mb-4 outline-none focus:border-emerald-500 text-white"
          />
          <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 font-bold text-xs rounded-xl transition shadow-lg">
            Secure Login
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
    <div className="min-h-screen bg-slate-100 flex flex-col max-w-md md:max-w-xl mx-auto shadow-2xl relative pb-20 select-none">
      
      {/* Native App Top Bar */}
      <header className="bg-slate-900 text-white px-4 py-3 sticky top-0 z-40 border-b border-slate-800 flex items-center justify-between shadow-md">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <h1 className="text-sm font-black text-emerald-400 leading-none">BMart Seller Hub</h1>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Barijan Mart 15 Villages Network</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchOrders} className="p-1.5 bg-slate-800 rounded-lg text-slate-300 hover:text-white transition">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={handleLogout} className="p-1.5 bg-rose-900/60 text-rose-300 hover:bg-rose-800 rounded-lg transition" title="Logout">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-3.5 flex-1">

        {/* 1. ORDERS VIEW */}
        {activeTab === 'orders' && (
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Search Order ID, Name ya Mobile..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 shadow-xs"
              />
            </div>

            {filteredOrders.length === 0 ? (
              <div className="text-center bg-white rounded-2xl p-10 border border-dashed border-slate-300">
                <Package className="mx-auto text-slate-300 mb-2" size={28} />
                <p className="text-slate-400 text-xs font-bold">Koi live order nahi mila.</p>
              </div>
            ) : (
              filteredOrders.map((o) => (
                <div key={o.id} className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex flex-col gap-2.5">
                  <div className="flex justify-between items-start border-b pb-2">
                    <div>
                      <span className="font-black text-xs text-emerald-800">#{o.id}</span>
                      <p className="text-[10px] text-slate-400">{new Date(o.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <span className={"text-[10px] font-black px-2 py-0.5 rounded-full " + (
                      o.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800' :
                      o.status === 'Shipped' ? 'bg-blue-100 text-blue-800' :
                      o.status === 'Cancelled' || o.status === 'Cancel Approved' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                    )}>
                      {o.status || 'Order Placed'}
                    </span>
                  </div>

                  {/* Customer & Address Details */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs flex flex-col gap-1">
                    <p className="font-bold text-slate-900">{o.customer_name}</p>
                    <div className="flex gap-2 text-slate-600 text-[11px]">
                      <span>📞 <a href={"tel:" + o.customer_phone} className="text-emerald-700 font-bold underline">{o.customer_phone}</a></span>
                      {o.alt_phone && <span>(Alt: <a href={"tel:" + o.alt_phone} className="underline">{o.alt_phone}</a>)</span>}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight mt-0.5">🏡 {o.full_address}</p>
                  </div>

                  {/* Items List */}
                  <div className="flex flex-col gap-1 bg-white border border-slate-100 rounded-xl p-2">
                    {o.items?.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1 border-b last:border-none border-slate-100">
                        <div className="flex items-center gap-2">
                          <img src={it.images?.[0] || 'https://via.placeholder.com/40'} className="w-8 h-8 rounded-lg object-contain bg-slate-50 border border-slate-200" alt="prod" />
                          <span className="font-bold text-slate-800 text-[11px] truncate max-w-[170px]">{it.title} ({it.size || 'Std'})</span>
                        </div>
                        <span className="text-[11px] font-extrabold text-slate-700">x{it.quantity || 1} = ₹{it.price * (it.quantity || 1)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Fees Breakdown & Action Buttons */}
                  <div className="flex justify-between items-center text-[11px] px-1">
                    <span>Adv Fee: <b className="text-emerald-700">₹{o.delivery_fee_paid || 0}</b></span>
                    <span>COD Collect: <b className="text-slate-900 font-black text-xs">₹{o.total_price || 0}</b></span>
                  </div>

                  <div className="flex gap-1.5 pt-2 border-t border-slate-100">
                    <button 
                      onClick={() => setPrintOrder(o)}
                      className="flex-1 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition active:scale-95"
                    >
                      <Printer size={13} /> Print Label
                    </button>
                    {o.screenshot && (
                      <button 
                        onClick={() => setSelectedScreenshot(o.screenshot)} 
                        className="px-2.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold"
                      >
                        Slip
                      </button>
                    )}
                    {o.location?.mapsUrl && (
                      <a 
                        href={o.location.mapsUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="px-2.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold"
                      >
                        GPS
                      </a>
                    )}
                  </div>

                  {/* Order Status Control */}
                  <div className="flex gap-1 pt-1">
                    <button onClick={() => updateOrderStatus(o.id, 'Processing')} className="flex-1 py-1 bg-amber-500 text-white rounded-lg text-[10px] font-bold">Processing</button>
                    <button onClick={() => updateOrderStatus(o.id, 'Shipped')} className="flex-1 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-bold">Shipped</button>
                    <button onClick={() => updateOrderStatus(o.id, 'Delivered')} className="flex-1 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold">Delivered</button>
                    <button onClick={() => updateOrderStatus(o.id, 'Cancelled')} className="flex-1 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-bold">Cancel</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
                {/* 2. RETURNS & REPLACEMENT VIEW */}
        {activeTab === 'returns' && (
          <div className="flex flex-col gap-3">
            <div className="p-2.5 bg-rose-50 rounded-2xl border border-rose-200 text-rose-800 text-xs font-bold">
              ⚠️ Grahak Return & Replacement Requests ({returnRequests.length})
            </div>

            {returnRequests.length === 0 ? (
              <div className="text-center bg-white rounded-2xl p-12 border border-dashed border-slate-300">
                <CheckCircle className="mx-auto text-emerald-400 mb-2" size={32} />
                <p className="text-slate-400 text-xs font-bold">Koi pending Return ya Replacement nahi hai.</p>
              </div>
            ) : (
              returnRequests.map((o) => (
                <div key={o.id} className="bg-white rounded-2xl border-2 border-rose-200 p-3.5 shadow-sm flex flex-col gap-2.5">
                  <div className="flex justify-between items-start border-b pb-2">
                    <div>
                      <span className="font-black text-xs text-rose-700">#{o.id}</span>
                      <p className="text-[10px] text-slate-400">{o.customer_name} (📞 {o.customer_phone})</p>
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                      {o.return_info?.type || o.status}
                    </span>
                  </div>

                  <div className="p-2 bg-slate-50 rounded-xl text-xs">
                    <p className="font-bold text-slate-800">Karan (Reason):</p>
                    <p className="text-[11px] text-slate-600 italic">{o.return_info?.reason || 'Karan likha nahi hai'}</p>
                  </div>

                  {/* Customer Attached Damage Product Photo */}
                  {o.return_info?.product_photo && (
                    <div className="flex items-center justify-between p-2 bg-rose-50/50 rounded-xl border border-rose-200">
                      <div className="flex items-center gap-2">
                        <img src={o.return_info.product_photo} className="w-10 h-10 rounded-lg object-cover border" alt="Damage" />
                        <span className="text-[11px] font-bold text-rose-800">Customer Damage Photo</span>
                      </div>
                      <button 
                        onClick={() => setSelectedDamagePhoto(o.return_info.product_photo)}
                        className="px-2 py-1 bg-white border border-rose-300 text-rose-700 rounded-lg text-[10px] font-bold"
                      >
                        Badi Photo Dekhein
                      </button>
                    </div>
                  )}

                  {/* Refund Details */}
                  {o.return_info?.type?.includes('वापस') && (
                    <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-xs">
                      <p className="font-bold text-emerald-900">Refund Method: {o.return_info?.refund_method?.toUpperCase()}</p>
                      {o.return_info?.refund_method === 'upi' ? (
                        <p className="text-emerald-800 font-mono font-bold mt-0.5">UPI ID: {o.return_info?.refund_details?.upi}</p>
                      ) : (
                        <div className="text-[10px] text-emerald-800 font-mono mt-0.5 leading-tight">
                          <p>A/C: {o.return_info?.refund_details?.accountNo}</p>
                          <p>IFSC: {o.return_info?.refund_details?.ifsc} | Name: {o.return_info?.refund_details?.holderName}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-1.5 pt-1">
                    <button 
                      onClick={() => updateOrderStatus(o.id, 'Return Approved & Refunded')}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                    >
                      ✓ Approve & Refund
                    </button>
                    <button 
                      onClick={() => updateOrderStatus(o.id, 'Replacement Shipped')}
                      className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                    >
                      🔄 Dispatch Replacement
                    </button>
                    <button 
                      onClick={() => updateOrderStatus(o.id, 'Return Rejected')}
                      className="px-2.5 py-1.5 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 3. CATALOG PRODUCTS VIEW */}
        {activeTab === 'products' && (
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-black text-slate-700">Dukaan Catalog ({products.length} Items)</span>
              <button onClick={() => { setEditingId(null); setActiveTab('add_product'); }} className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg flex items-center gap-1">
                <PlusCircle size={13} /> Naya Saman Jodein
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {products.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-3 flex gap-3 items-center justify-between shadow-xs">
                  <img src={p.images?.[0] || 'https://via.placeholder.com/60'} alt={p.title} className="w-14 h-14 rounded-xl object-contain bg-slate-50 border border-slate-100" />
                  <div className="flex-1 min-w-0 text-xs">
                    <h4 className="font-bold text-slate-900 truncate">{p.title}</h4>
                    <p className="text-slate-500 text-[11px]">Price: <b className="text-slate-900">₹{p.price}</b> | Min Qty: <b>{p.min_quantity || 1}</b></p>
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">{p.category || 'Fashion'}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingId(p.id); setProdForm(p); setActiveTab('add_product'); }} className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl">
                      <Edit3 size={15} />
                    </button>
                    <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl">
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
          <form onSubmit={handleSaveProduct} className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-black text-xs text-slate-900">{editingId ? 'Edit Product Item' : 'Naya Catalog Product Jodein'}</h3>
              <button type="button" onClick={() => setActiveTab('products')} className="text-xs font-bold text-slate-400">Cancel</button>
            </div>

            <input 
              type="text" 
              placeholder="Product Title *" 
              value={prodForm.title} 
              onChange={(e) => setProdForm({ ...prodForm, title: e.target.value })} 
              className="w-full px-3 py-2 text-xs border rounded-xl" 
            />

            <textarea 
              placeholder="Product Description..." 
              value={prodForm.description} 
              onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })} 
              className="w-full px-3 py-2 text-xs border rounded-xl" 
              rows={2} 
            />

            {/* Category Dropdown */}
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">Select Category *</label>
              <select 
                value={prodForm.category} 
                onChange={(e) => setProdForm({ ...prodForm, category: e.target.value })} 
                className="w-full px-2.5 py-2 text-xs border rounded-xl bg-white font-medium"
              >
                <option value="Fashion">Fashion (Kapde)</option>
                <option value="Footwear">Footwear (Joote / Chappal)</option>
                <option value="Groceries">Groceries (Rashan / Kirana)</option>
                <option value="Beauty">Beauty (Shringar)</option>
                <option value="Electronics">Electronics</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[9px] font-bold text-slate-500">Sell Price (₹) *</label>
                <input type="number" value={prodForm.price} onChange={(e) => setProdForm({ ...prodForm, price: e.target.value })} className="w-full px-2 py-1.5 text-xs border rounded-lg font-bold" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-500">MRP (₹)</label>
                <input type="number" value={prodForm.mrp} onChange={(e) => setProdForm({ ...prodForm, mrp: e.target.value })} className="w-full px-2 py-1.5 text-xs border rounded-lg" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-500">Min Order Qty *</label>
                <input type="number" value={prodForm.min_quantity} onChange={(e) => setProdForm({ ...prodForm, min_quantity: e.target.value })} className="w-full px-2 py-1.5 text-xs border rounded-lg font-bold bg-amber-50" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-bold text-slate-500">Advance Delivery Fee (₹)</label>
                <input type="number" value={prodForm.delivery_fee} onChange={(e) => setProdForm({ ...prodForm, delivery_fee: e.target.value })} className="w-full px-2 py-1.5 text-xs border rounded-lg" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-500">Sizes (comma separated)</label>
                <input type="text" value={Array.isArray(prodForm.sizes) ? prodForm.sizes.join(', ') : prodForm.sizes} onChange={(e) => setProdForm({ ...prodForm, sizes: e.target.value })} className="w-full px-2 py-1.5 text-xs border rounded-lg" />
              </div>
            </div>

            {/* Product UPI ID & Live QR Preview */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="text-[10px] font-bold text-slate-700 block mb-1">Product Specific UPI ID (For Advance Fee)</label>
              <input 
                type="text" 
                value={prodForm.upi_id || ''} 
                onChange={(e) => setProdForm({ ...prodForm, upi_id: e.target.value })} 
                placeholder="e.g. 9204184716@upi"
                className="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white font-mono" 
              />
              {prodForm.upi_id && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200">
                  <img src={"https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=" + encodeURIComponent("upi://pay?pa=" + prodForm.upi_id + "&pn=BarijanMart")} className="w-12 h-12 rounded border p-0.5 bg-white" alt="QR" />
                  <span className="text-[10px] text-slate-500 font-medium">✓ Is product par yeh UPI QR customer ko dikhega</span>
                </div>
              )}
            </div>

            <label className="p-3 border-2 border-dashed border-emerald-300 rounded-xl cursor-pointer text-center text-xs text-emerald-800 font-bold bg-emerald-50/40 hover:bg-emerald-50 transition">
              📷 Click to Upload Product Photos ({prodForm.images?.length || 0} Attached)
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
            </label>

            <button type="submit" disabled={loading} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition active:scale-95">
              {loading ? "Syncing..." : (editingId ? "Update Product" : "Publish to Customer App")}
            </button>
          </form>
        )}

        {/* 5. APP SETTINGS VIEW */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-3">
            <h3 className="font-black text-xs text-slate-900 border-b pb-2">Customer Care & Social Links Settings</h3>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">Support Calling Phone Number *</label>
              <input 
                type="tel" 
                value={settingsForm.support_phone} 
                onChange={(e) => setSettingsForm({ ...settingsForm, support_phone: e.target.value })} 
                className="w-full px-3 py-2 text-xs border rounded-xl font-mono font-bold" 
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">Official WhatsApp Link *</label>
              <input 
                type="text" 
                value={settingsForm.whatsapp_url} 
                onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp_url: e.target.value })} 
                className="w-full px-3 py-2 text-xs border rounded-xl font-mono text-[11px]" 
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">Facebook Page URL</label>
              <input 
                type="text" 
                value={settingsForm.facebook_url} 
                onChange={(e) => setSettingsForm({ ...settingsForm, facebook_url: e.target.value })} 
                className="w-full px-3 py-2 text-xs border rounded-xl font-mono text-[11px]" 
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">Instagram Page URL</label>
              <input 
                type="text" 
                value={settingsForm.instagram_url} 
                onChange={(e) => setSettingsForm({ ...settingsForm, instagram_url: e.target.value })} 
                className="w-full px-3 py-2 text-xs border rounded-xl font-mono text-[11px]" 
              />
            </div>

            <button type="submit" disabled={settingsSaving} className="w-full py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95">
              {settingsSaving ? "Saving..." : "Save Store Details"}
            </button>
          </form>
        )}
      </main>
            {/* 🏷️ PROFESSIONAL PARCEL SHIPPING LABEL PRINT MODAL */}
      {printOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-2xl p-4 shadow-2xl flex flex-col gap-3 max-h-[92vh] overflow-y-auto">
            
            {/* DIRECT PRINTABLE PARCEL STICKER */}
            <div id="printable-sticker" className="border-2 border-dashed border-slate-800 p-4 rounded-xl bg-white text-slate-900 font-sans">
              
              {/* Header */}
              <div className="border-b-2 border-slate-900 pb-2 mb-2 flex justify-between items-center">
                <div>
                  <h2 className="text-base font-black tracking-tight leading-none text-red-700">BARIJAN MART</h2>
                  <p className="text-[9px] font-bold text-slate-600 uppercase mt-0.5">Rural Doorstep Commerce • 15 Villages</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black border border-slate-900 px-1.5 py-0.5 rounded">EXP-PARCEL</span>
                  <p className="text-[9px] font-mono mt-0.5">#{printOrder.id}</p>
                </div>
              </div>

              {/* Delivery To Address Box */}
              <div className="border-b border-slate-300 pb-2 mb-2 text-xs">
                <span className="text-[9px] font-black text-slate-500 uppercase block mb-0.5">DELIVER TO (CUSTOMER):</span>
                <p className="font-black text-sm text-slate-900">{printOrder.customer_name}</p>
                <p className="font-bold text-[11px] text-slate-800 mt-0.5">📞 {printOrder.customer_phone} {printOrder.alt_phone && ` / ${printOrder.alt_phone}`}</p>
                <p className="text-[10px] text-slate-700 mt-1 leading-snug font-medium whitespace-pre-line">{printOrder.full_address}</p>
              </div>

              {/* Package Items Breakdown */}
              <div className="border-b border-slate-300 pb-2 mb-2 text-xs">
                <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">PARCEL CONTENTS:</span>
                {printOrder.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-[10px] py-0.5 font-medium">
                    <span className="truncate max-w-[180px]">{it.title} ({it.size || 'Std'})</span>
                    <span className="font-black">Qty: {it.quantity || 1}</span>
                  </div>
                ))}
              </div>

              {/* COD Due Banner */}
              <div className="p-2 bg-slate-100 rounded-lg border border-slate-300 flex justify-between items-center mb-2">
                <div>
                  <span className="text-[9px] font-black text-slate-600 uppercase block">CASH ON DELIVERY (COD):</span>
                  <span className="text-lg font-black text-slate-900">₹{printOrder.total_price || 0}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold text-emerald-800">ADV FEE PAID</span>
                  <p className="text-xs font-black text-emerald-700">✓ ₹{printOrder.delivery_fee_paid || 0}</p>
                </div>
              </div>

              {/* Bottom Support Line */}
              <div className="text-center pt-1 border-t border-slate-200">
                <p className="text-[9px] font-bold text-slate-800">
                  Customer Care & Help: {settingsForm.support_phone}
                </p>
                <p className="text-[8px] text-slate-500 mt-0.5">Thank you for ordering with Barijan Mart!</p>
              </div>
            </div>

            {/* Print Action Controls */}
            <div className="flex gap-2">
              <button 
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow"
              >
                <Printer size={15} /> Direct Print Label
              </button>
              <button 
                onClick={() => setPrintOrder(null)} 
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Screenshot Modal */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setSelectedScreenshot(null)}>
          <div className="bg-white p-3 rounded-2xl max-w-xs shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <img src={selectedScreenshot} alt="Payment Proof" className="w-full h-auto object-contain rounded-xl max-h-[70vh]" />
            <button onClick={() => setSelectedScreenshot(null)} className="w-full mt-2 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl">Band Karein</button>
          </div>
        </div>
      )}

      {/* Customer Damage Photo Modal */}
      {selectedDamagePhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setSelectedDamagePhoto(null)}>
          <div className="bg-white p-3 rounded-2xl max-w-xs shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-bold text-rose-700 mb-2">Customer Damage Item Photo:</p>
            <img src={selectedDamagePhoto} alt="Damage Proof" className="w-full h-auto object-contain rounded-xl max-h-[70vh]" />
            <button onClick={() => setSelectedDamagePhoto(null)} className="w-full mt-2.5 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl">Band Karein</button>
          </div>
        </div>
      )}

      {/* Professional Native App Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md md:max-w-xl mx-auto bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex justify-around py-2 z-40 text-slate-400">
        <button onClick={() => setActiveTab('orders')} className={"flex flex-col items-center gap-0.5 relative " + (activeTab === 'orders' ? 'text-emerald-400 font-bold' : '')}>
          <Package size={18} />
          <span className="text-[10px]">Orders</span>
          {normalOrders.length > 0 && <span className="absolute -top-1 -right-2 bg-emerald-500 text-slate-950 text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">{normalOrders.length}</span>}
        </button>

        <button onClick={() => setActiveTab('returns')} className={"flex flex-col items-center gap-0.5 relative " + (activeTab === 'returns' ? 'text-rose-400 font-bold' : '')}>
          <RefreshCw size={18} />
          <span className="text-[10px]">Returns</span>
          {returnRequests.length > 0 && <span className="absolute -top-1 -right-2 bg-rose-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">{returnRequests.length}</span>}
        </button>

        <button onClick={() => setActiveTab('products')} className={"flex flex-col items-center gap-0.5 " + (activeTab === 'products' || activeTab === 'add_product' ? 'text-emerald-400 font-bold' : '')}>
          <ShoppingBag size={18} />
          <span className="text-[10px]">Catalog</span>
        </button>

        <button onClick={() => setActiveTab('settings')} className={"flex flex-col items-center gap-0.5 " + (activeTab === 'settings' ? 'text-emerald-400 font-bold' : '')}>
          <Settings size={18} />
          <span className="text-[10px]">Settings</span>
        </button>
      </nav>
    </div>
  );
            }
        
                          
                      
                                                                                     
  
  
