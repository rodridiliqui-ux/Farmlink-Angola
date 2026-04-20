import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, orderBy, getDocs, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Tractor, 
  Truck, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  MapPin, 
  Smartphone, 
  CreditCard, 
  DollarSign, 
  Package, 
  ChevronRight,
  TrendingUp,
  Users,
  AlertCircle,
  Loader2,
  Camera,
  Edit3,
  User,
  Info,
  Settings,
  Map as MapIcon,
  Navigation,
  X
} from 'lucide-react';
import { MapView } from './MapView';

export const Dashboard: React.FC = () => {
  const { user, profile, seedProducts, switchRole, profileLoading } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'settings' | 'deliveries'>('overview');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderForMap, setSelectedOrderForMap] = useState<any | null>(null);
  const [currentTransporterLoc, setCurrentTransporterLoc] = useState<[number, number] | null>(null);
  
  // Product Form State
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'Vegetais',
    price: 0,
    unit: 'kg',
    quantity: 0,
    location: '',
    lat: -8.839,
    lng: 13.289,
    imageUrl: '',
  });

  useEffect(() => {
    if (profile) {
      setNewProduct(prev => ({
        ...prev,
        location: profile.location || prev.location,
        lat: profile.lat || prev.lat,
        lng: profile.lng || prev.lng
      }));
    }
  }, [profile]);

  const handleFirestoreError = (error: any, operation: string, path: string) => {
    const errInfo = {
      error: error.message || String(error),
      operation,
      path,
      userId: user?.uid,
      role: profile?.role
    };
    console.error('Firestore Error:', JSON.stringify(errInfo));
    // We don't throw here to avoid crashing the whole dashboard, but we log it
  };

  useEffect(() => {
    if (!user || !profile) return;
    
    setLoading(true);
    
    // Fetch user's products (if farmer)
    const productsQuery = query(collection(db, 'products'), where('farmerId', '==', user.uid));
    const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, 'LIST', 'products'));

    // Fetch user's orders (as buyer, farmer, or transporter)
    let ordersQuery;
    if (profile?.role === 'transporter') {
      // For transporters, show orders they've accepted OR orders that need transport
      ordersQuery = query(collection(db, 'orders'), where('requestTransport', '==', true));
    } else {
      const roleField = profile?.role === 'farmer' ? 'farmerId' : 'buyerId';
      ordersQuery = query(collection(db, 'orders'), where(roleField, '==', user.uid));
    }

    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      let dbOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (profile?.role === 'transporter') {
        // Filter for transporter: either assigned to them OR unassigned and not rejected by them
        dbOrders = dbOrders.filter((o: any) => 
          o.transporterId === user.uid || 
          (!o.transporterId && !o.rejectedBy?.includes(user.uid))
        );
      }

      // Sort in memory to avoid index requirements
      dbOrders.sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate?.() || 0;
        const dateB = b.createdAt?.toDate?.() || 0;
        return dateB - dateA;
      });
      setOrders(dbOrders);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, 'LIST', 'orders');
      setLoading(false);
    });

    // Track location for transporters
    let watchId: number;
    if (profile?.role === 'transporter' && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setCurrentTransporterLoc([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => console.error("Geolocation error:", err),
        { enableHighAccuracy: true }
      );
    }

    return () => {
      unsubscribeProducts();
      unsubscribeOrders();
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [user, profile]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) {
        showToast("A imagem é muito grande. Por favor, escolha uma imagem menor que 500KB.", "error");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProduct({ ...newProduct, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setUploading(true);
    
    try {
      if (!newProduct.imageUrl) {
        showToast("Por favor, selecione uma imagem.", "info");
        setUploading(false);
        return;
      }

      await addDoc(collection(db, 'products'), {
        ...newProduct,
        farmerId: user.uid,
        farmerName: profile?.name || user.displayName || 'Produtor',
        farmerPhone: profile?.phone || '',
        status: 'available',
        createdAt: serverTimestamp(),
      });

      setShowAddProduct(false);
      setNewProduct({ 
        name: '', 
        category: 'Vegetais', 
        price: 0, 
        unit: 'kg', 
        quantity: 0, 
        location: profile?.location || '', 
        lat: profile?.lat || -8.839, 
        lng: profile?.lng || 13.289, 
        imageUrl: '' 
      });
      showToast("Produto publicado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao publicar:", error);
      showToast("Erro ao publicar produto. Verifique a sua ligação.", "error");
    } finally {
      setUploading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || order.status === newStatus) return;

    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      
      // Notify buyer
      await addDoc(collection(db, 'notifications'), {
        userId: order.buyerId,
        title: 'Estado da Encomenda Atualizado',
        message: `A sua encomenda de ${order.items[0].productName} está agora: ${newStatus.replace('_', ' ')}.`,
        type: 'order_update',
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, 'UPDATE', `orders/${orderId}`);
      showToast("Erro ao atualizar estado da encomenda.", "error");
    }
  };

  const acceptDelivery = async (orderId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        transporterId: user.uid,
        transporterName: profile?.name || user.displayName,
        status: 'accepted_by_transporter'
      });
      showToast("Entrega aceite com sucesso!");
    } catch (error) {
      console.error(error);
      showToast("Erro ao aceitar entrega.", "error");
    }
  };

  const rejectDelivery = async (orderId: string) => {
    if (!user) return;
    try {
      const order = orders.find(o => o.id === orderId);
      const rejectedBy = order.rejectedBy || [];
      if (!rejectedBy.includes(user.uid)) {
        await updateDoc(doc(db, 'orders', orderId), {
          rejectedBy: [...rejectedBy, user.uid]
        });
      }
      showToast("Pedido de transporte recusado.", "info");
    } catch (error) {
      console.error(error);
    }
  };

  const confirmPayment = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        paymentStatus: 'paid',
        status: 'accepted' // Automatically accept when paid
      });
      showToast("Pagamento confirmado e pedido aceite!");
    } catch (error) {
      console.error(error);
    }
  };

  const deleteProduct = async (id: string) => {
    if (confirm('Tem a certeza que deseja eliminar este produto?')) {
      await deleteDoc(doc(db, 'products', id));
    }
  };

  const totalEarnings = orders
    .filter(o => o.status === 'delivered')
    .reduce((acc, o) => {
      if (profile?.role === 'farmer' && o.farmerId === user?.uid) {
        const subtotal = o.items.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0);
        return acc + subtotal;
      }
      if (profile?.role === 'transporter' && o.transporterId === user?.uid) {
        return acc + (o.freightFee || 0);
      }
      return acc;
    }, 0);

  const pendingEarnings = orders
    .filter(o => o.status !== 'delivered' && o.status !== 'rejected')
    .reduce((acc, o) => {
      if (profile?.role === 'farmer' && o.farmerId === user?.uid) {
        const subtotal = o.items.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0);
        return acc + subtotal;
      }
      if (profile?.role === 'transporter' && o.transporterId === user?.uid) {
        return acc + (o.freightFee || 0);
      }
      return acc;
    }, 0);

  const stats = profile?.role === 'buyer' ? [
    { label: 'Total de Compras', value: orders.length, icon: ShoppingBag, color: 'green' },
    { label: 'Encomendas Ativas', value: orders.filter(o => o.status !== 'delivered' && o.status !== 'rejected').length, icon: Package, color: 'blue' },
    { label: 'Total Gasto', value: `${orders.reduce((acc, o) => acc + o.totalAmount, 0).toLocaleString('pt-AO')} AKZ`, icon: DollarSign, color: 'orange' },
  ] : [
    { label: profile?.role === 'transporter' ? 'Entregas Totais' : 'Total de Vendas', value: orders.length, icon: TrendingUp, color: 'green' },
    { label: 'Ganhos Pendentes', value: `${pendingEarnings.toLocaleString('pt-AO')} AKZ`, icon: Package, color: 'blue' },
    { label: 'Ganhos Totais', value: `${totalEarnings.toLocaleString('pt-AO')} AKZ`, icon: DollarSign, color: 'orange' },
  ];

  // Filter orders for "Recent Orders" in Overview
  const recentOrders = orders.filter(o => {
    if (profile?.role === 'farmer') return o.farmerId === user?.uid;
    if (profile?.role === 'buyer') return o.buyerId === user?.uid;
    if (profile?.role === 'transporter') return o.transporterId === user?.uid;
    return false;
  }).slice(0, 5);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
        <p className="text-gray-500 font-medium animate-pulse">A carregar o seu painel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-white border-r border-gray-100 p-8 flex flex-col gap-8 sticky top-20 h-[calc(100vh-80px)] overflow-y-auto">
        <div className="space-y-2">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">Menu Principal</p>
          {[
            { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
            { id: 'products', label: 'Meus Produtos', icon: Tractor, hidden: profile?.role !== 'farmer' },
            { id: 'deliveries', label: 'Entregas', icon: Truck, hidden: profile?.role !== 'transporter' },
            { id: 'orders', label: 'Encomendas', icon: ShoppingBag },
            { id: 'settings', label: 'Definições', icon: Edit3 },
          ].map((item) => !item.hidden && (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-sm transition-all ${
                activeTab === item.id 
                  ? 'bg-green-600 text-white shadow-lg shadow-green-100' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-auto space-y-4">
          <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Mudar Perfil</p>
            <div className="grid grid-cols-1 gap-2">
              {['farmer', 'buyer', 'transporter'].map((r) => (
                <button
                  key={r}
                  onClick={() => switchRole(r)}
                  className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                    profile?.role === r 
                      ? 'bg-green-600 text-white border-green-600' 
                      : 'bg-white text-gray-500 border-gray-100 hover:border-green-200'
                  }`}
                >
                  {r === 'farmer' ? 'Agricultor' : r === 'buyer' ? 'Comprador' : 'Transportador'}
                </button>
              ))}
            </div>
          </div>
          
          {profile?.role === 'farmer' && products.length === 0 && (
            <button 
              onClick={seedProducts}
              className="w-full py-4 bg-blue-50 text-blue-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-100 transition-all border border-blue-100"
            >
              Gerar Produtos Demo
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 md:p-12 overflow-x-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h2 className="text-4xl font-black text-gray-900 tracking-tight">Olá, {profile?.name || user?.displayName}!</h2>
                  <p className="text-gray-500 font-medium mt-1">Bem-vindo ao seu painel de controlo do FarmLink.</p>
                </div>
                {profile?.role === 'farmer' ? (
                  <button 
                    onClick={() => setShowAddProduct(true)}
                    className="bg-green-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-green-700 transition-all shadow-xl shadow-green-100 flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" /> Novo Produto
                  </button>
                ) : (
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-3">
                    <Info className="w-5 h-5 text-blue-600" />
                    <p className="text-sm text-blue-800">
                      Quer vender os seus produtos? <button onClick={() => setActiveTab('settings')} className="font-bold underline">Mude para Produtor</button> nas definições.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {stats.map((s, i) => (
                  <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                    <div className={`w-14 h-14 bg-${s.color}-50 text-${s.color}-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-${s.color}-600 group-hover:text-white transition-colors`}>
                      <s.icon className="w-7 h-7" />
                    </div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">{s.label}</p>
                    <p className="text-3xl font-black text-gray-900">{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Encomendas Recentes</h3>
                    <button onClick={() => setActiveTab('orders')} className="text-xs font-black text-green-600 uppercase tracking-widest hover:underline">Ver Todas</button>
                  </div>
                  <div className="space-y-4">
                    {recentOrders.map((o) => (
                      <div key={o.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400 shadow-sm">
                            <ShoppingBag className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{o.items[0].productName}</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{o.buyerName || o.farmerName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-gray-900 text-sm">{o.totalAmount.toLocaleString('pt-AO')} AKZ</p>
                          <span className={`text-[10px] font-black uppercase tracking-tighter ${o.status === 'delivered' ? 'text-green-500' : 'text-orange-500'}`}>
                            {o.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                    {recentOrders.length === 0 && <p className="text-center py-8 text-gray-400 text-sm font-medium">Sem encomendas recentes.</p>}
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Meus Produtos</h3>
                    <button onClick={() => setActiveTab('products')} className="text-xs font-black text-green-600 uppercase tracking-widest hover:underline">Gerir</button>
                  </div>
                  <div className="space-y-4">
                    {products.slice(0, 5).map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-4">
                          <img src={p.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=100'} className="w-10 h-10 rounded-xl object-cover shadow-sm" referrerPolicy="no-referrer" />
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{p.name}</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{p.quantity} {p.unit} disponíveis</p>
                          </div>
                        </div>
                        <p className="font-black text-green-600 text-sm">{p.price.toLocaleString('pt-AO')} AKZ</p>
                      </div>
                    ))}
                    {products.length === 0 && <p className="text-center py-8 text-gray-400 text-sm font-medium">Não tem produtos listados.</p>}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'products' && (
            <motion.div key="products" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">Meus Produtos</h2>
                <button 
                  onClick={() => setShowAddProduct(true)}
                  className="bg-green-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-green-700 transition-all shadow-xl shadow-green-100 flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" /> Adicionar Produto
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {products.map((p) => (
                  <div key={p.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden group hover:shadow-2xl transition-all">
                    <div className="h-48 relative">
                      <img src={p.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                      <div className="absolute top-4 right-4 flex gap-2">
                        <button onClick={() => deleteProduct(p.id)} className="p-2 bg-white/90 backdrop-blur-md text-red-500 rounded-xl shadow-sm hover:bg-red-500 hover:text-white transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-black text-gray-900 tracking-tight mb-1">{p.name}</h3>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{p.category}</p>
                      <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                        <div>
                          <p className="text-2xl font-black text-green-600">{p.price.toLocaleString('pt-AO')} AKZ</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Por {p.unit}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-gray-900">{p.quantity}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Em Stock</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'orders' && (
            <motion.div key="orders" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Encomendas</h2>
              
              <div className="space-y-6">
                {orders.map((o) => (
                  <div key={o.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden hover:shadow-xl transition-all">
                    <div className="p-8 flex flex-col md:flex-row justify-between gap-8">
                      <div className="flex-1 space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
                            <Package className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Encomenda #{o.id.slice(-6)}</p>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">
                              {o.items.map((i: any) => `${i.quantity}x ${i.productName}`).join(', ')}
                            </h3>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cliente</p>
                            <p className="text-sm font-bold text-gray-900">{o.buyerName}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Data</p>
                            <p className="text-sm font-bold text-gray-900">{o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString() : 'Recentemente'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total</p>
                            <div className="flex flex-col">
                              <p className="text-sm font-black text-green-600">{o.totalAmount.toLocaleString('pt-AO')} AKZ</p>
                              {o.freightFee > 0 && (
                                <p className="text-[8px] font-bold text-gray-400">
                                  Produtos: {(o.totalAmount - o.freightFee).toLocaleString('pt-AO')} | Frete: {o.freightFee.toLocaleString('pt-AO')}
                                </p>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Estado</p>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              o.status === 'delivered' ? 'bg-green-100 text-green-700' : 
                              o.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {o.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        {o.paymentMethod === 'reference' && o.paymentDetails && o.status === 'pending' && (
                          <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 flex flex-wrap gap-6 items-center">
                            <div className="flex items-center gap-2 text-purple-700">
                              <CreditCard className="w-4 h-4" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Pagamento por Referência</span>
                            </div>
                            <div className="flex gap-4">
                              <div>
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Entidade</p>
                                <p className="text-sm font-black text-gray-900">{o.paymentDetails.entity}</p>
                              </div>
                              <div>
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Referência</p>
                                <p className="text-sm font-black text-gray-900 tracking-widest">{o.paymentDetails.reference}</p>
                              </div>
                              <div>
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Montante</p>
                                <p className="text-sm font-black text-purple-600">{o.paymentDetails.amount.toLocaleString('pt-AO')} AKZ</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col justify-center gap-3 min-w-[200px]">
                        {profile?.role === 'farmer' && o.status === 'pending' && (
                          <>
                            {o.paymentMethod === 'reference' && o.paymentStatus === 'pending' ? (
                              <button 
                                onClick={() => confirmPayment(o.id)}
                                className="w-full py-3 bg-purple-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-all shadow-lg shadow-purple-100"
                              >
                                Confirmar Pagamento
                              </button>
                            ) : (
                              <button 
                                onClick={() => updateOrderStatus(o.id, 'accepted')}
                                className="w-full py-3 bg-green-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg shadow-green-100"
                              >
                                Aceitar Pedido
                              </button>
                            )}
                            <button 
                              onClick={() => updateOrderStatus(o.id, 'rejected')}
                              className="w-full py-3 bg-white text-red-500 border-2 border-red-50 border-red-100 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-50 transition-all"
                            >
                              Rejeitar
                            </button>
                          </>
                        )}
                        {profile?.role === 'farmer' && o.status === 'accepted' && (
                          <button 
                            onClick={() => updateOrderStatus(o.id, 'in_transit')}
                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                          >
                            Marcar em Trânsito
                          </button>
                        )}
                        {o.status === 'in_transit' && (
                          <button 
                            onClick={() => updateOrderStatus(o.id, 'delivered')}
                            className="w-full py-3 bg-green-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg shadow-green-100"
                          >
                            Confirmar Entrega
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {orders.length === 0 && (
                  <div className="py-32 text-center bg-white rounded-[3rem] border border-gray-100">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
                      <ShoppingBag className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">Sem encomendas</h3>
                    <p className="text-gray-500 font-medium">Ainda não existem transações para mostrar.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'deliveries' && (
            <motion.div key="deliveries" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Entregas e Logística</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Available Requests */}
                <div className="space-y-6">
                  <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                    Pedidos Disponíveis
                  </h3>
                  <div className="space-y-4">
                    {orders.filter(o => !o.transporterId && o.requestTransport && !o.rejectedBy?.includes(user?.uid) && o.status !== 'rejected' && o.status !== 'delivered').map((o) => (
                      <div key={o.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">De: {o.farmerName}</p>
                            <p className="text-sm font-bold text-gray-900">{o.items.map((i: any) => i.productName).join(', ')}</p>
                          </div>
                          <p className="text-lg font-black text-green-600">{o.freightFee?.toLocaleString('pt-AO')} AKZ</p>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 text-xs mb-6">
                          <MapPin className="w-4 h-4" />
                          <span>Para: {o.deliveryAddress}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={() => acceptDelivery(o.id)}
                            className="py-3 bg-green-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-700 transition-all"
                          >
                            Aceitar
                          </button>
                          <button 
                            onClick={() => rejectDelivery(o.id)}
                            className="py-3 bg-white text-gray-400 border border-gray-100 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all"
                          >
                            Recusar
                          </button>
                        </div>
                      </div>
                    ))}
                    {orders.filter(o => !o.transporterId && o.requestTransport && !o.rejectedBy?.includes(user?.uid) && o.status !== 'rejected' && o.status !== 'delivered').length === 0 && (
                      <p className="text-center py-12 text-gray-400 font-medium bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                        Não há novos pedidos de transporte na sua área.
                      </p>
                    )}
                  </div>
                </div>

                {/* My Active Deliveries */}
                <div className="space-y-6">
                  <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-blue-500" />
                    Minhas Entregas Ativas
                  </h3>
                  <div className="space-y-4">
                    {orders.filter(o => o.transporterId === user?.uid && o.status !== 'delivered').map((o) => (
                      <div key={o.id} className="bg-white p-6 rounded-3xl border-2 border-blue-50 shadow-sm hover:shadow-lg transition-all">
                        <div className="flex justify-between items-center mb-4">
                          <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                            o.status === 'accepted_by_transporter' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {o.status === 'accepted_by_transporter' ? 'Pronto para Recolha' : 'Em Trânsito'}
                          </span>
                          <p className="text-sm font-black text-gray-900">{o.freightFee?.toLocaleString('pt-AO')} AKZ</p>
                        </div>
                        <h4 className="font-black text-gray-900 mb-4">{o.items.map((i: any) => i.productName).join(', ')}</h4>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <button 
                            onClick={() => setSelectedOrderForMap(o)}
                            className="flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-all"
                          >
                            <MapIcon className="w-4 h-4" /> Ver Rota
                          </button>
                          {o.status === 'accepted_by_transporter' ? (
                            <button 
                              onClick={() => updateOrderStatus(o.id, 'in_transit')}
                              className="py-3 bg-orange-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all"
                            >
                              Iniciar Viagem
                            </button>
                          ) : (
                            <button 
                              onClick={() => updateOrderStatus(o.id, 'delivered')}
                              className="py-3 bg-green-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition-all"
                            >
                              Confirmar Entrega
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {orders.filter(o => o.transporterId === user?.uid && o.status !== 'delivered').length === 0 && (
                      <p className="text-center py-12 text-gray-400 font-medium bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                        Não tem entregas ativas no momento.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-2xl space-y-12">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Definições de Perfil</h2>
              
              <div className="space-y-8">
                <div className="flex items-center gap-8">
                  <div className="w-24 h-24 bg-green-100 rounded-[2rem] flex items-center justify-center text-green-600 relative group cursor-pointer">
                    <User className="w-10 h-10" />
                    <div className="absolute inset-0 bg-black/40 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Camera className="w-6 h-6" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900">{profile?.name || user?.displayName}</h3>
                    <p className="text-gray-500 font-medium">{user?.email}</p>
                    <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                      {profile?.role || 'Utilizador'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Nome Completo</label>
                    <input type="text" defaultValue={profile?.name} className="w-full px-6 py-4 bg-white border-2 border-gray-100 rounded-2xl focus:border-green-600 outline-none transition-all font-bold text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Telefone</label>
                    <input type="tel" defaultValue={profile?.phone} className="w-full px-6 py-4 bg-white border-2 border-gray-100 rounded-2xl focus:border-green-600 outline-none transition-all font-bold text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Localização</label>
                    <input type="text" defaultValue={profile?.location} className="w-full px-6 py-4 bg-white border-2 border-gray-100 rounded-2xl focus:border-green-600 outline-none transition-all font-bold text-gray-900" />
                  </div>
                </div>

                <button className="bg-gray-900 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl shadow-gray-200">
                  Guardar Alterações
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Add Product Modal */}
      <AnimatePresence>
        {showAddProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddProduct(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden">
              <div className="bg-green-600 p-8 text-white flex justify-between items-center">
                <h3 className="text-2xl font-black tracking-tight">Novo Produto</h3>
                <button onClick={() => setShowAddProduct(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><XCircle className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleAddProduct} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-4">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Imagem do Produto (Obrigatório)</label>
                  <div className="relative h-64 bg-gray-50 border-4 border-dashed border-gray-200 rounded-[2rem] flex flex-col items-center justify-center overflow-hidden group hover:border-green-400 transition-all cursor-pointer">
                    {newProduct.imageUrl ? (
                      <div className="relative w-full h-full">
                        <img src={newProduct.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-black uppercase text-xs">
                          Alterar Foto
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-8">
                        <div className="w-20 h-20 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                          <Camera className="w-10 h-10" />
                        </div>
                        <p className="text-sm font-black text-gray-900 uppercase tracking-widest">Tirar Foto ou Galeria</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-2">Toque para selecionar a melhor imagem do seu produto</p>
                      </div>
                    )}
                    <input 
                      required={!newProduct.imageUrl}
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Nome do Produto</label>
                    <input required type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="Ex: Tomate Cereja" className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-green-600 focus:bg-white outline-none transition-all font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Categoria</label>
                    <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-green-600 focus:bg-white outline-none transition-all font-bold">
                      <option>Vegetais</option>
                      <option>Frutas</option>
                      <option>Cereais</option>
                      <option>Legumes</option>
                      <option>Carne/Peixe</option>
                      <option>Outros</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Preço (AKZ)</label>
                    <input required type="number" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-green-600 focus:bg-white outline-none transition-all font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Unidade</label>
                    <select value={newProduct.unit} onChange={e => setNewProduct({...newProduct, unit: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-green-600 focus:bg-white outline-none transition-all font-bold">
                      <option>kg</option>
                      <option>un</option>
                      <option>cacho</option>
                      <option>saco</option>
                      <option>caixa</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Stock Disponível</label>
                    <input required type="number" value={newProduct.quantity} onChange={e => setNewProduct({...newProduct, quantity: Number(e.target.value)})} className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-green-600 focus:bg-white outline-none transition-all font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Local de Venda</label>
                    <input required type="text" value={newProduct.location} onChange={e => setNewProduct({...newProduct, location: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-green-600 focus:bg-white outline-none transition-all font-bold" />
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={uploading}
                  className="w-full py-5 bg-green-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-green-700 transition-all shadow-2xl shadow-green-100 disabled:bg-gray-400 disabled:shadow-none flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Publicando...
                    </>
                  ) : (
                    "Publicar Produto"
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Map Modal */}
      <AnimatePresence>
        {selectedOrderForMap && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/80 backdrop-blur-md" 
              onClick={() => setSelectedOrderForMap(null)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 40 }} 
              className="relative bg-white w-full max-w-5xl h-[80vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">Rota de Entrega</h3>
                  <p className="text-sm font-medium text-gray-500">De: {selectedOrderForMap.farmerName} → Para: {selectedOrderForMap.buyerName}</p>
                </div>
                <button 
                  onClick={() => setSelectedOrderForMap(null)} 
                  className="p-3 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-colors"
                >
                  <X className="w-6 h-6 text-gray-900" />
                </button>
              </div>
              
              <div className="flex-1 relative">
                <MapView 
                  farmerLoc={selectedOrderForMap.farmerLoc || [-8.839, 13.289]} 
                  buyerLoc={selectedOrderForMap.buyerLoc || [-8.9, 13.3]} 
                  transporterLoc={currentTransporterLoc || undefined}
                />
                
                <div className="absolute bottom-8 left-8 right-8 grid grid-cols-1 md:grid-cols-3 gap-4 pointer-events-none">
                  <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-white shadow-xl pointer-events-auto">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                        <Tractor className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Origem</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{selectedOrderForMap.farmerName}</p>
                  </div>
                  
                  <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-white shadow-xl pointer-events-auto">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Destino</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{selectedOrderForMap.buyerName}</p>
                  </div>

                  <div className="bg-green-600 p-4 rounded-2xl shadow-xl pointer-events-auto text-white">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Ganhos</span>
                    </div>
                    <p className="text-lg font-black">{selectedOrderForMap.freightFee?.toLocaleString('pt-AO')} AKZ</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
