import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { apiUsers } from '../services/api';
import confetti from 'canvas-confetti';

interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
}

interface HouseholdContextType {
  currentUser: User | null;
  setCurrentUser: (user: User) => void;
  users: User[];
  loadingUsers: boolean;
  reloadUsers: () => Promise<void>;
  lang: 'he' | 'en';
  setLang: (lang: 'he' | 'en') => void;
  t: (he: string, en: string) => string;
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  triggerCelebration: () => void;
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

export const HouseholdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [lang, setLangState] = useState<'he' | 'en'>('he');
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Initialize lang from localStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('household_lang') as 'he' | 'en';
    if (savedLang) {
      setLangState(savedLang);
      document.documentElement.lang = savedLang;
      document.documentElement.dir = savedLang === 'he' ? 'rtl' : 'ltr';
    } else {
      document.documentElement.lang = 'he';
      document.documentElement.dir = 'rtl';
    }
  }, []);

  const setLang = (newLang: 'he' | 'en') => {
    setLangState(newLang);
    localStorage.setItem('household_lang', newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === 'he' ? 'rtl' : 'ltr';
  };

  const t = (he: string, en: string) => (lang === 'he' ? he : en);

  const reloadUsers = async () => {
    try {
      setLoadingUsers(true);
      const list = await apiUsers.list();
      setUsers(list);
      
      const savedUserId = localStorage.getItem('household_active_user_id');
      const matched = list.find((u) => u.id === savedUserId);
      if (matched) {
        setCurrentUserState(matched);
      } else if (list.length > 0) {
        setCurrentUserState(list[0]);
        localStorage.setItem('household_active_user_id', list[0].id);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    reloadUsers();
  }, []);

  const setCurrentUser = (user: User) => {
    setCurrentUserState(user);
    localStorage.setItem('household_active_user_id', user.id);
    showToast(`${t('עברת למשתמש:', 'Switched to:')} ${user.name}`, 'info');
  };

  const showToast = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch {
      // ignore in environments without canvas
    }
  };

  return (
    <HouseholdContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        users,
        loadingUsers,
        reloadUsers,
        lang,
        setLang,
        t,
        showToast,
        triggerCelebration,
      }}
    >
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none w-max max-w-[90vw]">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-2.5 rounded-xl shadow-xl text-sm font-medium text-white flex items-center gap-2 transform transition-all duration-300 pointer-events-auto ${
              toast.type === 'success'
                ? 'bg-emerald-600 shadow-emerald-500/20'
                : toast.type === 'error'
                ? 'bg-red-600 shadow-red-500/20'
                : toast.type === 'warning'
                ? 'bg-amber-600 shadow-amber-500/20'
                : 'bg-slate-800 shadow-slate-900/30'
            }`}
          >
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </HouseholdContext.Provider>
  );
};

export const useHousehold = () => {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error('useHousehold must be used within a HouseholdProvider');
  }
  return context;
};
