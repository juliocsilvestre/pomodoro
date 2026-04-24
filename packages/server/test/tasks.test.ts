import { describe, it, expect, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { createDb } from '../src/db.js'
import { WsManager } from '../src/ws.js'
import { registerTaskRoutes } from '../src/routes/tasks.js'

async function buildApp() {
  const db = createDb(':memory:')
  const ws = new WsManager()
  const app = Fastify()
  await registerTaskRoutes(app, db, ws)
  return { app, db }
}

describe('task routes', () => {
  it('POST /tasks creates a task and returns 201', async () => {
    const { app } = await buildApp()
    const res = await app.inject({
      method: 'POST', url: '/tasks',
      payload: { title: 'Fix bug', category: 'work' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.title).toBe('Fix bug')
    expect(body.category).toBe('work')
    expect(body.status).toBe('pending')
    expect(body.id).toBeTruthy()
  })

  it('GET /tasks returns all non-archived tasks', async () => {
    const { app } = await buildApp()
    await app.inject({ method: 'POST', url: '/tasks', payload: { title: 'A', category: 'work' } })
    await app.inject({ method: 'POST', url: '/tasks', payload: { title: 'B', category: 'study' } })
    const res = await app.inject({ method: 'GET', url: '/tasks' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(2)
  })

  it('PATCH /tasks/:id updates status to done', async () => {
    const { app } = await buildApp()
    const created = (await app.inject({ method: 'POST', url: '/tasks', payload: { title: 'X', category: 'personal' } })).json()
    const res = await app.inject({ method: 'PATCH', url: `/tasks/${created.id}`, payload: { status: 'done' } })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.status).toBe('done')
    expect(body.completed_at).toBeTruthy()
  })

  it('DELETE /tasks/:id removes the task', async () => {
    const { app } = await buildApp()
    const created = (await app.inject({ method: 'POST', url: '/tasks', payload: { title: 'Y', category: 'work' } })).json()
    const del = await app.inject({ method: 'DELETE', url: `/tasks/${created.id}` })
    expect(del.statusCode).toBe(204)
    const list = await app.inject({ method: 'GET', url: '/tasks' })
    expect(list.json()).toHaveLength(0)
  })

  it('POST /tasks returns 400 for invalid category', async () => {
    const { app } = await buildApp()
    const res = await app.inject({ method: 'POST', url: '/tasks', payload: { title: 'Z', category: 'invalid' } })
    expect(res.statusCode).toBe(400)
  })

  it('POST /tasks returns 400 for empty title', async () => {
    const { app } = await buildApp()
    const res = await app.inject({
      method: 'POST', url: '/tasks',
      payload: { title: '', category: 'work' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('PATCH /tasks/:id returns 404 for unknown id', async () => {
    const { app } = await buildApp()
    const res = await app.inject({
      method: 'PATCH', url: '/tasks/nonexistent-id',
      payload: { status: 'done' },
    })
    expect(res.statusCode).toBe(404)
  })

  it('DELETE /tasks/:id returns 404 for unknown id', async () => {
    const { app } = await buildApp()
    const res = await app.inject({
      method: 'DELETE', url: '/tasks/nonexistent-id',
    })
    expect(res.statusCode).toBe(404)
  })
})
