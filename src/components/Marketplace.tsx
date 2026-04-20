import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, ShoppingCart, MapPin, Tag, Plus, Check, Loader2, Info } from 'lucide-react';
import { MapView } from './MapView';

export const Marketplace: React.FC = () => {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('Todos');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  const mockProducts = [
    { id: 'm1', name: 'Tomate Cereja', category: 'Vegetais', price: 1500, unit: 'kg', quantity: 50, location: 'Luanda', farmerName: 'João Silva', imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400', status: 'available' },
    { id: 'm2', name: 'Manga Rosa', category: 'Frutas', price: 2000, unit: 'kg', quantity: 30, location: 'Benguela', farmerName: 'Maria Santos', imageUrl: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=400', status: 'available' },
    { id: 'm3', name: 'Cenoura Orgânica', category: 'Vegetais', price: 800, unit: 'kg', quantity: 100, location: 'Huambo', farmerName: 'António Costa', imageUrl: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&q=80&w=400', status: 'available' },
    { id: 'm4', name: 'Banana Pão', category: 'Frutas', price: 1200, unit: 'cacho', quantity: 20, location: 'Uíge', farmerName: 'Bento Manuel', imageUrl: 'https://images.unsplash.com/photo-1571771894821-ad990241274d?auto=format&fit=crop&q=80&w=400', status: 'available' },
  ];

  useEffect(() => {
    const q = query(collection(db, 'products'), where('status', '==', 'available'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (dbProducts.length === 0) {
        setProducts(mockProducts);
        setIsDemo(true);
      } else {
        setProducts(dbProducts);
        setIsDemo(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredProducts = products.filter(p => 
    (category === 'Todos' || p.category === category) &&
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const addToCart = async (product: any) => {
    if (!user) {
      showToast("Por favor, faça login para adicionar ao carrinho.", "info");
      return;
    }
    setAddingToCart(product.id);
    try {
      await addDoc(collection(db, 'cart'), {
        userId: user.uid,
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: 1,
        farmerId: product.farmerId,
        farmerName: product.farmerName,
        farmerLat: product.lat || null,
        farmerLng: product.lng || null,
        imageUrl: product.imageUrl,
        createdAt: serverTimestamp(),
      });
      // Success feedback
      setTimeout(() => setAddingToCart(null), 1000);
    } catch (error) {
      console.error(error);
      setAddingToCart(null);
    }
  };

  const categories = ['Todos', 'Vegetais', 'Frutas', 'Cereais', 'Legumes', 'Outros'];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Search & Filter Header */}
      <div className="bg-white border-b border-gray-100 sticky top-20 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Procurar produtos ou locais..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-green-600 focus:bg-white outline-none transition-all font-medium"
              />
            </div>
            
            <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-6 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                    category === cat 
                      ? 'bg-green-600 text-white shadow-lg shadow-green-100' 
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex bg-gray-100 p-1.5 rounded-xl border border-gray-200">
              <button 
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Grelha
              </button>
              <button 
                onClick={() => setViewMode('map')}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'map' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Mapa
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {isDemo && (
          <div className="mb-8 bg-orange-50 border border-orange-100 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
                <Info className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-orange-900 tracking-tight">Modo de Simulação Ativo</h4>
                <p className="text-orange-700 text-sm font-medium">A mostrar produtos demo porque o mercado está vazio.</p>
              </div>
            </div>
            {profile?.role === 'farmer' && (
              <button 
                onClick={() => navigate('/dashboard')}
                className="px-6 py-3 bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg shadow-orange-100"
              >
                Publicar Primeiro Produto
              </button>
            )}
          </div>
        )}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-12 h-12 text-green-600 animate-spin mb-4" />
            <p className="text-gray-500 font-bold">A carregar produtos frescos...</p>
          </div>
        ) : viewMode === 'map' ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="mb-6 flex items-center gap-2 text-gray-500 bg-blue-50 p-4 rounded-xl border border-blue-100">
              <Info className="w-5 h-5 text-blue-600" />
              <p className="text-sm font-medium">Explore os produtos disponíveis por localização geográfica.</p>
            </div>
            <MapView items={filteredProducts} />
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            <AnimatePresence>
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all overflow-hidden group flex flex-col"
                >
                  <div className="h-56 relative overflow-hidden">
                    <img 
                      src={product.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400'} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                      <Tag className="w-3 h-3 text-green-600" /> {product.category}
                    </div>
                    {product.quantity < 10 && (
                      <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                        Últimas Unidades
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-black text-gray-900 tracking-tight">{product.name}</h3>
                      <div className="text-right">
                        <p className="text-2xl font-black text-green-600 leading-none">{product.price.toLocaleString('pt-AO')}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">AKZ / {product.unit}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-gray-500 mb-6 font-bold text-xs">
                      <MapPin className="w-3.5 h-3.5 text-red-500" /> {product.location}
                    </div>

                    <div className="mt-auto space-y-4">
                      <div className="flex items-center justify-between text-xs font-bold text-gray-400 border-t border-gray-50 pt-4">
                        <span>Produtor: <span className="text-gray-900">{product.farmerName}</span></span>
                        <span>Qtd: <span className="text-gray-900">{product.quantity} {product.unit}</span></span>
                      </div>
                      
                      <button 
                        onClick={() => addToCart(product)}
                        disabled={addingToCart === product.id}
                        className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg ${
                          addingToCart === product.id 
                            ? 'bg-green-100 text-green-600 shadow-none' 
                            : 'bg-gray-900 text-white hover:bg-green-600 shadow-gray-200 hover:shadow-green-100'
                        }`}
                      >
                        {addingToCart === product.id ? (
                          <>
                            <Check className="w-4 h-4" /> Adicionado
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" /> Adicionar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {!loading && filteredProducts.length === 0 && (
          <div className="py-32 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
              <Search className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Nenhum produto encontrado</h3>
            <p className="text-gray-500 font-medium">Tente ajustar os filtros ou a sua pesquisa.</p>
            <button 
              onClick={() => { setSearchTerm(''); setCategory('Todos'); }}
              className="mt-8 text-green-600 font-black uppercase tracking-widest text-xs hover:underline"
            >
              Limpar todos os filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
