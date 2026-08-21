// مسارات الصندوق عبر HTTP REST

import type { FastifyInstance } from 'fastify';
import {
  listCashSessions,
  getCashSession,
  getCurrentCashSession,
  openCashSession,
  closeCashSession,
  depositCash,
} from '../../handlers/cash';

export async function registerCashRoutes(server: FastifyInstance): Promise<void> {
  // GET /api/cash
  server.get('/api/cash', async (_request, reply) => {
    const result = await listCashSessions();
    return reply.send(result);
  });

  // GET /api/cash/current
  server.get('/api/cash/current', async (_request, reply) => {
    const result = await getCurrentCashSession();
    return reply.send(result);
  });

  // GET /api/cash/:id
  server.get('/api/cash/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await getCashSession(id);
    return reply.send(result);
  });

  // POST /api/cash/open
  server.post('/api/cash/open', async (request, reply) => {
    const data = request.body as { openedBy: string; openingBalance: number };
    const result = await openCashSession(data);
    if (result.error) return reply.code(result.error.status).send({ error: result.error });
    return reply.code(201).send(result);
  });

  // POST /api/cash/:id/close
  server.post('/api/cash/:id/close', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as { actualBalance: number; note?: string };
    const result = await closeCashSession(id, data);
    if (result.error) return reply.code(result.error.status).send({ error: result.error });
    return reply.send(result);
  });

  // POST /api/cash/:id/deposit
  server.post('/api/cash/:id/deposit', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as { amount: number; note?: string };
    const result = await depositCash(id, data);
    if (result.error) return reply.code(result.error.status).send({ error: result.error });
    return reply.send(result);
  });
}
