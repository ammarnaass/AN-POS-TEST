// منطق الفئات — دوال قابلة لإعادة الاستخدام (IPC + HTTP REST).
// مع JOIN لعدد المنتجات + فحص التكرار والألوان والأيقونات.
// يمسي مزامنة مع ipc/categories.ts.

import { randomUUID } from 'node:crypto';
import {
  queryAll,
  queryOne,
  execute,
  tableHasColumn,
  type Row,
} from './db-utils';

export async function listCategories(): Promise<{ data: Row[] }> {
  // نحسب عدد المنتجات عبر category_id أو اسم category للوفاقية مع البيانات القديمة
  const rows = queryAll(`
    SELECT c.*, COUNT(p.id) AS product_count
    FROM categories c
    LEFT JOIN products p ON (p.category_id = c.id OR (p.category_id IS NULL AND p.category = c.name))
    GROUP BY c.id
    ORDER BY c.name ASC
  `);
  return { data: rows };
}

export async function getCategory(id: string): Promise<{ data: Record<string, unknown> | null }> {
  const row = queryOne('SELECT * FROM categories WHERE id = ?', [id]);
  if (!row) return { data: null };
  const productCount = queryOne(
    'SELECT COUNT(*) as count FROM products WHERE category_id = ? OR (category_id IS NULL AND category = ?)',
    [id, row.name]
  );
  return { data: { ...row, product_count: Number(productCount?.count) || 0 } };
}

export async function createCategory(data: Record<string, unknown>): Promise<{ data: Row | null; error?: { status: number; detail: string } }> {
  const name = ((data.name as string) || '').trim();
  if (!name) {
    return { error: { status: 400, detail: 'اسم الفئة مطلوب' } };
  }

  const existing = queryOne('SELECT id FROM categories WHERE name = ?', [name]);
  if (existing) {
    return { error: { status: 409, detail: 'اسم الفئة موجود مسبقاً' } };
  }

  const id = (data.id as string) || randomUUID();
  const now = new Date().toISOString();
  const parentId = data.parentId || data.parent_id || null;
  const description = data.description || '';
  const icon = (data.icon as string) || 'FolderTree';
  const color = (data.color as string) || '#3B82F6';

  const hasIcon = tableHasColumn('categories', 'icon');
  const hasColor = tableHasColumn('categories', 'color');

  if (hasIcon && hasColor) {
    execute(
      'INSERT INTO categories (id, name, parent_id, description, icon, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, parentId, description, icon, color, now, now]
    );
  } else {
    execute(
      'INSERT INTO categories (id, name, parent_id, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, parentId, description, now, now]
    );
  }

  // مزامنة المنتجات الموجودة التي تحمل نفس الاسم لربط category_id
  try {
    execute('UPDATE products SET category_id = ? WHERE (category_id IS NULL OR category_id = "") AND category = ?', [id, name]);
  } catch { /* ignore */ }

  const created = queryOne('SELECT * FROM categories WHERE id = ?', [id]);
  return { data: created };
}

export async function updateCategory(id: string, data: Record<string, unknown>): Promise<{ data: Row | null; error?: { status: number; detail: string } }> {
  const name = data.name ? ((data.name as string) || '').trim() : undefined;
  if (name) {
    const existing = queryOne('SELECT id FROM categories WHERE name = ? AND id != ?', [name, id]);
    if (existing) {
      return { error: { status: 409, detail: 'اسم الفئة موجود مسبقاً' } };
    }
  }

  const entries = Object.entries(data).filter(([k]) => k !== 'id');
  const setClause = entries.map(([k]) => {
    if (k === 'parentId') return 'parent_id = ?';
    return `${k} = ?`;
  }).join(', ');
  const vals = entries.map(([k, v]) => (k === 'name' && typeof v === 'string' ? v.trim() : v));

  execute(`UPDATE categories SET ${setClause}, updated_at = ? WHERE id = ?`,
    [...vals, new Date().toISOString(), id]);

  if (name) {
    try {
      execute('UPDATE products SET category = ? WHERE category_id = ?', [name, id]);
    } catch { /* ignore */ }
  }

  const updated = queryOne('SELECT * FROM categories WHERE id = ?', [id]);
  return { data: updated };
}

export async function removeCategory(id: string): Promise<{ success: boolean; error?: { status: number; detail: string } }> {
  const category = queryOne('SELECT * FROM categories WHERE id = ?', [id]);
  if (!category) return { success: true };

  // فحص وجود منتجات مرتبطة
  const count = queryOne(
    'SELECT COUNT(*) as count FROM products WHERE category_id = ? OR category = ?',
    [id, category.name]
  );
  if (count && Number(count.count) > 0) {
    return { error: { status: 409, detail: `لا يمكن حذف الفئة: يوجد ${count.count} منتج مرتبط بها` } };
  }

  // فحص وجود فئات فرعية
  const childCount = queryOne('SELECT COUNT(*) as count FROM categories WHERE parent_id = ?', [id]);
  if (childCount && Number(childCount.count) > 0) {
    return { error: { status: 409, detail: `لا يمكن حذف الفئة: يوجد ${childCount.count} فئات فرعية تابعة لها` } };
  }

  execute('DELETE FROM categories WHERE id = ?', [id]);
  return { success: true };
}

