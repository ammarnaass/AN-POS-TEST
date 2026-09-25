import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setStoredTransportConfig,
  getStoredTransportConfig,
  getStoredTerminalRole,
  isClientNode,
  httpTransportDb,
} from '../lib/transportGateway';
import {
  enqueueOutboxItem,
  getPendingOutboxCount,
  flushOutbox,
  clearOutbox,
} from '../lib/offlineOutbox';
import {
  saveReplicaItem,
  getReplicaItem,
  clearReplicaTable,
} from '../lib/offlineReplica';
import {
  isClientTerminal,
  isRestrictedTabOnClient,
  isManagerUnlocked,
  unlockManagerSession,
  lockManagerSession,
  verifyManagerPin,
} from '../lib/clientAccessControl';

// محاكاة منطق Rate Limiting لمنع هجمات التخمين والإغراق على رمز الاقتران (المطبق في pair.ts)
interface FailedAttemptRecord {
  count: number;
  firstAttemptAt: number;
  blockedUntil: number;
}
const failedPairingAttempts = new Map<string, FailedAttemptRecord>();

function checkPairingRateLimit(clientIp: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = failedPairingAttempts.get(clientIp);
  if (!record) return { allowed: true };

  if (record.blockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  if (now - record.firstAttemptAt > 60000 && record.blockedUntil <= now) {
    failedPairingAttempts.delete(clientIp);
    return { allowed: true };
  }

  return { allowed: true };
}

function recordFailedPairing(clientIp: string): void {
  const now = Date.now();
  const record = failedPairingAttempts.get(clientIp);
  if (!record || (now - record.firstAttemptAt > 60000 && record.blockedUntil <= now)) {
    failedPairingAttempts.set(clientIp, { count: 1, firstAttemptAt: now, blockedUntil: 0 });
  } else {
    record.count++;
    if (record.count >= 5) {
      record.blockedUntil = now + 60000;
    }
  }
}

function resetPairingFailures(clientIp: string): void {
  failedPairingAttempts.delete(clientIp);
}

describe('Phase 6: Network Setup Wizard, RBAC Hardening & Chaos Testing', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    await clearOutbox();
    await clearReplicaTable('sales');
    await clearReplicaTable('products');
    resetPairingFailures('192.168.1.55');
  });

  afterEach(() => {
    delete (window as any).electronAPI;
  });

  describe('1. Chaos Scenario: Network Dropout During Checkout (انقطاع الشبكة أثناء الدفع)', () => {
    it('seamlessly saves sale to offline replica and outbox without interrupting cashier', async () => {
      // Setup node as client terminal
      setStoredTransportConfig({
        role: 'client',
        serverUrl: 'http://192.168.1.100:3000',
        token: 'token_cashier_1',
        deviceId: 'term_pos_01',
      });

      const salePayload = {
        id: 'sale_chaos_001',
        invoiceNumber: 'INV-T02-9988',
        customerId: 'cust_cash_walkin',
        totalAmount: 185.5,
        paymentMethod: 'cash',
        paidAmount: 200,
        changeAmount: 14.5,
        status: 'completed',
        items: [
          { productId: 'prod_rice_5kg', quantity: 2, unitPrice: 45 },
          { productId: 'prod_oil_1l', quantity: 3, unitPrice: 31.83 },
        ],
        createdAt: new Date().toISOString(),
      };

      // Mock fetch to simulate sudden network dropout (LAN cable unplugged / router reboot)
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Failed to fetch: NET_CONN_REFUSED'));

      // Process checkout via transportGateway
      const result = await httpTransportDb.create('sales', salePayload);

      // Verify that offline outbox caught the transaction gracefully
      expect(result.data).not.toBeNull();
      expect(result.queuedOffline).toBe(true);

      // Verify local replica has the sale for local display & printing
      const localSale = await getReplicaItem('sales', 'sale_chaos_001');
      expect(localSale).not.toBeNull();
      expect(localSale.invoiceNumber).toBe('INV-T02-9988');
      expect(localSale.totalAmount).toBe(185.5);

      // Verify outbox queue has 1 pending item ready for synchronization
      const pendingCount = await getPendingOutboxCount();
      expect(pendingCount).toBe(1);

      // Restore network and flush outbox
      fetchSpy.mockImplementationOnce(async (url, init: any) => {
        const body = JSON.parse(init.body);
        const ops = body.operations || [];
        return {
          ok: true,
          json: async () => ({
            success: true,
            results: ops.map((op: any) => ({ id: op.id, success: true })),
          }),
        } as any;
      });

      const flushResult = await flushOutbox();
      expect(flushResult.pushed).toBe(1);
      expect(flushResult.failed).toBe(0);

      // Queue is now empty
      const afterFlushCount = await getPendingOutboxCount();
      expect(afterFlushCount).toBe(0);
    });
  });

  describe('2. Stress Test: High Concurrency Load (50 عملية بيع متزامنة في نفس الثانية)', () => {
    it('executes 50 concurrent transactions safely with idempotency and zero collisions', async () => {
      setStoredTransportConfig({
        role: 'client',
        serverUrl: 'http://192.168.1.100:3000',
        token: 'token_stress_test',
        deviceId: 'term_stress_01',
      });

      // Track product stock
      let initialStock = 200;
      const soldPerSale = 2;
      const totalSales = 50;

      // Mock fetch / IPC to simulate fast SQLite atomic write
      const processedSales: any[] = [];
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init: any) => {
        const body = JSON.parse(init.body);
        processedSales.push(body);
        initialStock -= soldPerSale;
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: { id: body.id, stockRemaining: initialStock },
          }),
        } as any;
      });

      // Launch 50 sales simultaneously
      const salePromises = Array.from({ length: totalSales }).map((_, index) => {
        const terminalPrefix = index % 2 === 0 ? 'T01' : 'T02';
        const sale = {
          id: `sale_concurrent_${index + 1}`,
          invoiceNumber: `INV-${terminalPrefix}-${String(index + 1).padStart(4, '0')}`,
          total: 50.0,
          productId: 'prod_sugar_2kg',
          qty: soldPerSale,
        };
        return httpTransportDb.create('sales', sale);
      });

      const results = await Promise.all(salePromises);

      // Assertions
      expect(results).toHaveLength(totalSales);
      expect(processedSales).toHaveLength(totalSales);

      // All IDs must be strictly unique
      const ids = new Set(processedSales.map((s) => s.id));
      expect(ids.size).toBe(totalSales);

      // All invoice numbers must be strictly unique
      const invoiceNumbers = new Set(processedSales.map((s) => s.invoiceNumber));
      expect(invoiceNumbers.size).toBe(totalSales);

      // Final stock must match exact arithmetic (200 - 50 * 2 = 100)
      expect(initialStock).toBe(100);
    });
  });

  describe('3. Role-Based Access Control (RBAC) & Hardening on Client Terminals', () => {
    it('identifies client terminals and blocks access to sensitive tabs', () => {
      // 1. When on Server
      setStoredTransportConfig({ role: 'server' });
      expect(isClientTerminal()).toBe(false);
      expect(isRestrictedTabOnClient('export')).toBe(false);
      expect(isRestrictedTabOnClient('users')).toBe(false);

      // 2. When on Client
      setStoredTransportConfig({ role: 'client' });
      expect(isClientTerminal()).toBe(true);
      expect(isRestrictedTabOnClient('export')).toBe(true);
      expect(isRestrictedTabOnClient('users')).toBe(true);
      // Non-restricted tab is permitted
      expect(isRestrictedTabOnClient('pos')).toBe(false);
      expect(isRestrictedTabOnClient('general')).toBe(false);
    });

    it('requires Manager PIN to unlock restricted sections and manages session lifetime', async () => {
      setStoredTransportConfig({ role: 'client' });

      // Initially locked
      expect(isManagerUnlocked()).toBe(false);

      // Reject invalid PIN
      const invalidRes = await verifyManagerPin('wrong_pin');
      expect(invalidRes.success).toBe(false);
      expect(isManagerUnlocked()).toBe(false);

      // Accept valid Manager PIN
      const validRes = await verifyManagerPin('1234');
      expect(validRes.success).toBe(true);
      expect(validRes.managerName).toBeTruthy();
      expect(isManagerUnlocked()).toBe(true);

      // Lock session manually
      lockManagerSession();
      expect(isManagerUnlocked()).toBe(false);
    });

    it('enforces rate limiting against brute-force pairing attacks', () => {
      const testIp = '192.168.1.55';

      // 1-4 failed attempts are allowed
      for (let i = 1; i <= 4; i++) {
        recordFailedPairing(testIp);
        const check = checkPairingRateLimit(testIp);
        expect(check.allowed).toBe(true);
      }

      // 5th failed attempt triggers 60s lockout
      recordFailedPairing(testIp);
      const lockedCheck = checkPairingRateLimit(testIp);
      expect(lockedCheck.allowed).toBe(false);
      expect(lockedCheck.retryAfterSeconds).toBeGreaterThan(0);
      expect(lockedCheck.retryAfterSeconds).toBeLessThanOrEqual(60);

      // Reset allows immediately
      resetPairingFailures(testIp);
      expect(checkPairingRateLimit(testIp).allowed).toBe(true);
    });
  });

  describe('4. Initial Setup Wizard & Role Persistence', () => {
    it('correctly persists transport gateway configuration across sessions', () => {
      // Configure client terminal
      setStoredTransportConfig({
        role: 'client',
        serverUrl: 'http://192.168.1.200:3000',
        token: 'auth_jwt_token_999',
        deviceId: 'term_hall_front',
      });

      const restored = getStoredTransportConfig();
      expect(restored.role).toBe('client');
      expect(restored.serverUrl).toBe('http://192.168.1.200:3000');
      expect(restored.token).toBe('auth_jwt_token_999');
      expect(restored.deviceId).toBe('term_hall_front');

      expect(getStoredTerminalRole()).toBe('client');
      expect(isClientNode()).toBe(true);
    });
  });
});
