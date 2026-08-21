// مسارات الفئات عبر HTTP REST

import type { FastifyInstance } from 'fastify';
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  removeCategory,
} from '../../handlers/categories';

export async function registerCategoriesRoutes(server: FastifyInstance): Promise<void> {
  // GET /api/categories
  server.get('/api/categories', async (_request, reply) => {
    const result = await listCategories();
    return reply.send(result);
  });

  // GET /api/categories/:id
  server.get('/api/categories/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await getCategory(id);
    return reply.send(result);
  });

  // POST /api/categories
  server.post('/api/categories', async (request, reply) => {
    const data = request.body as Record<string, unknown>;
    const result = await createCategory(data);
    if (result.error) return reply.code(result.error.status).send({ error: result.error });
    return reply.code(201).send(result);
  });

  // PUT /api/categories/:id
  server.put('/api/categories/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as Record<string, unknown>;
    const result = await updateCategory(id, data);
    if (result.error) return reply.code(result.error.status).send({ error: result.error });
    return reply.send(result);
  });

  // DELETE /api/categories/:id
  server.delete('/api/categories/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await removeCategory(id);
    if (result.error) return reply.code(result.error.status).send({ error: result.error });
    return reply.send(result);
  });
}
