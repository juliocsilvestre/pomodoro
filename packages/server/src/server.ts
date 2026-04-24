import Fastify from 'fastify'
import fastifyWebsocket from '@fastify/websocket'
import fastifyStatic from '@fastify/static'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { Db } from './db.js'
import { TimerEngine } from './timer.js'
import { WsManager } from './ws.js'
import { handleClientMessage } from './handler.js'
import { registerTaskRoutes } from './routes/tasks.js'
import { registerSessionRoutes } from './routes/sessions.js'
import { registerSettingsRoutes } from './routes/settings.js'
import { registerTimerRoutes } from './routes/timer.js'
import type { Task, ClientMessage } from './types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export async function createApp(db: Db, timer: TimerEngine, ws: WsManager) {
  const app = Fastify({ logger: false })

  await app.register(fastifyWebsocket)

  app.get('/ws', { websocket: true }, (socket) => {
    ws.add(socket)
    socket.send(JSON.stringify({
      type: 'state',
      timer: timer.getState(),
      tasks: db.prepare("SELECT * FROM tasks WHERE status != 'archived' ORDER BY created_at ASC").all() as Task[],
    }))
    socket.on('message', (raw) => {
      let msg: unknown
      try {
        msg = JSON.parse(raw.toString())
      } catch {
        return
      }
      try {
        handleClientMessage(msg as ClientMessage, timer)
      } catch (err) {
        console.error('[ws] handleClientMessage error:', err)
      }
    })
  })

  await registerTaskRoutes(app, db, ws)
  await registerSessionRoutes(app, db)
  await registerSettingsRoutes(app, db, timer, ws)
  await registerTimerRoutes(app, timer, ws)

  const webDist = join(__dirname, '../../web/dist')
  if (existsSync(webDist)) {
    await app.register(fastifyStatic, { root: webDist, prefix: '/' })
  }

  return app
}
