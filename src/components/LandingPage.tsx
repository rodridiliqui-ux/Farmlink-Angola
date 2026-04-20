import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, ShoppingBag, Tractor, Truck, ShieldCheck, Zap, Globe, Users } from 'lucide-react';
import { useAuth } from '../AuthContext';

export const LandingPage: React.FC = () => {
  const { login, user } = useAuth();

  const features = [
    { icon: Globe, title: 'Alcance Nacional', description: 'Conectamos produtores de todas as províncias de Angola.' },
    { icon: ShieldCheck, title: 'Pagamentos Seguros', description: 'Transações protegidas via Unitel Money e Multicaixa Express.' },
    { icon: Zap, title: 'Logística Rápida', description: 'Rede de transportadores verificados para entregas eficientes.' },
    { icon: Users, title: 'Comunidade Forte', description: 'Milhares de agricultores e compradores já fazem parte.' },
  ];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1920" 
            alt="Farm background" 
            className="w-full h-full object-cover opacity-20"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/40 to-white"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6">
              O Futuro do Agronegócio em Angola
            </span>
            <h1 className="text-6xl md:text-8xl font-black text-gray-900 leading-tight tracking-tighter mb-8">
              Conectando a <span className="text-green-600">Terra</span> <br />
              ao seu <span className="text-green-600">Prato</span>.
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
              A maior plataforma agritech de Angola. Compre produtos frescos diretamente dos produtores ou venda a sua colheita para todo o país.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                to="/marketplace" 
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 text-white px-10 py-5 rounded-2xl font-black text-lg hover:bg-green-700 transition-all shadow-2xl shadow-green-200 group"
              >
                Explorar Mercado <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              {!user && (
                <button 
                  onClick={login}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-gray-900 border-2 border-gray-100 px-10 py-5 rounded-2xl font-black text-lg hover:bg-gray-50 transition-all"
                >
                  Começar Agora
                </button>
              )}
            </div>
          </motion.div>
        </div>

        {/* Floating Stats */}
        <div className="absolute bottom-10 left-0 right-0 max-w-7xl mx-auto px-4 hidden md:block">
          <div className="grid grid-cols-3 gap-8 bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-white shadow-2xl">
            <div className="text-center">
              <p className="text-4xl font-black text-green-600 mb-1">5,000+</p>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Produtores</p>
            </div>
            <div className="text-center border-x border-gray-100">
              <p className="text-4xl font-black text-green-600 mb-1">12,000+</p>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Vendas Mensais</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-black text-green-600 mb-1">18</p>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Províncias</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Porquê escolher o FarmLink?</h2>
            <p className="text-gray-500 font-medium">Inovação e confiança para o setor agrícola angolano.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all group"
              >
                <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-green-600 group-hover:text-white transition-colors">
                  <f.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-3 tracking-tight">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed font-medium">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="bg-green-600 rounded-[3rem] p-16 text-white relative overflow-hidden shadow-2xl shadow-green-200">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-24 -mb-24 blur-3xl"></div>
            
            <h2 className="text-5xl font-black mb-8 relative z-10 leading-tight">Pronto para transformar o seu negócio agrícola?</h2>
            <p className="text-xl text-green-100 mb-12 relative z-10 font-medium opacity-90">Junte-se a milhares de angolanos que já estão a lucrar com o FarmLink.</p>
            <button 
              onClick={login}
              className="relative z-10 bg-white text-green-600 px-12 py-5 rounded-2xl font-black text-xl hover:bg-green-50 transition-all shadow-xl"
            >
              Criar Conta Grátis
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white">
                  <Tractor className="w-6 h-6" />
                </div>
                <span className="text-2xl font-black tracking-tight">FarmLink <span className="text-green-600">Angola</span></span>
              </div>
              <p className="text-gray-400 max-w-sm font-medium leading-relaxed">
                A nossa missão é fortalecer a segurança alimentar em Angola através da tecnologia, conectando produtores e consumidores de forma justa e eficiente.
              </p>
            </div>
            <div>
              <h4 className="font-black text-lg mb-6 uppercase tracking-widest text-green-600">Links Rápidos</h4>
              <ul className="space-y-4 text-gray-400 font-bold">
                <li><Link to="/marketplace" className="hover:text-white transition-colors">Mercado</Link></li>
                <li><button onClick={login} className="hover:text-white transition-colors">Vender Produtos</button></li>
                <li><button onClick={login} className="hover:text-white transition-colors">Ser Transportador</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black text-lg mb-6 uppercase tracking-widest text-green-600">Contacto</h4>
              <ul className="space-y-4 text-gray-400 font-bold">
                <li>Luanda, Angola</li>
                <li>info@farmlink.ao</li>
                <li>+244 9XX XXX XXX</li>
              </ul>
            </div>
          </div>
          <div className="pt-12 border-t border-gray-800 text-center text-gray-500 font-bold text-sm">
            &copy; 2026 FarmLink Angola. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};
