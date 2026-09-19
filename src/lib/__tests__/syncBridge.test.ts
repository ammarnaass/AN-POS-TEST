import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initSyncBridge } from '../syncBridge';

describe('syncBridge', () => {
  let mockInvalidateQueries: any;
  let mockQueryClient: any;
  let listeners: ((payload: any) => void)[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    listeners = [];
    mockInvalidateQueries = vi.fn();
    mockQueryClient = {
      invalidateQueries: mockInvalidateQueries,
    };

    (window as any).electronAPI = {
      db: {
        onTableUpdated: (cb: (payload: any) => void) => {
          listeners.push(cb);
          return () => {
            listeners = listeners.filter((l) => l !== cb);
          };
        },
      },
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (window as any).electronAPI;
  });

  it('debounces and invalidates correct query keys when tables are updated', async () => {
    const cleanup = initSyncBridge(mockQueryClient);

    // Trigger update for sales
    listeners.forEach((cb) => cb({ table: 'sales', action: 'create', id: 'INV-000001' }));
    listeners.forEach((cb) => cb({ table: 'products', action: 'update' }));

    // Before timer advances, no queries should have been invalidated yet
    expect(mockInvalidateQueries).not.toHaveBeenCalled();

    // Fast-forward debounce timer
    vi.advanceTimersByTime(60);

    // Should have invalidated sales and products related queries
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['sales'] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['products'] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['cash_sessions'] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['cashSessions'] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['customers'] });

    cleanup();
  });

  it('cleans up properly on unmount', () => {
    const cleanup = initSyncBridge(mockQueryClient);
    expect(listeners.length).toBe(1);

    cleanup();
    expect(listeners.length).toBe(0);
  });
});
