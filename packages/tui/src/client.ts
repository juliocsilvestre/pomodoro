import WebSocket from 'ws'
import type { ServerMessage, ClientMessage, Task, Settings, TimerState, TaskCategory } from '@juliocsilvestre/pomodoro-server'

export function buildUrl(path: string, proto = 'http') {
  const port = process.env.POMODORO_PORT ?? '3333'
  return `${proto}://localhost:${port}${path}`
}

export async function fetchTasks(): Promise<Task[]> {
  const res = await fetch(buildUrl('/tasks'))
  return res.json() as Promise<Task[]>
}

export async function createTask(title: string, category: TaskCategory): Promise<Task> {
  const res = await fetch(buildUrl('/tasks'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title, category }),
  })
  return res.json() as Promise<Task>
}

export async function updateTask(id: string, patch: Partial<Pick<Task, 'title' | 'status' | 'category'>>): Promise<Task> {
  const res = await fetch(buildUrl(`/tasks/${id}`), {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  })
  return res.json() as Promise<Task>
}

export async function deleteTask(id: string): Promise<void> {
  await fetch(buildUrl(`/tasks/${id}`), { method: 'DELETE' })
}

export async function fetchSettings(): Promise<Settings> {
  const res = await fetch(buildUrl('/settings'))
  return res.json() as Promise<Settings>
}

export async function timerAction(action: 'start' | 'pause' | 'skip' | 'reset', taskId?: string) {
  await fetch(buildUrl(`/timer/${action}`), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(taskId ? { taskId } : {}),
  })
}

type MessageHandler = (msg: ServerMessage) => void

export function connectWs(onMessage: MessageHandler, onOpen?: () => void): () => void {
  let ws: WebSocket
  let alive = true

  function connect() {
    ws = new WebSocket(buildUrl('/ws', 'ws'))
    ws.on('open', () => onOpen?.())
    ws.on('message', (data) => {
      try { onMessage(JSON.parse(data.toString()) as ServerMessage) } catch {}
    })
    ws.on('close', () => {
      if (alive) setTimeout(connect, 2000)
    })
    ws.on('error', () => ws.terminate())
  }

  connect()
  return () => { alive = false; ws.terminate() }
}

export type { Task, Settings, TimerState, ServerMessage, ClientMessage, TaskCategory }
