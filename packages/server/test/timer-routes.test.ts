import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Fastify from 'fastify'
import { createDb } from '../src/db.js'
import { WsManager } from '../src/ws.js'
import { TimerEngine } from '../src/timer.js'
import { registerTimerRoutes } from '../src/routes/timer.js'

async function buildApp() {
  const db = createDb(':memory:')
  const ws = new WsManager()
  const timer = new TimerEngine(db, vi.fn(), vi.fn())
  const app = Fastify()
  await registerTimerRoutes(app, timer, ws)
  return { app, timer }
}

describe('timer routes', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('GET /timer returns current state', async () => {
    const { app } = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/timer' })
    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('idle')
  })

  it('POST /timer/start transitions to running', async () => {
    const { app } = await buildApp()
    const res = await app.inject({ method: 'POST', url: '/timer/start' })
    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('running')
  })

  it('POST /timer/pause toggles pause', async () => {
    const { app } = await buildApp()
    await app.inject({ method: 'POST', url: '/timer/start' })
    const res = await app.inject({ method: 'POST', url: '/timer/pause' })
    expect(res.json().status).toBe('paused')
  })

  it('POST /timer/reset returns to idle', async () => {
    const { app } = await buildApp()
    await app.inject({ method: 'POST', url: '/timer/start' })
    await app.inject({ method: 'POST', url: '/timer/skip' })
    const res = await app.inject({ method: 'POST', url: '/timer/reset' })
    const body = res.json()
    expect(body.sessionType).toBe('work')
    expect(body.status).toBe('idle')
  })
})
