import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  profileLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthReady: boolean;
  seedProducts: () => Promise<void>;
  switchRole: (newRole: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    let unsubscribeProfile: () => void = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setProfileLoading(true);
        
        const docRef = doc(db, 'users', firebaseUser.uid);
        
        // Use onSnapshot for real-time profile updates
        unsubscribeProfile = onSnapshot(docRef, async (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data());
            setProfileLoading(false);
            setLoading(false);
          } else {
            // Create profile if it doesn't exist
            const newProfile = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'Utilizador',
              email: firebaseUser.email,
              role: 'buyer',
              roleSet: false,
              createdAt: serverTimestamp(),
            };
            await setDoc(docRef, newProfile);
          }
        }, (error) => {
          console.error("Error fetching profile:", error);
          setProfileLoading(false);
          setLoading(false);
        });
      } else {
        setUser(null);
        setProfile(null);
        setProfileLoading(false);
        setLoading(false);
        unsubscribeProfile();
      }
      setIsAuthReady(true);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProfile();
    };
  }, []);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Erro ao fazer login:", error);
      if (error.code === 'auth/popup-blocked') {
        showToast("O pop-up de login foi bloqueado pelo seu navegador. Por favor, permita pop-ups ou abra a aplicação num novo separador.", "error");
      } else {
        showToast("Erro ao fazer login. Experimente abrir a aplicação num novo separador para garantir que a autenticação funciona corretamente.", "error");
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const seedProducts = async () => {
    if (!user) return;
    const mockProducts = [
      { name: 'Tomate Cereja', category: 'Vegetais', price: 1500, unit: 'kg', quantity: 50, location: 'Luanda', lat: -8.839, lng: 13.289, imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400' },
      { name: 'Manga Rosa', category: 'Frutas', price: 2000, unit: 'kg', quantity: 30, location: 'Benguela', lat: -12.576, lng: 13.405, imageUrl: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=400' },
      { name: 'Cenoura Orgânica', category: 'Vegetais', price: 800, unit: 'kg', quantity: 100, location: 'Huambo', lat: -12.776, lng: 15.739, imageUrl: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&q=80&w=400' },
      { name: 'Banana Pão', category: 'Frutas', price: 1200, unit: 'cacho', quantity: 20, location: 'Uíge', lat: -7.608, lng: 15.061, imageUrl: 'https://images.unsplash.com/photo-1571771894821-ad990241274d?auto=format&fit=crop&q=80&w=400' },
      { name: 'Alface Fresca', category: 'Vegetais', price: 500, unit: 'un', quantity: 40, location: 'Luanda', lat: -8.839, lng: 13.289, imageUrl: 'https://images.unsplash.com/photo-1622206141540-5844544d3fa5?auto=format&fit=crop&q=80&w=400' },
      { name: 'Abacate', category: 'Frutas', price: 1800, unit: 'kg', quantity: 25, location: 'Cuanza Sul', lat: -10.733, lng: 14.333, imageUrl: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&q=80&w=400' },
      { name: 'Batata Doce', category: 'Vegetais', price: 600, unit: 'kg', quantity: 150, location: 'Huíla', lat: -14.917, lng: 13.500, imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=400' },
      { name: 'Ananás', category: 'Frutas', price: 1000, unit: 'un', quantity: 60, location: 'Bengo', lat: -8.583, lng: 13.667, imageUrl: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&q=80&w=400' },
      { name: 'Cebola Branca', category: 'Vegetais', price: 700, unit: 'kg', quantity: 200, location: 'Namibe', lat: -15.196, lng: 12.152, imageUrl: 'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&q=80&w=400' },
    ];

    try {
      for (const p of mockProducts) {
        await addDoc(collection(db, 'products'), {
          ...p,
          farmerId: user.uid,
          farmerName: profile?.name || 'Produtor Demo',
          farmerPhone: profile?.phone || '+244 9XX XXX XXX',
          status: 'available',
          createdAt: serverTimestamp(),
        });
      }
      showToast("Produtos simulados com sucesso!");
    } catch (error) {
      console.error(error);
    }
  };

  const switchRole = async (newRole: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { role: newRole });
      setProfile((prev: any) => ({ ...prev, role: newRole }));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, profileLoading, login, logout, isAuthReady, seedProducts, switchRole } as any}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
