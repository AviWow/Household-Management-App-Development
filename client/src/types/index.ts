export type UrgencyLevel = 'urgent' | 'leisure' | 'sometime';
export type TaskType = 'one_time' | 'recurring';
export type RecurrenceInterval = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
export type ShoppingListType = 'supermarket' | 'pharmacy' | 'general' | 'other';
export type UnitType = 'units' | 'kg' | 'g' | 'pack' | 'bottle' | 'box';

export interface User {
  id: string;
  name: string;
  avatar: string;
  color: string;
  role: 'admin' | 'member' | 'child';
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  task_type: TaskType;
  recurrence_interval?: RecurrenceInterval | null;
  recurrence_details?: string | null;
  urgency: UrgencyLevel;
  status: 'pending' | 'completed';
  due_date?: string | null;
  created_by?: string | null;
  assigned_to?: string | null;
  completed_by?: string | null;
  completed_at?: string | null;
  is_deleted: number;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;

  // Joined fields
  creator_name?: string;
  creator_avatar?: string;
  assignee_name?: string;
  assignee_avatar?: string;
  assignee_color?: string;
  completer_name?: string;
}

export interface ShoppingCategory {
  id: string;
  name_he: string;
  name_en: string;
  icon: string;
  display_order: number;
  color?: string;
}

export interface ShoppingItem {
  id: string;
  list_type: ShoppingListType;
  category_id?: string | null;
  name: string;
  quantity: number;
  unit: UnitType;
  is_checked: number;
  checked_by?: string | null;
  checked_at?: string | null;
  notes?: string;
  url?: string;
  estimated_price?: number | null;
  is_favorite: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;

  // Joined category fields
  category_name_he?: string;
  category_name_en?: string;
  category_icon?: string;
  category_order?: number;
  category_color?: string;
  creator_name?: string;
  checker_name?: string;
}

export interface FavoriteTemplate {
  id: string;
  name: string;
  category_id?: string | null;
  default_quantity: number;
  unit: UnitType;
  icon?: string;
  created_at: string;
  category_name_he?: string;
  category_name_en?: string;
  category_icon?: string;
  category_color?: string;
}
