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
    const updates = req.body as Partial<Pick<Task, 'title' | 'status' | 'category'>>
    if (updates.status === 'done') (updates as Record<string, unknown>).completed_at = Date.now()
    const cols = Object.keys(updates).map(k => `${k} = ?`).join(', ')
    db.prepare(`UPDATE tasks SET ${cols} WHERE id = ?`).run(...Object.values(updates), id)
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task
    if (!task) return reply.status(404).send({ error: 'Not found' })
    ws.broadcast({ type: 'task_updated', task })
    return task
  })

  app.delete('/tasks/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
    ws.broadcast({ type: 'task_deleted', id })
    return reply.status(204).send()
  })
}
