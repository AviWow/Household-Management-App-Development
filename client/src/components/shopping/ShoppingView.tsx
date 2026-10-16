import React, { useState, useEffect } from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import { ShoppingItem, ShoppingCategory, FavoriteTemplate, ShoppingListType, UnitType } from '../../types';
import { apiShopping } from '../../services/api';
import { FavoritesDrawer } from './FavoritesDrawer';
import { CategoryOrderModal } from './CategoryOrderModal';
import { ShoppingItemModal } from './ShoppingItemModal';
import {
  ShoppingCart,
  Pill,
  Package,
  Layers,
  Plus,
  Minus,
  CheckCircle2,
  Circle,
  Star,
  Trash2,
  Edit2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Settings2,
  Check,
  ShoppingBag,
  RotateCcw,
} from 'lucide-react';

export const ShoppingView: React.FC = () => {
  const { currentUser, t, showToast, triggerCelebration } = useHousehold();

  // Active shopping list tab
  const [activeList, setActiveList] = useState<ShoppingListType>('supermarket');

  // Data states
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [categories, setCategories] = useState<ShoppingCategory[]>([]);
  const [favorites, setFavorites] = useState<FavoriteTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Panels
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [showInCartDrawer, setShowInCartDrawer] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cats, favs, itemList] = await Promise.all([
        apiShopping.getCategories(),
        apiShopping.getFavorites(),
        apiShopping.getItems(activeList),
      ]);
      setCategories(cats);
      setFavorites(favs);
      setItems(itemList);
    } catch (err: any) {
      showToast(err.message || 'Error loading shopping data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeList]);

  // Toggle item collected/in cart
  const handleToggleItem = async (item: ShoppingItem) => {
    try {
      const updated = await apiShopping.toggleItem(item.id, currentUser?.id);
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));

      if (updated.is_checked) {
        showToast(t(`"${item.name}" נאסף לעגלה! 🛒`, `"${item.name}" added to cart! 🛒`), 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Error toggling item', 'error');
    }
  };

  // Quick quantity increment / decrement directly on the item row!
  const handleQuickQuantity = async (item: ShoppingItem, delta: number) => {
    const newQty = Math.max(0.25, Math.round((item.quantity + delta) * 100) / 100);
    try {
      const updated = await apiShopping.updateItem(item.id, { quantity: newQty });
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i)));
    } catch (err: any) {
      showToast(err.message || 'Error updating quantity', 'error');
    }
  };

  // Toggle favorite on an item
  const handleToggleFavorite = async (item: ShoppingItem) => {
    try {
      const res = await apiShopping.toggleFavorite(item.id);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_favorite: res.is_favorite } : i))
      );
      // Refresh favorites list
      const favs = await apiShopping.getFavorites();
      setFavorites(favs);
      showToast(
        res.is_favorite
          ? t(`"${item.name}" נוסף למועדפים ⭐`, `"${item.name}" saved to favorites ⭐`)
          : t(`"${item.name}" הוסר מהמועדפים`, `Removed from favorites`),
        'info'
      );
    } catch (err: any) {
      showToast(err.message || 'Error toggling favorite', 'error');
    }
  };

  // Delete item
  const handleDeleteItem = async (item: ShoppingItem) => {
    try {
      await apiShopping.deleteItem(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      showToast(t(`"${item.name}" נמחק מהרשימה`, `Item removed`), 'info');
    } catch (err: any) {
      showToast(err.message || 'Error deleting item', 'error');
    }
  };

  // Save new / edited item
  const handleSaveItem = async (data: Partial<ShoppingItem>) => {
    try {
      if (editingItem) {
        const updated = await apiShopping.updateItem(editingItem.id, data);
        setItems((prev) => prev.map((i) => (i.id === editingItem.id ? { ...i, ...updated } : i)));
        showToast(t('המוצר עודכן', 'Item updated'), 'success');
      } else {
        const created = await apiShopping.createItem(data);
        setItems((prev) => [created, ...prev]);
        showToast(t('המוצר נוסף לרשימה!', 'Item added to list!'), 'success');
      }
      setEditingItem(null);
    } catch (err: any) {
      showToast(err.message || 'Error saving item', 'error');
    }
  };

  // Clear checked items (clean up after shopping trip)
  const handleClearChecked = async () => {
    const checkedCount = items.filter((i) => i.is_checked).length;
    if (checkedCount === 0) return;

    if (!confirm(t(`למחוק ${checkedCount} מוצרים שנאספו מהרשימה?`, `Clear ${checkedCount} checked items?`))) {
      return;
    }

    try {
      await apiShopping.clearChecked(activeList);
      setItems((prev) => prev.filter((i) => !i.is_checked));
      triggerCelebration();
      showToast(t('סיימת את הקניות בהצלחה! כל הכבוד!', 'Shopping completed! Great job!'), 'success');
    } catch (err: any) {
      showToast(err.message || 'Error clearing checked items', 'error');
    }
  };

  // Uncheck all items (repeat shopping trip!)
  const handleUncheckAll = async () => {
    try {
      await apiShopping.uncheckAll(activeList);
      setItems((prev) => prev.map((i) => ({ ...i, is_checked: 0, checked_by: null, checked_at: null })));
      showToast(t('כל המוצרים הוחזרו לרשימה הפעילה', 'All items unmarked for next shopping trip'), 'info');
    } catch (err: any) {
      showToast(err.message || 'Error unchecking items', 'error');
    }
  };

  // Toggle category collapse
  const toggleCategoryCollapse = (catId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Split items into Unchecked (Active) and Checked (In Cart)
  const activeItems = items.filter((i) => !i.is_checked);
  const checkedItems = items.filter((i) => Boolean(i.is_checked));

  // For supermarket: group active items by category in the CUSTOM ordered sequence!
  const sortedCategories = [...categories].sort((a, b) => a.display_order - b.display_order);

  const getCategoryItems = (catId: string) => {
    return activeItems.filter((i) => i.category_id === catId);
  };

  const uncategorizedActiveItems = activeItems.filter(
    (i) => !i.category_id || !categories.some((c) => c.id === i.category_id)
  );

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* 4 List Navigation Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-x-auto touch-scroll w-full sm:w-auto">
          {/* 1. Supermarket */}
          <button
            onClick={() => setActiveList('supermarket')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeList === 'supermarket'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <ShoppingCart size={16} />
            <span>{t('סופר (מצרכים)', 'Supermarket')}</span>
          </button>

          {/* 2. Pharmacy */}
          <button
            onClick={() => setActiveList('pharmacy')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeList === 'pharmacy'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Pill size={16} />
            <span>{t('מכבי / סופר-פארם', 'Pharmacy')}</span>
          </button>

          {/* 3. General / Cheap Store */}
          <button
            onClick={() => setActiveList('general')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeList === 'general'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Package size={16} />
            <span>{t('אלי אקספרס / מקס-סטוק', 'AliExpress / Stock')}</span>
          </button>

          {/* 4. Other */}
          <button
            onClick={() => setActiveList('other')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeList === 'other'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Layers size={16} />
            <span>{t('אחר (כללי)', 'Other')}</span>
          </button>
        </div>

        {/* Action Buttons: Add Item & Custom Category Reordering */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {activeList === 'supermarket' && (
            <button
              onClick={() => setIsOrderModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs"
              title={t('שנה את סדר המחלקות בסופר לפי הסניף שלך', 'Reorder supermarket departments')}
            >
              <Settings2 size={16} className="text-amber-500" />
              <span>{t('סדר מחלקות ↕️', 'Aisle Order ↕️')}</span>
            </button>
          )}

          <button
            onClick={() => {
              setEditingItem(null);
              setIsItemModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/25 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>{t('הוסף מוצר', 'Add Item')}</span>
          </button>
        </div>
      </div>

      {/* Favorites Quick-Add Shelf (For Supermarket) */}
      {activeList === 'supermarket' && (
        <FavoritesDrawer
          favorites={favorites}
          categories={categories}
          onItemAdded={() => apiShopping.getItems('supermarket').then(setItems)}
          onFavoritesUpdated={() => apiShopping.getFavorites().then(setFavorites)}
        />
      )}

      {/* Main Item List Content */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          {t('טוען מוצרים...', 'Loading shopping list...')}
        </div>
      ) : activeItems.length === 0 && checkedItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-500 mx-auto flex items-center justify-center text-3xl mb-3 shadow-inner">
            🛒
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {t('רשימת הקניות ריקה!', 'Shopping list is empty!')}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            {activeList === 'supermarket'
              ? t('הוסף מוצרים מהמועדפים למעלה או לחץ על "הוסף מוצר"', 'Add staples from favorites above or click "Add Item"')
              : t('הוסף מוצרים שתרצה לקנות לחץ על "הוסף מוצר"', 'Click "Add Item" to add items you need to buy')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* SUPERMARKET LIST: Displayed in Custom Ordered Department Categories! */}
          {activeList === 'supermarket' ? (
            <div className="space-y-4">
              {sortedCategories.map((category) => {
                const catItems = getCategoryItems(category.id);
                if (catItems.length === 0) return null; // Don't show empty categories to keep view clean

                const isCollapsed = collapsedCategories[category.id];

                return (
                  <div
                    key={category.id}
                    className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden"
                  >
                    {/* Category Header */}
                    <div
                      onClick={() => toggleCategoryCollapse(category.id)}
                      className="p-3.5 sm:p-4 bg-slate-50/70 hover:bg-slate-100/70 border-b border-slate-100 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{category.icon}</span>
                        <h3 className="text-sm font-bold text-slate-800">
                          {t(category.name_he, category.name_en)}
                        </h3>
                        <span className="text-[11px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                          {catItems.length}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-slate-400">
                        {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                      </div>
                    </div>

                    {/* Category Items */}
                    {!isCollapsed && (
                      <div className="p-3 sm:p-4 divide-y divide-slate-100">
                        {catItems.map((item) => (
                          <ShoppingItemRow
                            key={item.id}
                            item={item}
                            onToggle={() => handleToggleItem(item)}
                            onQuickQty={(delta) => handleQuickQuantity(item, delta)}
                            onToggleFav={() => handleToggleFavorite(item)}
                            onEdit={() => {
                              setEditingItem(item);
                              setIsItemModalOpen(true);
                            }}
                            onDelete={() => handleDeleteItem(item)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Uncategorized items (if any) */}
              {uncategorizedActiveItems.length > 0 && (
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-4">
                  <h3 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">
                    {t('מוצרים ללא מחלקה', 'Uncategorized Items')}
                  </h3>
                  <div className="divide-y divide-slate-100">
                    {uncategorizedActiveItems.map((item) => (
                      <ShoppingItemRow
                        key={item.id}
                        item={item}
                        onToggle={() => handleToggleItem(item)}
                        onQuickQty={(delta) => handleQuickQuantity(item, delta)}
                        onToggleFav={() => handleToggleFavorite(item)}
                        onEdit={() => {
                          setEditingItem(item);
                          setIsItemModalOpen(true);
                        }}
                        onDelete={() => handleDeleteItem(item)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* NON-SUPERMARKET LISTS (Pharmacy, General / Cheap Store, Other) */
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-3 sm:p-4 divide-y divide-slate-100">
              {activeItems.map((item) => (
                <ShoppingItemRow
                  key={item.id}
                  item={item}
                  onToggle={() => handleToggleItem(item)}
                  onQuickQty={(delta) => handleQuickQuantity(item, delta)}
                  onToggleFav={() => handleToggleFavorite(item)}
                  onEdit={() => {
                    setEditingItem(item);
                    setIsItemModalOpen(true);
                  }}
                  onDelete={() => handleDeleteItem(item)}
                />
              ))}
            </div>
          )}

          {/* "In Cart / Collected" (נאספו לעגלה) Section */}
          {checkedItems.length > 0 && (
            <div className="bg-emerald-50/60 rounded-3xl border border-emerald-200/80 overflow-hidden mt-6">
              <div
                onClick={() => setShowInCartDrawer(!showInCartDrawer)}
                className="p-4 bg-emerald-100/60 flex items-center justify-between cursor-pointer hover:bg-emerald-100 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    <Check size={18} strokeWidth={3} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                      <span>{t('נאספו לעגלה', 'In Cart / Collected')}</span>
                      <span className="text-xs bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                        {checkedItems.length}
                      </span>
                    </h3>
                    <p className="text-[11px] text-emerald-700">
                      {t(
                        `${checkedItems.length} מתוך ${items.length} מוצרים נאספו`,
                        `${checkedItems.length} of ${items.length} items collected`
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Clean up / finished shopping button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearChecked();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
                    title={t('נקה פריטים שנאספו (סיום קניות)', 'Finish shopping & clear cart')}
                  >
                    {t('רוקן עגלה (סיום קניה) ✓', 'Clear Cart ✓')}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUncheckAll();
                    }}
                    className="p-1.5 rounded-xl text-emerald-700 hover:bg-emerald-200/60 transition-colors"
                    title={t('אפס עגלה (קנייה חוזרת)', 'Uncheck all')}
                  >
                    <RotateCcw size={16} />
                  </button>

                  <div className="text-emerald-700 ms-1">
                    {showInCartDrawer ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>
              </div>

              {showInCartDrawer && (
                <div className="p-3 sm:p-4 divide-y divide-emerald-200/50">
                  {checkedItems.map((item) => (
                    <ShoppingItemRow
                      key={item.id}
                      item={item}
                      isCheckedView
                      onToggle={() => handleToggleItem(item)}
                      onQuickQty={(delta) => handleQuickQuantity(item, delta)}
                      onToggleFav={() => handleToggleFavorite(item)}
                      onEdit={() => {
                        setEditingItem(item);
                        setIsItemModalOpen(true);
                      }}
                      onDelete={() => handleDeleteItem(item)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Item Modal (Add / Edit) */}
      <ShoppingItemModal
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
        listType={activeList}
        categories={categories}
        initialItem={editingItem}
      />

      {/* Category Reordering Modal (Aisle Order) */}
      <CategoryOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        categories={categories}
        onOrderUpdated={(newCats) => {
          setCategories(newCats);
          apiShopping.getItems('supermarket').then(setItems);
        }}
      />
    </div>
  );
};

// Reusable Shopping Item Row component
interface RowProps {
  item: ShoppingItem;
  isCheckedView?: boolean;
  onToggle: () => void;
  onQuickQty: (delta: number) => void;
  onToggleFav: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const ShoppingItemRow: React.FC<RowProps> = ({
  item,
  isCheckedView = false,
  onToggle,
  onQuickQty,
  onToggleFav,
  onEdit,
  onDelete,
}) => {
  const { t } = useHousehold();

  const formatUnit = (unit: UnitType, qty: number) => {
    switch (unit) {
      case 'kg':
        return t('ק״ג', 'kg');
      case 'g':
        return t('גרם', 'g');
      case 'pack':
        return t('מארז', 'pack');
      case 'bottle':
        return t('בקבוק', 'btl');
      case 'box':
        return t('קופסה', 'box');
      default:
        return t('יח׳', 'pcs');
    }
  };

  return (
    <div
      className={`group py-2.5 sm:py-3 flex items-center justify-between gap-3 transition-colors ${
        isCheckedView ? 'opacity-70' : 'hover:bg-slate-50/50 rounded-xl px-2'
      }`}
    >
      {/* Left: Checkbox & Name */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          onClick={onToggle}
          className="text-slate-300 hover:text-indigo-600 transition-colors focus:outline-none cursor-pointer flex-shrink-0"
          title={isCheckedView ? t('החזר לרשימה', 'Return to list') : t('אסוף לעגלה', 'Check into cart')}
        >
          {item.is_checked ? (
            <CheckCircle2 size={24} className="text-emerald-500 fill-emerald-100" />
          ) : (
            <Circle size={24} className="hover:text-indigo-500" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-sm font-bold break-words leading-snug ${
                item.is_checked ? 'line-through text-slate-400' : 'text-slate-800'
              }`}
            >
              {item.name}
            </span>

            {/* Price badge if available (e.g. general / bargain) */}
            {Boolean(item.estimated_price) && (
              <span className="text-[11px] font-bold px-2 py-0.2 rounded-full bg-slate-100 text-slate-600">
                ₪{item.estimated_price}
              </span>
            )}

            {/* URL button if available (AliExpress link) */}
            {Boolean(item.url) && (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:underline font-bold"
                onClick={(e) => e.stopPropagation()}
              >
                <span>{t('קישור', 'Link')}</span>
                <ExternalLink size={11} />
              </a>
            )}
          </div>

          {/* Notes */}
          {Boolean(item.notes) && (
            <p className="text-xs text-slate-500 mt-0.5 break-words">{item.notes}</p>
          )}

          {/* Checked by attribution */}
          {Boolean(item.is_checked) && Boolean(item.checker_name) && (
            <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">
              ✓ {t('נאסף ע״י', 'Collected by')} {item.checker_name}
            </span>
          )}
        </div>
      </div>

      {/* Right: Quantity controls & Actions */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Quick Quantity Controller (+ / -) */}
        {!item.is_checked && (
          <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-0.5">
            <button
              onClick={() => onQuickQty(-1)}
              className="w-6 h-6 rounded-lg bg-white hover:bg-slate-100 flex items-center justify-center text-slate-500 shadow-xs transition-colors"
              title={t('הפחת כמות', 'Decrease quantity')}
            >
              <Minus size={12} />
            </button>
            <div className="px-2 text-xs font-bold text-slate-700 min-w-[42px] text-center">
              {item.quantity} {formatUnit(item.unit, item.quantity)}
            </div>
            <button
              onClick={() => onQuickQty(1)}
              className="w-6 h-6 rounded-lg bg-white hover:bg-slate-100 flex items-center justify-center text-slate-500 shadow-xs transition-colors"
              title={t('הגדל כמות', 'Increase quantity')}
            >
              <Plus size={12} />
            </button>
          </div>
        )}

        {/* Favorite Star Toggle */}
        <button
          onClick={onToggleFav}
          className="p-1.5 rounded-lg text-slate-300 hover:text-amber-500 transition-colors"
          title={item.is_favorite ? t('הסר ממועדפים', 'Remove favorite') : t('סמן כמועדף', 'Save favorite')}
        >
          <Star
            size={16}
            className={item.is_favorite ? 'fill-amber-400 text-amber-500' : 'text-slate-300'}
          />
        </button>

        {/* Edit & Delete Actions */}
        <div className="flex items-center gap-0.5 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title={t('ערוך מוצר', 'Edit item')}
          >
            <Edit2 size={15} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title={t('מחק מוצר', 'Delete item')}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
