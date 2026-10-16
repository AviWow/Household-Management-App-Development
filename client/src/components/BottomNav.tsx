import React from 'react';
import { useHousehold } from '../context/HouseholdContext';
import { CheckSquare, ShoppingCart, Users, Zap } from 'lucide-react';

interface Props {
  activeTab: 'tasks' | 'shopping' | 'smart';
  setActiveTab: (tab: 'tasks' | 'shopping' | 'smart') => void;
  openUserModal: () => void;
  openTrash: () => void;
  isTrashOpen: boolean;
  trashCount?: number;
}

export const BottomNav: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  openUserModal,
}) => {
  const { t } = useHousehold();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 px-2 py-1 shadow-lg">
      <div className="grid grid-cols-4 items-center justify-around">
        {/* Tasks Button */}
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex flex-col items-center justify-center py-1.5 transition-colors ${
            activeTab === 'tasks'
              ? 'text-indigo-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckSquare size={20} strokeWidth={activeTab === 'tasks' ? 2.5 : 2} />
          <span className="text-[11px] mt-0.5">{t('מטלות', 'Tasks')}</span>
        </button>

        {/* Shopping Button */}
        <button
          onClick={() => setActiveTab('shopping')}
          className={`flex flex-col items-center justify-center py-1.5 transition-colors ${
            activeTab === 'shopping'
              ? 'text-indigo-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingCart size={20} strokeWidth={activeTab === 'shopping' ? 2.5 : 2} />
          <span className="text-[11px] mt-0.5">{t('קניות', 'Shopping')}</span>
        </button>

        {/* Smart Home Button */}
        <button
          onClick={() => setActiveTab('smart')}
          className={`flex flex-col items-center justify-center py-1.5 transition-colors ${
            activeTab === 'smart'
              ? 'text-amber-500 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Zap size={20} strokeWidth={activeTab === 'smart' ? 2.5 : 2} className={activeTab === 'smart' ? 'fill-amber-500' : ''} />
          <span className="text-[11px] mt-0.5">{t('בית חכם', 'Smart')}</span>
        </button>

        {/* User / Household button */}
        <button
          onClick={openUserModal}
          className="flex flex-col items-center justify-center py-1.5 text-slate-500 hover:text-slate-800 transition-colors"
        >
          <Users size={20} strokeWidth={2} />
          <span className="text-[11px] mt-0.5">{t('משתמשים', 'Family')}</span>
        </button>
      </div>
    </nav>
  );
};
