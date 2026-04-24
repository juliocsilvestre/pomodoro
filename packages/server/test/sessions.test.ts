import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'
import { createDb } from '../src/db.js'
import { registerSessionRoutes } from '../src/routes/sessions.js'

describe('session routes', () => {
  it('GET /sessions returns empty array initially', async () => {
    const db = createDb(':memory:')
    const app = Fastify()
    await registerSessionRoutes(app, db)
    const res = await app.inject({ method: 'GET', url: '/sessions' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([])
  })

  it('GET /sessions returns seeded sessions ordered by started_at desc', async () => {
    const db = createDb(':memory:')
    const app = Fastify()
    await registerSessionRoutes(app, db)
    const now = Date.now()
    db.prepare('INSERT INTO sessions (id, task_id, type, started_at, ended_at, duration_s) VALUES (?, ?, ?, ?, ?, ?)').run('s1', null, 'work', now - 2000, now - 1000, 1500)
    db.prepare('INSERT INTO sessions (id, task_id, type, started_at, ended_at, duration_s) VALUES (?, ?, ?, ?, ?, ?)').run('s2', null, 'short_break', now - 500, now, 300)
    const res = await app.inject({ method: 'GET', url: '/sessions' })
    const sessions = res.json()
    expect(sessions).toHaveLength(2)
    expect(sessions[0].id).toBe('s2')
  })
})
