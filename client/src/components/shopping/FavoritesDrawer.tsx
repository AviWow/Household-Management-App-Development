import React, { useState } from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import { FavoriteTemplate, ShoppingCategory } from '../../types';
import { apiShopping } from '../../services/api';
import { Star, Plus, Trash2, X, Sparkles } from 'lucide-react';

interface Props {
  favorites: FavoriteTemplate[];
  categories: ShoppingCategory[];
  onItemAdded: () => void;
  onFavoritesUpdated: () => void;
}

export const FavoritesDrawer: React.FC<Props> = ({
  favorites,
  categories,
  onItemAdded,
  onFavoritesUpdated,
}) => {
  const { currentUser, t, showToast } = useHousehold();
  const [isOpen, setIsOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('produce');
  const [quantity, setQuantity] = useState<number | string>(1);
  const [unit, setUnit] = useState<any>('units');
  const [addingId, setAddingId] = useState<string | null>(null);

  const handleAddToList = async (fav: FavoriteTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setAddingId(fav.id);
      await apiShopping.addFavoriteToList(fav.id, currentUser?.id, fav.default_quantity);
      showToast(t(`"${fav.name}" נוסף לרשימת הסופר!`, `"${fav.name}" added to supermarket!`), 'success');
      onItemAdded();
    } catch (err: any) {
      showToast(err.message || 'Error adding item', 'error');
    } finally {
      setTimeout(() => setAddingId(null), 400);
    }
  };

  const handleDeleteFavorite = async (fav: FavoriteTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t(`להסיר את "${fav.name}" מהמועדפים?`, `Remove "${fav.name}" from favorites?`))) return;
    try {
      await apiShopping.deleteFavorite(fav.id);
      showToast(t('המוצר הוסר מהמועדפים', 'Removed from favorites'), 'info');
      onFavoritesUpdated();
    } catch (err: any) {
      showToast(err.message || 'Error removing favorite', 'error');
    }
  };

  const handleCreateFavorite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await apiShopping.createFavorite({
        name: name.trim(),
        category_id: categoryId,
        default_quantity: Number(quantity) || 1,
        unit,
        icon: '⭐',
      });
      showToast(t('מוצר מועדף חדש נשמר!', 'Favorite staple saved!'), 'success');
      setName('');
      setShowAddForm(false);
      onFavoritesUpdated();
    } catch (err: any) {
      showToast(err.message || 'Error creating favorite', 'error');
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-amber-200/80 shadow-xs overflow-hidden">
      {/* Top Banner / Toggle Bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-3.5 sm:p-4 bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-amber-50/90 flex items-center justify-between cursor-pointer hover:bg-amber-100/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-400 text-white flex items-center justify-center text-sm font-bold shadow-xs">
            ⭐
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span>{t('מוצרים מועדפים וקבועים', 'Favorite Staples')}</span>
              <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.2 rounded-full font-bold">
                {favorites.length}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              {t('הוספה בלחיצה אחת לסל הקניות', '1-click quick add to supermarket cart')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-xl transition-colors"
          >
            {isOpen ? t('הסתר מועדפים', 'Hide') : t('הצג מוצרים ⭐', 'View Staples ⭐')}
          </button>
        </div>
      </div>

      {/* Expanded Quick-Add Drawer */}
      {isOpen && (
        <div className="p-4 sm:p-5 border-t border-amber-100 space-y-4 animate-fadeIn">
          {/* Quick-add chip cloud */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {favorites.map((fav) => {
              const isAdding = addingId === fav.id;

              return (
                <div
                  key={fav.id}
                  className={`group relative flex items-center justify-between p-2.5 rounded-2xl border transition-all duration-200 ${
                    isAdding
                      ? 'bg-emerald-50 border-emerald-400 scale-95'
                      : 'bg-amber-50/40 border-amber-200/60 hover:bg-amber-50 hover:border-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{fav.icon || '⭐'}</span>
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-800 truncate" title={fav.name}>
                        {fav.name}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {fav.default_quantity} {fav.unit === 'kg' ? t('ק״ג', 'kg') : fav.unit === 'pack' ? t('מארז', 'pack') : t('יח׳', 'pcs')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* 1-Click Add Button */}
                    <button
                      onClick={(e) => handleAddToList(fav, e)}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-white transition-all ${
                        isAdding
                          ? 'bg-emerald-600 scale-110'
                          : 'bg-amber-500 hover:bg-amber-600 shadow-xs hover:scale-105'
                      }`}
                      title={t('הוסף לרשימת הסופר', 'Add to supermarket')}
                    >
                      <Plus size={16} strokeWidth={3} />
                    </button>

                    {/* Delete Favorite Button (visible on hover) */}
                    <button
                      onClick={(e) => handleDeleteFavorite(fav, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-500 transition-opacity"
                      title={t('הסר מהמועדפים', 'Remove from favorites')}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add custom favorite staple */}
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-amber-50 transition-colors"
            >
              <Plus size={14} />
              <span>{t('+ הוסף מוצר קבוע חדש למועדפים', '+ Add new staple to favorites')}</span>
            </button>
          ) : (
            <form onSubmit={handleCreateFavorite} className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">{t('הוספת מוצר מועדף חדש', 'Add Favorite Staple')}</span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  placeholder={t('שם המוצר (לדוגמה: יוגורט)', 'Item name (e.g. Yogurt)')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                />
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {t(c.name_he, c.name_en)}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value === '' ? '' : e.target.value)}
                    className="w-16 px-2 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                  >
                    <option value="units">{t('יחידות', 'Units')}</option>
                    <option value="kg">{t('ק״ג', 'Kg')}</option>
                    <option value="pack">{t('מארז', 'Pack')}</option>
                    <option value="bottle">{t('בקבוק', 'Bottle')}</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  {t('ביטול', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg"
                >
                  {t('שמור מועדף', 'Save Favorite')}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
