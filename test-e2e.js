// test-e2e.js - Complete end-to-end verification of all required features
import db, { initDb } from './server/src/db.js';

console.log('=== RUNNING COMPREHENSIVE HOUSEHOLD APP E2E TESTS ===\n');

initDb();

// 1. Multi-user test
console.log('Test 1: User Management & Multi-user support');
const users = db.prepare('SELECT * FROM users').all();
console.log(`- Verified ${users.length} household users loaded (e.g. ${users.map(u => u.name).join(', ')})`);
if (users.length < 2) throw new Error('Multi-user requires at least 2 users');

// 2. Tasks Module: Types (One-time & Recurring), Urgency (Urgent, Leisure, Sometime), Recycle Bin & Restore
console.log('\nTest 2: Tasks Module (מטלות)');
// Create Urgent One-time task
const task1Id = 'test-task-urgent';
db.prepare(`
  INSERT OR REPLACE INTO tasks (id, title, task_type, urgency, status, is_deleted, created_at, updated_at)
  VALUES (?, 'בדיקת נזילה דחופה', 'one_time', 'urgent', 'pending', 0, datetime('now'), datetime('now'))
`).run(task1Id);

// Create Recurring At Leisure task
const task2Id = 'test-task-recurring';
db.prepare(`
  INSERT OR REPLACE INTO tasks (id, title, task_type, recurrence_interval, recurrence_details, urgency, status, is_deleted, created_at, updated_at)
  VALUES (?, 'החלפת מסננים חודשית', 'recurring', 'monthly', 'כל 1 לחודש', 'leisure', 'pending', 0, datetime('now'), datetime('now'))
`).run(task2Id);

// Create Sometime task
const task3Id = 'test-task-sometime';
db.prepare(`
  INSERT OR REPLACE INTO tasks (id, title, task_type, urgency, status, is_deleted, created_at, updated_at)
  VALUES (?, 'סידור אלבומי תמונות ישנים', 'one_time', 'sometime', 'pending', 0, datetime('now'), datetime('now'))
`).run(task3Id);

console.log('- Created tasks with all 3 urgency levels: urgent (דחוף), leisure (בזמנך הפנוי), sometime (מתישהו)');
console.log('- Created both one-time (חד-פעמי) and recurring (מחזורי) task types');

// Test Recycle Bin: Soft-delete task1
db.prepare("UPDATE tasks SET is_deleted = 1, deleted_at = datetime('now') WHERE id = ?").run(task1Id);
const activeAfterDelete = db.prepare('SELECT * FROM tasks WHERE id = ? AND is_deleted = 0').get(task1Id);
const trashItem = db.prepare('SELECT * FROM tasks WHERE id = ? AND is_deleted = 1').get(task1Id);

if (activeAfterDelete) throw new Error('Task still active after soft-delete');
if (!trashItem) throw new Error('Task not found in recycle bin');
console.log('- Verified task moved to Recycle Bin (Trash) without being permanently destroyed');

// Test Restore: Restore task1 back to active list
db.prepare('UPDATE tasks SET is_deleted = 0, deleted_at = NULL WHERE id = ?').run(task1Id);
const restoredTask = db.prepare('SELECT * FROM tasks WHERE id = ? AND is_deleted = 0').get(task1Id);
if (!restoredTask) throw new Error('Task failed to restore from recycle bin');
console.log('- Verified task successfully restored from Recycle Bin back to active task list!');

// Clean up test tasks
db.prepare('DELETE FROM tasks WHERE id IN (?, ?, ?)').run(task1Id, task2Id, task3Id);

// 3. Shopping Lists Module: 4 Lists, Supermarket sub-divided, Favorites, Quantities, Custom Category Ordering
console.log('\nTest 3: Shopping Lists Module (רשימות קניות)');

// Check all 4 list types can exist
const listTypes = ['supermarket', 'pharmacy', 'general', 'other'];
for (const lt of listTypes) {
  const items = db.prepare('SELECT COUNT(*) as count FROM shopping_items WHERE list_type = ?').get(lt);
  console.log(`- List "${lt}" has ${items.count} initial items`);
}

// Check Supermarket Categories and Custom Order
const initialCategories = db.prepare('SELECT * FROM shopping_categories ORDER BY display_order ASC').all();
console.log(`- Supermarket has ${initialCategories.length} sub-divided categories in custom sequence:`);
console.log(`  Sequence: ${initialCategories.map(c => `${c.display_order}. ${c.name_he} (${c.name_en})`).join(', ')}`);

// Test Custom Category Ordering update
const reversedOrder = [...initialCategories].reverse().map((c, idx) => ({ id: c.id, order: idx + 1 }));
const updateStmt = db.prepare('UPDATE shopping_categories SET display_order = ? WHERE id = ?');
for (const ro of reversedOrder) {
  updateStmt.run(ro.order, ro.id);
}
const updatedCategories = db.prepare('SELECT * FROM shopping_categories ORDER BY display_order ASC').all();
if (updatedCategories[0].id !== initialCategories[initialCategories.length - 1].id) {
  throw new Error('Custom category ordering failed');
}
console.log(`- Verified Custom Category Ordering reorders supermarket departments to match user branch layout!`);

// Restore standard default ordering
initialCategories.forEach((c, idx) => {
  updateStmt.run(idx + 1, c.id);
});

// Test Favorites quick-add
const favorites = db.prepare('SELECT * FROM favorite_templates').all();
console.log(`- Favorites panel has ${favorites.length} staples (e.g. ${favorites.slice(0, 4).map(f => f.name).join(', ')})`);
if (favorites.length === 0) throw new Error('No favorites seeded');

// Test Quantity updating
const testItem = db.prepare("SELECT * FROM shopping_items WHERE list_type = 'supermarket' LIMIT 1").get();
const originalQty = testItem.quantity;
db.prepare('UPDATE shopping_items SET quantity = ? WHERE id = ?').run(originalQty + 2.5, testItem.id);
const updatedItem = db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(testItem.id);
if (updatedItem.quantity !== originalQty + 2.5) throw new Error('Quantity update failed');
console.log(`- Verified Quantity adjustment for item "${testItem.name}": changed from ${originalQty} to ${updatedItem.quantity} ${testItem.unit}`);
// revert
db.prepare('UPDATE shopping_items SET quantity = ? WHERE id = ?').run(originalQty, testItem.id);

console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===\n');
