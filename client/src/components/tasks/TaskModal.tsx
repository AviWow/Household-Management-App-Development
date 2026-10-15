import React, { useState, useEffect } from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import { Task, UrgencyLevel, TaskType, RecurrenceInterval } from '../../types';
import { X, Flame, Clock, Coffee, Calendar, User as UserIcon, RefreshCw } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Task>) => Promise<void>;
  initialTask?: Task | null;
}

export const TaskModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  initialTask,
}) => {
  const { users, currentUser, t } = useHousehold();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('one_time');
  const [recurrenceInterval, setRecurrenceInterval] = useState<RecurrenceInterval>('weekly');
  const [recurrenceDetails, setRecurrenceDetails] = useState('');
  const [urgency, setUrgency] = useState<UrgencyLevel>('leisure');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title || '');
      setDescription(initialTask.description || '');
      setTaskType(initialTask.task_type || 'one_time');
      setRecurrenceInterval(initialTask.recurrence_interval || 'weekly');
      setRecurrenceDetails(initialTask.recurrence_details || '');
      setUrgency(initialTask.urgency || 'leisure');
      setDueDate(initialTask.due_date ? initialTask.due_date.split('T')[0] : '');
      setAssignedTo(initialTask.assigned_to || '');
    } else {
      setTitle('');
      setDescription('');
      setTaskType('one_time');
      setRecurrenceInterval('weekly');
      setRecurrenceDetails('');
      setUrgency('leisure');
      setDueDate('');
      setAssignedTo(currentUser?.id || '');
    }
  }, [initialTask, isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setLoading(true);
      await onSave({
        title: title.trim(),
        description: description.trim(),
        task_type: taskType,
        recurrence_interval: taskType === 'recurring' ? recurrenceInterval : null,
        recurrence_details: taskType === 'recurring' ? recurrenceDetails.trim() : null,
        urgency,
        due_date: dueDate || null,
        assigned_to: assignedTo || null,
        created_by: initialTask ? initialTask.created_by : currentUser?.id,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              📝
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {initialTask ? t('עריכת מטלה', 'Edit Task') : t('מטלה חדשה לבית', 'New Task')}
              </h2>
              <p className="text-xs text-slate-500">
                {t('הגדר סוג מטלה, דחיפות ואחראי לביצוע', 'Define task details, urgency, and assignee')}
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('שם המטלה', 'Task Title')} *
            </label>
            <input
              type="text"
              required
              placeholder={t('לדוגמה: לנקות פילטר מזגן, להחליף מצעים...', 'e.g. Clean AC filter, water plants...')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
              autoFocus
            />
          </div>

          {/* Urgency Levels: 3 visual cards */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t('רמת דחיפות', 'Urgency Level')} *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Urgent */}
              <button
                type="button"
                onClick={() => setUrgency('urgent')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${
                  urgency === 'urgent'
                    ? 'border-red-500 bg-red-50/80 text-red-700 shadow-sm ring-1 ring-red-400 font-bold'
                    : 'border-slate-100 hover:border-slate-200 bg-slate-50/40 text-slate-600'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-1">
                  <Flame size={18} />
                </div>
                <span className="text-xs">{t('דחוף', 'Urgent')}</span>
                <span className="text-[10px] text-red-500 font-normal mt-0.5">{t('בהקדם האפשרי', 'ASAP')}</span>
              </button>

              {/* At leisure */}
              <button
                type="button"
                onClick={() => setUrgency('leisure')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${
                  urgency === 'leisure'
                    ? 'border-amber-500 bg-amber-50/80 text-amber-800 shadow-sm ring-1 ring-amber-400 font-bold'
                    : 'border-slate-100 hover:border-slate-200 bg-slate-50/40 text-slate-600'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-1">
                  <Coffee size={18} />
                </div>
                <span className="text-xs">{t('בזמנך הפנוי', 'At Leisure')}</span>
                <span className="text-[10px] text-amber-600 font-normal mt-0.5">{t('השבוע / כשמתאים', 'This week')}</span>
              </button>

              {/* Sometime */}
              <button
                type="button"
                onClick={() => setUrgency('sometime')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${
                  urgency === 'sometime'
                    ? 'border-indigo-500 bg-indigo-50/80 text-indigo-800 shadow-sm ring-1 ring-indigo-400 font-bold'
                    : 'border-slate-100 hover:border-slate-200 bg-slate-50/40 text-slate-600'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center mb-1">
                  <Clock size={18} />
                </div>
                <span className="text-xs">{t('מתישהו', 'Sometime')}</span>
                <span className="text-[10px] text-indigo-600 font-normal mt-0.5">{t('עדיפות נמוכה', 'Low priority')}</span>
              </button>
            </div>
          </div>

          {/* Task Type: One-time vs Recurring */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t('סוג מטלה', 'Task Type')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTaskType('one_time')}
                className={`py-2.5 px-3 rounded-xl border-2 text-xs font-bold transition-all ${
                  taskType === 'one_time'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t('⚡ חד-פעמית', '⚡ One-time')}
              </button>

              <button
                type="button"
                onClick={() => setTaskType('recurring')}
                className={`py-2.5 px-3 rounded-xl border-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  taskType === 'recurring'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <RefreshCw size={14} />
                <span>{t('מחזורית (קבועה)', 'Recurring')}</span>
              </button>
            </div>
          </div>

          {/* Recurrence Settings (if recurring) */}
          {taskType === 'recurring' && (
            <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('תדירות חזרה', 'Frequency')}
                </label>
                <select
                  value={recurrenceInterval}
                  onChange={(e) => setRecurrenceInterval(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="daily">{t('יומי (כל יום)', 'Daily')}</option>
                  <option value="weekly">{t('שבועי (פעם בשבוע)', 'Weekly')}</option>
                  <option value="biweekly">{t('דו-שבועי (כל שבועיים)', 'Bi-weekly')}</option>
                  <option value="monthly">{t('חודשי (פעם בחודש)', 'Monthly')}</option>
                  <option value="custom">{t('מותאם אישית', 'Custom')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('ימים או פרטים (אופציונלי)', 'Days / Schedule Details')}
                </label>
                <input
                  type="text"
                  placeholder={t('לדוגמה: ימי ראשון בערב, סוף שבוע...', 'e.g. Sundays, Weekend mornings...')}
                  value={recurrenceDetails}
                  onChange={(e) => setRecurrenceDetails(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Assignee & Due Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Assignee */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <UserIcon size={14} className="text-slate-400" />
                <span>{t('באחריות מי?', 'Assigned to')}</span>
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">{t('לכולם / ללא שיוך', 'Anyone / Unassigned')}</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.avatar} {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar size={14} className="text-slate-400" />
                <span>{t('יעד לביצוע', 'Due Date')}</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('תיאור / הערות נוספות', 'Description / Notes')}
            </label>
            <textarea
              rows={2}
              placeholder={t('פרטים נוספים שיעזרו לבצע את המטלה...', 'Additional tips or instructions...')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              {loading
                ? t('שומר...', 'Saving...')
                : initialTask
                ? t('עדכן מטלה', 'Update Task')
                : t('הוסף מטלה', 'Add Task')}
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
