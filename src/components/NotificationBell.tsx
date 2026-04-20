import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { motion, AnimatePresence } from 'motion/react';

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      dbNotifications.sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate?.() || 0;
        const dateB = b.createdAt?.toDate?.() || 0;
        return dateB - dateA;
      });
      setNotifications(dbNotifications);
    });
    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  };

  const deleteNotification = async (id: string) => {
    await deleteDoc(doc(db, 'notifications', id));
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors relative"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-bold text-gray-800">Notificações</h3>
                <span className="text-xs text-gray-500">{notifications.length} total</span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Sem notificações</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors relative group ${!n.read ? 'bg-blue-50/30' : ''}`}
                    >
                      <div className="pr-8">
                        <p className={`text-sm ${!n.read ? 'font-bold text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{n.message}</p>
                        <p className="text-[10px] text-gray-400 mt-2">
                          {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString() : 'Recentemente'}
                        </p>
                      </div>
                      <div className="absolute top-4 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!n.read && (
                          <button 
                            onClick={() => markAsRead(n.id)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded-full"
                            title="Marcar como lida"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                        <button 
                          onClick={() => deleteNotification(n.id)}
                          className="p-1 text-red-400 hover:bg-red-100 rounded-full"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
