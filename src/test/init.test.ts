import { describe, expect, it } from 'vitest';
import { db } from '@/infrastructure/database/dexie/db';
import { seedDatabase } from '@/infrastructure/database/dexie/seed';

describe('app initialization', () => {
  it('seedDatabase runs without error', async () => {
    await seedDatabase();
    const userCount = await db.users.count();
    expect(userCount).toBeGreaterThan(0);
  });
});
