import React, { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { motion } from 'motion/react';
import { User, Tractor, ShoppingCart, Truck, CheckCircle2 } from 'lucide-react';

export const RegistrationQuestionnaire: React.FC = () => {
  const { user, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const roles = [
    { id: 'farmer', title: 'Agricultor', icon: Tractor, description: 'Quero vender os meus produtos agrícolas.' },
    { id: 'buyer', title: 'Comprador', icon: ShoppingCart, description: 'Quero comprar produtos frescos e saudáveis.' },
    { id: 'transporter', title: 'Transportador', icon: Truck, description: 'Quero prestar serviços de logística.' },
  ];

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    
    let lat = -8.839;
    let lng = 13.289;

    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (e) {
        console.log("Using default coordinates");
      }
    }

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        role,
        location,
        phone,
        lat,
        lng,
        roleSet: true,
        totalEarnings: 0,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (profile?.roleSet) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden"
      >
        <div className="bg-green-600 p-8 text-white text-center">
          <h2 className="text-3xl font-bold mb-2">Bem-vindo ao FarmLink!</h2>
          <p className="text-green-100 opacity-90">Vamos configurar o seu perfil para começar.</p>
        </div>

        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-800 text-center mb-6">Qual é o seu objetivo?</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {roles.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={`p-6 rounded-2xl border-2 transition-all text-center group ${
                      role === r.id ? 'border-green-600 bg-green-50' : 'border-gray-100 hover:border-green-200'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors ${
                      role === r.id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-green-100 group-hover:text-green-600'
                    }`}>
                      <r.icon className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-gray-900 mb-1">{r.title}</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">{r.description}</p>
                  </button>
                ))}
              </div>
              <button
                disabled={!role}
                onClick={() => setStep(2)}
                className="w-full mt-8 bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-200"
              >
                Continuar
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-800 text-center mb-6">Informações de Contacto</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Localização (Província/Cidade)</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ex: Luanda, Talatona"
                    className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-green-600 focus:bg-white outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Número de Telefone</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">+244</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9XX XXX XXX"
                      className="w-full pl-16 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-green-600 focus:bg-white outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-100 text-gray-600 font-bold py-4 rounded-xl hover:bg-gray-200 transition-all"
                >
                  Voltar
                </button>
                <button
                  disabled={!location || !phone || loading}
                  onClick={handleSubmit}
                  className="flex-[2] bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 disabled:opacity-50 transition-all shadow-lg shadow-green-200 flex items-center justify-center gap-2"
                >
                  {loading ? 'A guardar...' : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Concluir Registo
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
