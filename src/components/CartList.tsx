import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, deleteDoc, doc, addDoc, serverTimestamp, updateDoc, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, Trash2, Plus, Minus, CreditCard, Smartphone, CheckCircle2, ArrowRight, X, Loader2, ShieldCheck, Info } from 'lucide-react';

interface CartListProps {
  onClose: () => void;
}

export const CartList: React.FC<CartListProps> = ({ onClose }) => {
  const { user, profile } = useAuth();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [step, setStep] = useState<'cart' | 'checkout' | 'processing' | 'success'>('cart');
  const [paymentMethod, setPaymentMethod] = useState<'ussd' | 'bank_transfer' | 'cash' | 'reference'>('ussd');
  const [referenceData, setReferenceData] = useState<{ entity: string, reference: string } | null>(null);
  const [address, setAddress] = useState('');
  const [requestTransport, setRequestTransport] = useState(true);
  const [loading, setLoading] = useState(false);

  const generateReference = () => {
    const ref = Math.floor(100000000 + Math.random() * 900000000).toString();
    setReferenceData({ entity: '00000', reference: ref });
  };

  useEffect(() => {
    if (paymentMethod === 'reference' && !referenceData) {
      generateReference();
    }
  }, [paymentMethod]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'cart'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCartItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const freightFee = requestTransport ? 2500 : 0;
  const total = subtotal + freightFee;

  const updateQuantity = async (id: string, newQty: number) => {
    if (newQty < 1) return;
    await updateDoc(doc(db, 'cart', id), { quantity: newQty });
  };

  const removeItem = async (id: string) => {
    await deleteDoc(doc(db, 'cart', id));
  };

  const handleFirestoreError = (error: any, operation: string, path: string) => {
    const errInfo = {
      error: error.message || String(error),
      authInfo: {
        userId: user?.uid,
        email: user?.email,
        emailVerified: user?.emailVerified,
        isAnonymous: user?.isAnonymous,
      },
      operationType: operation,
      path
    };
    console.error('Firestore Error:', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  };

  const handleCheckout = async () => {
    if (!user || cartItems.length === 0) return;
    setStep('processing');
    setLoading(true);

    try {
      // Create orders for each farmer
      const farmers = [...new Set(cartItems.map(item => item.farmerId))];
      
      for (const farmerId of farmers) {
        const itemsForFarmer = cartItems.filter(item => item.farmerId === farmerId);
        const farmerSubtotal = itemsForFarmer.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const farmerTotal = farmerSubtotal + (requestTransport ? (freightFee / farmers.length) : 0);
        
        const orderData = {
          buyerId: user.uid,
          buyerName: profile?.name || user.displayName,
          buyerLoc: profile?.lat && profile?.lng ? [profile.lat, profile.lng] : null,
          farmerId: farmerId,
          farmerName: itemsForFarmer[0].farmerName,
          farmerLoc: itemsForFarmer[0].farmerLat && itemsForFarmer[0].farmerLng ? [itemsForFarmer[0].farmerLat, itemsForFarmer[0].farmerLng] : null,
          items: itemsForFarmer.map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
          })),
          totalAmount: farmerTotal,
          freightFee: requestTransport ? (freightFee / farmers.length) : 0,
          status: 'pending',
          deliveryAddress: address,
          paymentMethod,
          paymentStatus: 'pending',
          paymentDetails: paymentMethod === 'reference' ? {
            entity: '00000',
            reference: Math.floor(100000000 + Math.random() * 900000000).toString(),
            amount: farmerTotal
          } : null,
          requestTransport,
          createdAt: serverTimestamp(),
        };

        try {
          await addDoc(collection(db, 'orders'), orderData);
        } catch (err) {
          handleFirestoreError(err, 'create', 'orders');
        }
        
        // Notify farmer
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: farmerId,
            title: 'Nova Encomenda!',
            message: `Recebeu um novo pedido de ${profile?.name || user.displayName}.`,
            type: 'order',
            read: false,
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          console.error("Error notifying farmer:", err);
        }

        // Notify transporters if requested
        if (requestTransport) {
          try {
            const transportersQuery = query(collection(db, 'users'), where('role', '==', 'transporter'));
            const transportersSnap = await getDocs(transportersQuery);
            
            for (const tDoc of transportersSnap.docs) {
              await addDoc(collection(db, 'notifications'), {
                userId: tDoc.id,
                title: 'Novo Pedido de Entrega!',
                message: `Há um novo pedido de transporte disponível para ${itemsForFarmer[0].farmerName}.`,
                type: 'delivery_request',
                read: false,
                createdAt: serverTimestamp(),
              });
            }
          } catch (err) {
            console.error("Error notifying transporters:", err);
          }
        }
      }

      // Clear cart and update product quantities
      for (const item of cartItems) {
        try {
          const productRef = doc(db, 'products', item.productId);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            const currentQty = productSnap.data().quantity || 0;
            const newQty = Math.max(0, currentQty - item.quantity);
            await updateDoc(productRef, { 
              quantity: newQty,
              status: newQty === 0 ? 'out_of_stock' : 'available'
            });
          }
        } catch (err) {
          console.error("Error updating product quantity:", err);
          // Don't fail the whole checkout if quantity update fails, but log it
        }
        try {
          await deleteDoc(doc(db, 'cart', item.id));
        } catch (err) {
          console.error("Error deleting cart item:", err);
        }
      }

      setStep('success');
    } catch (error) {
      console.error('Checkout failed:', error);
      setStep('checkout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-100">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">O seu Carrinho</h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{cartItems.length} itens selecionados</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {step === 'cart' && (
              <motion.div key="cart" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                {cartItems.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-200">
                      <ShoppingCart className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-2 tracking-tight">Carrinho Vazio</h3>
                    <p className="text-gray-500 font-medium mb-8 leading-relaxed">Parece que ainda não adicionou nenhum produto fresco ao seu carrinho.</p>
                    <button 
                      onClick={onClose}
                      className="bg-green-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg shadow-green-100"
                    >
                      Explorar Mercado
                    </button>
                  </div>
                ) : (
                  cartItems.map((item) => (
                    <div key={item.id} className="flex gap-4 bg-white p-4 rounded-2xl border border-gray-100 hover:border-green-100 transition-all group shadow-sm hover:shadow-md">
                      <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                        <img src={item.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200'} alt={item.productName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-black text-gray-900 tracking-tight">{item.productName}</h4>
                          <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Produtor: {item.farmerName}</p>
                        <div className="mt-auto flex justify-between items-center">
                          <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-100">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 hover:bg-white rounded-md text-gray-400 hover:text-gray-900 transition-all"><Minus className="w-3 h-3" /></button>
                            <span className="w-8 text-center text-xs font-black text-gray-900">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 hover:bg-white rounded-md text-gray-400 hover:text-gray-900 transition-all"><Plus className="w-3 h-3" /></button>
                          </div>
                          <p className="font-black text-green-600">{(item.price * item.quantity).toLocaleString('pt-AO')} AKZ</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {step === 'checkout' && (
              <motion.div key="checkout" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                <button onClick={() => setStep('cart')} className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors text-xs font-black uppercase tracking-widest">
                  <ArrowRight className="w-4 h-4 rotate-180" /> Voltar ao Carrinho
                </button>

                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Endereço de Entrega</label>
                    <textarea 
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Ex: Rua Direita da Samba, Edifício X, Luanda"
                      className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-green-600 focus:bg-white outline-none transition-all font-medium min-h-[100px]"
                    />
                  </div>

                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-bold text-gray-900">Solicitar Transporte</span>
                      </div>
                      <button 
                        onClick={() => setRequestTransport(!requestTransport)}
                        className={`w-12 h-6 rounded-full transition-all relative ${requestTransport ? 'bg-green-600' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${requestTransport ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-500 font-medium leading-relaxed">Utilize a nossa rede de transportadores verificados para uma entrega segura.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Método de Pagamento</label>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { id: 'ussd', title: 'Unitel Money / MCX Express', icon: Smartphone, color: 'blue', desc: 'Pagamento imediato via telemóvel' },
                        { id: 'reference', title: 'Referência Multicaixa', icon: CreditCard, color: 'purple', desc: 'Pague em qualquer ATM ou Internet Banking' },
                        { id: 'bank_transfer', title: 'Transferência Bancária', icon: CreditCard, color: 'green', desc: 'Envie o comprovativo após a transferência' },
                        { id: 'cash', title: 'Pagamento na Entrega', icon: ShoppingCart, color: 'orange', desc: 'Pague em numerário ao receber' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setPaymentMethod(m.id as any)}
                          className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${
                            paymentMethod === m.id ? 'border-green-600 bg-green-50' : 'border-gray-100 hover:border-green-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl bg-${m.color}-100 flex items-center justify-center text-${m.color}-600`}>
                              <m.icon className="w-5 h-5" />
                            </div>
                            <div>
                              <span className="text-sm font-bold text-gray-900 block">{m.title}</span>
                              <span className="text-[10px] text-gray-500 font-medium">{m.desc}</span>
                            </div>
                          </div>
                          {paymentMethod === m.id && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                        </button>
                      ))}
                    </div>

                    {paymentMethod === 'reference' && referenceData && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4 p-6 bg-purple-50 rounded-2xl border-2 border-purple-100 space-y-4"
                      >
                        <div className="flex items-center gap-2 text-purple-700 mb-2">
                          <Info className="w-4 h-4" />
                          <span className="text-xs font-black uppercase tracking-widest">Dados para Pagamento</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white p-3 rounded-xl border border-purple-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Entidade</p>
                            <p className="text-lg font-black text-gray-900 tracking-widest">{referenceData.entity}</p>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-purple-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Referência</p>
                            <p className="text-lg font-black text-gray-900 tracking-widest">{referenceData.reference}</p>
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-purple-100">
                          <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Montante Total</p>
                          <p className="text-xl font-black text-purple-600">{total.toLocaleString('pt-AO')} AKZ</p>
                        </div>
                        <p className="text-[10px] text-purple-600 font-bold text-center italic">A referência será válida por 24 horas após a confirmação do pedido.</p>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'processing' && (
              <motion.div key="processing" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-20 flex flex-col items-center text-center space-y-6">
                <div className="relative">
                  <div className="w-24 h-24 border-4 border-gray-100 rounded-full"></div>
                  <Loader2 className="w-24 h-24 absolute inset-0 animate-spin text-green-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">Processando Pedido</h3>
                  <p className="text-gray-500 font-medium mt-2">Estamos a notificar os produtores e a preparar a sua encomenda.</p>
                </div>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-20 flex flex-col items-center text-center space-y-6">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-xl shadow-green-100">
                  <CheckCircle2 className="w-14 h-14" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-gray-900 tracking-tight">Sucesso!</h3>
                  <p className="text-gray-500 font-medium mt-2 leading-relaxed px-4">O seu pedido foi enviado. Pode acompanhar o estado no seu painel de controlo.</p>
                </div>
                <button 
                  onClick={onClose}
                  className="bg-gray-900 text-white px-12 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl shadow-gray-200"
                >
                  Concluir
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {cartItems.length > 0 && step !== 'processing' && step !== 'success' && (
          <div className="p-8 bg-white border-t border-gray-100 space-y-6 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-gray-500 font-bold text-sm">
                <span>Subtotal</span>
                <span>{subtotal.toLocaleString('pt-AO')} AKZ</span>
              </div>
              {requestTransport && (
                <div className="flex justify-between items-center text-gray-500 font-bold text-sm">
                  <span>Taxa de Entrega</span>
                  <span>{freightFee.toLocaleString('pt-AO')} AKZ</span>
                </div>
              )}
              <div className="flex justify-between items-center text-gray-900 font-black text-2xl pt-2 border-t border-gray-50">
                <span>Total</span>
                <span className="text-green-600">{total.toLocaleString('pt-AO')} AKZ</span>
              </div>
            </div>

            {step === 'cart' ? (
              <button 
                onClick={() => setStep('checkout')}
                className="w-full bg-green-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-green-700 transition-all shadow-2xl shadow-green-200 flex items-center justify-center gap-2 group"
              >
                Finalizar Compra <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <button 
                disabled={!address || loading}
                onClick={handleCheckout}
                className="w-full bg-green-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-green-700 disabled:opacity-50 transition-all shadow-2xl shadow-green-200 flex items-center justify-center gap-2"
              >
                Confirmar Pedido
              </button>
            )}
            
            <div className="flex items-center justify-center gap-2 text-gray-400 text-[10px] font-black uppercase tracking-widest">
              <ShieldCheck className="w-3 h-3" /> Pagamento 100% Seguro
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
