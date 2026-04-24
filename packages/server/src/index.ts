import { createDb } from './db.js'
import { TimerEngine } from './timer.js'
import { WsManager } from './ws.js'
import { createApp } from './server.js'

const PORT = Number(process.env.POMODORO_PORT ?? 3333)
const HOST = '127.0.0.1'

async function main() {
  const db = createDb()
  const ws = new WsManager()
  const timer = new TimerEngine(
    db,
    (state) => ws.broadcast({ type: 'tick', remaining: state.remainingSeconds, status: state.status, session: state.sessionType, pomodoro: state.pomodoroNumber }),
    (completed, next) => ws.broadcast({ type: 'session_complete', session: completed, next }),
  )

  const app = await createApp(db, timer, ws)
  await app.listen({ port: PORT, host: HOST })
  process.stdout.write(`pomodoro server on http://${HOST}:${PORT}\n`)
}

main().catch(err => { console.error(err); process.exit(1) })

export type { Task, Session, Settings, TimerState, ServerMessage, ClientMessage, TaskCategory, TaskStatus, SessionType, TimerStatus } from './types.js'
