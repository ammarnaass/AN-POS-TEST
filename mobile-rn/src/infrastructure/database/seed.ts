/**
 * Seed Database — AN POS Mobile
 * Populates default data on first run:
 *   • Admin user (admin / PIN: 1234)
 *   • Default roles (admin, cashier, seller)
 *   • Store settings
 *   • Default thermal printer entry
 */
import { generateId } from '@shared/utils';
import type { DataDriver } from '../drivers/DataDriver';

const now = () => new Date().toISOString();

export async function seedDatabase(driver: DataDriver): Promise<void> {
  // ── Check if already seeded ──────────────────────────────────
  try {
    const existing = await driver.list<{ id: string }>('users', { limit: 1 });
    if (existing.total > 0) {
      // Already seeded — skip
      return;
    }
  } catch {
    // Table may not exist yet — proceed
  }

  const ts = now();

  // ── Roles ──────────────────────────────────────────────────
  const roleAdmin = generateId();
  const roleCashier = generateId();
  const roleSeller = generateId();

  const roles = [
    {
      id: roleAdmin,
      name: 'admin',
      permissions: JSON.stringify(['*']),
      created_at: ts,
      updated_at: ts,
    },
    {
      id: roleCashier,
      name: 'cashier',
      permissions: JSON.stringify(['pos', 'cash', 'sales', 'customers']),
      created_at: ts,
      updated_at: ts,
    },
    {
      id: roleSeller,
      name: 'seller',
      permissions: JSON.stringify(['pos', 'customers']),
      created_at: ts,
      updated_at: ts,
    },
  ];

  for (const role of roles) {
    try {
      await driver.create('roles', role);
    } catch { /* ignore duplicate */ }
  }

  // ── Admin User ─────────────────────────────────────────────
  const adminId = generateId();
  try {
    await driver.create('users', {
      id: adminId,
      username: 'admin',
      name: 'المدير',
      email: 'admin@anpos.local',
      phone: '',
      pin: '1234',
      role: 'admin',
      status: 'active',
      permissions: JSON.stringify(['*']),
      created_at: ts,
      updated_at: ts,
    });
  } catch { /* ignore */ }

  // ── Default Settings ───────────────────────────────────────
  const defaultSettings = [
    { key: 'store_name', value: 'متجر AN POS' },
    { key: 'store_address', value: '' },
    { key: 'store_phone', value: '' },
    { key: 'store_email', value: '' },
    { key: 'currency', value: 'دج' },
    { key: 'currency_code', value: 'DZD' },
    { key: 'tva_rate', value: '0.19' },
    { key: 'tva_enabled', value: 'true' },
    { key: 'receipt_footer', value: 'شكراً لتسوقكم معنا' },
    { key: 'receipt_header', value: '' },
    { key: 'invoice_prefix', value: 'INV' },
    { key: 'next_invoice_number', value: '1' },
    { key: 'low_stock_alert', value: 'true' },
    { key: 'trial_started_at', value: ts },
    { key: 'trial_days', value: '7' },
    { key: 'app_version', value: '2.0.0' },
  ];

  for (const s of defaultSettings) {
    try {
      await driver.create('settings', {
        id: generateId(),
        key: s.key,
        value: s.value,
        created_at: ts,
        updated_at: ts,
      });
    } catch { /* ignore duplicate */ }
  }

  // ── Default Categories ─────────────────────────────────────
  const defaultCategories = [
    { name: 'عام', icon: '📦', color: '#3b82f6' },
    { name: 'مشروبات', icon: '🥤', color: '#06b6d4' },
    { name: 'مواد غذائية', icon: '🛒', color: '#22c55e' },
    { name: 'أدوات', icon: '🔧', color: '#f59e0b' },
    { name: 'ملابس', icon: '👕', color: '#d946ef' },
  ];

  for (const cat of defaultCategories) {
    try {
      await driver.create('categories', {
        id: generateId(),
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        created_at: ts,
        updated_at: ts,
      });
    } catch { /* ignore */ }
  }

  // ── Default Printer ────────────────────────────────────────
  try {
    await driver.create('printers', {
      id: generateId(),
      name: 'الطابعة الحرارية الافتراضية',
      type: 'bluetooth',
      paper_width: 80,
      is_default: 1,
      status: 'active',
      created_at: ts,
      updated_at: ts,
    });
  } catch { /* ignore */ }
}
