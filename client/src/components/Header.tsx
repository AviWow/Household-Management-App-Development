import React from 'react';
import { useHousehold } from '../context/HouseholdContext';
import { CheckSquare, ShoppingCart, Users, Globe } from 'lucide-react';

interface Props {
  activeTab: 'tasks' | 'shopping';
  setActiveTab: (tab: 'tasks' | 'shopping') => void;
  openUserModal: () => void;
  trashCount?: number;
}

export const Header: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  openUserModal,
}) => {
  const { currentUser, lang, setLang, t } = useHousehold();

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <img
            src="/icon.svg"
            alt="לוגו ניהול בית"
            className="w-10 h-10 rounded-2xl shadow-md shadow-rose-500/20 object-contain hover:scale-105 transition-transform"
          />
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-800 tracking-tight leading-none">
              {t('משק בית', 'Household')}
            </h1>
            <span className="text-[11px] font-medium text-slate-400">
              {t('מטלות ורשימות קניות', 'Tasks & Shopping')}
            </span>
          </div>
        </div>

        {/* Desktop Main Navigation Tabs */}
        <div className="hidden md:flex items-center bg-slate-100/80 p-1 rounded-2xl border border-slate-200/50">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'tasks'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckSquare size={17} />
            <span>{t('מטלות הבית', 'Tasks')}</span>
          </button>
          <button
            onClick={() => setActiveTab('shopping')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'shopping'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingCart size={17} />
            <span>{t('רשימות קניות', 'Shopping Lists')}</span>
          </button>
        </div>

        {/* Right Controls: User Switcher & Language */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active User Switcher Pill */}
          <button
            onClick={openUserModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200/60 transition-all hover:scale-[1.02] cursor-pointer"
            title={t('החלף משתמש', 'Switch User')}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-sm shadow-xs text-white"
              style={{ backgroundColor: currentUser?.color || '#3B82F6' }}
            >
              {currentUser?.avatar || '👤'}
            </div>
            <span className="text-xs font-bold text-slate-700 max-w-[80px] sm:max-w-none truncate">
              {currentUser?.name || t('בחר משתמש', 'Select')}
            </span>
            <Users size={14} className="text-slate-400" />
          </button>

          {/* Language Toggle */}
          <button
            onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-600 transition-colors"
            title={t('שנה שפה', 'Switch Language')}
          >
            <Globe size={14} />
            <span>{lang === 'he' ? 'EN' : 'עב'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
