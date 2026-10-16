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

  // Only seed sample tasks and sample shopping items ONCE ever upon fresh setup.
  // Never re-seed if the user cleared items or already has their own data!
  const hasSeededMeta = db.prepare("SELECT value FROM app_metadata WHERE key = 'has_seeded_sample_data'").get();
  const existingTasksCount = db.prepare('SELECT COUNT(*) as count FROM tasks').get().count;
  const existingShoppingCount = db.prepare('SELECT COUNT(*) as count FROM shopping_items').get().count;

  if (!hasSeededMeta && existingTasksCount === 0 && existingShoppingCount === 0) {
    const insertTask = db.prepare(`
      INSERT INTO tasks (
        id, title, description, task_type, recurrence_interval, recurrence_details,
        urgency, status, due_date, created_by, assigned_to, is_deleted, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date();
    const isoNow = now.toISOString();
    const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
    const nextWeek = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];

    const sampleTasks = [
      {
        id: 'task-1',
        title: 'תיקון הברז הדולף במטבח',
        description: 'הברז מטפטף מתחת לכיור, לקרוא לאינסטלטור או להחליף גומייה',
        task_type: 'one_time',
        recurrence_interval: null,
        recurrence_details: null,
        urgency: 'urgent',
        status: 'pending',
        due_date: tomorrow,
        created_by: 'user-1',
        assigned_to: 'user-1',
        is_deleted: 0
      },
      {
        id: 'task-2',
        title: 'ריקון פח מיחזור וקרטונים',
        description: 'להוריד לפח המחזור הירוק והכחול ברחוב',
        task_type: 'recurring',
        recurrence_interval: 'weekly',
        recurrence_details: 'ימי ראשון בערב',
        urgency: 'urgent',
        status: 'pending',
        due_date: tomorrow,
        created_by: 'user-2',
        assigned_to: 'user-3',
        is_deleted: 0
      },
      {
        id: 'task-3',
        title: 'השקיית צמחים ועציצים במרפסת',
        description: 'לבדוק את הלחות באדמה ולהשקות את המונסטרה והסחלבים',
        task_type: 'recurring',
        recurrence_interval: 'weekly',
        recurrence_details: 'פעמיים בשבוע (שני וחמישי)',
        urgency: 'leisure',
        status: 'pending',
        due_date: nextWeek,
        created_by: 'user-2',
        assigned_to: 'user-2',
        is_deleted: 0
      },
      {
        id: 'task-4',
        title: 'החלפת מצעים ומגבות',
        description: 'בכל חדרי השינה, כביסה ב-60 מעלות',
        task_type: 'recurring',
        recurrence_interval: 'weekly',
        recurrence_details: 'סוף שבוע (שישי בבוקר)',
        urgency: 'leisure',
        status: 'pending',
        due_date: nextWeek,
        created_by: 'user-1',
        assigned_to: 'user-4',
        is_deleted: 0
      },
      {
        id: 'task-5',
        title: 'סידור ארון חשמל ומחסן',
        description: 'למיין קופסאות ישנות, לסמן תוויות ולהיפטר מדברים שלא צריך',
        task_type: 'one_time',
        recurrence_interval: null,
        recurrence_details: null,
        urgency: 'sometime',
        status: 'pending',
        due_date: null,
        created_by: 'user-1',
        assigned_to: 'user-1',
        is_deleted: 0
      },
      {
        id: 'task-6',
        title: 'ניקוי עמוק של תנור האפייה',
        description: 'עם חומר ממיס שומנים ולהשאיר חצי שעה',
        task_type: 'one_time',
        recurrence_interval: null,
        recurrence_details: null,
        urgency: 'sometime',
        status: 'pending',
        due_date: null,
        created_by: 'user-2',
        assigned_to: 'user-2',
        is_deleted: 0
      },
      {
        id: 'task-deleted-sample',
        title: 'צביעת קיר הסלון (דוגמת אשפה לבדיקת שחזור)',
        description: 'מטלה שנמחקה לבדיקת תקינות סל המחזור והשחזור',
        task_type: 'one_time',
        recurrence_interval: null,
        recurrence_details: null,
        urgency: 'sometime',
        status: 'pending',
        due_date: null,
        created_by: 'user-1',
        assigned_to: 'user-1',
        is_deleted: 1,
        deleted_at: new Date(Date.now() - 3600000).toISOString()
      }
    ];

    for (const t of sampleTasks) {
      insertTask.run(
        t.id, t.title, t.description, t.task_type, t.recurrence_interval, t.recurrence_details,
        t.urgency, t.status, t.due_date, t.created_by, t.assigned_to, t.is_deleted, isoNow, isoNow
      );
      if (t.is_deleted) {
        db.prepare('UPDATE tasks SET deleted_at = ? WHERE id = ?').run(t.deleted_at, t.id);
      }
    }

    const insertShop = db.prepare(`
      INSERT INTO shopping_items (
        id, list_type, category_id, name, quantity, unit, is_checked, checked_by, checked_at,
        notes, url, estimated_price, is_favorite, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const sampleShopping = [
      // Supermarket
      { id: 's-1', list_type: 'supermarket', category_id: 'produce', name: 'עגבניות שרי מתוקות', quantity: 2, unit: 'pack', is_checked: 0, notes: 'עדיף מגי או תמר', is_fav: 1, user: 'user-1' },
      { id: 's-2', list_type: 'supermarket', category_id: 'produce', name: 'אבוקדו בשל', quantity: 1, unit: 'kg', is_checked: 0, notes: 'שיהיה רך לאכילה היום', is_fav: 0, user: 'user-2' },
      { id: 's-3', list_type: 'supermarket', category_id: 'dairy', name: 'חלב שיבולת שועל בריסטה', quantity: 3, unit: 'units', is_checked: 0, notes: 'אלפרו או תנובה', is_fav: 1, user: 'user-2' },
      { id: 's-4', list_type: 'supermarket', category_id: 'bakery', name: 'חלה לשבת', quantity: 2, unit: 'units', is_checked: 1, notes: '', is_fav: 0, user: 'user-1' },
      { id: 's-5', list_type: 'supermarket', category_id: 'meat', name: 'כרעיים עוף טרי', quantity: 2, unit: 'kg', is_checked: 0, notes: 'מחולק ונקי', is_fav: 0, user: 'user-1' },
      { id: 's-6', list_type: 'supermarket', category_id: 'cleaning', name: 'טבליות למדיח פיניש', quantity: 1, unit: 'pack', is_checked: 0, notes: 'מבצע 80 יח', is_fav: 1, user: 'user-2' },

      // Pharmacy (מכבי / סופר פארם)
      { id: 'p-1', list_type: 'pharmacy', category_id: null, name: 'ויטמין D3 טיפות', quantity: 1, unit: 'bottle', is_checked: 0, notes: 'מרשם ממכבי בטלפון', is_fav: 0, user: 'user-2' },
      { id: 'p-2', list_type: 'pharmacy', category_id: null, name: 'אקמול / דקסמול קולד', quantity: 1, unit: 'box', is_checked: 0, notes: 'שיהיה תמיד בארון תרופות', is_fav: 0, user: 'user-1' },
      { id: 'p-3', list_type: 'pharmacy', category_id: null, name: 'משחת שיניים פרדונטקס', quantity: 2, unit: 'units', is_checked: 1, notes: 'ללא הלבנה', is_fav: 1, user: 'user-1' },
      { id: 'p-4', list_type: 'pharmacy', category_id: null, name: 'פלסטרים עמידים במים', quantity: 1, unit: 'box', is_checked: 0, notes: 'לילדים', is_fav: 0, user: 'user-3' },

      // General / Cheap Store (אלי אקספרס / מקס-סטוק)
      { id: 'g-1', list_type: 'general', category_id: null, name: 'מתלה מגבות מגנטי למקרר', quantity: 1, unit: 'units', is_checked: 0, notes: 'מצאנו באלי אקספרס בדירוג 4.9', url: 'https://aliexpress.com', est_price: 28, is_fav: 0, user: 'user-2' },
      { id: 'g-2', list_type: 'general', category_id: null, name: 'קופסאות אחסון שקופות לארון (מקס סטוק)', quantity: 6, unit: 'units', is_checked: 0, notes: 'גודל בינוני 5 ליטר', url: '', est_price: 60, is_fav: 0, user: 'user-1' },
      { id: 'g-3', list_type: 'general', category_id: null, name: 'סוללות AA ו-AAA נטענות', quantity: 2, unit: 'pack', is_checked: 1, notes: '', url: 'https://aliexpress.com', est_price: 45, is_fav: 0, user: 'user-1' },

      // Other (אחר)
      { id: 'o-1', list_type: 'other', category_id: null, name: 'דיבלים וברגים 6 מ"מ (טמבור)', quantity: 1, unit: 'box', is_checked: 0, notes: 'לתליית המדף בחדר ילדים', is_fav: 0, user: 'user-1' },
      { id: 'o-2', list_type: 'other', category_id: null, name: 'אוכל יבש לחתול (חנות חיות)', quantity: 1, unit: 'pack', is_checked: 0, notes: 'שק 7 ק"ג רויאל קנין', is_fav: 1, user: 'user-2' }
    ];

    for (const item of sampleShopping) {
      insertShop.run(
        item.id,
        item.list_type,
        item.category_id,
        item.name,
        item.quantity,
        item.unit,
        item.is_checked,
        item.is_checked ? 'user-1' : null,
        item.is_checked ? isoNow : null,
        item.notes || '',
        item.url || '',
        item.est_price || null,
        item.is_fav || 0,
        item.user,
        isoNow,
        isoNow
      );
    }
  }

  // Always mark that database initialization/seeding check has completed so sample data is NEVER re-inserted
  db.prepare("INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('has_seeded_sample_data', 'true')").run();

  console.log('Database initialized successfully with default records.');
}

export default db;
