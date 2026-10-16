import React, { useState } from 'react';
import { HouseholdProvider, useHousehold } from './context/HouseholdContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { TasksView } from './components/tasks/TasksView';
import { ShoppingView } from './components/shopping/ShoppingView';
import { SmartHomeView } from './components/smart/SmartHomeView';
import { UserSwitcherModal } from './components/UserSwitcherModal';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'shopping' | 'smart'>('tasks');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 pb-20 md:pb-8 selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setIsTrashOpen(false);
          setActiveTab(tab);
        }}
        openUserModal={() => setIsUserModalOpen(true)}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-5 pb-6">
        {activeTab === 'tasks' ? (
          <TasksView isTrashOpenInitially={isTrashOpen} />
        ) : activeTab === 'shopping' ? (
          <ShoppingView />
        ) : (
          <SmartHomeView />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setIsTrashOpen(false);
          setActiveTab(tab);
        }}
        openUserModal={() => setIsUserModalOpen(true)}
        openTrash={() => {
          setActiveTab('tasks');
          setIsTrashOpen(true);
        }}
        isTrashOpen={activeTab === 'tasks' && isTrashOpen}
      />

      {/* Household User Switcher Modal */}
      <UserSwitcherModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <HouseholdProvider>
      <AppContent />
    </HouseholdProvider>
  );
};

export default App;
