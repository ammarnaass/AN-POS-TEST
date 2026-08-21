// مسارات CRUD العامة عبر HTTP REST — تطابق الأسماء المُسجّلة في handlers/crud.ts

import type { FastifyInstance } from 'fastify';
import {
  listRows,
  getRow,
  createRow,
  updateRow,
  removeRow,
} from '../../handlers/crud';

export async function registerCrudRoutes(server: FastifyInstance): Promise<void> {
  // GET /api/:table?search=...&from=...&to=...&limit=...&offset=...
  server.get('/api/:table', async (request, reply) => {
    const { table } = request.params as { table: string };
    const opts = request.query as {
      search?: string; from?: string; to?: string;
      limit?: number; offset?: number;
    };
    // تحويل limit/offset من string إلى number (Fastify قد يمرّرها كـ string)
    const normOpts = {
      ...opts,
      limit: opts.limit ? Number(opts.limit) : undefined,
      offset: opts.offset ? Number(opts.offset) : undefined,
    };
    try {
      const result = await listRows(table, normOpts);
      return reply.send(result);
    } catch (err) {
      return reply.code(400).send({ error: { status: 400, detail: (err as Error).message } });
    }
  });

  // GET /api/:table/:id
  server.get('/api/:table/:id', async (request, reply) => {
    const { table, id } = request.params as { table: string; id: string };
    try {
      const result = await getRow(table, id);
      return reply.send(result);
    } catch (err) {
      return reply.code(400).send({ error: { status: 400, detail: (err as Error).message } });
    }
  });

  // POST /api/:table
  server.post('/api/:table', async (request, reply) => {
    const { table } = request.params as { table: string };
    const data = request.body as Record<string, unknown>;
    try {
      const result = await createRow(table, data);
      return reply.code(201).send(result);
    } catch (err) {
      return reply.code(400).send({ error: { status: 400, detail: (err as Error).message } });
    }
  });

  // PUT /api/:table/:id
  server.put('/api/:table/:id', async (request, reply) => {
    const { table, id } = request.params as { table: string; id: string };
    const data = request.body as Record<string, unknown>;
    try {
      const result = await updateRow(table, id, data);
      return reply.send(result);
    } catch (err) {
      return reply.code(400).send({ error: { status: 400, detail: (err as Error).message } });
    }
  });

  // PATCH /api/:table/:id (alias للـ PUT — تحديث جزئي)
  server.patch('/api/:table/:id', async (request, reply) => {
    const { table, id } = request.params as { table: string; id: string };
    const data = request.body as Record<string, unknown>;
    try {
      const result = await updateRow(table, id, data);
      return reply.send(result);
    } catch (err) {
      return reply.code(400).send({ error: { status: 400, detail: (err as Error).message } });
    }
  });

  // DELETE /api/:table/:id
  server.delete('/api/:table/:id', async (request, reply) => {
    const { table, id } = request.params as { table: string; id: string };
    try {
      const result = await removeRow(table, id);
      return reply.send(result);
    } catch (err) {
      return reply.code(400).send({ error: { status: 400, detail: (err as Error).message } });
    }
  });
}
