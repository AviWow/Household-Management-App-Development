import React, { useState } from 'react';
import { useHousehold } from '../context/HouseholdContext';
import { User } from '../types';
import { apiUsers } from '../services/api';
import { X, Check, Trash2, UserPlus, Pencil, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const AVATAR_GROUPS = [
  {
    id: 'rainbow',
    labelHe: '🌈 קשת ומיוחדים',
    labelEn: 'Rainbow & Fun',
    emojis: ['🌈', '⭐', '🌸', '🌺', '🌻', '🌞', '✨', '👑', '🚀', '🥑', '🍉', '🍓', '🍕', '🍦', '🎨', '🎮', '❤️', '🎈'],
  },
  {
    id: 'animals',
    labelHe: '🐾 חיות',
    labelEn: 'Animals',
    emojis: [
      '🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐨', '🦁', '🐯', '🦄',
      '🐵', '🐸', '🐧', '🐥', '🦉', '🦋', '🐬', '🐢', '🦔', '🐘',
      '🦒', '🐝', '🦖', '🐙', '🐴', '🐑'
    ],
  },
  {
    id: 'people',
    labelHe: '👨‍👩‍👧 אנשים ומשפחה',
    labelEn: 'People & Family',
    emojis: ['👨', '👩', '👦', '👧', '👨‍🦰', '👩‍🦱', '👴', '👵', '👶', '🧑', '👱‍♀️', '👱‍♂️', '👸', '🤴', '🦸‍♂️', '🦸‍♀️'],
  },
];

const COLOR_OPTIONS = [
  '#3B82F6', '#EC4899', '#10B981', '#8B5CF6',
  '#F59E0B', '#EF4444', '#06B6D4', '#64748B',
  '#F97316', '#14B8A6', '#A855F7', '#E11D48'
];

export const UserSwitcherModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { currentUser, setCurrentUser, users, reloadUsers, t, showToast } = useHousehold();
  const [showForm, setShowForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🌈');
  const [color, setColor] = useState('#EC4899');
  const [role, setRole] = useState<'admin' | 'member' | 'child'>('member');
  const [activeTab, setActiveTab] = useState<'rainbow' | 'animals' | 'people' | 'all'>('rainbow');
  const [customEmoji, setCustomEmoji] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSelectUser = (u: User) => {
    setCurrentUser(u);
    onClose();
  };

  const handleOpenAdd = () => {
    setEditingUserId(null);
    setName('');
    setAvatar('🌈');
    setColor('#EC4899');
    setRole('member');
    setCustomEmoji('');
    setActiveTab('rainbow');
    setShowForm(true);
  };

  const handleOpenEdit = (u: User, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingUserId(u.id);
    setName(u.name);
    setAvatar(u.avatar || '👤');
    setColor(u.color || '#3B82F6');
    setRole(u.role || 'member');
    setCustomEmoji('');
    setShowForm(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);
      const chosenAvatar = customEmoji.trim() || avatar || '🌈';

      if (editingUserId) {
        // Update existing user
        const updated = await apiUsers.update(editingUserId, {
          name: name.trim(),
          avatar: chosenAvatar,
          color,
          role,
        });
        await reloadUsers();
        if (currentUser?.id === editingUserId) {
          setCurrentUser(updated);
        }
        showToast(t('פרטי חבר הבית עודכנו בהצלחה!', 'Member details updated successfully!'), 'success');
      } else {
        // Create new user
        const newUser = await apiUsers.create({
          name: name.trim(),
          avatar: chosenAvatar,
          color,
          role,
        });
        await reloadUsers();
        setCurrentUser(newUser);
        showToast(t('חבר בית חדש נוסף בהצלחה!', 'New household member added!'), 'success');
      }

      setShowForm(false);
      setEditingUserId(null);
      setName('');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Error saving user', 'error');
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
    if (!confirm(t(`האם למחוק את ${u.name}?`, `Delete member ${u.name}?`))) return;

    try {
      await apiUsers.delete(u.id);
      await reloadUsers();
      showToast(t('חבר הבית נמחק', 'Member removed'), 'info');
    } catch (err: any) {
      showToast(err.message || 'Error deleting user', 'error');
    }
  };

  // Get displayed emojis depending on active tab
  const displayedEmojis =
    activeTab === 'all'
      ? AVATAR_GROUPS.flatMap((g) => g.emojis)
      : AVATAR_GROUPS.find((g) => g.id === activeTab)?.emojis || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70 flex-shrink-0">
          <div>
            <h2 className="text-xl font-black text-slate-800">
              {showForm
                ? editingUserId
                  ? t('עריכת חבר בית', 'Edit Household Member')
                  : t('הוספת חבר בית חדש', 'Add Household Member')
                : t('חברי הבית', 'Household Members')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {showForm
                ? t('בחר שם, אימוג׳י מיוחד (קשת, חיות ועוד) וצבע מזהה', 'Choose name, avatar (rainbow, animals, etc.) and color')
                : t('בחר משתמש פעיל או נהל את חברי הבית', 'Select active user or manage members')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {!showForm ? (
            <>
              {/* Member List */}
              <div className="grid grid-cols-1 gap-2.5">
                {users.map((u) => {
                  const isSelected = currentUser?.id === u.id;
                  return (
                    <div
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer border-2 transition-all duration-200 ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/60 shadow-sm'
                          : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shadow-sm text-white font-bold flex-shrink-0"
                          style={{ backgroundColor: u.color }}
                        >
                          {u.avatar || '👤'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800 text-base truncate">{u.name}</span>
                            {isSelected && (
                              <span className="text-[10px] font-bold bg-indigo-500 text-white px-2 py-0.5 rounded-full">
                                {t('פעיל כעת', 'Active')}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 block truncate">
                            {u.role === 'admin'
                              ? t('מנהל משק בית', 'Household Admin')
                              : u.role === 'child'
                              ? t('ילד/ה', 'Child')
                              : t('בן/בת בית', 'Family Member')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Edit Button */}
                        <button
                          onClick={(e) => handleOpenEdit(u, e)}
                          title={t('ערוך פרטי חבר בית', 'Edit member')}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                        >
                          <Pencil size={15} />
                        </button>

                        {/* Delete Button (if more than 1 user) */}
                        {users.length > 1 && (
                          <button
                            onClick={(e) => handleDeleteUser(u, e)}
                            title={t('מחק חבר בית', 'Delete member')}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}

                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center mr-1">
                            <Check size={14} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add New Member Button */}
              <button
                onClick={handleOpenAdd}
                className="w-full mt-3 py-3 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 rounded-2xl text-sm font-bold text-indigo-600 flex items-center justify-center gap-2 transition-colors"
              >
                <UserPlus size={18} />
                <span>{t('הוסף חבר/ת בית חדש', 'Add Household Member')}</span>
              </button>
            </>
          ) : (
            <form onSubmit={handleSaveUser} className="space-y-4">
              {/* Live Preview Card */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm text-white font-bold transition-all flex-shrink-0"
                  style={{ backgroundColor: color }}
                >
                  {customEmoji.trim() || avatar || '👤'}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 text-base truncate">
                    {name.trim() || t('שם חבר הבית', 'Member Name')}
                  </div>
                  <div className="text-xs text-slate-500">
                    {role === 'admin'
                      ? t('מנהל משק בית', 'Household Admin')
                      : role === 'child'
                      ? t('ילד/ה', 'Child')
                      : t('בן/בת בית', 'Family Member')}
                  </div>
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('שם חבר הבית', 'Member Name')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('לדוגמה: אבא, מיכל, יואב...', 'e.g. Mom, Maya, Leo...')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                  autoFocus
                />
              </div>

              {/* Avatar Selector with Rainbow & Animal Categories */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    {t('בחר אימוג׳י / חיה / קשת', 'Select Emoji / Animal / Rainbow')}
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {t('נבחר:', 'Selected:')} {customEmoji.trim() || avatar}
                  </span>
                </div>

                {/* Category Filter Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl mb-2.5 overflow-x-auto scrollbar-none text-xs font-bold">
                  {AVATAR_GROUPS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setActiveTab(g.id as any)}
                      className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap ${
                        activeTab === g.id
                          ? 'bg-white text-indigo-600 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t(g.labelHe, g.labelEn)}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap ${
                      activeTab === 'all'
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t('הכל', 'All')}
                  </button>
                </div>

                {/* Emojis Grid */}
                <div className="grid grid-cols-7 sm:grid-cols-8 gap-1.5 p-2 bg-slate-50/80 rounded-2xl border border-slate-200/70 max-h-40 overflow-y-auto">
                  {displayedEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setAvatar(emoji);
                        setCustomEmoji('');
                      }}
                      className={`w-9 h-9 text-xl rounded-xl flex items-center justify-center transition-all ${
                        avatar === emoji && !customEmoji
                          ? 'bg-white ring-2 ring-indigo-500 shadow-sm scale-110'
                          : 'hover:bg-white/80 hover:scale-105'
                      }`}
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Custom Emoji Input Option */}
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={4}
                    placeholder={t('או הקלד אימוג׳י משלך מהמקלדת...', 'Or type any emoji from keyboard...')}
                    value={customEmoji}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomEmoji(val);
                      if (val.trim()) setAvatar(val.trim());
                    }}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                  {customEmoji && (
                    <button
                      type="button"
                      onClick={() => setCustomEmoji('')}
                      className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
                    >
                      {t('נקה', 'Clear')}
                    </button>
                  )}
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t('בחר צבע מזהה', 'Select Color')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition-all ${
                        color === c ? 'ring-2 ring-offset-2 ring-indigo-600 scale-110 shadow-sm' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Role Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('תפקיד בבית', 'Household Role')}
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium bg-white"
                >
                  <option value="admin">{t('מנהל משק בית (הורה / שותף ראשי)', 'Admin')}</option>
                  <option value="member">{t('בן / בת בית', 'Member')}</option>
                  <option value="child">{t('ילד / ילדה', 'Child')}</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-colors shadow-md disabled:opacity-50"
                >
                  {loading
                    ? t('שומר...', 'Saving...')
                    : editingUserId
                    ? t('שמור שינויים', 'Save Changes')
                    : t('הוסף חבר בית', 'Add Member')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-sm transition-colors"
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
