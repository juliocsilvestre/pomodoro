import { describe, it, expect, vi } from 'vitest'
import Fastify from 'fastify'
import { createDb } from '../src/db.js'
import { WsManager } from '../src/ws.js'
import { TimerEngine } from '../src/timer.js'
import { registerSettingsRoutes } from '../src/routes/settings.js'

async function buildApp() {
  const db = createDb(':memory:')
  const ws = new WsManager()
  const timer = new TimerEngine(db, vi.fn(), vi.fn())
  const app = Fastify()
  await registerSettingsRoutes(app, db, timer, ws)
  return { app, db, ws }
}

describe('settings routes', () => {
  it('GET /settings returns defaults', async () => {
    const { app } = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/settings' })
    expect(res.statusCode).toBe(200)
    const s = res.json()
    expect(s.work_duration).toBe(1500)
    expect(s.short_break).toBe(300)
  })

  it('PUT /settings updates values', async () => {
    const { app, ws } = await buildApp()
    const broadcastSpy = vi.spyOn(ws, 'broadcast')
    const res = await app.inject({
      method: 'PUT', url: '/settings',
      payload: { work_duration: 3000 },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().work_duration).toBe(3000)
    expect(broadcastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'settings_updated' })
    )
  })
})
