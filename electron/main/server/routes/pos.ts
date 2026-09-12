// مسارات نقطة البيع عن بُعد — Mobile Scanner → Desktop POS
// POST /api/pos/scan — يستقبل باركود من الهاتف ويُرسله لـ POSPage عبر IPC و SSE
// GET  /api/pos/status — حالة اتصال قارئ الباركود
// GET  /api/pos/events — بث أحداث المسح المباشر (SSE) لمتصفح الويب ووضع التطوير

import type { FastifyInstance } from 'fastify';
import { BrowserWindow } from 'electron';
import { queryOne } from '../../handlers/db-utils';

export interface FoundItemResult {
  id: string;
  name: string;
  retailPrice: number;
  quantity: number;
  barcode?: string;
  isPack?: boolean;
  packPiecesCount?: number;
  packUnit?: string;
}

/**
 * البحث عن منتج أو حزمة بالباركود في قاعدة البيانات
 * يبحث في جدول products وجدول product_barcodes وجدول packs
 */
export function findProductByBarcode(barcode: string): FoundItemResult | null {
  const cleanCode = (barcode || '').trim();
  if (!cleanCode) return null;

  // 1) بحث مباشر في حقل barcode أو sku للمنتج
  const direct = queryOne(
    `SELECT id, name, retail_price as retailPrice, quantity, barcode
     FROM products
     WHERE (barcode = ? OR sku = ?) AND status = 'active'
     LIMIT 1`,
    [cleanCode, cleanCode]
  );
  if (direct) {
    return {
      id: (direct as any).id,
      name: (direct as any).name,
      retailPrice: Number((direct as any).retailPrice || 0),
      quantity: Number((direct as any).quantity || 0),
      barcode: (direct as any).barcode,
      isPack: false,
    };
  }

  // 2) بحث في جدول الباركودات المتعددة
  const fromBarcodeTable = queryOne(
    `SELECT p.id, p.name, p.retail_price as retailPrice, p.quantity, pb.barcode
     FROM product_barcodes pb
     JOIN products p ON p.id = pb.product_id
     WHERE pb.barcode = ? AND p.status = 'active'
     LIMIT 1`,
    [cleanCode]
  );
  if (fromBarcodeTable) {
    return {
      id: (fromBarcodeTable as any).id,
      name: (fromBarcodeTable as any).name,
      retailPrice: Number((fromBarcodeTable as any).retailPrice || 0),
      quantity: Number((fromBarcodeTable as any).quantity || 0),
      barcode: (fromBarcodeTable as any).barcode,
      isPack: false,
    };
  }

  // 3) بحث في جدول العبوات والحزم (packs)
  try {
    const fromPacks = queryOne(
      `SELECT id, name, COALESCE(pack_price, price, 0) as retailPrice,
              pieces_count as piecesCount, unit_name as unitName, barcode
       FROM packs
       WHERE barcode = ? AND (status = 'active' OR is_active = 1)
       LIMIT 1`,
      [cleanCode]
    );
    if (fromPacks) {
      return {
        id: `pack-${(fromPacks as any).id}`,
        name: (fromPacks as any).name,
        retailPrice: Number((fromPacks as any).retailPrice || 0),
        quantity: 999,
        barcode: (fromPacks as any).barcode,
        isPack: true,
        packPiecesCount: Number((fromPacks as any).piecesCount || 1),
        packUnit: (fromPacks as any).unitName || 'عبوة',
      };
    }
  } catch (err) {
    // جدول packs قد يكون غير متاح أو قيد الهجرة
  }

  return null;
}

// عملاء SSE النشطون للاستماع المباشر في المتصفحات
type SseClient = {
  id: string;
  write: (data: string) => void;
};
const sseClients = new Map<string, SseClient>();

export function broadcastScanEvent(data: any): void {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const [id, client] of sseClients.entries()) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(id);
    }
  }
}

export async function registerPosRoutes(server: FastifyInstance): Promise<void> {
  /**
   * POST /api/pos/scan
   * الهاتف يرسل باركود → نبحث عن المنتج/الحزمة → نُرسل الحدث لـ POSPage عبر IPC و SSE
   */
  server.post('/api/pos/scan', async (request, reply) => {
    const body = request.body as { barcode?: string; qty?: number };
    const barcode = (body?.barcode || '').trim();
    const qty = Math.max(1, Number(body?.qty) || 1);

    if (!barcode) {
      return reply.code(422).send({
        error: { status: 422, detail: 'الحقل barcode مطلوب' },
      });
    }

    // البحث عن المنتج أو الحزمة
    const product = findProductByBarcode(barcode);

    const scanPayload = {
      barcode,
      qty,
      fromMobile: true,
      product: product
        ? {
            id: product.id,
            name: product.name,
            price: product.retailPrice,
            quantity: product.quantity,
            isPack: product.isPack ?? false,
            packPiecesCount: product.packPiecesCount,
            packUnit: product.packUnit,
          }
        : null,
    };

    // 1) إرسال الحدث لنافذة سطح المكتب عبر IPC
    try {
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        if (!win.isDestroyed()) {
          win.webContents.send('pos:barcode-scan', scanPayload);
        }
      }
    } catch (err) {
      console.warn('[pos/scan] فشل إرسال IPC:', err);
    }

    // 2) إرسال الحدث عبر SSE للمتصفحات النشطة أو وضع التطوير
    broadcastScanEvent({ type: 'scan', ...scanPayload });

    if (!product) {
      return reply.send({
        success: true,
        found: false,
        barcode,
        qty,
        message: 'تم استقبال الباركود — العنصر غير موجود في قاعدة البيانات',
      });
    }

    return reply.send({
      success: true,
      found: true,
      barcode,
      qty,
      product: {
        id: product.id,
        name: product.name,
        price: product.retailPrice,
        quantity: product.quantity,
        isPack: product.isPack,
        packPiecesCount: product.packPiecesCount,
        packUnit: product.packUnit,
      },
    });
  });

  /**
   * GET /api/pos/status
   * يُخبر الهاتف بحالة الاتصال والنافذة المفتوحة
   */
  server.get('/api/pos/status', async (_request, reply) => {
    const windows = BrowserWindow.getAllWindows();
    const hasWindow = windows.some((w) => !w.isDestroyed() && w.isVisible());
    return reply.send({
      ok: true,
      posOpen: hasWindow || sseClients.size > 0,
      activeClients: sseClients.size,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /api/pos/events
   * Server-Sent Events (SSE) للاستماع لأحداث المسح في المتصفح خارج Electron
   */
  server.get('/api/pos/events', async (request, reply) => {
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');
    reply.raw.flushHeaders();

    const clientId = Math.random().toString(36).substring(2, 9);
    const client: SseClient = {
      id: clientId,
      write: (msg: string) => {
        reply.raw.write(msg);
      },
    };
    sseClients.set(clientId, client);

    reply.raw.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

    request.raw.on('close', () => {
      sseClients.delete(clientId);
    });
  });
}

