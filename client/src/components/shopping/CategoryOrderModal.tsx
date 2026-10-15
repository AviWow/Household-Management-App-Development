import React, { useState, useEffect } from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import { ShoppingCategory } from '../../types';
import { apiShopping } from '../../services/api';
import { X, ArrowUp, ArrowDown, RotateCcw, Check, GripVertical, Store } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  categories: ShoppingCategory[];
  onOrderUpdated: (newCategories: ShoppingCategory[]) => void;
}

export const CategoryOrderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  categories: initialCategories,
  onOrderUpdated,
}) => {
  const { t, showToast } = useHousehold();
  const [categories, setCategories] = useState<ShoppingCategory[]>(initialCategories || []);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialCategories && initialCategories.length > 0) {
        setCategories([...initialCategories].sort((a, b) => a.display_order - b.display_order));
      } else {
        setLoading(true);
        apiShopping
          .getCategories()
          .then((cats) => {
            if (cats && cats.length > 0) {
              setCategories([...cats].sort((a, b) => a.display_order - b.display_order));
            }
          })
          .catch((err) => {
            console.error('Error fetching categories in modal:', err);
          })
          .finally(() => {
            setLoading(false);
          });
      }
    }
  }, [isOpen, initialCategories]);

  if (!isOpen) return null;

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= categories.length) return;

    const updated = [...categories];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);

    // Update display_order property sequentially
    const reordered = updated.map((cat, idx) => ({
      ...cat,
      display_order: idx + 1,
    }));

    setCategories(reordered);
  };

  const handleDragStart = (index: number) => {
    setDraggedIdx(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;

    const updated = [...categories];
    const [moved] = updated.splice(draggedIdx, 1);
    updated.splice(index, 0, moved);

    const reordered = updated.map((cat, idx) => ({
      ...cat,
      display_order: idx + 1,
    }));

    setDraggedIdx(index);
    setCategories(reordered);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const orders = categories.map((cat, idx) => ({
        id: cat.id,
        display_order: idx + 1,
      }));
      const updated = await apiShopping.reorderCategories(orders);
      onOrderUpdated(updated);
      showToast(t('סדר המחלקות נשמר בהצלחה!', 'Category order saved!'), 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Error saving category order', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm(t('לאפס את סדר המחלקות לברירת המחדל?', 'Reset category order to default layout?'))) return;
    try {
      setSaving(true);
      const updated = await apiShopping.resetCategoriesOrder();
      setCategories(updated);
      onOrderUpdated(updated);
      showToast(t('סדר המחלקות אופס לברירת המחדל', 'Category order reset to default'), 'info');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Error resetting order', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl font-bold">
              <Store size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {t('סדר מחלקות בסופר', 'Supermarket Aisle Order')}
              </h2>
              <p className="text-xs text-slate-500">
                {t('התאם את סדר המחלקות לפי מסלול ההליכה בסניף הסופר שלך', 'Match categories to your supermarket walking route')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tip Banner */}
        <div className="px-5 py-2.5 bg-amber-50/80 border-b border-amber-100 text-amber-900 text-[11px] leading-relaxed flex items-center gap-2">
          <span>💡</span>
          <span>
            {t(
              'גרור מחלקה או השתמש בחצים למעלה/למטה. המוצרים בסופר יוצגו בדיוק בסדר זה.',
              'Drag or use up/down arrows to reorder. Items will appear in this exact order.'
            )}
          </span>
        </div>

        {/* Categories List */}
        <div className="p-5 overflow-y-auto space-y-2 flex-1">
          {loading ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              {t('טוען מחלקות...', 'Loading categories...')}
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              <p>{t('לא נמצאו מחלקות. לחץ על איפוס כדי לטעון את המחלקות המקוריות.', 'No categories found. Click reset to load default categories.')}</p>
              <button
                type="button"
                onClick={handleReset}
                className="mt-3 px-3 py-1.5 bg-amber-50 text-amber-700 font-bold rounded-xl text-xs hover:bg-amber-100"
              >
                {t('טען מחלקות ברירת מחדל', 'Load default categories')}
              </button>
            </div>
          ) : (
            categories.map((cat, index) => (
            <div
              key={cat.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${
                draggedIdx === index
                  ? 'border-indigo-500 bg-indigo-50 opacity-60 scale-[1.02]'
                  : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="cursor-grab text-slate-300 hover:text-slate-500 p-1">
                  <GripVertical size={16} />
                </span>
                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center">
                  {index + 1}
                </span>
                <span className="text-lg">{cat.icon}</span>
                <span className="text-sm font-bold text-slate-800">
                  {t(cat.name_he, cat.name_en)}
                </span>
              </div>

              {/* Move up / down buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveCategory(index, 'up')}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title={t('הזז למעלה', 'Move up')}
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  type="button"
                  disabled={index === categories.length - 1}
                  onClick={() => moveCategory(index, 'down')}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title={t('הזז למטה', 'Move down')}
                >
                  <ArrowDown size={15} />
                </button>
              </div>
            </div>
          )))}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <RotateCcw size={14} />
            <span>{t('איפוס לברירת מחדל', 'Reset to Default')}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
            >
              {t('ביטול', 'Cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              <Check size={16} />
              <span>{saving ? t('שומר...', 'Saving...') : t('שמור סדר מחלקות', 'Save Order')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
