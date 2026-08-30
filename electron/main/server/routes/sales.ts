// مسارات المبيعات عبر HTTP REST

import type { FastifyInstance } from 'fastify';
import {
  listSales,
  getSale,
  createSale,
  updateSale,
  removeSale,
  type SalesListOptions,
} from '../../handlers/sales';
import { normalizeBody } from '../middleware/normalizeFields';

export async function registerSalesRoutes(server: FastifyInstance): Promise<void> {
  // GET /api/sales?type=&docType=&customerId=&status=&search=&from=&to=&limit=&offset=
  server.get('/api/sales', async (request, reply) => {
    const q = request.query as SalesListOptions;
    // تطبيع الأرقام
    const opts = {
      ...q,
      limit: q.limit ? Number(q.limit) : undefined,
      offset: q.offset ? Number(q.offset) : undefined,
    };
    const result = await listSales(opts);
    return reply.send(result);
  });

  // GET /api/sales/:id
  server.get('/api/sales/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await getSale(id);
    return reply.send(result);
  });

  // POST /api/sales
  server.post('/api/sales', async (request, reply) => {
    const data = normalizeBody(request.body as Record<string, unknown>);
    const result = await createSale(data);
    return reply.code(201).send(result);
  });

  // PUT /api/sales/:id
  server.put('/api/sales/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = normalizeBody(request.body as Record<string, unknown>);
    const result = await updateSale(id, data);
    return reply.send(result);
  });

  // DELETE /api/sales/:id
  server.delete('/api/sales/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await removeSale(id);
    return reply.send(result);
  });
}
