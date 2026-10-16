import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = process.env.DATA_DIR || path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'household.db');
const db = new Database(dbPath);

// Enable foreign keys & WAL mode for performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDb() {
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT NOT NULL,
      color TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      task_type TEXT NOT NULL DEFAULT 'one_time', -- 'one_time' | 'recurring'
      recurrence_interval TEXT DEFAULT 'weekly',   -- 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom'
      recurrence_details TEXT,                    -- JSON or string e.g. "every Sunday"
      urgency TEXT NOT NULL DEFAULT 'leisure',    -- 'urgent' | 'leisure' | 'sometime'
      status TEXT NOT NULL DEFAULT 'pending',     -- 'pending' | 'completed'
      due_date TEXT,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
      completed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      completed_at TEXT,
      is_deleted INTEGER NOT NULL DEFAULT 0,      -- 0: active, 1: in trash
      deleted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shopping_categories (
      id TEXT PRIMARY KEY,
      name_he TEXT NOT NULL,
      name_en TEXT NOT NULL,
      icon TEXT NOT NULL,
      display_order INTEGER NOT NULL,
      color TEXT DEFAULT '#3B82F6'
    );

    CREATE TABLE IF NOT EXISTS shopping_items (
      id TEXT PRIMARY KEY,
      list_type TEXT NOT NULL,                   -- 'supermarket' | 'pharmacy' | 'general' | 'other'
      category_id TEXT REFERENCES shopping_categories(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit TEXT NOT NULL DEFAULT 'units',        -- 'units' | 'kg' | 'g' | 'pack' | 'bottle' | 'box'
      is_checked INTEGER NOT NULL DEFAULT 0,
      checked_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      checked_at TEXT,
      notes TEXT,
      url TEXT,
      estimated_price REAL,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS favorite_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category_id TEXT REFERENCES shopping_categories(id) ON DELETE SET NULL,
      default_quantity REAL NOT NULL DEFAULT 1,
      unit TEXT NOT NULL DEFAULT 'units',
      icon TEXT DEFAULT '⭐',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Seed default users if empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const insertUser = db.prepare(
      'INSERT INTO users (id, name, avatar, color, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );

    const defaultUsers = [
      { id: 'user-1', name: 'דניאל', avatar: '👨‍🦰', color: '#3B82F6', role: 'admin' },
      { id: 'user-2', name: 'נועה', avatar: '👩‍🦱', color: '#EC4899', role: 'admin' },
      { id: 'user-3', name: 'עומר', avatar: '👦', color: '#10B981', role: 'member' },
      { id: 'user-4', name: 'רוני', avatar: '👧', color: '#8B5CF6', role: 'member' }
    ];

    const now = new Date().toISOString();
    for (const u of defaultUsers) {
      insertUser.run(u.id, u.name, u.avatar, u.color, u.role, now);
    }
  }

  // Seed default supermarket categories if empty
  const catCount = db.prepare('SELECT COUNT(*) as count FROM shopping_categories').get().count;
  if (catCount === 0) {
    const insertCat = db.prepare(
      'INSERT INTO shopping_categories (id, name_he, name_en, icon, display_order, color) VALUES (?, ?, ?, ?, ?, ?)'
    );

    const defaultCategories = [
      { id: 'produce', name_he: 'ירקות ופירות', name_en: 'Fruits & Vegetables', icon: '🥦', display_order: 1, color: '#22C55E' },
      { id: 'bakery', name_he: 'מאפים ולחמים', name_en: 'Bakery & Bread', icon: '🥐', display_order: 2, color: '#F59E0B' },
      { id: 'dairy', name_he: 'מוצרי חלב וביצים', name_en: 'Dairy & Eggs', icon: '🧀', display_order: 3, color: '#3B82F6' },
      { id: 'meat', name_he: 'בשר, עוף ודגים', name_en: 'Meat & Fish', icon: '🥩', display_order: 4, color: '#EF4444' },
      { id: 'frozen', name_he: 'קפואים', name_en: 'Frozen Foods', icon: '🧊', display_order: 5, color: '#06B6D4' },
      { id: 'pantry', name_he: 'מזווה ויבשים', name_en: 'Pantry & Dry Goods', icon: '🥫', display_order: 6, color: '#D97706' },
      { id: 'drinks', name_he: 'משקאות', name_en: 'Beverages', icon: '🧃', display_order: 7, color: '#8B5CF6' },
      { id: 'snacks', name_he: 'חטיפים ומתוקים', name_en: 'Snacks & Sweets', icon: '🍫', display_order: 8, color: '#EC4899' },
      { id: 'cleaning', name_he: 'חומרי ניקוי וחד פעמי', name_en: 'Cleaning & Disposables', icon: '🧼', display_order: 9, color: '#14B8A6' },
      { id: 'general', name_he: 'כללי ומבצעים', name_en: 'General', icon: '🛒', display_order: 10, color: '#6B7280' }
    ];

    for (const c of defaultCategories) {
      insertCat.run(c.id, c.name_he, c.name_en, c.icon, c.display_order, c.color);
    }
  }

  // Seed default favorite templates if empty
  const favCount = db.prepare('SELECT COUNT(*) as count FROM favorite_templates').get().count;
  if (favCount === 0) {
    const insertFav = db.prepare(
      'INSERT INTO favorite_templates (id, name, category_id, default_quantity, unit, icon, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    const defaultFavorites = [
      { id: 'fav-1', name: 'חלב 3%', category_id: 'dairy', default_quantity: 2, unit: 'units', icon: '🥛' },
      { id: 'fav-2', name: 'ביצים L (תבנית)', category_id: 'dairy', default_quantity: 1, unit: 'pack', icon: '🥚' },
      { id: 'fav-3', name: 'עגבניות', category_id: 'produce', default_quantity: 1.5, unit: 'kg', icon: '🍅' },
      { id: 'fav-4', name: 'מלפפונים', category_id: 'produce', default_quantity: 1.5, unit: 'kg', icon: '🥒' },
      { id: 'fav-5', name: 'לחם אחיד פרוס', category_id: 'bakery', default_quantity: 1, unit: 'units', icon: '🍞' },
      { id: 'fav-6', name: 'חזה עוף טרי', category_id: 'meat', default_quantity: 1, unit: 'kg', icon: '🍗' },
      { id: 'fav-7', name: 'קפה שחור / נמס', category_id: 'pantry', default_quantity: 1, unit: 'pack', icon: '☕' },
      { id: 'fav-8', name: 'שמן זית כתית מעולה', category_id: 'pantry', default_quantity: 1, unit: 'bottle', icon: '🫒' },
      { id: 'fav-9', name: 'גבינה צהובה 28%', category_id: 'dairy', default_quantity: 1, unit: 'pack', icon: '🧀' },
      { id: 'fav-10', name: 'נייר טואלט', category_id: 'cleaning', default_quantity: 1, unit: 'pack', icon: '🧻' },
      { id: 'fav-11', name: 'שקיות אשפה', category_id: 'cleaning', default_quantity: 1, unit: 'pack', icon: '🗑️' },
      { id: 'fav-12', name: 'אפונה עדינה קפואה', category_id: 'frozen', default_quantity: 1, unit: 'pack', icon: '🥦' }
    ];

    const now = new Date().toISOString();
    for (const f of defaultFavorites) {
      insertFav.run(f.id, f.name, f.category_id, f.default_quantity, f.unit, f.icon, now);
    }
  }

  // Mark database initialization completed
  db.prepare("INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('has_seeded_sample_data', 'true')").run();

  console.log('Database initialized successfully with default records.');
}

export default db;
