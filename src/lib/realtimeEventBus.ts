// realtimeEventBus.ts — محرك الأحداث اللحظية المباشرة (WebSockets & SSE Event Bus)
// يوفر قناة اتصال لحظية فائقة السرعة (< 20ms) بين حاسوب الخادم ومحطات الكاشير (Clients)
//
// الميزات الأساسية:
// 1. إدارة ذكية لدور الجهاز: خادم رئيسي (Server Master عبر IPC) أو محطة طرفية (Client عبر WebSocket/SSE).
// 2. قنوات الأحداث اللحظية الأربعة:
//    - product:updated: تحديث أسعار المنتجات والتصنيفات فورياً.
//    - stock:changed: تحديث رصيد المخزون التراكمي لمنع البيع بالسالب.
//    - order:suspended: مشاركة الفواتير المعلقة عبر الصالة بين أجهزة الكاشير.
//    - customer:updated: تحديث ديون وأرصدة العملاء اللحظية.
//    - table:updated: تحديث عام لأي جدول في SQLite.
// 3. إعادة الاتصال التلقائي مع تراجع أسي (Exponential Backoff Auto-Reconnect: 1s -> 15s).
// 4. تبديل تلقائي فوري إلى Server-Sent Events (SSE) في حال حظر مقابس WebSocket.
// 5. نبضات حيوية (Heartbeat Ping/Pong) كل 20 ثانية لقياس زمن الاستجابة (Latency) واكتشاف الانقطاع.
// 6. إبطال تلقائي واستباقي لكاش React Query بالتسلسل الصحيح.

import { useState, useEffect } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import {
  getStoredTerminalRole,
  getStoredServerLanUrl,
  getStoredClientToken,
  getStoredClientDeviceId,
  type TerminalRole,
} from './transportGateway';

export type RealtimeEventType =
  | 'product:updated'
  | 'stock:changed'
  | 'order:suspended'
  | 'customer:updated'
  | 'table:updated'
  | 'pos:scan'
  | 'connected'
  | 'ping'
  | 'pong';

export type RealtimeConnectionState =
  | 'connected'
  | 'connecting'
  | 'reconnecting'
  | 'disconnected'
  | 'server_master'
  | 'standalone';

export interface RealtimeEvent<T = any> {
  id: string;
  type: RealtimeEventType | string;
  data: T;
  timestamp: string;
  senderDeviceId?: string;
}

export interface RealtimeStatus {
  state: RealtimeConnectionState;
  role: TerminalRole;
  transport: 'websocket' | 'sse' | 'ipc' | 'none';
  serverUrl: string;
  lastConnectedAt: string | null;
  lastPingMs: number | null;
  reconnectAttempts: number;
}

type EventListener = (event: RealtimeEvent) => void;
type StatusListener = (status: RealtimeStatus) => void;

class RealtimeEventBusManager {
  private queryClient?: QueryClient;
  private ws: WebSocket | null = null;
  private sse: EventSource | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private lastPingSentAt: number = 0;
  private isExplicitlyClosed = false;
  private ipcUnsubscribe: (() => void) | null = null;

  private listeners = new Set<EventListener>();
  private statusListeners = new Set<StatusListener>();

  private status: RealtimeStatus = {
    state: 'standalone',
    role: 'server',
    transport: 'none',
    serverUrl: '',
    lastConnectedAt: null,
    lastPingMs: null,
    reconnectAttempts: 0,
  };

  /**
   * تهيئة محرك الأحداث اللحظية وربطه بـ React Query
   */
  public init(queryClient?: QueryClient): () => void {
    if (typeof window === 'undefined') return () => {};

    this.queryClient = queryClient;
    this.isExplicitlyClosed = false;

    // تهيئة الاتصال بناءً على الدور الحالي للجهاز
    this.configureAndConnect();

    // الاستماع لأحداث الشبكة في المتصفح لإعادة الاتصال فور عودة الاتصال
    const onOnline = () => {
      if (this.status.state === 'disconnected' || this.status.state === 'reconnecting') {
        console.log('[realtimeEventBus] 🌐 اكتشاف عودة اتصال الشبكة، محاولة إعادة الاتصال فوراً...');
        this.reconnect();
      }
    };
    window.addEventListener('online', onOnline);

    // الاستماع لتغييرات التخزين المحلي (في حال تم تغيير عنوان الخادم أو الدور من نافذة الإعدادات)
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === 'anpos_terminal_role' ||
        e.key === 'anpos_server_lan_url' ||
        e.key === 'anpos_client_token'
      ) {
        console.log('[realtimeEventBus] 🔄 رصد تعديل في إعدادات الشبكة، إعادة تهيئة محرك الأحداث...');
        this.configureAndConnect();
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('storage', onStorage);
      this.close();
    };
  }

  /**
   * تحديث الحالة وإخطار المشتركين
   */
  private setStatus(patch: Partial<RealtimeStatus>) {
    this.status = { ...this.status, ...patch };
    for (const listener of this.statusListeners) {
      try {
        listener(this.status);
      } catch (err) {
        console.warn('[realtimeEventBus] خطأ في مستمع الحالة:', err);
      }
    }
  }

  /**
   * تهيئة وتوجيه الاتصال حسب دور الجهاز (Server Master أو Client Terminal)
   */
  public configureAndConnect(): void {
    const role = getStoredTerminalRole();
    const serverUrl = getStoredServerLanUrl();
    const token = getStoredClientToken();
    const deviceId = getStoredClientDeviceId();

    this.cleanupTransports();

    if (role === 'server') {
      // الجهاز هو حاسوب الخادم الرئيسي:
      // يستمع لأحداث Electron IPC المحلية المرسلة عبر BrowserWindow
      const api = (window as any).electronAPI;
      if (api?.realtime?.onEvent) {
        this.ipcUnsubscribe = api.realtime.onEvent((evt: RealtimeEvent) => {
          this.handleIncomingEvent(evt);
        });
      }

      this.setStatus({
        state: 'server_master',
        role: 'server',
        transport: 'ipc',
        serverUrl: 'localhost',
        lastConnectedAt: new Date().toISOString(),
        reconnectAttempts: 0,
        lastPingMs: 0,
      });
      console.log('[realtimeEventBus] ⚙️ محرك الأحداث يعمل في وضع الخادم الرئيسي (Server Master)');
      return;
    }

    // الجهاز هو جهاز عميل (Client Terminal):
    if (!serverUrl) {
      this.setStatus({
        state: 'disconnected',
        role: 'client',
        transport: 'none',
        serverUrl: '',
        reconnectAttempts: 0,
      });
      console.log('[realtimeEventBus] ⚠️ عنوان خادم الشبكة غير محدد في جهاز العميل');
      return;
    }

    this.setStatus({
      state: this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting',
      role: 'client',
      serverUrl,
      reconnectAttempts: this.reconnectAttempts,
    });

    this.connectWebSocket(serverUrl, token, deviceId);
  }

  /**
   * بدء اتصال WebSocket بالخادم
   */
  private connectWebSocket(serverUrl: string, token: string, deviceId: string): void {
    try {
      const cleanHttpUrl = serverUrl.trim().replace(/\/+$/, '');
      const wsUrl = cleanHttpUrl.replace(/^http/i, 'ws') +
        `/api/events?token=${encodeURIComponent(token)}&deviceId=${encodeURIComponent(deviceId)}`;

      console.log(`[realtimeEventBus] 🔌 جاري الاتصال بخادم الأحداث عبر WebSocket: ${cleanHttpUrl}`);
      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      socket.onopen = () => {
        if (this.ws !== socket) return;
        this.reconnectAttempts = 0;
        this.setStatus({
          state: 'connected',
          transport: 'websocket',
          lastConnectedAt: new Date().toISOString(),
          reconnectAttempts: 0,
        });
        console.log('[realtimeEventBus] 🟢 تم الاتصال بنجاح بخادم الأحداث اللحظية عبر WebSocket');

        // بدء نبضات الحيوية كل 20 ثانية لقياس زمن الاستجابة
        this.startHeartbeat();
      };

      socket.onmessage = (event) => {
        if (this.ws !== socket) return;
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'pong' || payload.type === 'ping') {
            this.handleHeartbeatResponse(payload);
            return;
          }
          this.handleIncomingEvent(payload);
        } catch {
          // non-blocking
        }
      };

      socket.onerror = (err) => {
        console.warn('[realtimeEventBus] خطأ في مقبس WebSocket:', err);
      };

      socket.onclose = (event) => {
        if (this.ws !== socket) return;
        this.ws = null;
        this.stopHeartbeat();

        if (this.isExplicitlyClosed) return;

        console.warn(`[realtimeEventBus] 🔴 انقطع اتصال WebSocket (كود: ${event.code}) — التبديل للبديل أو إعادة المحاولة`);

        // إذا كان الفشل في المحاولة الأولى، نجرب SSE كبديل فوري
        if (this.reconnectAttempts === 0) {
          this.fallbackToSse(serverUrl, token, deviceId);
        } else {
          this.scheduleReconnect();
        }
      };
    } catch (err) {
      console.warn('[realtimeEventBus] تعذر إنشاء اتصال WebSocket:', err);
      this.fallbackToSse(serverUrl, token, deviceId);
    }
  }

  /**
   * التبديل التلقائي إلى Server-Sent Events (SSE) في حال حظر WebSocket على الشبكة
   */
  private fallbackToSse(serverUrl: string, token: string, deviceId: string): void {
    if (typeof EventSource === 'undefined') {
      this.scheduleReconnect();
      return;
    }

    try {
      const cleanHttpUrl = serverUrl.trim().replace(/\/+$/, '');
      const sseUrl = `${cleanHttpUrl}/api/events/sse?token=${encodeURIComponent(token)}&deviceId=${encodeURIComponent(deviceId)}`;

      console.log(`[realtimeEventBus] 📡 تجربة قناة Server-Sent Events (SSE) البديلة: ${cleanHttpUrl}`);
      const sse = new EventSource(sseUrl);
      this.sse = sse;

      sse.onopen = () => {
        if (this.sse !== sse) return;
        this.reconnectAttempts = 0;
        this.setStatus({
          state: 'connected',
          transport: 'sse',
          lastConnectedAt: new Date().toISOString(),
          reconnectAttempts: 0,
        });
        console.log('[realtimeEventBus] 🟢 تم الاتصال بنجاح عبر قناة SSE البديلة');
      };

      // الاستماع لكافة قنوات الأحداث المدعومة
      const channels: RealtimeEventType[] = [
        'product:updated',
        'stock:changed',
        'order:suspended',
        'customer:updated',
        'table:updated',
        'pos:scan',
      ];

      for (const channel of channels) {
        sse.addEventListener(channel, (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            this.handleIncomingEvent(data);
          } catch {}
        });
      }

      sse.onerror = () => {
        if (this.sse !== sse) return;
        this.sse.close();
        this.sse = null;
        console.warn('[realtimeEventBus] 🔴 فشل اتصال SSE — جدولة إعادة المحاولة...');
        this.scheduleReconnect();
      };
    } catch (err) {
      console.warn('[realtimeEventBus] فشل تهيئة SSE:', err);
      this.scheduleReconnect();
    }
  }

  /**
   * جدولة إعادة الاتصال مع تراجع أسي (Exponential Backoff)
   * الفاصل يبدأ من 1000ms ويتضاعف حتى 15000ms كحد أقصى مع إضافة تشتيت عشوائي (Jitter)
   */
  private scheduleReconnect(): void {
    if (this.isExplicitlyClosed) return;

    this.reconnectAttempts++;
    this.setStatus({
      state: 'reconnecting',
      transport: 'none',
      reconnectAttempts: this.reconnectAttempts,
    });

    const baseDelay = Math.min(15000, 1000 * Math.pow(1.5, Math.min(this.reconnectAttempts, 8)));
    const jitter = Math.floor(Math.random() * 500);
    const delay = Math.round(baseDelay + jitter);

    console.log(`[realtimeEventBus] ⏱️ سيتم إعادة محاولة الاتصال بعد ${delay}ms (المحاولة #${this.reconnectAttempts})`);

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.configureAndConnect();
    }, delay);
  }

  /**
   * تشغيل نبضات الحيوية (Heartbeat) كل 20 ثانية
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.lastPingSentAt = Date.now();
        try {
          this.ws.send(JSON.stringify({ type: 'ping', timestamp: this.lastPingSentAt }));
        } catch {}
      }
    }, 20000);
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private handleHeartbeatResponse(_payload: any): void {
    if (this.lastPingSentAt > 0) {
      const latency = Math.max(1, Date.now() - this.lastPingSentAt);
      this.setStatus({ lastPingMs: latency });
      this.lastPingSentAt = 0;
    }
  }

  /**
   * معالجة الحدث الوارد وتوجيهه للمشتركين وإبطال كاش React Query المناسب
   */
  private handleIncomingEvent(event: RealtimeEvent): void {
    if (!event || !event.type) return;

    console.log(`[realtimeEventBus] ⚡ حدث لحظي مستلم: ${event.type}`, event.data);

    // 1. إخطار المستمعين المشتركين
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.warn('[realtimeEventBus] خطأ في معالج المشترك للحدث:', err);
      }
    }

    // 2. إطلاق حدث DOM مخصص للمكونات المعزولة
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('an-pos:realtime-event', { detail: event }));
      } catch {}
    }

    // 3. إبطال كاش React Query تلقائياً بحسب نوع الحدث
    this.invalidateCachesForEvent(event);
  }

  /**
   * إبطال كاش React Query الذكي بحسب نوع الحدث المباشر
   */
  private invalidateCachesForEvent(event: RealtimeEvent): void {
    const qc = this.queryClient;
    if (!qc) return;

    const { type, data } = event;

    switch (type) {
      case 'product:updated':
        qc.invalidateQueries({ queryKey: ['products'] });
        qc.invalidateQueries({ queryKey: ['categories'] });
        qc.invalidateQueries({ queryKey: ['packs'] });
        break;

      case 'stock:changed':
        qc.invalidateQueries({ queryKey: ['products'] });
        qc.invalidateQueries({ queryKey: ['inventory_movements'] });
        qc.invalidateQueries({ queryKey: ['sales'] });
        break;

      case 'order:suspended':
        qc.invalidateQueries({ queryKey: ['sales'] });
        qc.invalidateQueries({ queryKey: ['suspended_orders'] });
        qc.invalidateQueries({ queryKey: ['suspended_sales'] });
        break;

      case 'customer:updated':
        qc.invalidateQueries({ queryKey: ['customers'] });
        qc.invalidateQueries({ queryKey: ['customer_transactions'] });
        break;

      case 'table:updated':
        if (data?.table) {
          qc.invalidateQueries({ queryKey: [data.table] });
        } else {
          qc.invalidateQueries();
        }
        break;

      default:
        // حدث غير معروف — إبطال عام احتياطي إذا طُلب
        break;
    }
  }

  /**
   * بث حدث فوري إلى الخادم والمحطات الأخرى
   */
  public async emit(type: RealtimeEventType | string, data: any = {}): Promise<boolean> {
    const role = getStoredTerminalRole();

    // في وضع الخادم: بث محلياً وعبر الشبكة
    if (role === 'server') {
      const api = (window as any).electronAPI;
      if (api?.realtime?.emit) {
        try {
          const res = await api.realtime.emit(type, data);
          return Boolean(res?.success);
        } catch {
          return false;
        }
      }
      return false;
    }

    // في وضع العميل: إرسال عبر مقبس WebSocket المفتوح
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type, data }));
        return true;
      } catch {
        // ننتقل للبديل HTTP أدناه
      }
    }

    // بديل HTTP POST في حال عدم اتصال WebSocket
    const serverUrl = getStoredServerLanUrl();
    const token = getStoredClientToken();
    const deviceId = getStoredClientDeviceId();

    if (!serverUrl) return false;

    try {
      const cleanHttpUrl = serverUrl.trim().replace(/\/+$/, '');
      const res = await fetch(`${cleanHttpUrl}/api/events/emit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': token,
          'x-device-id': deviceId,
        },
        body: JSON.stringify({ type, data }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * الاشتراك في الأحداث اللحظية
   */
  public subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * الاشتراك في تحديثات حالة الاتصال
   */
  public onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /**
   * إجبار إعادة الاتصال فوراً يدوياً
   */
  public reconnect(): void {
    this.reconnectAttempts = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.configureAndConnect();
  }

  /**
   * قراءة الحالة الحالية
   */
  public getStatus(): RealtimeStatus {
    return { ...this.status };
  }

  /**
   * تنظيف المقابس والوصلات الحالية
   */
  private cleanupTransports(): void {
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      try {
        this.ws.onclose = null;
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    if (this.sse) {
      try {
        this.sse.close();
      } catch {}
      this.sse = null;
    }

    if (this.ipcUnsubscribe) {
      try {
        this.ipcUnsubscribe();
      } catch {}
      this.ipcUnsubscribe = null;
    }
  }

  /**
   * إغلاق المحرك بالكامل
   */
  public close(): void {
    this.isExplicitlyClosed = true;
    this.cleanupTransports();
    this.listeners.clear();
    this.statusListeners.clear();
  }
}

// كائن مفرد مركزي (Singleton)
export const realtimeEventBus = new RealtimeEventBusManager();

/**
 * خطاف React لاستهلاك حالة الاتصال اللحظي في الأشرطة العلوية ومكونات الواجهة
 */
export function useRealtimeStatus() {
  const [status, setStatus] = useState<RealtimeStatus>(() => realtimeEventBus.getStatus());

  useEffect(() => {
    return realtimeEventBus.onStatusChange(setStatus);
  }, []);

  return {
    status,
    isConnected: status.state === 'connected' || status.state === 'server_master',
    reconnect: () => realtimeEventBus.reconnect(),
    emit: (type: RealtimeEventType | string, data?: any) => realtimeEventBus.emit(type, data),
  };
}
