import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { Marketplace } from './components/Marketplace';
import { Dashboard } from './components/Dashboard';
import { CartList } from './components/CartList';
import { RegistrationQuestionnaire } from './components/RegistrationQuestionnaire';
import { Loader2 } from 'lucide-react';
import { AnimatePresence } from 'motion/react';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/" />;
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { user, loading, profile, profileLoading } = useAuth();
  const [isCartOpen, setIsCartOpen] = useState(false);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans selection:bg-green-100 selection:text-green-900">
      <Navbar onCartClick={() => setIsCartOpen(true)} />
      
      <AnimatePresence>
        {isCartOpen && <CartList onClose={() => setIsCartOpen(false)} />}
      </AnimatePresence>

      {user && !profileLoading && !profile?.roleSet && <RegistrationQuestionnaire />}

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
