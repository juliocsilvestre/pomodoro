import type { FastifyInstance } from 'fastify'
import type { Db } from '../db.js'
import type { WsManager } from '../ws.js'
import type { TimerEngine } from '../timer.js'
import type { Settings } from '../types.js'

function readSettings(db: Db): Settings {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
  const m = Object.fromEntries(rows.map(r => [r.key, r.value]))
  return {
    work_duration: Number(m.work_duration),
    short_break: Number(m.short_break),
    long_break: Number(m.long_break),
    long_break_interval: Number(m.long_break_interval),
    sound_type: m.sound_type as Settings['sound_type'],
    sound_volume: Number(m.sound_volume),
  }
}

const ALLOWED_SETTINGS_KEYS = new Set([
  'work_duration', 'short_break', 'long_break',
  'long_break_interval', 'sound_type', 'sound_volume',
])

export async function registerSettingsRoutes(
  app: FastifyInstance,
  db: Db,
  _timer: TimerEngine,
  ws: WsManager,
) {
  app.get('/settings', async () => readSettings(db))

  app.put('/settings', async (req, reply) => {
    const updates = req.body as Partial<Record<string, string | number>>
    const invalid = Object.keys(updates).filter(k => !ALLOWED_SETTINGS_KEYS.has(k))
    if (invalid.length) return reply.code(400).send({ error: `Unknown settings keys: ${invalid.join(', ')}` })
    const upd = db.prepare('UPDATE settings SET value = ? WHERE key = ?')
    for (const [k, v] of Object.entries(updates)) upd.run(String(v), k)
    const settings = readSettings(db)
    ws.broadcast({ type: 'settings_updated', settings })
    return settings
  })
}
