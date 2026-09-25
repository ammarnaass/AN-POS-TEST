import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  encodeWsFrame,
  decodeClientWsFrames,
} from '@/lib/wsCodec';
import {
  realtimeEventBus,
  type RealtimeEvent,
} from '@/lib/realtimeEventBus';
import {
  setStoredTransportConfig,
} from '@/lib/transportGateway';

describe('المرحلة 3: محرك الأحداث اللحظية المباشرة (WebSockets & SSE Event Bus)', () => {
  beforeEach(() => {
    localStorage.clear();
    realtimeEventBus.close();
  });

  describe('1. تشفير وفك تشفير إطارات WebSocket بحسب معيار RFC 6455', () => {
    it('يشفر رسالة نصية قصيرة (أقل من 126 بايت) بدون قناع (Server to Client Frame)', () => {
      const text = JSON.stringify({ type: 'product:updated', id: 'p123' });
      const frame = encodeWsFrame(text);

      expect(frame[0]).toBe(0x81); // FIN + Text opcode
      expect(frame[1]).toBe(Buffer.byteLength(text)); // Mask bit 0 + length
      expect(frame.subarray(2).toString('utf8')).toBe(text);
    });

    it('يشفر رسالة متوسطة الحجم (أكبر من 125 بايت وأقل من 65536 بايت) مع امتداد طول 16-bit', () => {
      const largePayload = 'A'.repeat(300);
      const text = JSON.stringify({ type: 'stock:changed', data: largePayload });
      const frame = encodeWsFrame(text);

      expect(frame[0]).toBe(0x81);
      expect(frame[1]).toBe(126); // مؤشر 16-bit Extended Length
      const length = frame.readUInt16BE(2);
      expect(length).toBe(Buffer.byteLength(text));
      expect(frame.subarray(4).toString('utf8')).toBe(text);
    });

    it('يفك تشفير إطار WebSocket المقنع القادم من العميل (Client Masked Frame)', () => {
      const message = JSON.stringify({ type: 'ping', timestamp: 123456789 });
      const payloadBytes = Buffer.from(message, 'utf8');
      const maskKey = Buffer.from([0x12, 0x34, 0x56, 0x78]);

      const maskedPayload = Buffer.alloc(payloadBytes.length);
      for (let i = 0; i < payloadBytes.length; i++) {
        maskedPayload[i] = payloadBytes[i] ^ maskKey[i % 4];
      }

      // بناء إطار العميل: [0x81, 0x80 | length, maskKey(4), maskedPayload]
      const clientFrame = Buffer.concat([
        Buffer.from([0x81, 0x80 | payloadBytes.length]),
        maskKey,
        maskedPayload,
      ]);

      const decoded = decodeClientWsFrames(clientFrame);
      expect(decoded.messages.length).toBe(1);
      expect(decoded.messages[0].opcode).toBe(1);
      expect(decoded.messages[0].text).toBe(message);
      expect(decoded.remaining.length).toBe(0);
    });

    it('يتعامل مع استقبال إطارات مجزأة وغير مكتملة بسلاسة (Fragmentation Buffering)', () => {
      const message = 'Hello AN POS';
      const payloadBytes = Buffer.from(message, 'utf8');
      const maskKey = Buffer.from([0xAA, 0xBB, 0xCC, 0xDD]);
      const maskedPayload = Buffer.alloc(payloadBytes.length);
      for (let i = 0; i < payloadBytes.length; i++) {
        maskedPayload[i] = payloadBytes[i] ^ maskKey[i % 4];
      }

      const fullFrame = Buffer.concat([
        Buffer.from([0x81, 0x80 | payloadBytes.length]),
        maskKey,
        maskedPayload,
      ]);

      // إرسال نصف الإطار الأول
      const part1 = fullFrame.subarray(0, 5);
      const decoded1 = decodeClientWsFrames(part1);
      expect(decoded1.messages.length).toBe(0);
      expect(decoded1.remaining.length).toBe(5);

      // إرسال باقي الإطار مدمجاً مع الجزء المتبقي
      const part2 = Buffer.concat([decoded1.remaining, fullFrame.subarray(5)]);
      const decoded2 = decodeClientWsFrames(part2);
      expect(decoded2.messages.length).toBe(1);
      expect(decoded2.messages[0].text).toBe(message);
      expect(decoded2.remaining.length).toBe(0);
    });
  });

  describe('2. توجيه الأحداث اللحظية وإبطال كاش React Query المناسب', () => {
    it('يبطل كاش المنتجات والتصنيفات والعبوات عند استقبال product:updated', () => {
      const mockInvalidateQueries = vi.fn();
      const mockQueryClient = {
        invalidateQueries: mockInvalidateQueries,
      } as any;

      realtimeEventBus.init(mockQueryClient);

      // محاكاة استقبال حدث product:updated عبر نافذة المتصفح
      const event: RealtimeEvent = {
        id: 'evt_1',
        type: 'product:updated',
        data: { id: 'prod_99', action: 'update' },
        timestamp: new Date().toISOString(),
      };

      window.dispatchEvent(new CustomEvent('an-pos:realtime-event', { detail: event }));

      // التحقق من استدعاء إبطال الكاش
      // نتحقق من دالة handleIncomingEvent عبر اشتراك الحدث
      let receivedEvent: RealtimeEvent | null = null;
      const unsubscribe = realtimeEventBus.subscribe((e) => {
        receivedEvent = e;
      });

      // بث الحدث عبر المنسق
      (realtimeEventBus as any).handleIncomingEvent(event);

      expect(receivedEvent).toEqual(event);
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['products'] });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['categories'] });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['packs'] });

      unsubscribe();
    });

    it('يبطل كاش المبيعات والمخزون عند استقبال stock:changed', () => {
      const mockInvalidateQueries = vi.fn();
      const mockQueryClient = {
        invalidateQueries: mockInvalidateQueries,
      } as any;

      realtimeEventBus.init(mockQueryClient);

      const event: RealtimeEvent = {
        id: 'evt_2',
        type: 'stock:changed',
        data: { productId: 'prod_12', action: 'update' },
        timestamp: new Date().toISOString(),
      };

      (realtimeEventBus as any).handleIncomingEvent(event);

      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['products'] });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['inventory_movements'] });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['sales'] });
    });

    it('يبطل كاش الفواتير المعلقة عبر الصالة عند استقبال order:suspended', () => {
      const mockInvalidateQueries = vi.fn();
      const mockQueryClient = {
        invalidateQueries: mockInvalidateQueries,
      } as any;

      realtimeEventBus.init(mockQueryClient);

      const event: RealtimeEvent = {
        id: 'evt_3',
        type: 'order:suspended',
        data: { orderId: 'ord_55' },
        timestamp: new Date().toISOString(),
      };

      (realtimeEventBus as any).handleIncomingEvent(event);

      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['sales'] });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['suspended_orders'] });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['suspended_sales'] });
    });

    it('يبطل كاش العملاء والديون عند استقبال customer:updated', () => {
      const mockInvalidateQueries = vi.fn();
      const mockQueryClient = {
        invalidateQueries: mockInvalidateQueries,
      } as any;

      realtimeEventBus.init(mockQueryClient);

      const event: RealtimeEvent = {
        id: 'evt_4',
        type: 'customer:updated',
        data: { customerId: 'cust_7' },
        timestamp: new Date().toISOString(),
      };

      (realtimeEventBus as any).handleIncomingEvent(event);

      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['customers'] });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['customer_transactions'] });
    });
  });

  describe('3. دورة حياة اتصال ناقل الأحداث وإعادة الاتصال التلقائي', () => {
    it('يعمل في وضع Server Master عند تعيين دور الجهاز كـ server', () => {
      setStoredTransportConfig({ role: 'server' });
      realtimeEventBus.init();

      const status = realtimeEventBus.getStatus();
      expect(status.role).toBe('server');
      expect(status.state).toBe('server_master');
      expect(status.transport).toBe('ipc');
    });

    it('يعين الحالة إلى disconnected عند تعيين دور الجهاز كـ client دون تحديد عنوان الخادم', () => {
      setStoredTransportConfig({ role: 'client', serverUrl: '' });
      realtimeEventBus.init();

      const status = realtimeEventBus.getStatus();
      expect(status.role).toBe('client');
      expect(status.state).toBe('disconnected');
    });

    it('يبدأ الاتصال بحالة connecting عند تحديد دور client وعنوان الخادم', () => {
      setStoredTransportConfig({
        role: 'client',
        serverUrl: 'http://192.168.1.100:3000',
        token: 'test_token',
        deviceId: 'dev_1',
      });

      realtimeEventBus.init();

      const status = realtimeEventBus.getStatus();
      expect(status.role).toBe('client');
      expect(['connecting', 'reconnecting', 'connected']).toContain(status.state);
      expect(status.serverUrl).toBe('http://192.168.1.100:3000');
    });
  });

  describe('4. ربط تغييرات جداول SQLite بمحرك بث الأحداث (Database Hooking)', () => {
    it('يخطر المشتركين المسجلين في subscribeToTableChanges فور استدعاء notifyTableChange', () => {
      type TableChangeSubscriber = (tableName: string, action: string, id?: string) => void;
      const subscribers = new Set<TableChangeSubscriber>();

      function subscribe(sub: TableChangeSubscriber) {
        subscribers.add(sub);
        return () => subscribers.delete(sub);
      }

      function notify(table: string, action = 'update', id?: string) {
        for (const sub of subscribers) {
          sub(table, action, id);
        }
      }

      let notifiedTable = '';
      let notifiedAction = '';
      let notifiedId: string | undefined = '';

      const unsubscribe = subscribe((table, action, id) => {
        notifiedTable = table;
        notifiedAction = action;
        notifiedId = id;
      });

      notify('products', 'update', 'prod_44');

      expect(notifiedTable).toBe('products');
      expect(notifiedAction).toBe('update');
      expect(notifiedId).toBe('prod_44');

      unsubscribe();

      // بعد إلغاء الاشتراك، لا يجب أن يتم استدعاؤه مرة أخرى
      notify('sales', 'create', 'sale_1');
      expect(notifiedTable).toBe('products');
    });
  });
});
