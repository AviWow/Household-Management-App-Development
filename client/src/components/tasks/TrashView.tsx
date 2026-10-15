import React, { useState, useEffect } from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import { Task } from '../../types';
import { apiTasks } from '../../services/api';
import { Trash2, RotateCcw, AlertTriangle, ArrowLeft, ArrowRight, ShieldAlert } from 'lucide-react';

interface Props {
  onClose: () => void;
  onRestored: () => void;
}

export const TrashView: React.FC<Props> = ({ onClose, onRestored }) => {
  const { t, showToast, lang } = useHousehold();
  const [deletedTasks, setDeletedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const fetchTrash = async () => {
    try {
      setLoading(true);
      const list = await apiTasks.listTrash();
      setDeletedTasks(list);
    } catch (err: any) {
      showToast(err.message || 'Error fetching trash', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const handleRestore = async (task: Task) => {
    try {
      await apiTasks.restore(task.id);
      showToast(t(`המטלה "${task.title}" שוחזרה בהצלחה!`, `Task "${task.title}" restored!`), 'success');
      setDeletedTasks((prev) => prev.filter((item) => item.id !== task.id));
      onRestored();
    } catch (err: any) {
      showToast(err.message || 'Error restoring task', 'error');
    }
  };

  const handlePermanentDelete = async (task: Task) => {
    if (!confirm(t(`למחוק לצמיתות את "${task.title}"? לא ניתן לשחזר פעולה זו.`, `Permanently delete "${task.title}"? This cannot be undone.`))) {
      return;
    }
    try {
      await apiTasks.permanentDelete(task.id);
      setDeletedTasks((prev) => prev.filter((item) => item.id !== task.id));
      showToast(t('המטלה נמחקה לצמיתות', 'Task permanently deleted'), 'info');
      onRestored();
    } catch (err: any) {
      showToast(err.message || 'Error deleting task', 'error');
    }
  };

  const handleEmptyTrash = async () => {
    if (deletedTasks.length === 0) return;
    if (!confirm(t('האם אתה בטוח שברצונך לרוקן את כל סל המחזור? כל המטלות יימחקו לצמיתות.', 'Empty entire recycle bin? All tasks will be permanently removed.'))) {
      return;
    }
    try {
      setClearing(true);
      await apiTasks.emptyTrash();
      setDeletedTasks([]);
      showToast(t('סל המחזור רוקן לחלוטין', 'Recycle bin emptied'), 'info');
      onRestored();
    } catch (err: any) {
      showToast(err.message || 'Error emptying trash', 'error');
    } finally {
      setClearing(false);
    }
  };

  const formatDeletedDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Top Banner */}
      <div className="p-5 bg-gradient-to-r from-rose-50 to-orange-50 border-b border-rose-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white text-slate-600 hover:text-slate-900 shadow-xs border border-slate-200/80 hover:bg-slate-50 transition-colors"
            title={t('חזרה למטלות', 'Back to tasks')}
          >
            {lang === 'he' ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
          </button>
          <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center text-xl shadow-md shadow-rose-500/20">
            <Trash2 size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>{t('סל מחזור (מטלות שנמחקו)', 'Recycle Bin / Recently Deleted')}</span>
              <span className="text-xs bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full font-bold">
                {deletedTasks.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              {t(
                'מטלות שנמחקו נשמרות כאן. באפשרותך לשחזר אותן לרשימה הפעילה בכל עת.',
                'Deleted tasks are kept here. You can restore them back to the active list anytime.'
              )}
            </p>
          </div>
        </div>

        {deletedTasks.length > 0 && (
          <button
            onClick={handleEmptyTrash}
            disabled={clearing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm shadow-rose-600/20 disabled:opacity-50"
          >
            <ShieldAlert size={15} />
            <span>{t('רוקן סל מחזור', 'Empty Recycle Bin')}</span>
          </button>
        )}
      </div>

      {/* Deleted Task List */}
      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            {t('טוען סל מחזור...', 'Loading trash...')}
          </div>
        ) : deletedTasks.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center text-2xl mb-3">
              🗑️
            </div>
            <h3 className="text-base font-bold text-slate-700">
              {t('סל המחזור ריק!', 'Recycle Bin is empty!')}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {t(
                'כאשר תמחק מטלות מהרשימה הפעילה, הן יופיעו כאן וניתן יהיה לשחזר אותן.',
                'When tasks are removed from the active list, they will appear here and can be restored.'
              )}
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            >
              {t('חזור למטלות הפעילות', 'Return to Active Tasks')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {deletedTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800 text-sm">{task.title}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        task.urgency === 'urgent'
                          ? 'bg-red-100 text-red-700'
                          : task.urgency === 'leisure'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      {task.urgency === 'urgent'
                        ? t('דחוף', 'Urgent')
                        : task.urgency === 'leisure'
                        ? t('בזמנך הפנוי', 'At leisure')
                        : t('מתישהו', 'Sometime')}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">
                      {task.task_type === 'recurring' ? t('מחזורית', 'Recurring') : t('חד-פעמית', 'One-time')}
                    </span>
                  </div>

                  {task.description && (
                    <p className="text-xs text-slate-500 line-clamp-1">{task.description}</p>
                  )}

                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    <span>
                      {t('נמחקה בתאריך:', 'Deleted on:')} {formatDeletedDate(task.deleted_at)}
                    </span>
                    {task.assignee_name && (
                      <span>• {t('הייתה משויכת ל:', 'Assigned to:')} {task.assignee_name}</span>
                    )}
                  </div>
                </div>

                {/* Actions: Restore & Permanent Delete */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleRestore(task)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold transition-colors"
                    title={t('שחזר מטלה לרשימה הפעילה', 'Restore task to active list')}
                  >
                    <RotateCcw size={14} />
                    <span>{t('שחזר מטלה', 'Restore')}</span>
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(task)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors"
                    title={t('מחק לצמיתות', 'Delete permanently')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
