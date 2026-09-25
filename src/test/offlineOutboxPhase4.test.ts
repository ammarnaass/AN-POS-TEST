import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveReplicaItem,
  saveReplicaBatch,
  getReplicaItem,
  listReplicaItems,
  removeReplicaItem,
  clearReplicaTable,
} from '../lib/offlineReplica';
import {
  enqueueOutboxItem,
  getPendingOutboxCount,
  getPendingOutboxItems,
  clearOutbox,
  flushOutbox,
} from '../lib/offlineOutbox';
import {
  httpTransportDb,
  setStoredTransportConfig,
} from '../lib/transportGateway';

describe('Phase 4: Offline-First Outbox & Replica Resilience', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await clearOutbox();
    await clearReplicaTable('products');
    await clearReplicaTable('sales');
    await clearReplicaTable('customers');
    setStoredTransportConfig({
      role: 'client',
      serverUrl: 'http://192.168.1.100:3000',
      token: 'test_token',
      deviceId: 'term_test_1',
    });
  });

  describe('1. Local Offline Read Replica (offlineReplica)', () => {
    it('saves and retrieves items from local replica', async () => {
      const product = {
        id: 'prod_1',
        name: 'حليب نادك 1 لتر',
        price: 8.5,
        barcode: '628100123456',
        stock: 50,
      };

      await saveReplicaItem('products', product);
      const retrieved = await getReplicaItem('products', 'prod_1');

      expect(retrieved).not.toBeNull();
      expect(retrieved.id).toBe('prod_1');
      expect(retrieved.name).toBe('حليب نادك 1 لتر');
      expect(retrieved.price).toBe(8.5);
    });

    it('saves batches and lists with filtering, searching, and sorting', async () => {
      const products = [
        { id: 'p1', name: 'عصير برتقال طبيعي', price: 12, barcode: '1111', category: 'مشروبات' },
        { id: 'p2', name: 'عصير تفاح سيزر', price: 10, barcode: '2222', category: 'مشروبات' },
        { id: 'p3', name: 'شوكولاتة جلاكسي', price: 5, barcode: '3333', category: 'حلويات' },
      ];

      await saveReplicaBatch('products', products);

      // Search by text
      const searchRes = await listReplicaItems('products', { search: 'عصير' });
      expect(searchRes.total).toBe(2);
      expect(searchRes.data.map((p) => p.id)).toEqual(expect.arrayContaining(['p1', 'p2']));

      // Filter by category
      const filterRes = await listReplicaItems('products', { filter: { category: 'حلويات' } });
      expect(filterRes.total).toBe(1);
      expect(filterRes.data[0].id).toBe('p3');

      // Sort by price DESC
      const sortRes = await listReplicaItems('products', { orderBy: 'price', orderDir: 'DESC' });
      expect(sortRes.data[0].price).toBe(12);
      expect(sortRes.data[2].price).toBe(5);
    });

    it('removes item from replica', async () => {
      await saveReplicaItem('products', { id: 'del_me', name: 'مؤقت' });
      expect(await getReplicaItem('products', 'del_me')).not.toBeNull();

      await removeReplicaItem('products', 'del_me');
      expect(await getReplicaItem('products', 'del_me')).toBeNull();
    });
  });

  describe('2. Offline Outbox Queue (offlineOutbox)', () => {
    it('enqueues mutations with idempotency id and pending status', async () => {
      const initialCount = await getPendingOutboxCount();
      expect(initialCount).toBe(0);

      const op = await enqueueOutboxItem({
        entity: 'sales',
        operation: 'create',
        localId: 'sale_101',
        payload: { id: 'sale_101', total: 150, items: [] },
      });

      expect(op.id).toBeDefined();
      expect(op.status).toBe('pending');
      expect(op.attempts).toBe(0);
      expect(op.localId).toBe('sale_101');

      const count = await getPendingOutboxCount();
      expect(count).toBe(1);

      const items = await getPendingOutboxItems();
      expect(items.length).toBe(1);
      expect(items[0].localId).toBe('sale_101');
    });

    it('flushes queued mutations via POST /api/sync/push to server', async () => {
      await enqueueOutboxItem({
        entity: 'sales',
        operation: 'create',
        localId: 'sale_201',
        payload: { id: 'sale_201', total: 85 },
      });

      // Mock server push endpoint response
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
        if (String(url).includes('/api/sync/push')) {
          const body = JSON.parse(init?.body as string);
          expect(body.operations).toBeDefined();
          expect(body.operations.length).toBe(1);
          expect(body.operations[0].localId).toBe('sale_201');

          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              processed: 1,
              succeeded: 1,
              failed: 0,
              results: [{ id: body.operations[0].id, success: true }],
            }),
          } as any;
        }
        return { ok: false, status: 404 } as any;
      });

      const res = await flushOutbox({
        serverUrl: 'http://192.168.1.100:3000',
        token: 'test_token',
        deviceId: 'term_1',
      });

      expect(res.pushed).toBe(1);
      expect(res.failed).toBe(0);
      expect(await getPendingOutboxCount()).toBe(0);

      fetchSpy.mockRestore();
    });

    it('handles server network failure during flush and increments attempt counter', async () => {
      await enqueueOutboxItem({
        entity: 'customers',
        operation: 'create',
        localId: 'cust_301',
        payload: { id: 'cust_301', name: 'أحمد محمود' },
      });

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

      const res = await flushOutbox({
        serverUrl: 'http://192.168.1.100:3000',
      });

      expect(res.pushed).toBe(0);
      expect(res.failed).toBe(1);

      const items = await getPendingOutboxItems();
      expect(items.length).toBe(1);
      expect(items[0].status).toBe('failed');
      expect(items[0].attempts).toBe(1);

      fetchSpy.mockRestore();
    });
  });

  describe('3. Transport Gateway Seamless Fallback & Zero Disruption Flow', () => {
    it('transparently falls back to local replica when network drops on list()', async () => {
      // Pre-seed local replica with products
      await saveReplicaItem('products', { id: 'p_offline_1', name: 'لبن زبادي', price: 3 });

      // Mock network failure (e.g. cable disconnected)
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

      const result = await httpTransportDb.list('products');
      expect(result.offlineReplica).toBe(true);
      expect(result.data.length).toBe(1);
      expect(result.data[0].id).toBe('p_offline_1');
      expect(result.data[0].name).toBe('لبن زبادي');
    });

    it('enables seamless cashier sales when offline: creates sale locally and queues in outbox', async () => {
      // Mock network failure (router turned off / server unreachable)
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

      const saleData = {
        id: 'sale_offline_999',
        total: 245.5,
        payment_method: 'cash',
        customer_id: 'cust_1',
        items: [{ product_id: 'p1', quantity: 2, price: 50 }],
      };

      // Call create through transport layer
      const response = await httpTransportDb.create('sales', saleData);

      // Verify cashier flow succeeded without throwing
      expect(response.queuedOffline).toBe(true);
      expect(response.data.id).toBe('sale_offline_999');
      expect(response.data.total).toBe(245.5);

      // Verify item exists in local replica for immediate viewing/printing
      const inReplica = await getReplicaItem('sales', 'sale_offline_999');
      expect(inReplica).not.toBeNull();
      expect(inReplica.total).toBe(245.5);

      // Verify mutation was queued into outbox
      const pending = await getPendingOutboxItems();
      expect(pending.length).toBe(1);
      expect(pending[0].entity).toBe('sales');
      expect(pending[0].operation).toBe('create');
      expect(pending[0].localId).toBe('sale_offline_999');
    });

    it('handles offline updates and deletes seamlessly without throwing', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

      // 1. Update customer offline
      await saveReplicaItem('customers', { id: 'c_offline_1', name: 'محمد', phone: '050111222' });
      const updateRes = await httpTransportDb.update('customers', 'c_offline_1', { phone: '050999888' });

      expect(updateRes.queuedOffline).toBe(true);
      expect(updateRes.data.phone).toBe('050999888');

      // 2. Delete item offline
      const removeRes = await httpTransportDb.remove('customers', 'c_offline_1');
      expect(removeRes.queuedOffline).toBe(true);
      expect(await getReplicaItem('customers', 'c_offline_1')).toBeNull();

      // Check queued mutations in outbox
      const pending = await getPendingOutboxItems();
      expect(pending.map((p) => p.operation)).toEqual(expect.arrayContaining(['update', 'delete']));
    });
  });
});
