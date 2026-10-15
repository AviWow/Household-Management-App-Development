import React from 'react';
import { useHousehold } from '../context/HouseholdContext';
import { CheckSquare, ShoppingCart, Trash2, Users } from 'lucide-react';

interface Props {
  activeTab: 'tasks' | 'shopping';
  setActiveTab: (tab: 'tasks' | 'shopping') => void;
  openUserModal: () => void;
  openTrash: () => void;
  isTrashOpen: boolean;
  trashCount?: number;
}

export const BottomNav: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  openUserModal,
  openTrash,
  isTrashOpen,
  trashCount = 0,
}) => {
  const { t } = useHousehold();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 px-2 py-1 shadow-lg">
      <div className="grid grid-cols-4 items-center justify-around">
        {/* Tasks Button */}
        <button
          onClick={() => {
            setActiveTab('tasks');
          }}
          className={`flex flex-col items-center justify-center py-1.5 transition-colors ${
            activeTab === 'tasks' && !isTrashOpen
              ? 'text-indigo-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckSquare size={20} strokeWidth={activeTab === 'tasks' && !isTrashOpen ? 2.5 : 2} />
          <span className="text-[11px] mt-0.5">{t('מטלות', 'Tasks')}</span>
        </button>

        {/* Shopping Button */}
        <button
          onClick={() => {
            setActiveTab('shopping');
          }}
          className={`flex flex-col items-center justify-center py-1.5 transition-colors ${
            activeTab === 'shopping'
              ? 'text-indigo-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingCart size={20} strokeWidth={activeTab === 'shopping' ? 2.5 : 2} />
          <span className="text-[11px] mt-0.5">{t('קניות', 'Shopping')}</span>
        </button>

        {/* Trash Button */}
        <button
          onClick={openTrash}
          className={`relative flex flex-col items-center justify-center py-1.5 transition-colors ${
            isTrashOpen
              ? 'text-rose-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="relative">
            <Trash2 size={20} strokeWidth={isTrashOpen ? 2.5 : 2} />
            {trashCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {trashCount > 9 ? '9+' : trashCount}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-0.5">{t('סל מחזור', 'Trash')}</span>
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
