// مسارات إضافية عبر HTTP REST: payments, supplierEntries, barcodePrints, activities

import type { FastifyInstance } from 'fastify';
import {
  listBarcodePrints,
  createBarcodePrint,
  removeBarcodePrint,
  listPayments,
  createPayment,
  listSupplierEntries,
  createSupplierEntry,
  listActivities,
  logActivity,
} from '../../handlers/misc';

export async function registerMiscRoutes(server: FastifyInstance): Promise<void> {
  // ===== payments =====
  server.get('/api/payments', async (request, reply) => {
    const opts = request.query as { partyId?: string; partyType?: string };
    const result = await listPayments(opts);
    return reply.send(result);
  });
  server.post('/api/payments', async (request, reply) => {
    const data = request.body as Record<string, unknown>;
    const result = await createPayment(data);
    return reply.code(201).send(result);
  });

  // ===== supplierEntries =====
  server.get('/api/supplier-entries', async (request, reply) => {
    const opts = request.query as { supplierId?: string };
    const result = await listSupplierEntries(opts);
    return reply.send(result);
  });
  server.post('/api/supplier-entries', async (request, reply) => {
    const data = request.body as Record<string, unknown>;
    const result = await createSupplierEntry(data);
    return reply.code(201).send(result);
  });

  // ===== barcodePrints =====
  server.get('/api/barcode-prints', async (request, reply) => {
    const opts = request.query as { productId?: string };
    const result = await listBarcodePrints(opts);
    return reply.send(result);
  });
  server.post('/api/barcode-prints', async (request, reply) => {
    const data = request.body as Record<string, unknown>;
    const result = await createBarcodePrint(data);
    return reply.code(201).send(result);
  });
  server.delete('/api/barcode-prints/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await removeBarcodePrint(id);
    return reply.send(result);
  });

  // ===== activities =====
  server.get('/api/activities', async (request, reply) => {
    const opts = request.query as { userId?: string; action?: string; limit?: number };
    const normOpts = {
      ...opts,
      limit: opts.limit ? Number(opts.limit) : undefined,
    };
    const result = await listActivities(normOpts);
    return reply.send(result);
  });
  server.post('/api/activities/log', async (request, reply) => {
    const data = request.body as {
      userId: string; action: string; entityType?: string;
      entityId?: string; details?: string;
    };
    const result = await logActivity(data);
    return reply.send(result);
  });
}
