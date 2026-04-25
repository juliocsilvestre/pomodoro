import type { ServerMessage, Task, Settings, TaskCategory, Session } from './types.js'

export type { ServerMessage, Task, Settings, TaskCategory, Session }

const BASE = ''
const WS_BASE = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}`

export async function getTasks(): Promise<Task[]> {
  return (await fetch(`${BASE}/tasks`)).json()
}

export async function postTask(title: string, category: TaskCategory): Promise<Task> {
  return (await fetch(`${BASE}/tasks`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title, category }),
  })).json()
}

export async function patchTask(id: string, patch: Partial<Pick<Task, 'title' | 'status' | 'category'>>): Promise<Task> {
  return (await fetch(`${BASE}/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  })).json()
}

export async function deleteTask(id: string): Promise<void> {
  await fetch(`${BASE}/tasks/${id}`, { method: 'DELETE' })
}

export async function getSessions(): Promise<Session[]> {
  return (await fetch(`${BASE}/sessions`)).json()
}

export async function getSettings(): Promise<Settings> {
  return (await fetch(`${BASE}/settings`)).json()
}

export async function putSettings(patch: Partial<Record<string, unknown>>): Promise<Settings> {
  return (await fetch(`${BASE}/settings`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  })).json()
}

export async function timerPost(action: 'start' | 'pause' | 'skip' | 'reset', body?: object) {
  return (await fetch(`${BASE}/timer/${action}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })).json()
}

export function connectWs(onMessage: (msg: ServerMessage) => void): () => void {
  let alive = true
  let ws: WebSocket

  function connect() {
    ws = new WebSocket(`${WS_BASE}/ws`)
    ws.onmessage = (e) => {
      try {
        onMessage(JSON.parse(e.data as string) as ServerMessage)
      } catch {}
    }
    ws.onclose = () => {
      if (alive) setTimeout(connect, 2000)
    }
    ws.onerror = () => ws.close()
  }

  connect()
  return () => {
    alive = false
    ws.close()
  }
}
