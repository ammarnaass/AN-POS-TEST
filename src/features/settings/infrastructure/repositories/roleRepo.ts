import { db } from '@/infrastructure/database/dexie/db';
import { v4 as uuid } from 'uuid';
import type { RoleEntity } from '@/infrastructure/database/dexie/db';

export interface CreateRoleInput {
  name: string;
  description?: string;
  permissions: Record<string, boolean>;
}

export const roleRepo = {
  async all(): Promise<RoleEntity[]> {
    return db.roles.toArray();
  },

  async get(id: string): Promise<RoleEntity | undefined> {
    return db.roles.get(id);
  },

  async getByName(name: string): Promise<RoleEntity | undefined> {
    return db.roles.where('name').equals(name).first();
  },

  async create(input: CreateRoleInput): Promise<RoleEntity> {
    const role: RoleEntity = {
      id: uuid(),
      name: input.name,
      description: input.description,
      permissions: input.permissions,
      isSystem: false,
      createdAt: new Date().toISOString(),
    };
    await db.roles.add(role);
    return role;
  },

  async update(id: string, patch: Partial<RoleEntity>): Promise<void> {
    const existing = await db.roles.get(id);
    if (!existing) return;
    if (existing.isSystem) throw new Error('لا يمكن تعديل الدور النظامي');
    await db.roles.put({ ...existing, ...patch });
  },

  async remove(id: string): Promise<void> {
    const existing = await db.roles.get(id);
    if (!existing) return;
    if (existing.isSystem) throw new Error('لا يمكن حذف الدور النظامي');
    const userCount = await db.users.where('roleId').equals(id).count();
    if (userCount > 0) throw new Error('لا يمكن حذف دور مستخدم من قبل مستخدمين');
    await db.roles.delete(id);
  },
};
