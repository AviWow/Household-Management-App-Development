import React, { useState, useEffect } from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import { Task, UrgencyLevel, TaskType } from '../../types';
import { apiTasks } from '../../services/api';
import { TaskModal } from './TaskModal';
import { TrashView } from './TrashView';
import {
  Plus,
  Search,
  Flame,
  Coffee,
  Clock,
  RefreshCw,
  CheckCircle2,
  Circle,
  Trash2,
  Edit2,
  Calendar,
  AlertCircle,
  Filter,
  Layers,
} from 'lucide-react';

interface Props {
  isTrashOpenInitially?: boolean;
}

export const TasksView: React.FC<Props> = ({ isTrashOpenInitially = false }) => {
  const { currentUser, t, showToast, triggerCelebration } = useHousehold();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [trashCount, setTrashCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyLevel | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<TaskType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'completed' | 'all'>('pending');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');

  // Modals & Views
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showTrash, setShowTrash] = useState(isTrashOpenInitially);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const [activeList, trashList] = await Promise.all([
        apiTasks.list(),
        apiTasks.listTrash(),
      ]);
      setTasks(activeList);
      setTrashCount(trashList.length);
    } catch (err: any) {
      showToast(err.message || 'Error loading tasks', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleToggleTask = async (task: Task) => {
    try {
      const updated = await apiTasks.toggle(task.id, currentUser?.id);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));

      if (updated.status === 'completed') {
        triggerCelebration();
        showToast(t(`כל הכבוד! סיימת: "${task.title}"`, `Great job! Completed: "${task.title}"`), 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating task', 'error');
    }
  };

  const handleDeleteTask = async (task: Task) => {
    try {
      await apiTasks.delete(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      setTrashCount((prev) => prev + 1);
      showToast(t(`המטלה "${task.title}" הועברה לסל המחזור`, `Moved to Recycle Bin: "${task.title}"`), 'info');
    } catch (err: any) {
      showToast(err.message || 'Error deleting task', 'error');
    }
  };

  const handleSaveTask = async (data: Partial<Task>) => {
    try {
      if (editingTask) {
        const updated = await apiTasks.update(editingTask.id, data);
        setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? { ...t, ...updated } : t)));
        showToast(t('המטלה עודכנה בהצלחה', 'Task updated'), 'success');
      } else {
        const created = await apiTasks.create(data);
        setTasks((prev) => [created, ...prev]);
        showToast(t('המטלה נוספה בהצלחה', 'Task added'), 'success');
      }
      setEditingTask(null);
    } catch (err: any) {
      showToast(err.message || 'Error saving task', 'error');
    }
  };

  // Filtered tasks calculation
  const filteredTasks = tasks.filter((task) => {
    // Search
    if (search.trim()) {
      const query = search.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(query);
      const matchDesc = task.description?.toLowerCase().includes(query);
      if (!matchTitle && !matchDesc) return false;
    }
    // Urgency
    if (urgencyFilter !== 'all' && task.urgency !== urgencyFilter) return false;
    // Type
    if (typeFilter !== 'all' && task.task_type !== typeFilter) return false;
    // Status
    if (statusFilter !== 'all' && task.status !== statusFilter) return false;
    // Assignee
    if (assigneeFilter === 'me') {
      if (task.assigned_to !== currentUser?.id) return false;
    } else if (assigneeFilter !== 'all') {
      if (task.assigned_to !== assigneeFilter) return false;
    }
    return true;
  });

  const urgentCount = tasks.filter((t) => t.urgency === 'urgent' && t.status === 'pending').length;
  const pendingCount = tasks.filter((t) => t.status === 'pending').length;

  if (showTrash) {
    return (
      <TrashView
        onClose={() => setShowTrash(false)}
        onRestored={fetchTasks}
      />
    );
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Top Action Bar & Stat Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            {t('מטלות הבית', 'Household Tasks')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {t(
              `ישנן ${pendingCount} מטלות פתוחות (${urgentCount} דחופות)`,
              `${pendingCount} pending tasks (${urgentCount} urgent)`
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Recycle Bin Button */}
          <button
            onClick={() => setShowTrash(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all shadow-xs"
            title={t('צפה בסל המחזור', 'View Recycle Bin')}
          >
            <Trash2 size={16} className={trashCount > 0 ? 'text-rose-500' : 'text-slate-400'} />
            <span className="hidden sm:inline">{t('סל מחזור', 'Recycle Bin')}</span>
            {trashCount > 0 && (
              <span className="bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded-full text-[11px] font-bold">
                {trashCount}
              </span>
            )}
          </button>

          {/* New Task Button */}
          <button
            onClick={() => {
              setEditingTask(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/25 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>{t('מטלה חדשה', 'New Task')}</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/70 shadow-xs space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search size={18} className="absolute top-1/2 -translate-y-1/2 start-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('חיפוש מטלה לפי שם או תיאור...', 'Search tasks by title or details...')}
            className="w-full ps-10 pe-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>

        {/* Filter Chips: Urgency */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 touch-scroll scrollbar-none text-xs">
          <span className="text-[11px] font-bold text-slate-400 ms-1 flex items-center gap-1">
            <Filter size={12} />
            {t('דחיפות:', 'Urgency:')}
          </span>
          <button
            onClick={() => setUrgencyFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              urgencyFilter === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t('הכל', 'All')}
          </button>
          <button
            onClick={() => setUrgencyFilter('urgent')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              urgencyFilter === 'urgent'
                ? 'bg-red-500 text-white shadow-sm ring-2 ring-red-300'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            <Flame size={13} />
            <span>{t('דחוף', 'Urgent')}</span>
          </button>
          <button
            onClick={() => setUrgencyFilter('leisure')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              urgencyFilter === 'leisure'
                ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-300'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <Coffee size={13} />
            <span>{t('בזמנך הפנוי', 'At leisure')}</span>
          </button>
          <button
            onClick={() => setUrgencyFilter('sometime')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              urgencyFilter === 'sometime'
                ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            <Clock size={13} />
            <span>{t('מתישהו', 'Sometime')}</span>
          </button>
        </div>

        {/* Filter Chips: Type & Status */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-100">
          {/* Type filters */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[11px] font-bold text-slate-400 ms-1 flex items-center gap-1">
              <Layers size={12} />
              {t('סוג:', 'Type:')}
            </span>
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                typeFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t('הכל', 'All')}
            </button>
            <button
              onClick={() => setTypeFilter('one_time')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                typeFilter === 'one_time' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t('⚡ חד-פעמי', '⚡ One-time')}
            </button>
            <button
              onClick={() => setTypeFilter('recurring')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                typeFilter === 'recurring' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t('🔁 מחזורי', '🔁 Recurring')}
            </button>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                statusFilter === 'pending'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t('לביצוע', 'Pending')}
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                statusFilter === 'completed'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t('הושלמו', 'Completed')}
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                statusFilter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t('הכל', 'All')}
            </button>
          </div>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          {t('טוען מטלות...', 'Loading tasks...')}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-500 mx-auto flex items-center justify-center text-3xl mb-3 shadow-inner">
            ✨
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {t('אין מטלות מתאימות', 'No matching tasks')}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            {t(
              'נסה לשנות את הסינון או הוסף מטלה חדשה למשק הבית!',
              'Try adjusting your filters or create a new household task!'
            )}
          </p>
          <button
            onClick={() => {
              setUrgencyFilter('all');
              setTypeFilter('all');
              setStatusFilter('all');
              setSearch('');
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
          >
            {t('אפס סינונים', 'Reset filters')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const isCompleted = task.status === 'completed';

            return (
              <div
                key={task.id}
                className={`group relative p-4 sm:p-5 rounded-3xl border transition-all duration-200 ${
                  isCompleted
                    ? 'bg-slate-50/70 border-slate-200/60 opacity-80'
                    : task.urgency === 'urgent'
                    ? 'bg-white border-red-200/80 hover:border-red-300 shadow-xs'
                    : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Completion Checkbox */}
                  <button
                    onClick={() => handleToggleTask(task)}
                    className="mt-0.5 text-slate-300 hover:text-indigo-600 transition-colors focus:outline-none cursor-pointer"
                    title={isCompleted ? t('סמן כלא הושלם', 'Mark as incomplete') : t('סמן כהושלם', 'Mark as complete')}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={24} className="text-emerald-500 fill-emerald-100" />
                    ) : (
                      <Circle size={24} className="hover:text-indigo-500" />
                    )}
                  </button>

                  {/* Task Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {/* Urgency Badge */}
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          task.urgency === 'urgent'
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : task.urgency === 'leisure'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {task.urgency === 'urgent' && <Flame size={12} className="text-red-500" />}
                        {task.urgency === 'leisure' && <Coffee size={12} className="text-amber-600" />}
                        {task.urgency === 'sometime' && <Clock size={12} className="text-indigo-500" />}
                        <span>
                          {task.urgency === 'urgent'
                            ? t('דחוף', 'Urgent')
                            : task.urgency === 'leisure'
                            ? t('בזמנך הפנוי', 'At leisure')
                            : t('מתישהו', 'Sometime')}
                        </span>
                      </span>

                      {/* Recurrence Badge */}
                      {task.task_type === 'recurring' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                          <RefreshCw size={11} />
                          <span>
                            {task.recurrence_interval === 'daily'
                              ? t('מחזורי (יומי)', 'Daily')
                              : task.recurrence_interval === 'weekly'
                              ? t('מחזורי (שבועי)', 'Weekly')
                              : task.recurrence_interval === 'biweekly'
                              ? t('מחזורי (דו-שבועי)', 'Bi-weekly')
                              : task.recurrence_interval === 'monthly'
                              ? t('מחזורי (חודשי)', 'Monthly')
                              : t('מחזורי', 'Recurring')}
                          </span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400 px-1.5 py-0.5">
                          {t('חד-פעמית', 'One-time')}
                        </span>
                      )}

                      {/* Assignee Badge */}
                      {task.assignee_name && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          <span>{task.assignee_avatar || '👤'}</span>
                          <span>{task.assignee_name}</span>
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h4
                      className={`text-sm sm:text-base font-bold ${
                        isCompleted ? 'line-through text-slate-400' : 'text-slate-800'
                      }`}
                    >
                      {task.title}
                    </h4>

                    {/* Description */}
                    {task.description && (
                      <p
                        className={`text-xs mt-1 leading-relaxed ${
                          isCompleted ? 'text-slate-400 line-through' : 'text-slate-600'
                        }`}
                      >
                        {task.description}
                      </p>
                    )}

                    {/* Recurrence Details or Schedule */}
                    {task.recurrence_details && (
                      <p className="text-[11px] font-medium text-purple-600 mt-1 flex items-center gap-1">
                        <span>🗓️</span>
                        <span>{task.recurrence_details}</span>
                      </p>
                    )}

                    {/* Footer Details: Due Date & Completion attribution */}
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 flex-wrap">
                      {task.due_date && (
                        <span className="flex items-center gap-1 text-slate-500 font-medium">
                          <Calendar size={12} />
                          <span>{t('יעד:', 'Due:')} {task.due_date}</span>
                        </span>
                      )}

                      {isCompleted && task.completer_name && (
                        <span className="text-emerald-600 font-medium">
                          ✓ {t('הושלם ע״י', 'Done by')} {task.completer_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Actions: Edit & Soft-Delete */}
                  <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingTask(task);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title={t('ערוך מטלה', 'Edit task')}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title={t('העבר לסל מחזור', 'Move to Recycle Bin')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Modal (Create / Edit) */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        initialTask={editingTask}
      />
    </div>
  );
};
