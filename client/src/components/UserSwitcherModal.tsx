import React, { useState } from 'react';
import { useHousehold } from '../context/HouseholdContext';
import { User } from '../types';
import { apiUsers } from '../services/api';
import { X, Plus, Check, Trash2, UserPlus } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const AVATAR_OPTIONS = ['👨', '👩', '👦', '👧', '👨‍🦰', '👩‍🦱', '👴', '👵', '👶', '🐱', '🐶', '🦊', '⭐', '🥑'];
const COLOR_OPTIONS = ['#3B82F6', '#EC4899', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#64748B'];

export const UserSwitcherModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { currentUser, setCurrentUser, users, reloadUsers, t, showToast } = useHousehold();
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('👤');
  const [color, setColor] = useState('#3B82F6');
  const [role, setRole] = useState<'admin' | 'member' | 'child'>('member');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSelectUser = (u: User) => {
    setCurrentUser(u);
    onClose();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);
      const newUser = await apiUsers.create({
        name: name.trim(),
        avatar,
        color,
        role,
      });
      await reloadUsers();
      setCurrentUser(newUser);
      setShowAddForm(false);
      setName('');
      showToast(t('חבר בית חדש נוסף בהצלחה!', 'New household member added!'), 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Error creating user', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (u: User, e: React.MouseEvent) => {
    e.stopPropagation();
    if (users.length <= 1) {
      showToast(t('לא ניתן למחוק את חבר הבית היחיד', 'Cannot delete the only household member'), 'warning');
      return;
    }
    if (!confirm(t(`למחוק את ${u.name}?`, `Delete member ${u.name}?`))) return;

    try {
      await apiUsers.delete(u.id);
      await reloadUsers();
      showToast(t('חבר הבית נמחק', 'Member removed'), 'info');
    } catch (err: any) {
      showToast(err.message || 'Error deleting user', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {t('חברי הבית', 'Household Members')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('בחר משתמש לביצוע פעולות או הוסף חבר חדש', 'Select active user or add a new member')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4">
          {!showAddForm ? (
            <>
              <div className="grid grid-cols-1 gap-2.5">
                {users.map((u) => {
                  const isSelected = currentUser?.id === u.id;
                  return (
                    <div
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer border-2 transition-all duration-200 ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/60 shadow-sm'
                          : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center text-xl shadow-sm text-white font-bold"
                          style={{ backgroundColor: u.color }}
                        >
                          {u.avatar || '👤'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800 text-base">{u.name}</span>
                            {isSelected && (
                              <span className="text-[11px] font-bold bg-indigo-500 text-white px-2 py-0.5 rounded-full">
                                {t('פעיל כעת', 'Active')}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500">
                            {u.role === 'admin'
                              ? t('מנהל משק בית', 'Household Admin')
                              : u.role === 'child'
                              ? t('ילד/ה', 'Child')
                              : t('בן/בת בית', 'Family Member')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <div className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                            <Check size={14} strokeWidth={3} />
                          </div>
                        ) : (
                          users.length > 1 && (
                            <button
                              onClick={(e) => handleDeleteUser(u, e)}
                              title={t('מחק חבר בית', 'Delete member')}
                              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => setShowAddForm(true)}
                className="w-full mt-3 py-3 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 rounded-xl text-sm font-semibold text-indigo-600 flex items-center justify-center gap-2 transition-colors"
              >
                <UserPlus size={18} />
                <span>{t('הוסף חבר/ת בית חדש', 'Add Household Member')}</span>
              </button>
            </>
          ) : (
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {t('שם חבר הבית', 'Member Name')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('לדוגמה: אבא, מיכל, יואב...', 'e.g. Mom, Maya, Leo...')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {t('בחר אימוג׳י / אווטאר', 'Select Avatar Emoji')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatar(emoji)}
                      className={`w-9 h-9 text-lg rounded-xl flex items-center justify-center transition-transform ${
                        avatar === emoji
                          ? 'bg-indigo-100 ring-2 ring-indigo-500 scale-110'
                          : 'bg-slate-100 hover:bg-slate-200'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {t('בחר צבע מזהה', 'Select Color')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        color === c ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {t('תפקיד', 'Role')}
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                >
                  <option value="admin">{t('מנהל משק בית (הורה / שותף ראשי)', 'Admin')}</option>
                  <option value="member">{t('בן / בת בית', 'Member')}</option>
                  <option value="child">{t('ילד / ילדה', 'Child')}</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors shadow-md disabled:opacity-50"
                >
                  {loading ? t('שומר...', 'Saving...') : t('שמור חבר בית', 'Save Member')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-sm transition-colors"
                >
                  {t('ביטול', 'Cancel')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
