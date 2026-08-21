// مسارات المصادقة عبر HTTP REST

import type { FastifyInstance } from 'fastify';
import { loginUser, registerUser, getCurrentUser, logoutUser } from '../../handlers/auth';

export async function registerAuthRoutes(server: FastifyInstance): Promise<void> {
  // POST /api/auth/login { username, pin } → { user } || { error }
  server.post('/api/auth/login', async (request, reply) => {
    const body = request.body as { username?: string; pin?: string };
    const result = await loginUser(body.username || '', body.pin || '');
    if (result.error) {
      return reply.code(result.error.status).send({ error: result.error });
    }
    // ربط user بالجلسة الحالية (إن وُجد توكن في الـ headers — تطبيقاً بما تم في pair.ts)
    return reply.send(result);
  });

  // POST /api/auth/register
  server.post('/api/auth/register', async (request, reply) => {
    const body = request.body as { username?: string; name?: string; pin?: string; phone?: string; email?: string };
    const result = await registerUser({
      username: body.username || '',
      name: body.name || '',
      pin: body.pin || '',
      phone: body.phone,
      email: body.email,
    });
    if (result.error) {
      return reply.code(result.error.status).send({ error: result.error });
    }
    return reply.send(result);
  });

  // GET /api/auth/me?userId=XXX
  server.get('/api/auth/me', async (request, reply) => {
    const userId = (request.query as { userId?: string }).userId;
    if (!userId) {
      return reply.code(422).send({ error: { status: 422, detail: 'userId مطلوب' } });
    }
    const result = await getCurrentUser(userId);
    if (result.error) {
      return reply.code(result.error.status).send({ error: result.error });
    }
    return reply.send(result);
  });

  // POST /api/auth/logout { userId }
  server.post('/api/auth/logout', async (request, reply) => {
    const body = request.body as { userId?: string };
    const result = await logoutUser(body.userId || '');
    return reply.send(result);
  });
}
