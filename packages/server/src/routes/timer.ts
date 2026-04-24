import type { FastifyInstance } from 'fastify'
import type { WsManager } from '../ws.js'
import type { TimerEngine } from '../timer.js'

export async function registerTimerRoutes(app: FastifyInstance, timer: TimerEngine, ws: WsManager) {
  const broadcastState = () => {
    const s = timer.getState()
    ws.broadcast({ type: 'tick', remaining: s.remainingSeconds, status: s.status, session: s.sessionType, pomodoro: s.pomodoroNumber })
    return s
  }

  app.get('/timer', async () => timer.getState())

  app.post('/timer/start', async (req) => {
    const body = req.body as { taskId?: string } | null
    timer.start(body?.taskId)
    return broadcastState()
  })

  app.post('/timer/pause', async () => {
    const s = timer.getState()
    if (s.status === 'running') timer.pause()
    else if (s.status === 'paused') timer.resume()
    return broadcastState()
  })

  app.post('/timer/skip', async () => {
    timer.skip()
    return broadcastState()
  })

  app.post('/timer/reset', async () => {
    timer.reset()
    return broadcastState()
  })
}
