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
  const handleList = async (request: any, reply: any) => {
    const { table } = request.params as { table: string };
    const opts = request.query as {
      search?: string; from?: string; to?: string;
      limit?: number; offset?: number;
    };
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
  };

  const handleGet = async (request: any, reply: any) => {
    const { table, id } = request.params as { table: string; id: string };
    try {
      const result = await getRow(table, id);
      return reply.send(result);
    } catch (err) {
      return reply.code(400).send({ error: { status: 400, detail: (err as Error).message } });
    }
  };

  const handleCreate = async (request: any, reply: any) => {
    const { table } = request.params as { table: string };
    const data = request.body as Record<string, unknown>;
    try {
      const result = await createRow(table, data);
      return reply.code(201).send(result);
    } catch (err) {
      return reply.code(400).send({ error: { status: 400, detail: (err as Error).message } });
    }
  };

  const handleUpdate = async (request: any, reply: any) => {
    const { table, id } = request.params as { table: string; id: string };
    const data = request.body as Record<string, unknown>;
    try {
      const result = await updateRow(table, id, data);
      return reply.send(result);
    } catch (err) {
      return reply.code(400).send({ error: { status: 400, detail: (err as Error).message } });
    }
  };

  const handleDelete = async (request: any, reply: any) => {
    const { table, id } = request.params as { table: string; id: string };
    try {
      const result = await removeRow(table, id);
      return reply.send(result);
    } catch (err) {
      return reply.code(400).send({ error: { status: 400, detail: (err as Error).message } });
    }
  };

  // GET /api/:table & /api/inventory/:table
  server.get('/api/:table', handleList);
  server.get('/api/inventory/:table', handleList);

  // GET /api/:table/:id & /api/inventory/:table/:id
  server.get('/api/:table/:id', handleGet);
  server.get('/api/inventory/:table/:id', handleGet);

  // POST /api/:table & /api/inventory/:table & /api/:table/create & /api/inventory/:table/create
  server.post('/api/:table', handleCreate);
  server.post('/api/inventory/:table', handleCreate);
  server.post('/api/:table/create', handleCreate);
  server.post('/api/inventory/:table/create', handleCreate);

  // PUT & PATCH & POST updates
  server.put('/api/:table/:id', handleUpdate);
  server.put('/api/inventory/:table/:id', handleUpdate);
  server.patch('/api/:table/:id', handleUpdate);
  server.patch('/api/inventory/:table/:id', handleUpdate);
  server.post('/api/:table/:id', handleUpdate);
  server.post('/api/:table/update/:id', handleUpdate);
  server.post('/api/:table/:id/update', handleUpdate);
  server.put('/api/:table/update/:id', handleUpdate);

  // DELETE & POST delete
  server.delete('/api/:table/:id', handleDelete);
  server.delete('/api/inventory/:table/:id', handleDelete);
  server.post('/api/:table/delete/:id', handleDelete);
  server.post('/api/:table/:id/delete', handleDelete);
  server.delete('/api/:table/delete/:id', handleDelete);
}

