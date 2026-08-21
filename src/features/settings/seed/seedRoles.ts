import { db } from '@/infrastructure/database/dexie/db';
import { v4 as uuid } from 'uuid';
import type { RoleEntity } from '@/infrastructure/database/dexie/db';

const DEFAULT_ROLES: Omit<RoleEntity, 'id' | 'createdAt'>[] = [
  {
    name: 'admin',
    description: 'المدير — تحكم كامل بالنظام',
    isSystem: true,
    permissions: { '*': true },
  },
  {
    name: 'accountant',
    description: 'المحاسب — إدارة مالية',
    isSystem: true,
    permissions: {
      'pos.view_sales': true,
      'invoice.view': true,
      'product.view': true,
      'customer.view': true,
      'customer.add': true,
      'supplier.view': true,
      'inventory.view': true,
      'report.view': true,
      'report.export': true,
      'settings.view': true,
    },
  },
  {
    name: 'sales_manager',
    description: 'مدير المبيعات — إدارة المبيعات والعملاء',
    isSystem: true,
    permissions: {
      'pos.complete_sale': true,
      'pos.cancel_sale': true,
      'pos.view_sales': true,
      'invoice.create': true,
      'invoice.edit': true,
      'invoice.print': true,
      'invoice.reprint': true,
      'product.view': true,
      'customer.add': true,
      'customer.edit': true,
      'customer.view': true,
      'report.view': true,
      'report.export': true,
      'settings.view': true,
    },
  },
  {
    name: 'inventory_manager',
    description: 'مدير المخزون — إدارة المنتجات والمخزون',
    isSystem: true,
    permissions: {
      'product.add': true,
      'product.edit': true,
      'product.delete': true,
      'product.view': true,
      'supplier.add': true,
      'supplier.edit': true,
      'supplier.view': true,
      'inventory.add': true,
      'inventory.edit': true,
      'inventory.view': true,
      'report.view': true,
      'report.export': true,
      'settings.view': true,
    },
  },
  {
    name: 'cashier',
    description: 'الكاشير — نقطة البيع وعرض المخزون',
    isSystem: true,
    permissions: {
      'pos.complete_sale': true,
      'pos.cancel_sale': true,
      'pos.view_sales': true,
      'invoice.create': true,
      'invoice.print': true,
      'product.view': true,
      'customer.add': true,
      'customer.view': true,
      'inventory.view': true,
      'settings.view': true,
    },
  },
  {
    name: 'seller',
    description: 'البائع — بيع فقط',
    isSystem: true,
    permissions: {
      'pos.complete_sale': true,
      'invoice.create': true,
      'invoice.print': true,
      'product.view': true,
    },
  },
];

export async function seedRoles(): Promise<void> {
  const count = await db.roles.count();
  if (count > 0) return;

  const now = new Date().toISOString();
  const roles: RoleEntity[] = DEFAULT_ROLES.map(r => ({
    ...r,
    id: uuid(),
    createdAt: now,
  }));

  await db.roles.bulkAdd(roles);
}
