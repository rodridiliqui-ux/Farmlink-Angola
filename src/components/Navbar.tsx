import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { LogIn, LogOut, User, Tractor, ShoppingCart, Truck, LayoutDashboard, ShoppingBag } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { CartButton } from './CartButton';

interface NavbarProps {
  onCartClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onCartClick }) => {
  const { user, profile, login, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white group-hover:bg-green-700 transition-all shadow-lg shadow-green-100">
                <Tractor className="w-6 h-6" />
              </div>
              <span className="text-2xl font-black text-gray-900 tracking-tight">FarmLink <span className="text-green-600">Angola</span></span>
            </Link>
            
            <div className="hidden md:flex items-center gap-6">
              <Link to="/marketplace" className="text-sm font-bold text-gray-600 hover:text-green-600 transition-colors flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" /> Mercado
              </Link>
              {user && (
                <Link to="/dashboard" className="text-sm font-bold text-gray-600 hover:text-green-600 transition-colors flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" /> Painel
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <NotificationBell />
                <CartButton onClick={onCartClick} />
                <div className="h-8 w-px bg-gray-100 mx-2"></div>
                <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-black text-gray-900 leading-none">{profile?.name || user.displayName}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{profile?.role || 'Utilizador'}</p>
                  </div>
                  <button 
                    onClick={() => navigate('/dashboard')}
                    className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center border-2 border-white shadow-sm"
                  >
                    <User className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={logout}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="Sair"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <button 
                onClick={login}
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-100"
              >
                <LogIn className="w-5 h-5" /> Entrar
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
