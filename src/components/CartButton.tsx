import React, { useState, useEffect } from 'react';
import { ShoppingCart } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';

interface CartButtonProps {
  onClick: () => void;
}

export const CartButton: React.FC<CartButtonProps> = ({ onClick }) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'cart'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCartItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  const itemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <button 
      onClick={onClick}
      className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors relative"
    >
      <ShoppingCart className="w-6 h-6" />
      {itemCount > 0 && (
        <span className="absolute top-1 right-1 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
          {itemCount}
        </span>
      )}
    </button>
  );
};
