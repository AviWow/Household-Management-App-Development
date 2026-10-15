import React, { useState, useEffect } from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import { ShoppingItem, ShoppingCategory, ShoppingListType, UnitType } from '../../types';
import { X, Plus, Minus, Star, ExternalLink, Tag } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<ShoppingItem>) => Promise<void>;
  listType: ShoppingListType;
  categories: ShoppingCategory[];
  initialItem?: ShoppingItem | null;
}

export const ShoppingItemModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  listType,
  categories,
  initialItem,
}) => {
  const { currentUser, t } = useHousehold();

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [quantity, setQuantity] = useState<number | string>(1);
  const [unit, setUnit] = useState<UnitType>('units');
  const [notes, setNotes] = useState('');
  const [url, setUrl] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState<string>('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialItem) {
      setName(initialItem.name || '');
      setCategoryId(initialItem.category_id || (categories[0]?.id ?? ''));
      setQuantity(initialItem.quantity || 1);
      setUnit(initialItem.unit || 'units');
      setNotes(initialItem.notes || '');
      setUrl(initialItem.url || '');
      setEstimatedPrice(initialItem.estimated_price ? String(initialItem.estimated_price) : '');
      setIsFavorite(Boolean(initialItem.is_favorite));
    } else {
      setName('');
      setCategoryId(categories[0]?.id || 'produce');
      setQuantity(1);
      setUnit('units');
      setNotes('');
      setUrl('');
      setEstimatedPrice('');
      setIsFavorite(false);
    }
  }, [initialItem, isOpen, categories]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);
      await onSave({
        list_type: listType,
        name: name.trim(),
        category_id: listType === 'supermarket' ? categoryId : null,
        quantity: Math.max(0.1, Number(quantity) || 1),
        unit,
        notes: notes.trim(),
        url: url.trim(),
        estimated_price: estimatedPrice ? Number(estimatedPrice) : null,
        is_favorite: isFavorite ? 1 : 0,
        created_by: initialItem ? initialItem.created_by : currentUser?.id,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const adjustQty = (amount: number) => {
    setQuantity((prev) => {
      const current = Number(prev) || 1;
      const next = Math.max(0.25, Math.round((current + amount) * 100) / 100);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {initialItem ? t('עריכת פריט', 'Edit Item') : t('הוספת פריט לקניות', 'Add Shopping Item')}
            </h2>
            <p className="text-xs text-slate-500">
              {listType === 'supermarket'
                ? t('רשימת סופרמרקט', 'Supermarket list')
                : listType === 'pharmacy'
                ? t('רשימת בית מרקחת ופארם', 'Pharmacy list')
                : listType === 'general'
                ? t('רשימת הזמנות ומקס-סטוק', 'AliExpress / Max Stock')
                : t('רשימת קניות כללית', 'General shopping')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('שם המוצר', 'Item Name')} *
            </label>
            <input
              type="text"
              required
              placeholder={
                listType === 'supermarket'
                  ? t('לדוגמה: עגבניות, חלב שיבולת שועל...', 'e.g. Tomatoes, Oat milk...')
                  : listType === 'pharmacy'
                  ? t('לדוגמה: ויטמין D, משחת שיניים, אקמול...', 'e.g. Vitamin D, Toothpaste...')
                  : t('לדוגמה: כבל טעינה USB, קופסאות אחסון...', 'e.g. USB cable, storage boxes...')
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
              autoFocus
            />
          </div>

          {/* Category (if supermarket) */}
          {listType === 'supermarket' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('מחלקה בסופר', 'Supermarket Department')}
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {t(c.name_he, c.name_en)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quantity & Unit Controls */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('כמות ויחידת מידה', 'Quantity & Unit')}
            </label>
            <div className="flex items-center gap-2">
              <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => adjustQty(-1)}
                  className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 shadow-xs transition-colors"
                >
                  <Minus size={15} />
                </button>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value === '' ? '' : e.target.value)}
                  className="w-14 text-center font-bold text-sm bg-transparent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => adjustQty(1)}
                  className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 shadow-xs transition-colors"
                >
                  <Plus size={15} />
                </button>
              </div>

              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as any)}
                className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="units">{t('יחידות (יח׳)', 'Units (pcs)')}</option>
                <option value="kg">{t('קילוגרם (ק״ג)', 'Kilograms (kg)')}</option>
                <option value="g">{t('גרם (ג׳)', 'Grams (g)')}</option>
                <option value="pack">{t('מארז / חבילה', 'Pack / Box')}</option>
                <option value="bottle">{t('בקבוק', 'Bottle')}</option>
                <option value="box">{t('קופסה', 'Box')}</option>
              </select>
            </div>
          </div>

          {/* General / Cheap store special fields: URL & Price */}
          {listType === 'general' && (
            <div className="space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <ExternalLink size={13} className="text-slate-400" />
                  <span>{t('קישור למוצר (AliExpress / אתר)', 'Product Link / URL')}</span>
                </label>
                <input
                  type="url"
                  placeholder="https://aliexpress.com/item/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Tag size={13} className="text-slate-400" />
                  <span>{t('מחיר משוער (₪)', 'Estimated Price (₪)')}</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="29"
                  value={estimatedPrice}
                  onChange={(e) => setEstimatedPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('הערות (מותג מועדף, דגשים, מיקום בסניף)', 'Notes / Preferences')}
            </label>
            <input
              type="text"
              placeholder={t('לדוגמה: ללא סוכר, רק עגבניות קשות, במבצע 1+1...', 'e.g. unsweetened, firm, on sale...')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
            />
          </div>

          {/* Mark as Favorite */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsFavorite(!isFavorite)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                isFavorite
                  ? 'border-amber-400 bg-amber-50 text-amber-800'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Star size={15} className={isFavorite ? 'fill-amber-400 text-amber-500' : 'text-slate-400'} />
              <span>{t('סמן כמוצר מועדף ⭐', 'Save as Favorite Staple ⭐')}</span>
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              {loading
                ? t('שומר...', 'Saving...')
                : initialItem
                ? t('עדכן מוצר', 'Update Item')
                : t('הוסף לרשימה', 'Add Item')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-sm transition-colors"
            >
              {t('ביטול', 'Cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
