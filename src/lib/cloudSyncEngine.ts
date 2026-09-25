// cloudSyncEngine.ts — محرك المزامنة السحابية المزدوج في الواجهة (Client Frontend Engine)
// يدير حالة المزامنة مع السحابة المركزية، الجدولة التلقائية، ويوفر خطافات React

import { useState, useEffect, useCallback, useRef } from 'react';
import { getStoredTerminalRole } from './transportGateway';

export interface CloudSyncStatus {
  cloudEnabled: boolean;
  terminalRole: 'server' | 'client';
  isMasterNode: boolean;
  apiUrl: string;
  apiKeyMasked: string;
  webhookUrl: string;
  syncAuto: boolean;
  syncInterval: number;
  syncType: 'incremental' | 'full';
  state: 'idle' | 'syncing' | 'offline' | 'error' | 'disabled';
  lastSyncAt: string | null;
  lastPushAt: string | null;
  lastPullAt: string | null;
  pushedCount: number;
  pulledCount: number;
  lastError: string | null;
  syncFailCount: number;
}

const DEFAULT_STATUS: CloudSyncStatus = {
  cloudEnabled: false,
  terminalRole: 'server',
  isMasterNode: true,
  apiUrl: '',
  apiKeyMasked: '',
  webhookUrl: '',
  syncAuto: true,
  syncInterval: 5,
  syncType: 'incremental',
  state: 'disabled',
  lastSyncAt: null,
  lastPushAt: null,
  lastPullAt: null,
  pushedCount: 0,
  pulledCount: 0,
  lastError: null,
  syncFailCount: 0,
};

const STATUS_LISTENERS = new Set<(status: CloudSyncStatus) => void>();
let cachedStatus: CloudSyncStatus = { ...DEFAULT_STATUS };
let isSyncingGlobally = false;

function notifyStatusListeners(status: CloudSyncStatus) {
  cachedStatus = status;
  STATUS_LISTENERS.forEach((cb) => {
    try {
      cb(status);
    } catch {
      /* ignore */
    }
  });
}

/**
 * جلب حالة المزامنة السحابية الحالية من Electron IPC أو التخزين المحلي
 */
export async function fetchCloudStatus(): Promise<CloudSyncStatus> {
  const role = getStoredTerminalRole();

  if (typeof window !== 'undefined' && (window as any).electronAPI?.cloud?.getStatus) {
    try {
      const res = await (window as any).electronAPI.cloud.getStatus();
      const status: CloudSyncStatus = {
        ...DEFAULT_STATUS,
        ...res,
        terminalRole: role,
        isMasterNode: role === 'server',
      };
      notifyStatusListeners(status);
      return status;
    } catch (err) {
      console.warn('[cloudSyncEngine] تعذر قراءة حالة السحابة من IPC:', err);
    }
  }

  // وضع المتصفح / الاختبارات
  const mockStatus: CloudSyncStatus = {
    ...cachedStatus,
    terminalRole: role,
    isMasterNode: role === 'server',
  };
  return mockStatus;
}

/**
 * إطلاق عملية مزامنة سحابية يدوية فورية
 */
export async function triggerCloudSync(options?: {
  forceFull?: boolean;
}): Promise<{
  success: boolean;
  pushed: number;
  pulled: number;
  error?: string;
}> {
  if (isSyncingGlobally) {
    return { success: false, pushed: 0, pulled: 0, error: 'المزامنة قيد التنفيذ حالياً' };
  }

  const role = getStoredTerminalRole();
  if (role === 'client') {
    return {
      success: false,
      pushed: 0,
      pulled: 0,
      error: 'المزامنة السحابية تتم حصرياً عبر حاسوب الخادم الرئيسي (Master Node)',
    };
  }

  isSyncingGlobally = true;
  notifyStatusListeners({ ...cachedStatus, state: 'syncing' });

  try {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.cloud?.syncNow) {
      const res = await (window as any).electronAPI.cloud.syncNow(options);
      await fetchCloudStatus();
      return res;
    }

    // محاكاة وضع المتصفح/الاختبار
    await new Promise((resolve) => setTimeout(resolve, 600));
    const nowIso = new Date().toISOString();
    const updated: CloudSyncStatus = {
      ...cachedStatus,
      state: 'idle',
      lastSyncAt: nowIso,
      lastPushAt: nowIso,
      lastPullAt: nowIso,
      pushedCount: (cachedStatus.pushedCount || 0) + 5,
      pulledCount: (cachedStatus.pulledCount || 0) + 2,
      lastError: null,
      syncFailCount: 0,
    };
    notifyStatusListeners(updated);
    return { success: true, pushed: 5, pulled: 2 };
  } catch (err: any) {
    const errorMsg = err?.message || 'فشلت المزامنة السحابية';
    notifyStatusListeners({ ...cachedStatus, state: 'error', lastError: errorMsg });
    return { success: false, pushed: 0, pulled: 0, error: errorMsg };
  } finally {
    isSyncingGlobally = false;
  }
}

/**
 * بدء تشغيل مستمعات الشبكة وجدولة المزامنة السحابية
 */
export function initCloudSyncEngine(): () => void {
  if (typeof window === 'undefined') return () => {};

  fetchCloudStatus().catch(() => {});

  // الاستماع لعودة الإنترنت
  const handleOnline = () => {
    console.log('[cloudSyncEngine] 🌐 عادت خدمة الإنترنت، فحص المزامنة السحابية...');
    const role = getStoredTerminalRole();
    if (role === 'server' && cachedStatus.cloudEnabled && cachedStatus.syncAuto) {
      triggerCloudSync().catch(() => {});
    }
  };
  window.addEventListener('online', handleOnline);

  // تحديث الحالة دورياً كل 40 ثانية
  const interval = setInterval(() => {
    fetchCloudStatus().catch(() => {});
  }, 40000);

  return () => {
    window.removeEventListener('online', handleOnline);
    clearInterval(interval);
  };
}

/**
 * خطاف React لمراقبة حالة المزامنة السحابية المركزية
 */
export function useCloudSyncStatus() {
  const [status, setStatus] = useState<CloudSyncStatus>(cachedStatus);
  const [isSyncing, setIsSyncing] = useState<boolean>(isSyncingGlobally);
  const isMountedRef = useRef(true);

  const refresh = useCallback(async () => {
    const st = await fetchCloudStatus();
    if (isMountedRef.current) {
      setStatus(st);
      setIsSyncing(st.state === 'syncing' || isSyncingGlobally);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    refresh();

    const unsub = () => {
      STATUS_LISTENERS.delete(listener);
    };
    const listener = (newStatus: CloudSyncStatus) => {
      if (isMountedRef.current) {
        setStatus(newStatus);
        setIsSyncing(newStatus.state === 'syncing' || isSyncingGlobally);
      }
    };
    STATUS_LISTENERS.add(listener);

    return () => {
      isMountedRef.current = false;
      unsub();
    };
  }, [refresh]);

  const syncNow = useCallback(
    async (opts?: { forceFull?: boolean }) => {
      setIsSyncing(true);
      const res = await triggerCloudSync(opts);
      await refresh();
      return res;
    },
    [refresh]
  );

  return {
    status,
    isSyncing,
    isMasterNode: status.isMasterNode,
    syncNow,
    refresh,
  };
}
