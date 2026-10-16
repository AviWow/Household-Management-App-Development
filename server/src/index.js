import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db, { initDb } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

initDb();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Request logger for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// ----------------------------------------------------
// USERS ROUTES
// ----------------------------------------------------
app.get('/api/users', (req, res) => {
  try {
    const users = db.prepare('SELECT * FROM users ORDER BY created_at ASC').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', (req, res) => {
  try {
    const { name, avatar, color, role } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const id = `user-${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, name, avatar, color, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, avatar || '👤', color || '#3B82F6', role || 'member', now);

    const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, avatar, color, role } = req.body;
    db.prepare(`
      UPDATE users
      SET name = COALESCE(?, name),
          avatar = COALESCE(?, avatar),
          color = COALESCE(?, color),
          role = COALESCE(?, role)
      WHERE id = ?
    `).run(name, avatar, color, role, id);

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    if (totalUsers <= 1) {
      return res.status(400).json({ error: 'Cannot delete the only household member' });
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ success: true, deletedId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// TASKS ROUTES
// ----------------------------------------------------
// Get active tasks (not deleted)
app.get('/api/tasks', (req, res) => {
  try {
    const { status, urgency, task_type, assigned_to } = req.query;

    let query = `
      SELECT t.*, 
             u_creator.name as creator_name, u_creator.avatar as creator_avatar,
             u_assignee.name as assignee_name, u_assignee.avatar as assignee_avatar, u_assignee.color as assignee_color,
             u_completer.name as completer_name
      FROM tasks t
      LEFT JOIN users u_creator ON t.created_by = u_creator.id
      LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
      LEFT JOIN users u_completer ON t.completed_by = u_completer.id
      WHERE t.is_deleted = 0
    `;
    const params = [];

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }
    if (urgency) {
      query += ' AND t.urgency = ?';
      params.push(urgency);
    }
    if (task_type) {
      query += ' AND t.task_type = ?';
      params.push(task_type);
    }
    if (assigned_to) {
      query += ' AND t.assigned_to = ?';
      params.push(assigned_to);
    }

    // Sort order: urgent first, then pending before completed, then due date
    query += `
      ORDER BY 
        CASE t.status WHEN 'pending' THEN 0 ELSE 1 END ASC,
        CASE t.urgency 
          WHEN 'urgent' THEN 1 
          WHEN 'leisure' THEN 2 
          WHEN 'sometime' THEN 3 
          ELSE 4 
        END ASC,
        t.due_date IS NULL ASC,
        t.due_date ASC,
        t.created_at DESC
    `;

    const tasks = db.prepare(query).all(...params);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Trash / Recently Deleted tasks
app.get('/api/tasks/trash', (req, res) => {
  try {
    const query = `
      SELECT t.*, 
             u_creator.name as creator_name,
             u_assignee.name as assignee_name
      FROM tasks t
      LEFT JOIN users u_creator ON t.created_by = u_creator.id
      LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
      WHERE t.is_deleted = 1
      ORDER BY t.deleted_at DESC
    `;
    const deletedTasks = db.prepare(query).all();
    res.json(deletedTasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create task
app.post('/api/tasks', (req, res) => {
  try {
    const {
      title,
      description,
      task_type,
      recurrence_interval,
      recurrence_details,
      urgency,
      due_date,
      created_by,
      assigned_to
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const id = `task-${randomUUID()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO tasks (
        id, title, description, task_type, recurrence_interval, recurrence_details,
        urgency, status, due_date, created_by, assigned_to, is_deleted, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, 0, ?, ?)
    `).run(
      id,
      title.trim(),
      description || '',
      task_type || 'one_time',
      task_type === 'recurring' ? (recurrence_interval || 'weekly') : null,
      task_type === 'recurring' ? (recurrence_details || '') : null,
      urgency || 'leisure',
      due_date || null,
      created_by || null,
      assigned_to || null,
      now,
      now
    );

    const task = db.prepare(`
      SELECT t.*, 
             u_creator.name as creator_name, u_creator.avatar as creator_avatar,
             u_assignee.name as assignee_name, u_assignee.avatar as assignee_avatar, u_assignee.color as assignee_color
      FROM tasks t
      LEFT JOIN users u_creator ON t.created_by = u_creator.id
      LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
      WHERE t.id = ?
    `).get(id);

    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update task
app.put('/api/tasks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      task_type,
      recurrence_interval,
      recurrence_details,
      urgency,
      status,
      due_date,
      assigned_to
    } = req.body;

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE tasks
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          task_type = COALESCE(?, task_type),
          recurrence_interval = ?,
          recurrence_details = ?,
          urgency = COALESCE(?, urgency),
          status = COALESCE(?, status),
          due_date = ?,
          assigned_to = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      title,
      description,
      task_type,
      task_type === 'recurring' ? recurrence_interval : null,
      task_type === 'recurring' ? recurrence_details : null,
      urgency,
      status,
      due_date !== undefined ? due_date : null,
      assigned_to !== undefined ? assigned_to : null,
      now,
      id
    );

    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle task completion
app.post('/api/tasks/:id/toggle', (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body; // user who toggled it

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const now = new Date().toISOString();
    const completedBy = newStatus === 'completed' ? (user_id || task.assigned_to) : null;
    const completedAt = newStatus === 'completed' ? now : null;

    db.prepare(`
      UPDATE tasks
      SET status = ?, completed_by = ?, completed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(newStatus, completedBy, completedAt, now, id);

    const updated = db.prepare(`
      SELECT t.*, 
             u_creator.name as creator_name, u_creator.avatar as creator_avatar,
             u_assignee.name as assignee_name, u_assignee.avatar as assignee_avatar, u_assignee.color as assignee_color,
             u_completer.name as completer_name
      FROM tasks t
      LEFT JOIN users u_creator ON t.created_by = u_creator.id
      LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
      LEFT JOIN users u_completer ON t.completed_by = u_completer.id
      WHERE t.id = ?
    `).get(id);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Soft-delete task (move to Recycle Bin)
app.post('/api/tasks/:id/delete', (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE tasks
      SET is_deleted = 1, deleted_at = ?, updated_at = ?
      WHERE id = ?
    `).run(now, now, id);

    res.json({ success: true, message: 'Task moved to trash', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Restore task from Recycle Bin
app.post('/api/tasks/:id/restore', (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE tasks
      SET is_deleted = 0, deleted_at = NULL, updated_at = ?
      WHERE id = ?
    `).run(now, id);

    const restored = db.prepare(`
      SELECT t.*, 
             u_creator.name as creator_name, u_creator.avatar as creator_avatar,
             u_assignee.name as assignee_name, u_assignee.avatar as assignee_avatar, u_assignee.color as assignee_color
      FROM tasks t
      LEFT JOIN users u_creator ON t.created_by = u_creator.id
      LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
      WHERE t.id = ?
    `).get(id);

    res.json(restored);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Permanently delete single task from trash
app.delete('/api/tasks/:id/permanent', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    res.json({ success: true, message: 'Task permanently deleted', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Empty entire trash bin
app.post('/api/tasks/trash/empty', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM tasks WHERE is_deleted = 1').run();
    res.json({ success: true, deletedCount: info.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// SHOPPING LISTS ROUTES
// ----------------------------------------------------
// Get categories with custom order
app.get('/api/shopping/categories', (req, res) => {
  try {
    let categories = db.prepare('SELECT * FROM shopping_categories ORDER BY display_order ASC').all();
    if (!categories || categories.length === 0) {
      initDb();
      categories = db.prepare('SELECT * FROM shopping_categories ORDER BY display_order ASC').all();
    }
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update category ordering (drag & drop / custom priority)
app.put('/api/shopping/categories/reorder', (req, res) => {
  try {
    const { orders } = req.body; // Array of { id, display_order }
    if (!Array.isArray(orders)) {
      return res.status(400).json({ error: 'orders array is required' });
    }

    const updateStmt = db.prepare('UPDATE shopping_categories SET display_order = ? WHERE id = ?');
    const updateAll = db.transaction((list) => {
      for (const item of list) {
        updateStmt.run(item.display_order, item.id);
      }
    });

    updateAll(orders);
    const updated = db.prepare('SELECT * FROM shopping_categories ORDER BY display_order ASC').all();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new custom category
app.post('/api/shopping/categories', (req, res) => {
  try {
    const { name_he, name_en, icon, color } = req.body;
    if (!name_he) return res.status(400).json({ error: 'Hebrew name is required' });

    const maxOrder = db.prepare('SELECT COALESCE(MAX(display_order), 0) as max FROM shopping_categories').get().max;
    const id = `cat-${randomUUID().slice(0, 8)}`;

    db.prepare(`
      INSERT INTO shopping_categories (id, name_he, name_en, icon, display_order, color)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name_he, name_en || name_he, icon || '🛍️', maxOrder + 1, color || '#6B7280');

    const created = db.prepare('SELECT * FROM shopping_categories WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset category ordering to defaults
app.post('/api/shopping/categories/reset-order', (req, res) => {
  try {
    const defaultOrder = [
      'produce', 'bakery', 'dairy', 'meat', 'frozen', 'pantry', 'drinks', 'snacks', 'cleaning', 'general'
    ];
    const updateStmt = db.prepare('UPDATE shopping_categories SET display_order = ? WHERE id = ?');
    const tx = db.transaction(() => {
      defaultOrder.forEach((id, index) => {
        updateStmt.run(index + 1, id);
      });
    });
    tx();
    const categories = db.prepare('SELECT * FROM shopping_categories ORDER BY display_order ASC').all();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get shopping items
app.get('/api/shopping/items', (req, res) => {
  try {
    const { list_type } = req.query; // 'supermarket' | 'pharmacy' | 'general' | 'other'

    let query = `
      SELECT i.*, 
             c.name_he as category_name_he, c.name_en as category_name_en, c.icon as category_icon, c.display_order as category_order, c.color as category_color,
             u_creator.name as creator_name,
             u_checker.name as checker_name
      FROM shopping_items i
      LEFT JOIN shopping_categories c ON i.category_id = c.id
      LEFT JOIN users u_creator ON i.created_by = u_creator.id
      LEFT JOIN users u_checker ON i.checked_by = u_checker.id
    `;
    const params = [];

    if (list_type) {
      query += ' WHERE i.list_type = ?';
      params.push(list_type);
    }

    query += `
      ORDER BY 
        i.is_checked ASC,
        COALESCE(c.display_order, 999) ASC,
        i.created_at DESC
    `;

    const items = db.prepare(query).all(...params);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add shopping item
app.post('/api/shopping/items', (req, res) => {
  try {
    const {
      list_type,
      category_id,
      name,
      quantity,
      unit,
      notes,
      url,
      estimated_price,
      is_favorite,
      created_by
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Item name is required' });
    }
    if (!list_type) {
      return res.status(400).json({ error: 'list_type is required' });
    }

    const id = `item-${randomUUID()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO shopping_items (
        id, list_type, category_id, name, quantity, unit, is_checked,
        notes, url, estimated_price, is_favorite, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      list_type,
      category_id || null,
      name.trim(),
      quantity !== undefined ? Number(quantity) : 1,
      unit || 'units',
      notes || '',
      url || '',
      estimated_price ? Number(estimated_price) : null,
      is_favorite ? 1 : 0,
      created_by || null,
      now,
      now
    );

    const created = db.prepare(`
      SELECT i.*, 
             c.name_he as category_name_he, c.name_en as category_name_en, c.icon as category_icon, c.display_order as category_order, c.color as category_color,
             u_creator.name as creator_name
      FROM shopping_items i
      LEFT JOIN shopping_categories c ON i.category_id = c.id
      LEFT JOIN users u_creator ON i.created_by = u_creator.id
      WHERE i.id = ?
    `).get(id);

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update shopping item
app.put('/api/shopping/items/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      quantity,
      unit,
      category_id,
      notes,
      url,
      estimated_price,
      is_favorite
    } = req.body;

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE shopping_items
      SET name = COALESCE(?, name),
          quantity = COALESCE(?, quantity),
          unit = COALESCE(?, unit),
          category_id = ?,
          notes = COALESCE(?, notes),
          url = COALESCE(?, url),
          estimated_price = ?,
          is_favorite = COALESCE(?, is_favorite),
          updated_at = ?
      WHERE id = ?
    `).run(
      name,
      quantity !== undefined ? Number(quantity) : null,
      unit,
      category_id !== undefined ? category_id : null,
      notes,
      url,
      estimated_price !== undefined ? Number(estimated_price) : null,
      is_favorite !== undefined ? (is_favorite ? 1 : 0) : null,
      now,
      id
    );

    const updated = db.prepare(`
      SELECT i.*, 
             c.name_he as category_name_he, c.name_en as category_name_en, c.icon as category_icon, c.display_order as category_order, c.color as category_color
      FROM shopping_items i
      LEFT JOIN shopping_categories c ON i.category_id = c.id
      WHERE i.id = ?
    `).get(id);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle checked status (in cart)
app.post('/api/shopping/items/:id/toggle', (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    const item = db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const newChecked = item.is_checked ? 0 : 1;
    const now = new Date().toISOString();
    const checkedBy = newChecked ? (user_id || null) : null;
    const checkedAt = newChecked ? now : null;

    db.prepare(`
      UPDATE shopping_items
      SET is_checked = ?, checked_by = ?, checked_at = ?, updated_at = ?
      WHERE id = ?
    `).run(newChecked, checkedBy, checkedAt, now, id);

    const updated = db.prepare(`
      SELECT i.*, 
             c.name_he as category_name_he, c.name_en as category_name_en, c.icon as category_icon, c.display_order as category_order, c.color as category_color,
             u_checker.name as checker_name
      FROM shopping_items i
      LEFT JOIN shopping_categories c ON i.category_id = c.id
      LEFT JOIN users u_checker ON i.checked_by = u_checker.id
      WHERE i.id = ?
    `).get(id);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle item favorite
app.post('/api/shopping/items/:id/favorite', (req, res) => {
  try {
    const { id } = req.params;
    const item = db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const newFav = item.is_favorite ? 0 : 1;
    db.prepare('UPDATE shopping_items SET is_favorite = ? WHERE id = ?').run(newFav, id);

    // If marked as favorite and not already in favorite_templates, optionally add to template
    if (newFav && item.list_type === 'supermarket') {
      const existing = db.prepare('SELECT id FROM favorite_templates WHERE name = ?').get(item.name);
      if (!existing) {
        db.prepare(`
          INSERT INTO favorite_templates (id, name, category_id, default_quantity, unit, icon, created_at)
          VALUES (?, ?, ?, ?, ?, '⭐', ?)
        `).run(`fav-${randomUUID().slice(0, 8)}`, item.name, item.category_id, item.quantity, item.unit, new Date().toISOString());
      }
    }

    res.json({ id, is_favorite: newFav });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete shopping item
app.delete('/api/shopping/items/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM shopping_items WHERE id = ?').run(id);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear all checked items for a list
app.post('/api/shopping/clear-checked', (req, res) => {
  try {
    const { list_type } = req.body;
    let query = 'DELETE FROM shopping_items WHERE is_checked = 1';
    const params = [];
    if (list_type) {
      query += ' AND list_type = ?';
      params.push(list_type);
    }
    const result = db.prepare(query).run(...params);
    res.json({ success: true, removedCount: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Uncheck all items for a list (e.g. repeat regular shopping trip!)
app.post('/api/shopping/uncheck-all', (req, res) => {
  try {
    const { list_type } = req.body;
    let query = 'UPDATE shopping_items SET is_checked = 0, checked_by = NULL, checked_at = NULL';
    const params = [];
    if (list_type) {
      query += ' WHERE list_type = ?';
      params.push(list_type);
    }
    const result = db.prepare(query).run(...params);
    res.json({ success: true, resetCount: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// FAVORITES ROUTES
// ----------------------------------------------------
app.get('/api/shopping/favorites', (req, res) => {
  try {
    const favorites = db.prepare(`
      SELECT f.*, c.name_he as category_name_he, c.name_en as category_name_en, c.icon as category_icon, c.color as category_color
      FROM favorite_templates f
      LEFT JOIN shopping_categories c ON f.category_id = c.id
      ORDER BY f.name ASC
    `).all();
    res.json(favorites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/shopping/favorites', (req, res) => {
  try {
    const { name, category_id, default_quantity, unit, icon } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const id = `fav-${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO favorite_templates (id, name, category_id, default_quantity, unit, icon, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name.trim(), category_id || null, default_quantity || 1, unit || 'units', icon || '⭐', now);

    const created = db.prepare('SELECT * FROM favorite_templates WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/shopping/favorites/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM favorite_templates WHERE id = ?').run(id);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1-Click: Add favorite item to active supermarket shopping list
app.post('/api/shopping/favorites/:id/add-to-list', (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, quantity } = req.body;

    const fav = db.prepare('SELECT * FROM favorite_templates WHERE id = ?').get(id);
    if (!fav) return res.status(404).json({ error: 'Favorite template not found' });

    // Check if an item with the same name already exists in active supermarket list
    const existing = db.prepare(
      "SELECT * FROM shopping_items WHERE list_type = 'supermarket' AND name = ? AND is_checked = 0"
    ).get(fav.name);

    let resultItem;
    const now = new Date().toISOString();

    if (existing) {
      // Increment quantity
      const addQty = quantity || fav.default_quantity || 1;
      db.prepare('UPDATE shopping_items SET quantity = quantity + ?, updated_at = ? WHERE id = ?')
        .run(addQty, now, existing.id);
      resultItem = db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(existing.id);
    } else {
      // Create new item
      const newItemId = `item-${randomUUID()}`;
      db.prepare(`
        INSERT INTO shopping_items (
          id, list_type, category_id, name, quantity, unit, is_checked,
          notes, is_favorite, created_by, created_at, updated_at
        ) VALUES (?, 'supermarket', ?, ?, ?, ?, 0, '', 1, ?, ?, ?)
      `).run(
        newItemId,
        fav.category_id,
        fav.name,
        quantity || fav.default_quantity || 1,
        fav.unit || 'units',
        user_id || null,
        now,
        now
      );
      resultItem = db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(newItemId);
    }

    res.status(201).json(resultItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// SMART DEVICES ROUTES (Switcher, Volcano / Smart Life)
// ----------------------------------------------------

// Auto-check expired timers helper
function checkExpiredTimers() {
  try {
    const nowIso = new Date().toISOString();
    db.prepare(`
      UPDATE smart_devices
      SET is_on = 0, power_watt = 0, timer_ends_at = NULL, updated_at = ?
      WHERE timer_ends_at IS NOT NULL AND timer_ends_at <= ?
    `).run(nowIso, nowIso);
  } catch (err) {
    console.error('Error checking expired timers:', err);
  }
}

// Run expired timer check periodically every 15 seconds
setInterval(checkExpiredTimers, 15000);

app.get('/api/smart-devices', (req, res) => {
  try {
    checkExpiredTimers();
    const devices = db.prepare('SELECT * FROM smart_devices ORDER BY device_type DESC, created_at ASC').all();
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/smart-devices/:id/toggle', (req, res) => {
  try {
    const { id } = req.params;
    const dev = db.prepare('SELECT * FROM smart_devices WHERE id = ?').get(id);
    if (!dev) return res.status(404).json({ error: 'Device not found' });

    const newIsOn = dev.is_on ? 0 : 1;
    const now = new Date();
    const nowIso = now.toISOString();

    let timerEndsAt = null;
    let powerWatt = 0;
    let currentTemp = dev.current_temp;

    if (newIsOn) {
      if (dev.device_type === 'switcher_boiler') {
        const durationMins = dev.timer_minutes || 30;
        timerEndsAt = new Date(now.getTime() + durationMins * 60000).toISOString();
        powerWatt = 2500; // Typical 2.5 kW electric water boiler element
      } else if (dev.device_type === 'volcano_light') {
        powerWatt = Math.round(12 * (dev.brightness / 100)); // ~12W LED bulb
      } else {
        powerWatt = 100;
      }
    } else {
      timerEndsAt = null;
      powerWatt = 0;
    }

    db.prepare(`
      UPDATE smart_devices
      SET is_on = ?, timer_ends_at = ?, power_watt = ?, updated_at = ?
      WHERE id = ?
    `).run(newIsOn, timerEndsAt, powerWatt, nowIso, id);

    const updated = db.prepare('SELECT * FROM smart_devices WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/smart-devices/:id/set', (req, res) => {
  try {
    const { id } = req.params;
    const dev = db.prepare('SELECT * FROM smart_devices WHERE id = ?').get(id);
    if (!dev) return res.status(404).json({ error: 'Device not found' });

    const {
      is_on,
      brightness,
      color_temp,
      color_hex,
      timer_minutes
    } = req.body;

    const now = new Date();
    const nowIso = now.toISOString();

    const targetIsOn = is_on !== undefined ? (is_on ? 1 : 0) : dev.is_on;
    const targetBrightness = brightness !== undefined ? Number(brightness) : dev.brightness;
    const targetColorTemp = color_temp !== undefined ? color_temp : dev.color_temp;
    const targetColorHex = color_hex !== undefined ? color_hex : dev.color_hex;
    const targetTimerMins = timer_minutes !== undefined ? Number(timer_minutes) : dev.timer_minutes;

    let timerEndsAt = dev.timer_ends_at;
    let powerWatt = dev.power_watt;

    if (dev.device_type === 'switcher_boiler') {
      if (targetIsOn) {
        timerEndsAt = new Date(now.getTime() + targetTimerMins * 60000).toISOString();
        powerWatt = 2500;
      } else {
        timerEndsAt = null;
        powerWatt = 0;
      }
    } else if (dev.device_type === 'volcano_light') {
      if (targetIsOn) {
        powerWatt = Math.max(1, Math.round(12 * (targetBrightness / 100)));
      } else {
        powerWatt = 0;
      }
    }

    db.prepare(`
      UPDATE smart_devices
      SET is_on = ?, brightness = ?, color_temp = ?, color_hex = ?,
          timer_minutes = ?, timer_ends_at = ?, power_watt = ?, updated_at = ?
      WHERE id = ?
    `).run(
      targetIsOn,
      targetBrightness,
      targetColorTemp,
      targetColorHex,
      targetTimerMins,
      timerEndsAt,
      powerWatt,
      nowIso,
      id
    );

    const updated = db.prepare('SELECT * FROM smart_devices WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Master Scenes (e.g. 'all_off', 'shower_ready', 'good_night', 'good_morning')
app.post('/api/smart-devices/scene/:sceneName', (req, res) => {
  try {
    const { sceneName } = req.params;
    const now = new Date();
    const nowIso = now.toISOString();

    if (sceneName === 'all_off' || sceneName === 'leaving_home') {
      // Turn off everything
      db.prepare(`
        UPDATE smart_devices
        SET is_on = 0, power_watt = 0, timer_ends_at = NULL, updated_at = ?
      `).run(nowIso);
    } else if (sceneName === 'shower_ready') {
      // Turn on boiler for 30 minutes, soft warm light
      const endsAt = new Date(now.getTime() + 30 * 60000).toISOString();
      db.prepare(`
        UPDATE smart_devices
        SET is_on = 1, timer_minutes = 30, timer_ends_at = ?, power_watt = 2500, updated_at = ?
        WHERE device_type = 'switcher_boiler'
      `).run(endsAt, nowIso);
    } else if (sceneName === 'good_night') {
      // Turn off boiler, dim volcano lights to warm 20%
      db.prepare(`
        UPDATE smart_devices
        SET is_on = 0, power_watt = 0, timer_ends_at = NULL, updated_at = ?
        WHERE device_type = 'switcher_boiler'
      `).run(nowIso);

      db.prepare(`
        UPDATE smart_devices
        SET is_on = 1, brightness = 20, color_temp = 'warm', color_hex = '#FFA726', power_watt = 3, updated_at = ?
        WHERE device_type = 'volcano_light'
      `).run(nowIso);
    } else if (sceneName === 'good_morning') {
      // Turn on lights to neutral 80%
      db.prepare(`
        UPDATE smart_devices
        SET is_on = 1, brightness = 80, color_temp = 'neutral', color_hex = '#FFF3E0', power_watt = 10, updated_at = ?
        WHERE device_type = 'volcano_light'
      `).run(nowIso);
    }

    const allDevices = db.prepare('SELECT * FROM smart_devices ORDER BY device_type DESC, created_at ASC').all();
    res.json(allDevices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Status check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Serve frontend static build if available
const __clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(__clientDist)) {
  app.use(express.static(__clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(__clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
