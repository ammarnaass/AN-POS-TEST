import { describe, expect, it, beforeEach } from 'vitest';
import { db } from '@/infrastructure/database/dexie/db';

describe('app initialization', () => {
  beforeEach(async () => {
    await db.users.clear();
  });

  it('database proxy initializes and supports basic CRUD operations', async () => {
    const testUser = {
      id: 'test-user-init-1',
      username: 'admin_test',
      name: 'مسؤول النظام التجريبي',
      role: 'admin' as const,
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.users.add(testUser);
    const userCount = await db.users.count();
    expect(userCount).toBeGreaterThan(0);

    const fetched = await db.users.get('test-user-init-1');
    expect(fetched).toBeDefined();
    expect(fetched?.name).toBe('مسؤول النظام التجريبي');
  });
});
