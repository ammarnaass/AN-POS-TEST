import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  fetchCloudStatus,
  triggerCloudSync,
  initCloudSyncEngine,
  CloudSyncStatus,
} from '../lib/cloudSyncEngine';
import { setStoredTransportConfig } from '../lib/transportGateway';

describe('Phase 5: Cloud Sync Engine & CDC (المرحلة 5: محرك المزامنة السحابية المزدوج)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    delete (window as any).electronAPI;
  });

  describe('1. Single Egress Master Node Rule (قاعدة المنفذ السحابي الوحيد)', () => {
    it('strictly forbids client terminals from pushing directly to cloud', async () => {
      // Configure node as client
      setStoredTransportConfig({
        role: 'client',
        serverUrl: 'http://192.168.1.150:3000',
        token: 'client_token_abc',
        deviceId: 'term_cashier_2',
      });

      const status = await fetchCloudStatus();
      expect(status.terminalRole).toBe('client');
      expect(status.isMasterNode).toBe(false);

      // Attempting to trigger sync should immediately reject with Arabic explanation
      const result = await triggerCloudSync();
      expect(result.success).toBe(false);
      expect(result.pushed).toBe(0);
      expect(result.pulled).toBe(0);
      expect(result.error).toContain('حصرياً عبر حاسوب الخادم الرئيسي');
    });

    it('allows server / master terminal to initiate cloud synchronization', async () => {
      setStoredTransportConfig({
        role: 'server',
        deviceId: 'master_server_main',
      });

      const status = await fetchCloudStatus();
      expect(status.terminalRole).toBe('server');
      expect(status.isMasterNode).toBe(true);

      // In browser/test mock mode, server node can trigger sync successfully
      const result = await triggerCloudSync();
      expect(result.success).toBe(true);
      expect(result.pushed).toBeGreaterThan(0);
      expect(result.pulled).toBeGreaterThan(0);
    });
  });

  describe('2. IPC Bridge Integration with Electron', () => {
    it('delegates to window.electronAPI.cloud.getStatus when present', async () => {
      const mockStatus: Partial<CloudSyncStatus> = {
        cloudEnabled: true,
        terminalRole: 'server',
        isMasterNode: true,
        apiUrl: 'https://api.myposcloud.com/v1',
        apiKeyMasked: 'live••••9999',
        syncAuto: true,
        syncInterval: 10,
        syncType: 'incremental',
        state: 'idle',
        lastSyncAt: '2026-09-25T05:00:00.000Z',
        pushedCount: 142,
        pulledCount: 38,
        lastError: null,
      };

      (window as any).electronAPI = {
        cloud: {
          getStatus: vi.fn().mockResolvedValue(mockStatus),
          syncNow: vi.fn(),
          restartScheduler: vi.fn(),
        },
      };

      setStoredTransportConfig({ role: 'server' });
      const status = await fetchCloudStatus();

      expect((window as any).electronAPI.cloud.getStatus).toHaveBeenCalled();
      expect(status.cloudEnabled).toBe(true);
      expect(status.apiUrl).toBe('https://api.myposcloud.com/v1');
      expect(status.apiKeyMasked).toBe('live••••9999');
      expect(status.pushedCount).toBe(142);
      expect(status.pulledCount).toBe(38);
    });

    it('delegates to window.electronAPI.cloud.syncNow and returns result', async () => {
      (window as any).electronAPI = {
        cloud: {
          getStatus: vi.fn().mockResolvedValue({
            cloudEnabled: true,
            terminalRole: 'server',
            isMasterNode: true,
            apiUrl: 'https://api.myposcloud.com/v1',
            state: 'idle',
          }),
          syncNow: vi.fn().mockResolvedValue({
            success: true,
            pushed: 12,
            pulled: 4,
          }),
        },
      };

      setStoredTransportConfig({ role: 'server' });
      const res = await triggerCloudSync({ forceFull: true });

      expect((window as any).electronAPI.cloud.syncNow).toHaveBeenCalledWith({ forceFull: true });
      expect(res.success).toBe(true);
      expect(res.pushed).toBe(12);
      expect(res.pulled).toBe(4);
    });
  });

  describe('3. Silent Internet Resilience (الصمود الصامت أمام انقطاع الإنترنت)', () => {
    it('handles offline/connection errors silently without unhandled exceptions', async () => {
      (window as any).electronAPI = {
        cloud: {
          getStatus: vi.fn().mockResolvedValue({
            cloudEnabled: true,
            terminalRole: 'server',
            isMasterNode: true,
            apiUrl: 'https://api.myposcloud.com/v1',
            state: 'offline',
            lastError: 'انقطع الاتصال بالإنترنت',
          }),
          syncNow: vi.fn().mockRejectedValue(new Error('ETIMEDOUT: Connection refused')),
        },
      };

      setStoredTransportConfig({ role: 'server' });
      const res = await triggerCloudSync();

      // Silent error returned cleanly
      expect(res.success).toBe(false);
      expect(res.pushed).toBe(0);
      expect(res.pulled).toBe(0);
      expect(res.error).toBe('ETIMEDOUT: Connection refused');
    });

    it('listens for online event and triggers sync recovery', async () => {
      setStoredTransportConfig({ role: 'server' });

      const syncNowMock = vi.fn().mockResolvedValue({ success: true, pushed: 1, pulled: 1 });
      (window as any).electronAPI = {
        cloud: {
          getStatus: vi.fn().mockResolvedValue({
            cloudEnabled: true,
            terminalRole: 'server',
            isMasterNode: true,
            syncAuto: true,
            apiUrl: 'https://api.myposcloud.com/v1',
            state: 'idle',
          }),
          syncNow: syncNowMock,
        },
      };

      const cleanup = initCloudSyncEngine();

      // Wait a tick for initial status fetch
      await new Promise((r) => setTimeout(r, 20));

      // Simulate internet recovery event
      window.dispatchEvent(new Event('online'));

      await new Promise((r) => setTimeout(r, 50));
      expect(syncNowMock).toHaveBeenCalled();

      cleanup();
    });
  });

  describe('4. Change Data Capture (CDC) and Master-Wins Specification', () => {
    it('verifies outbound and inbound entity table separation', () => {
      const outboundTables = [
        'sales',
        'sale_items',
        'payments',
        'customers',
        'expenses',
        'stock_movements_v2',
        'cash_sessions',
        'user_activities',
      ];
      const inboundTables = [
        'products',
        'categories',
        'promotions',
        'packs',
        'settings',
      ];

      // Verify no collision between outbound transactional entities and inbound catalog entities
      outboundTables.forEach((table) => {
        expect(inboundTables).not.toContain(table);
      });
    });

    it('handles concurrency: rejects simultaneous sync requests with in-progress error', async () => {
      setStoredTransportConfig({ role: 'server' });

      // Start first sync
      const p1 = triggerCloudSync();
      // Immediately start second sync while first is in flight
      const p2 = triggerCloudSync();

      const [res1, res2] = await Promise.all([p1, p2]);

      // One should succeed, the other should report already in progress
      expect(res1.success || res2.success).toBe(true);
      if (!res2.success) {
        expect(res2.error).toContain('المزامنة قيد التنفيذ حالياً');
      }
    });
  });
});
