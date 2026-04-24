import type { FastifyInstance } from 'fastify'
import { nanoid } from 'nanoid'
import type { Db } from '../db.js'
import type { WsManager } from '../ws.js'
import type { Task, TaskCategory } from '../types.js'

export async function registerTaskRoutes(app: FastifyInstance, db: Db, ws: WsManager) {
  app.get('/tasks', async (req) => {
    const { status, category } = req.query as { status?: string; category?: string }
    let sql = 'SELECT * FROM tasks WHERE status != ?'
    const params: unknown[] = ['archived']
    if (status) { sql += ' AND status = ?'; params.push(status) }
    if (category) { sql += ' AND category = ?'; params.push(category) }
    sql += ' ORDER BY created_at ASC'
    return db.prepare(sql).all(...params)
  })

  app.post('/tasks', async (req, reply) => {
    const { title, category } = req.body as { title: string; category: TaskCategory }
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return reply.status(400).send({ error: 'title is required' })
    }
    if (!['work', 'study', 'personal'].includes(category)) {
      return reply.status(400).send({ error: 'Invalid category' })
    }
    const task: Task = {
      id: nanoid(),
      title,
      category,
      status: 'pending',
      pomodoro_count: 0,
      created_at: Date.now(),
      completed_at: null,
    }
    db.prepare(
      'INSERT INTO tasks (id, title, category, status, pomodoro_count, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(task.id, task.title, task.category, task.status, task.pomodoro_count, task.created_at)
    ws.broadcast({ type: 'task_updated', task })
    return reply.status(201).send(task)
  })

  app.patch('/tasks/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const PATCHABLE = ['title', 'status', 'category'] as const

    const body = req.body as Record<string, unknown>
    const safe: Record<string, unknown> = {}
    for (const col of PATCHABLE) {
      if (col in body) safe[col] = body[col]
    }
    if (safe.status === 'done') safe.completed_at = Date.now()

    if (Object.keys(safe).length === 0) return reply.status(400).send({ error: 'No valid fields to update' })

    const cols = Object.keys(safe).map(k => `${k} = ?`).join(', ')
    const info = db.prepare(`UPDATE tasks SET ${cols} WHERE id = ?`).run(...Object.values(safe), id)
    if (info.changes === 0) return reply.status(404).send({ error: 'Not found' })

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task
    ws.broadcast({ type: 'task_updated', task })
    return task
  })

  app.delete('/tasks/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const info = db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
    if (info.changes === 0) return reply.status(404).send({ error: 'Not found' })
    ws.broadcast({ type: 'task_deleted', id })
    return reply.status(204).send()
  })
}
