import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Package, ShoppingBag, PlusCircle, Trash2, Edit3, MapPin, 
  CheckCircle, Clock, Truck, XCircle, ExternalLink, RefreshCw, 
  LogOut, Shield, Search, ArrowUpDown, ChevronRight, AlertCircle
} from 'lucide-react';

const ADMIN_PASS = "IN1511RNB2008";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('bmart_seller_logged') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'products' | 'add_product'

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [prodForm, setProdForm] = useState({
    title: '',
    description: '',
    category: 'Fashion',
    price: '',
    mrp: '',
    delivery_fee: '49',
    sizes: 'S, M, L, XL',
    images: [],
    seller_code: '',
    return_policy: 'Return Not Allowed',
    upi_id: 'barijanmart@upi'
  });
    useEffect(() => {
    if (!isAuthenticated) return;

    fetchOrders();
    fetchProducts();

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
    const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASS) {
      setIsAuthenticated(true);
      localStorage.setItem('bmart_seller_logged', 'true');
    } else {
      alert("Galat Master Password!");
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
      delivery_fee: Number(prodForm.delivery_fee || 49),
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
        title: '', description: '', category: 'Fashion', price: '', mrp: '', delivery_fee: '49',
        sizes: 'S, M, L, XL', images: [], seller_code: '', return_policy: 'Return Not Allowed', upi_id: 'barijanmart@upi'
      });
      setActiveTab('products');
      fetchProducts();
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Kya aap ise delete karna chahte hain?")) return;
    await supabase.from('products').delete().eq('id', id);
    fetchProducts();
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) alert("Status update error: " + error.message);
    else fetchOrders();
  };
    if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 text-white shadow-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="text-emerald-500" size={24} />
            <h2 className="text-xl font-black text-emerald-400">Bmart Seller</h2>
          </div>
          <p className="text-xs text-slate-400 mb-6">Central Operations & Seller Portal</p>
          <label className="text-xs font-bold text-slate-300 block mb-1">Seller Access Password</label>
          <input 
            type="password" 
            placeholder="Master key enter karein" 
            value={passwordInput} 
            onChange={(e) => setPasswordInput(e.target.value)} 
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm mb-5 outline-none focus:border-emerald-500 text-white"
          />
          <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold text-sm rounded-xl transition shadow-lg shadow-emerald-950">
            Secure Login
          </button>
        </form>
      </div>
    );
  }

  const filteredOrders = orders.filter((o) => 
    o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.customer_phone.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col max-w-4xl mx-auto shadow-xl">
      <header className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between sticky top-0 z-40 border-b border-slate-800">
        <div>
          <h1 className="text-lg font-black text-emerald-400 leading-tight">Bmart Seller</h1>
          <p className="text-[11px] text-slate-400 font-medium">Barijan Mart Central Hub</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={fetchOrders} className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 text-slate-300 transition">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/80 hover:bg-red-600 rounded-xl text-xs font-bold transition">
            <LogOut size={14} /> Exit
          </button>
        </div>
      </header>

      <div className="flex bg-white border-b sticky top-[65px] z-30 shadow-sm">
        <button 
          onClick={() => setActiveTab('orders')} 
          className={`flex-1 py-3.5 text-xs font-bold border-b-2 flex items-center justify-center gap-2 transition ${
            activeTab === 'orders' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40' : 'border-transparent text-slate-500'
          }`}
        >
          <Package size={16} /> Live Orders ({orders.length})
        </button>
        <button 
          onClick={() => setActiveTab('products')} 
          className={`flex-1 py-3.5 text-xs font-bold border-b-2 flex items-center justify-center gap-2 transition ${
            activeTab === 'products' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40' : 'border-transparent text-slate-500'
          }`}
        >
          <ShoppingBag size={16} /> Products ({products.length})
        </button>
        <button 
          onClick={() => { setEditingId(null); setActiveTab('add_product'); }} 
          className={`flex-1 py-3.5 text-xs font-bold border-b-2 flex items-center justify-center gap-2 transition ${
            activeTab === 'add_product' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40' : 'border-transparent text-slate-500'
          }`}
        >
          <PlusCircle size={16} /> {editingId ? 'Edit Product' : 'Add Item'}
        </button>
      </div>
            <div className="p-4 flex-1">
        {activeTab === 'orders' && (
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Order ID, Customer Name ya Phone se khojein..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs shadow-sm outline-none focus:border-emerald-600"
              />
            </div>

            {filteredOrders.length === 0 ? (
              <div className="text-center bg-white rounded-3xl p-12 border border-dashed border-slate-300">
                <Package className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-slate-400 text-xs font-bold">Koi order uplabdh nahi hai.</p>
              </div>
            ) : (
              filteredOrders.map((o) => (
                <div key={o.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-start border-b pb-2.5">
                    <div>
                      <span className="font-extrabold text-sm text-emerald-700">#{o.id}</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">{new Date(o.created_at).toLocaleString('en-IN')}</p>
                    </div>
                    <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full ${
                      o.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800' :
                      o.status === 'Shipped' ? 'bg-blue-100 text-blue-800' :
                      o.status === 'Cancelled' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {o.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{o.customer_name}</p>
                      <p className="text-slate-600 mt-0.5">📞 <a href={`tel:${o.customer_phone}`} className="text-emerald-700 underline font-bold">{o.customer_phone}</a></p>
                      <p className="text-slate-500 mt-1 leading-relaxed">🏠 {o.full_address}</p>
                    </div>
                    <div className="flex flex-col justify-between">
                      <div>
                        <p className="font-bold text-slate-700">Advance Delivery Fee: <span className="text-emerald-600 font-black">₹{o.delivery_fee_paid}</span></p>
                        <p className="font-bold text-slate-700">COD Product Due: <span className="text-slate-900 font-black">₹{o.total_price}</span></p>
                        <p className="text-[11px] text-slate-500 mt-0.5">UTR Reference: <b className="text-slate-800">{o.utr || 'N/A'}</b></p>
                      </div>
                      <div className="flex gap-2 mt-3">
                        {o.location?.mapsUrl && (
                          <a href={o.location.mapsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[11px] bg-blue-50 text-blue-700 px-2.5 py-1.5 rounded-lg font-bold border border-blue-200 hover:bg-blue-100 transition">
                            <MapPin size={12} /> Live GPS
                          </a>
                        )}
                        {o.screenshot && (
                          <button onClick={() => setSelectedScreenshot(o.screenshot)} className="flex items-center gap-1.5 text-[11px] bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-lg font-bold border border-emerald-200 hover:bg-emerald-100 transition">
                            <ExternalLink size={12} /> Check Slip
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-100 rounded-xl p-2.5 flex flex-col gap-1 bg-white">
                    {o.items?.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs py-0.5 border-b last:border-0 border-slate-50">
                        <span className="font-medium text-slate-800">{it.title} ({it.size || 'Std'}) x {it.quantity || 1}</span>
                        <span className="font-bold text-slate-700">₹{(it.price * (it.quantity || 1))}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                    <button onClick={() => updateOrderStatus(o.id, 'Processing')} className="px-3 py-1 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition">Processing</button>
                    <button onClick={() => updateOrderStatus(o.id, 'Shipped')} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition">Shipped</button>
                    <button onClick={() => updateOrderStatus(o.id, 'Delivered')} className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition">Delivered</button>
                    <button onClick={() => updateOrderStatus(o.id, 'Cancelled')} className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition">Cancel</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
                      {activeTab === 'products' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {products.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-3.5 flex gap-3 items-center justify-between shadow-sm">
                <img 
                  src={p.images?.[0] || 'https://via.placeholder.com/80'} 
                  alt={p.title} 
                  className="w-16 h-16 rounded-xl object-cover bg-slate-100 border border-slate-100" 
                />
                <div className="flex-1 min-w-0 text-xs">
                  <h4 className="font-bold text-slate-900 truncate">{p.title}</h4>
                  <p className="text-slate-500 mt-0.5">Price: <b className="text-slate-900">₹{p.price}</b> | Delivery: ₹{p.delivery_fee}</p>
                  <p className="text-[11px] text-emerald-700 font-bold mt-0.5">Seller: {p.seller_code || 'Direct Store'}</p>
                </div>
                <div className="flex gap-1.5">
                  <button 
                    onClick={() => { setEditingId(p.id); setProdForm(p); setActiveTab('add_product'); }} 
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteProduct(p.id)} 
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'add_product' && (
          <form onSubmit={handleSaveProduct} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3 max-w-lg mx-auto">
            <h3 className="font-bold text-sm text-slate-900 border-b pb-2">{editingId ? 'Edit Product Item' : 'Add New Catalog Item'}</h3>
            
            <input 
              type="text" 
              placeholder="Product Title" 
              value={prodForm.title} 
              onChange={(e) => setProdForm({ ...prodForm, title: e.target.value })} 
              className="w-full px-3 py-2 text-xs border rounded-xl outline-none focus:border-emerald-600" 
            />
            <textarea 
              placeholder="Product Description" 
              value={prodForm.description} 
              onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })} 
              className="w-full px-3 py-2 text-xs border rounded-xl outline-none focus:border-emerald-600" 
              rows={2} 
            />
            
            <div className="grid grid-cols-3 gap-2">
              <input type="number" placeholder="Price ₹" value={prodForm.price} onChange={(e) => setProdForm({ ...prodForm, price: e.target.value })} className="px-3 py-2 text-xs border rounded-xl" />
              <input type="number" placeholder="MRP ₹" value={prodForm.mrp} onChange={(e) => setProdForm({ ...prodForm, mrp: e.target.value })} className="px-3 py-2 text-xs border rounded-xl" />
              <input type="number" placeholder="Delivery Fee ₹" value={prodForm.delivery_fee} onChange={(e) => setProdForm({ ...prodForm, delivery_fee: e.target.value })} className="px-3 py-2 text-xs border rounded-xl" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Sizes (e.g. S, M, L, XL)" value={Array.isArray(prodForm.sizes) ? prodForm.sizes.join(', ') : prodForm.sizes} onChange={(e) => setProdForm({ ...prodForm, sizes: e.target.value })} className="px-3 py-2 text-xs border rounded-xl" />
              <input type="text" placeholder="Seller Code (e.g. BM-01)" value={prodForm.seller_code || ''} onChange={(e) => setProdForm({ ...prodForm, seller_code: e.target.value })} className="px-3 py-2 text-xs border rounded-xl bg-amber-50" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Return Policy" value={prodForm.return_policy || ''} onChange={(e) => setProdForm({ ...prodForm, return_policy: e.target.value })} className="px-3 py-2 text-xs border rounded-xl" />
              <input type="text" placeholder="Payment UPI ID" value={prodForm.upi_id || ''} onChange={(e) => setProdForm({ ...prodForm, upi_id: e.target.value })} className="px-3 py-2 text-xs border rounded-xl" />
            </div>

            <label className="p-4 border-2 border-dashed border-emerald-300 rounded-xl cursor-pointer text-center text-xs text-emerald-700 font-bold bg-emerald-50/50 hover:bg-emerald-50 transition">
              Click to Upload Photos ({prodForm.images?.length || 0} Chuni Gayi)
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
            </label>

            <button type="submit" disabled={loading} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition">
              {loading ? "Database Sync..." : (editingId ? "Update Item" : "Publish to Barijan Mart")}
            </button>
          </form>
        )}
      </div>
            {selectedScreenshot && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setSelectedScreenshot(null)}>
          <div className="bg-white p-2.5 rounded-2xl max-w-sm max-h-[85vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <img src={selectedScreenshot} alt="Payment Proof" className="w-full h-auto object-contain rounded-xl max-h-[75vh]" />
            <button onClick={() => setSelectedScreenshot(null)} className="w-full mt-2.5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl">Close View</button>
          </div>
        </div>
      )}
    </div>
  );
}

                
              
                    
      
      
          
  
  
  
  
