import { User, Task, ShoppingItem, ShoppingCategory, FavoriteTemplate } from '../types';

const API_BASE = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${res.status}`);
  }

  return res.json();
}

// ----------------- Users API -----------------
export const apiUsers = {
  list: () => request<User[]>('/users'),
  create: (data: Partial<User>) =>
    request<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<User>) =>
    request<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ success: boolean; deletedId: string }>(`/users/${id}`, { method: 'DELETE' }),
};

// ----------------- Tasks API -----------------
export const apiTasks = {
  list: (params?: { status?: string; urgency?: string; task_type?: string; assigned_to?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.urgency) query.set('urgency', params.urgency);
    if (params?.task_type) query.set('task_type', params.task_type);
    if (params?.assigned_to) query.set('assigned_to', params.assigned_to);
    const qs = query.toString();
    return request<Task[]>(`/tasks${qs ? `?${qs}` : ''}`);
  },
  listTrash: () => request<Task[]>('/tasks/trash'),
  create: (data: Partial<Task>) =>
    request<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Task>) =>
    request<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggle: (id: string, user_id?: string) =>
    request<Task>(`/tasks/${id}/toggle`, { method: 'POST', body: JSON.stringify({ user_id }) }),
  delete: (id: string) =>
    request<{ success: boolean; message: string; id: string }>(`/tasks/${id}/delete`, { method: 'POST' }),
  restore: (id: string) =>
    request<Task>(`/tasks/${id}/restore`, { method: 'POST' }),
  permanentDelete: (id: string) =>
    request<{ success: boolean; message: string; id: string }>(`/tasks/${id}/permanent`, { method: 'DELETE' }),
  emptyTrash: () =>
    request<{ success: boolean; deletedCount: number }>('/tasks/trash/empty', { method: 'POST' }),
};

// ----------------- Shopping API -----------------
export const apiShopping = {
  getCategories: () => request<ShoppingCategory[]>('/shopping/categories'),
  reorderCategories: (orders: { id: string; display_order: number }[]) =>
    request<ShoppingCategory[]>('/shopping/categories/reorder', {
      method: 'PUT',
      body: JSON.stringify({ orders }),
    }),
  resetCategoriesOrder: () =>
    request<ShoppingCategory[]>('/shopping/categories/reset-order', { method: 'POST' }),
  createCategory: (data: Partial<ShoppingCategory>) =>
    request<ShoppingCategory>('/shopping/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getItems: (list_type: string) =>
    request<ShoppingItem[]>(`/shopping/items?list_type=${list_type}`),
  createItem: (data: Partial<ShoppingItem>) =>
    request<ShoppingItem>('/shopping/items', { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (id: string, data: Partial<ShoppingItem>) =>
    request<ShoppingItem>(`/shopping/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleItem: (id: string, user_id?: string) =>
    request<ShoppingItem>(`/shopping/items/${id}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ user_id }),
    }),
  toggleFavorite: (id: string) =>
    request<{ id: string; is_favorite: number }>(`/shopping/items/${id}/favorite`, { method: 'POST' }),
  deleteItem: (id: string) =>
    request<{ success: boolean; id: string }>(`/shopping/items/${id}`, { method: 'DELETE' }),
  clearChecked: (list_type?: string) =>
    request<{ success: boolean; removedCount: number }>('/shopping/clear-checked', {
      method: 'POST',
      body: JSON.stringify({ list_type }),
    }),
  uncheckAll: (list_type?: string) =>
    request<{ success: boolean; resetCount: number }>('/shopping/uncheck-all', {
      method: 'POST',
      body: JSON.stringify({ list_type }),
    }),

  // Favorites templates
  getFavorites: () => request<FavoriteTemplate[]>('/shopping/favorites'),
  createFavorite: (data: Partial<FavoriteTemplate>) =>
    request<FavoriteTemplate>('/shopping/favorites', { method: 'POST', body: JSON.stringify(data) }),
  deleteFavorite: (id: string) =>
    request<{ success: boolean; id: string }>(`/shopping/favorites/${id}`, { method: 'DELETE' }),
  addFavoriteToList: (id: string, user_id?: string, quantity?: number) =>
    request<ShoppingItem>(`/shopping/favorites/${id}/add-to-list`, {
      method: 'POST',
      body: JSON.stringify({ user_id, quantity }),
    }),
};
