# Pomodoro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Pomodoro timer with a TUI (terminal) and a Web App sharing real-time state via a local Node.js server persisted in SQLite.

**Architecture:** Monorepo (`packages/server`, `packages/tui`, `packages/web`) + root CLI (`bin/cli.js`). The server owns the timer engine, SQLite DB, REST API, and WebSocket broadcast. TUI and Web connect via WebSocket and use REST for CRUD. Timer state is in-memory; tasks/sessions/settings live in `~/.pomodoro/data.db`.

**Tech Stack:** Node.js 20+, TypeScript 5 strict, Fastify 4 + @fastify/websocket + @fastify/static, better-sqlite3, nanoid, ink 4 (TUI), React 18 (TUI), Vite 5 (web), Vitest 1 (tests)

**Git conventions:** gitmoji prefix on every commit. No Co-Authored-By. Feature branches off `develop`.

---

## File Map

```
pomodoro/
├── bin/
│   └── cli.js                          root CLI entry (ESM)
├── package.json                        workspaces root + bin
├── tsconfig.json                       base TS config
├── README.md
└── packages/
    ├── server/
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── src/
    │   │   ├── types.ts                shared types + WS message contracts
    │   │   ├── db.ts                   SQLite factory, schema, seed defaults
    │   │   ├── timer.ts                TimerEngine class (pure, callback-based)
    │   │   ├── ws.ts                   WsManager (broadcast to all clients)
    │   │   ├── handler.ts              handle WS messages from clients
    │   │   ├── server.ts               Fastify app factory (createApp)
    │   │   ├── index.ts                entry: wire everything, start HTTP+WS
    │   │   └── routes/
    │   │       ├── tasks.ts            GET/POST/PATCH/DELETE /tasks
    │   │       ├── sessions.ts         GET /sessions
    │   │       ├── settings.ts         GET/PUT /settings
    │   │       └── timer.ts            POST /timer/start|pause|skip|reset
    │   └── test/
    │       ├── db.test.ts
    │       ├── timer.test.ts
    │       ├── tasks.test.ts
    │       ├── sessions.test.ts
    │       ├── settings.test.ts
    │       └── timer-routes.test.ts
    ├── tui/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── client.ts               REST + WS client (reconnect logic)
    │       ├── App.tsx                 root ink component, focus management
    │       ├── index.ts                entry: check server, spawn if needed
    │       └── components/
    │           ├── ProgressBar.tsx
    │           ├── TimerPanel.tsx      left panel
    │           ├── TasksPanel.tsx      right panel
    │           └── AddTaskForm.tsx     inline add-task input
    └── web/
        ├── package.json
        ├── tsconfig.json
        ├── vite.config.ts
        ├── index.html
        ├── public/assets/bell.mp3
        └── src/
            ├── api.ts                  WS + REST client
            ├── state.ts                reactive state store
            ├── sound.ts                Web Audio API + file audio
            ├── pip.ts                  Document Picture-in-Picture
            ├── main.ts                 entry: boot, tabs, routing
            ├── tabs/
            │   ├── timer.ts
            │   ├── tasks.ts
            │   ├── history.ts
            │   └── settings.ts
            └── styles/
                └── main.css
```

---

## Task 1: Initialize Monorepo

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `packages/server/package.json`
- Create: `packages/server/tsconfig.json`
- Create: `packages/tui/package.json`
- Create: `packages/tui/tsconfig.json`
- Create: `packages/web/package.json`
- Create: `packages/web/tsconfig.json`
- Create: `packages/web/vite.config.ts`

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "@juliocsilvestre/pomodoro",
  "version": "0.1.0",
  "description": "Pomodoro timer — TUI + web app with shared real-time state",
  "bin": { "pomodoro": "./bin/cli.js" },
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "dev:server": "npm run dev -w packages/server",
    "dev:web": "npm run dev -w packages/web"
  },
  "license": "MIT"
}
```

- [ ] **Step 2: Create root `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}
```

- [ ] **Step 3: Create `packages/server/package.json`**

```json
{
  "name": "@juliocsilvestre/pomodoro-server",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "@fastify/static": "^7.0.4",
    "@fastify/websocket": "^10.0.1",
    "fastify": "^4.28.1",
    "better-sqlite3": "^9.6.0",
    "nanoid": "^5.0.7"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.10",
    "@types/node": "^20.14.0",
    "tsx": "^4.16.0",
    "typescript": "^5.5.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 4: Create `packages/server/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 5: Create `packages/tui/package.json`**

```json
{
  "name": "@juliocsilvestre/pomodoro-tui",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "ink": "^4.4.1",
    "react": "^18.3.1",
    "@juliocsilvestre/pomodoro-server": "*"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.3",
    "tsx": "^4.16.0",
    "typescript": "^5.5.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 6: Create `packages/tui/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 7: Create `packages/web/package.json`**

```json
{
  "name": "@juliocsilvestre/pomodoro-web",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "vite build",
    "dev": "vite",
    "test": "vitest run --environment jsdom"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "typescript": "^5.5.0",
    "vite": "^5.3.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 8: Create `packages/web/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"],
    "noEmit": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 9: Create `packages/web/vite.config.ts`**

```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3333',
      '/ws': { target: 'ws://localhost:3333', ws: true },
    },
  },
  build: { outDir: 'dist', emptyOutDir: true },
})
```

- [ ] **Step 10: Install dependencies and commit**

```bash
npm install
git add -A
git commit -m "🎉 initialize monorepo with server, tui, web packages"
```

---

## Task 2: Shared Types

**Files:**
- Create: `packages/server/src/types.ts`

- [ ] **Step 1: Create `packages/server/src/types.ts`**

```typescript
export type TaskCategory = 'work' | 'study' | 'personal'
export type TaskStatus = 'pending' | 'done' | 'archived'
export type SessionType = 'work' | 'short_break' | 'long_break'
export type TimerStatus = 'idle' | 'running' | 'paused'

export interface Task {
  id: string
  title: string
  category: TaskCategory
  status: TaskStatus
  pomodoro_count: number
  created_at: number
  completed_at: number | null
}

export interface Session {
  id: string
  task_id: string | null
  type: SessionType
  started_at: number
  ended_at: number
  duration_s: number
}

export interface Settings {
  work_duration: number
  short_break: number
  long_break: number
  long_break_interval: number
  sound_type: 'generated' | 'file'
  sound_volume: number
}

export interface TimerState {
  status: TimerStatus
  sessionType: SessionType
  remainingSeconds: number
  pomodoroNumber: number
  currentTaskId: string | null
  sessionStartedAt: number | null
}

export type ServerMessage =
  | { type: 'tick'; remaining: number; status: TimerStatus; session: SessionType; pomodoro: number }
  | { type: 'session_complete'; session: SessionType; next: SessionType }
  | { type: 'task_updated'; task: Task }
  | { type: 'task_deleted'; id: string }
  | { type: 'settings_updated'; settings: Settings }
  | { type: 'state'; timer: TimerState; tasks: Task[] }

export type ClientMessage =
  | { type: 'timer_action'; action: 'start' | 'pause' | 'skip' | 'reset'; taskId?: string }
```

- [ ] **Step 2: Commit**

```bash
git add packages/server/src/types.ts
git commit -m "✨ add shared TypeScript types and message contracts"
```

---

## Task 3: Database Module

**Files:**
- Create: `packages/server/src/db.ts`
- Create: `packages/server/test/db.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// packages/server/test/db.test.ts
import { describe, it, expect } from 'vitest'
import { createDb } from '../src/db.js'

describe('createDb', () => {
  it('creates tables and inserts default settings', () => {
    const db = createDb(':memory:')
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
    const m = Object.fromEntries(rows.map(r => [r.key, r.value]))
    expect(m.work_duration).toBe('1500')
    expect(m.short_break).toBe('300')
    expect(m.long_break).toBe('900')
    expect(m.long_break_interval).toBe('4')
    expect(m.sound_type).toBe('generated')
    expect(m.sound_volume).toBe('0.7')
  })

  it('uses INSERT OR IGNORE so existing settings are not overwritten', () => {
    const db = createDb(':memory:')
    db.prepare("UPDATE settings SET value = '3000' WHERE key = 'work_duration'").run()
    // calling createDb again on the same path would not reset because of OR IGNORE
    const row = db.prepare("SELECT value FROM settings WHERE key = 'work_duration'").get() as { value: string }
    expect(row.value).toBe('3000')
  })

  it('accepts a task with valid category', () => {
    const db = createDb(':memory:')
    expect(() => {
      db.prepare('INSERT INTO tasks (id, title, category, created_at) VALUES (?, ?, ?, ?)').run('1', 'Test', 'work', Date.now())
    }).not.toThrow()
  })

  it('rejects a task with invalid category', () => {
    const db = createDb(':memory:')
    expect(() => {
      db.prepare('INSERT INTO tasks (id, title, category, created_at) VALUES (?, ?, ?, ?)').run('2', 'Test', 'invalid', Date.now())
    }).toThrow()
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd packages/server && npx vitest run test/db.test.ts
```

Expected: FAIL — `createDb` not found.

- [ ] **Step 3: Implement `packages/server/src/db.ts`**

```typescript
import Database from 'better-sqlite3'
import { join } from 'path'
import { homedir } from 'os'
import { mkdirSync } from 'fs'

const DATA_DIR = join(homedir(), '.pomodoro')

export function createDb(path?: string) {
  const dbPath = path ?? (() => {
    mkdirSync(DATA_DIR, { recursive: true })
    return join(DATA_DIR, 'data.db')
  })()

  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT CHECK(category IN ('work', 'study', 'personal')) NOT NULL,
      status TEXT CHECK(status IN ('pending', 'done', 'archived')) DEFAULT 'pending',
      pomodoro_count INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      completed_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      task_id TEXT REFERENCES tasks(id),
      type TEXT CHECK(type IN ('work', 'short_break', 'long_break')) NOT NULL,
      started_at INTEGER NOT NULL,
      ended_at INTEGER NOT NULL,
      duration_s INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  const defaults: Record<string, string> = {
    work_duration: '1500',
    short_break: '300',
    long_break: '900',
    long_break_interval: '4',
    sound_type: 'generated',
    sound_volume: '0.7',
  }
  const ins = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
  for (const [k, v] of Object.entries(defaults)) ins.run(k, v)

  return db
}

export type Db = ReturnType<typeof createDb>
```

- [ ] **Step 4: Run test — verify it passes**

```bash
cd packages/server && npx vitest run test/db.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/db.ts packages/server/test/db.test.ts
git commit -m "✨ add database module with schema and default settings"
```

---

## Task 4: Timer Engine

**Files:**
- Create: `packages/server/src/timer.ts`
- Create: `packages/server/test/timer.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/server/test/timer.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TimerEngine } from '../src/timer.js'
import { createDb } from '../src/db.js'
import type { Db } from '../src/db.js'

function make(db?: Db) {
  const _db = db ?? createDb(':memory:')
  const onTick = vi.fn()
  const onComplete = vi.fn()
  const timer = new TimerEngine(_db, onTick, onComplete)
  return { timer, db: _db, onTick, onComplete }
}

describe('TimerEngine', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('initializes idle at configured work_duration', () => {
    const { timer } = make()
    const s = timer.getState()
    expect(s.status).toBe('idle')
    expect(s.sessionType).toBe('work')
    expect(s.remainingSeconds).toBe(1500)
    expect(s.pomodoroNumber).toBe(1)
    expect(s.currentTaskId).toBeNull()
  })

  it('start() sets status to running', () => {
    const { timer } = make()
    timer.start()
    expect(timer.getState().status).toBe('running')
  })

  it('pause() stops countdown', () => {
    const { timer } = make()
    timer.start()
    timer.pause()
    expect(timer.getState().status).toBe('paused')
  })

  it('resume() restarts from paused', () => {
    const { timer } = make()
    timer.start(); timer.pause(); timer.resume()
    expect(timer.getState().status).toBe('running')
  })

  it('onTick fires every second while running', () => {
    const { timer, onTick } = make()
    timer.start()
    vi.advanceTimersByTime(3000)
    expect(onTick).toHaveBeenCalledTimes(3)
  })

  it('skip() on work advances to short_break', () => {
    const { timer, onComplete } = make()
    timer.start(); timer.skip()
    expect(timer.getState().sessionType).toBe('short_break')
    expect(timer.getState().status).toBe('idle')
    expect(onComplete).toHaveBeenCalledWith('work', 'short_break')
  })

  it('4th work skip advances to long_break', () => {
    const { timer, onComplete } = make()
    for (let i = 0; i < 3; i++) {
      timer.start(); timer.skip() // work → short_break
      timer.start(); timer.skip() // short_break → work
    }
    timer.start(); timer.skip()   // 4th work → long_break
    expect(timer.getState().sessionType).toBe('long_break')
    expect(onComplete).toHaveBeenLastCalledWith('work', 'long_break')
  })

  it('natural completion fires onComplete and persists session', () => {
    const db = createDb(':memory:')
    db.prepare("UPDATE settings SET value = '1' WHERE key = 'work_duration'").run()
    const { timer, onComplete } = make(db)
    timer.start()
    vi.advanceTimersByTime(1500)
    expect(onComplete).toHaveBeenCalledWith('work', 'short_break')
    const sessions = db.prepare('SELECT * FROM sessions').all()
    expect(sessions).toHaveLength(1)
  })

  it('reset() returns to initial idle state', () => {
    const { timer } = make()
    timer.start(); timer.skip(); timer.reset()
    const s = timer.getState()
    expect(s.status).toBe('idle')
    expect(s.sessionType).toBe('work')
    expect(s.remainingSeconds).toBe(1500)
    expect(s.pomodoroNumber).toBe(1)
  })

  it('increments task pomodoro_count on work completion', () => {
    const db = createDb(':memory:')
    db.prepare("UPDATE settings SET value = '1' WHERE key = 'work_duration'").run()
    db.prepare('INSERT INTO tasks (id, title, category, created_at) VALUES (?, ?, ?, ?)').run('t1', 'Test', 'work', Date.now())
    const { timer } = make(db)
    timer.start('t1')
    vi.advanceTimersByTime(1500)
    const task = db.prepare('SELECT pomodoro_count FROM tasks WHERE id = ?').get('t1') as { pomodoro_count: number }
    expect(task.pomodoro_count).toBe(1)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd packages/server && npx vitest run test/timer.test.ts
```

Expected: FAIL — `TimerEngine` not found.

- [ ] **Step 3: Implement `packages/server/src/timer.ts`**

```typescript
import { nanoid } from 'nanoid'
import type { Db } from './db.js'
import type { TimerState, SessionType, Settings } from './types.js'

type TickCb = (state: TimerState) => void
type CompleteCb = (completed: SessionType, next: SessionType) => void

export class TimerEngine {
  private state: TimerState
  private interval: ReturnType<typeof setInterval> | null = null

  constructor(
    private db: Db,
    private onTick: TickCb,
    private onComplete: CompleteCb,
  ) {
    const s = this.settings()
    this.state = {
      status: 'idle',
      sessionType: 'work',
      remainingSeconds: s.work_duration,
      pomodoroNumber: 1,
      currentTaskId: null,
      sessionStartedAt: null,
    }
  }

  getState(): TimerState { return { ...this.state } }

  start(taskId?: string) {
    if (this.state.status === 'running') return
    if (taskId) this.state.currentTaskId = taskId
    if (!this.state.sessionStartedAt) this.state.sessionStartedAt = Date.now()
    this.state.status = 'running'
    this.tick()
  }

  pause() {
    if (this.state.status !== 'running') return
    this.state.status = 'paused'
    this.clear()
  }

  resume() {
    if (this.state.status !== 'paused') return
    this.state.status = 'running'
    this.tick()
  }

  skip() {
    this.clear()
    const completed = this.state.sessionType
    this.advance()
    this.onComplete(completed, this.state.sessionType)
  }

  reset() {
    this.clear()
    const s = this.settings()
    this.state = {
      status: 'idle',
      sessionType: 'work',
      remainingSeconds: s.work_duration,
      pomodoroNumber: 1,
      currentTaskId: null,
      sessionStartedAt: null,
    }
    this.onTick(this.getState())
  }

  private tick() {
    this.clear()
    this.interval = setInterval(() => {
      this.state.remainingSeconds--
      this.onTick(this.getState())
      if (this.state.remainingSeconds <= 0) this.complete()
    }, 1000)
  }

  private clear() {
    if (this.interval) { clearInterval(this.interval); this.interval = null }
  }

  private complete() {
    this.clear()
    const completed = this.state.sessionType
    this.persist()
    this.advance()
    this.onComplete(completed, this.state.sessionType)
  }

  private persist() {
    const s = this.settings()
    const duration =
      this.state.sessionType === 'work' ? s.work_duration
      : this.state.sessionType === 'short_break' ? s.short_break
      : s.long_break
    const now = Date.now()
    const startedAt = this.state.sessionStartedAt ?? now - duration * 1000
    this.db.prepare(
      'INSERT INTO sessions (id, task_id, type, started_at, ended_at, duration_s) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(nanoid(), this.state.currentTaskId, this.state.sessionType, startedAt, now, duration)
    if (this.state.sessionType === 'work' && this.state.currentTaskId) {
      this.db.prepare('UPDATE tasks SET pomodoro_count = pomodoro_count + 1 WHERE id = ?').run(this.state.currentTaskId)
    }
  }

  private advance() {
    const s = this.settings()
    if (this.state.sessionType === 'work') {
      const long = this.state.pomodoroNumber % s.long_break_interval === 0
      this.state.sessionType = long ? 'long_break' : 'short_break'
      this.state.remainingSeconds = long ? s.long_break : s.short_break
    } else {
      this.state.pomodoroNumber++
      this.state.sessionType = 'work'
      this.state.remainingSeconds = s.work_duration
    }
    this.state.status = 'idle'
    this.state.currentTaskId = null
    this.state.sessionStartedAt = null
  }

  private settings(): Settings {
    const rows = this.db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
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
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
cd packages/server && npx vitest run test/timer.test.ts
```

Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/timer.ts packages/server/test/timer.test.ts
git commit -m "✨ add timer engine with state machine and session persistence"
```

---

## Task 5: WebSocket Manager

**Files:**
- Create: `packages/server/src/ws.ts`

- [ ] **Step 1: Create `packages/server/src/ws.ts`**

```typescript
import type { WebSocket } from 'ws'
import type { ServerMessage } from './types.js'

export class WsManager {
  private clients = new Set<WebSocket>()

  add(ws: WebSocket) {
    this.clients.add(ws)
    ws.on('close', () => this.clients.delete(ws))
  }

  broadcast(msg: ServerMessage) {
    const data = JSON.stringify(msg)
    for (const client of this.clients) {
      if (client.readyState === 1 /* OPEN */) client.send(data)
    }
  }

  size() { return this.clients.size }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/server/src/ws.ts
git commit -m "✨ add WebSocket manager with broadcast"
```

---

## Task 6: Task Routes

**Files:**
- Create: `packages/server/src/routes/tasks.ts`
- Create: `packages/server/test/tasks.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/server/test/tasks.test.ts
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
    expect(res.json().status).toBe('done')
    expect(res.json().completed_at).toBeTruthy()
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
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd packages/server && npx vitest run test/tasks.test.ts
```

Expected: FAIL — `registerTaskRoutes` not found.

- [ ] **Step 3: Implement `packages/server/src/routes/tasks.ts`**

```typescript
import type { FastifyInstance } from 'fastify'
import { nanoid } from 'nanoid'
import type { Db } from '../db.js'
import type { WsManager } from '../ws.js'
import type { Task, TaskCategory, TaskStatus } from '../types.js'

export async function registerTaskRoutes(app: FastifyInstance, db: Db, ws: WsManager) {
  app.get('/tasks', async (req, reply) => {
    const { status, category } = req.query as { status?: string; category?: string }
    let sql = 'SELECT * FROM tasks WHERE status != ?'
    const params: unknown[] = ['archived']
    if (status) { sql += ' AND status = ?'; params.push(status) }
    if (category) { sql += ' AND category = ?'; params.push(category) }
    sql += ' ORDER BY created_at ASC'
    return db.prepare(sql).all(...params)
  })

  app.post('/tasks', async (req, reply) => {
    const { title, category } = req.body as { title: string; category: TaskCategory }
    if (!['work', 'study', 'personal'].includes(category)) {
      return reply.status(400).send({ error: 'Invalid category' })
    }
    const task: Task = {
      id: nanoid(),
      title,
      category,
      status: 'pending',
      pomodoro_count: 0,
      created_at: Date.now(),
      completed_at: null,
    }
    db.prepare(
      'INSERT INTO tasks (id, title, category, status, pomodoro_count, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(task.id, task.title, task.category, task.status, task.pomodoro_count, task.created_at)
    ws.broadcast({ type: 'task_updated', task })
    return reply.status(201).send(task)
  })

  app.patch('/tasks/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const updates = req.body as Partial<Pick<Task, 'title' | 'status' | 'category'>>
    if (updates.status === 'done') (updates as Record<string, unknown>).completed_at = Date.now()
    const cols = Object.keys(updates).map(k => `${k} = ?`).join(', ')
    db.prepare(`UPDATE tasks SET ${cols} WHERE id = ?`).run(...Object.values(updates), id)
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task
    if (!task) return reply.status(404).send({ error: 'Not found' })
    ws.broadcast({ type: 'task_updated', task })
    return task
  })

  app.delete('/tasks/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
    ws.broadcast({ type: 'task_deleted', id })
    return reply.status(204).send()
  })
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
cd packages/server && npx vitest run test/tasks.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/routes/tasks.ts packages/server/test/tasks.test.ts
git commit -m "✨ add task CRUD routes with WS broadcast"
```

---

## Task 7: Sessions, Settings, and Timer Routes

**Files:**
- Create: `packages/server/src/routes/sessions.ts`
- Create: `packages/server/src/routes/settings.ts`
- Create: `packages/server/src/routes/timer.ts`
- Create: `packages/server/test/sessions.test.ts`
- Create: `packages/server/test/settings.test.ts`
- Create: `packages/server/test/timer-routes.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/server/test/sessions.test.ts
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
```

```typescript
// packages/server/test/settings.test.ts
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
  return { app, db }
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
    const { app } = await buildApp()
    const res = await app.inject({
      method: 'PUT', url: '/settings',
      payload: { work_duration: 3000 },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().work_duration).toBe(3000)
  })
})
```

```typescript
// packages/server/test/timer-routes.test.ts
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
    expect(res.json().sessionType).toBe('work')
    expect(res.json().status).toBe('idle')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd packages/server && npx vitest run test/sessions.test.ts test/settings.test.ts test/timer-routes.test.ts
```

Expected: FAIL — route register functions not found.

- [ ] **Step 3: Implement `packages/server/src/routes/sessions.ts`**

```typescript
import type { FastifyInstance } from 'fastify'
import type { Db } from '../db.js'

export async function registerSessionRoutes(app: FastifyInstance, db: Db) {
  app.get('/sessions', async (req) => {
    const { date } = req.query as { date?: string }
    let sql = 'SELECT * FROM sessions'
    const params: unknown[] = []
    if (date) {
      const start = new Date(date).setHours(0, 0, 0, 0)
      const end = new Date(date).setHours(23, 59, 59, 999)
      sql += ' WHERE started_at BETWEEN ? AND ?'
      params.push(start, end)
    }
    sql += ' ORDER BY started_at DESC'
    return db.prepare(sql).all(...params)
  })
}
```

- [ ] **Step 4: Implement `packages/server/src/routes/settings.ts`**

```typescript
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

export async function registerSettingsRoutes(
  app: FastifyInstance,
  db: Db,
  _timer: TimerEngine,
  ws: WsManager,
) {
  app.get('/settings', async () => readSettings(db))

  app.put('/settings', async (req) => {
    const updates = req.body as Partial<Record<string, string | number>>
    const upd = db.prepare('UPDATE settings SET value = ? WHERE key = ?')
    for (const [k, v] of Object.entries(updates)) upd.run(String(v), k)
    const settings = readSettings(db)
    ws.broadcast({ type: 'settings_updated', settings })
    return settings
  })
}
```

- [ ] **Step 5: Implement `packages/server/src/routes/timer.ts`**

```typescript
import type { FastifyInstance } from 'fastify'
import type { WsManager } from '../ws.js'
import type { TimerEngine } from '../timer.js'

export async function registerTimerRoutes(app: FastifyInstance, timer: TimerEngine, ws: WsManager) {
  const state = () => {
    const s = timer.getState()
    ws.broadcast({ type: 'tick', remaining: s.remainingSeconds, status: s.status, session: s.sessionType, pomodoro: s.pomodoroNumber })
    return s
  }

  app.get('/timer', async () => timer.getState())

  app.post('/timer/start', async (req) => {
    const { taskId } = req.body as { taskId?: string } ?? {}
    timer.start(taskId)
    return state()
  })

  app.post('/timer/pause', async () => {
    const s = timer.getState()
    if (s.status === 'running') timer.pause()
    else if (s.status === 'paused') timer.resume()
    return state()
  })

  app.post('/timer/skip', async () => {
    timer.skip()
    return timer.getState()
  })

  app.post('/timer/reset', async () => {
    timer.reset()
    return timer.getState()
  })
}
```

- [ ] **Step 6: Run tests — verify they pass**

```bash
cd packages/server && npx vitest run test/sessions.test.ts test/settings.test.ts test/timer-routes.test.ts
```

Expected: PASS (all tests).

- [ ] **Step 7: Commit**

```bash
git add packages/server/src/routes/
git add packages/server/test/sessions.test.ts packages/server/test/settings.test.ts packages/server/test/timer-routes.test.ts
git commit -m "✨ add sessions, settings, and timer routes"
```

---

## Task 8: Server Entry (Fastify + WebSocket + HTTP)

**Files:**
- Create: `packages/server/src/handler.ts`
- Create: `packages/server/src/server.ts`
- Create: `packages/server/src/index.ts`

- [ ] **Step 1: Create `packages/server/src/handler.ts`**

```typescript
import type { ClientMessage } from './types.js'
import type { TimerEngine } from './timer.js'

export function handleClientMessage(msg: ClientMessage, timer: TimerEngine) {
  if (msg.type !== 'timer_action') return
  if (msg.action === 'start') timer.start(msg.taskId)
  else if (msg.action === 'pause') {
    const s = timer.getState()
    if (s.status === 'running') timer.pause()
    else if (s.status === 'paused') timer.resume()
  }
  else if (msg.action === 'skip') timer.skip()
  else if (msg.action === 'reset') timer.reset()
}
```

- [ ] **Step 2: Create `packages/server/src/server.ts`**

```typescript
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

const __dirname = dirname(fileURLToPath(import.meta.url))

export async function createApp(db: Db, timer: TimerEngine, ws: WsManager) {
  const app = Fastify({ logger: false })

  await app.register(fastifyWebsocket)

  app.get('/ws', { websocket: true }, (socket) => {
    ws.add(socket)
    socket.send(JSON.stringify({
      type: 'state',
      timer: timer.getState(),
      tasks: db.prepare("SELECT * FROM tasks WHERE status != 'archived' ORDER BY created_at ASC").all(),
    }))
    socket.on('message', (raw) => {
      try { handleClientMessage(JSON.parse(raw.toString()), timer) } catch {}
    })
  })

  await registerTaskRoutes(app, db, ws)
  await registerSessionRoutes(app, db)
  await registerSettingsRoutes(app, db, timer, ws)
  await registerTimerRoutes(app, timer, ws)

  const webDist = join(__dirname, '../../../web/dist')
  if (existsSync(webDist)) {
    await app.register(fastifyStatic, { root: webDist, prefix: '/' })
  }

  return app
}
```

- [ ] **Step 3: Create `packages/server/src/index.ts`**

```typescript
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
```

- [ ] **Step 4: Build and smoke-test**

```bash
cd packages/server && npm run build && node dist/index.js &
sleep 1 && curl -s http://localhost:3333/timer | head -c 80
kill %1
```

Expected: JSON with `status: "idle"`.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/handler.ts packages/server/src/server.ts packages/server/src/index.ts
git commit -m "✨ add Fastify server with WebSocket and HTTP entry point"
```

---

## Task 9: TUI — Client Module

**Files:**
- Create: `packages/tui/src/client.ts`
- Create: `packages/tui/test/client.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// packages/tui/test/client.test.ts
import { describe, it, expect, vi } from 'vitest'
import { buildUrl } from '../src/client.js'

describe('buildUrl', () => {
  it('builds REST url with default port', () => {
    expect(buildUrl('/tasks')).toBe('http://localhost:3333/tasks')
  })

  it('builds WS url', () => {
    expect(buildUrl('/ws', 'ws')).toBe('ws://localhost:3333/ws')
  })

  it('respects POMODORO_PORT env', () => {
    process.env.POMODORO_PORT = '4000'
    expect(buildUrl('/timer')).toBe('http://localhost:4000/timer')
    delete process.env.POMODORO_PORT
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd packages/tui && npx vitest run test/client.test.ts
```

- [ ] **Step 3: Implement `packages/tui/src/client.ts`**

```typescript
import WebSocket from 'ws'
import type { ServerMessage, ClientMessage, Task, Settings, TimerState } from '@juliocsilvestre/pomodoro-server'

const PORT = process.env.POMODORO_PORT ?? '3333'

export function buildUrl(path: string, proto = 'http') {
  return `${proto}://localhost:${PORT}${path}`
}

// REST helpers
export async function fetchTasks(): Promise<Task[]> {
  const res = await fetch(buildUrl('/tasks'))
  return res.json()
}

export async function createTask(title: string, category: Task['category']): Promise<Task> {
  const res = await fetch(buildUrl('/tasks'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title, category }),
  })
  return res.json()
}

export async function updateTask(id: string, patch: Partial<Pick<Task, 'title' | 'status' | 'category'>>): Promise<Task> {
  const res = await fetch(buildUrl(`/tasks/${id}`), {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  })
  return res.json()
}

export async function deleteTask(id: string): Promise<void> {
  await fetch(buildUrl(`/tasks/${id}`), { method: 'DELETE' })
}

export async function fetchSettings(): Promise<Settings> {
  const res = await fetch(buildUrl('/settings'))
  return res.json()
}

export async function timerAction(action: ClientMessage['action'], taskId?: string) {
  await fetch(buildUrl(`/timer/${action}`), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(taskId ? { taskId } : {}),
  })
}

// WebSocket client with reconnect
type MessageHandler = (msg: ServerMessage) => void

export function connectWs(onMessage: MessageHandler, onOpen?: () => void): () => void {
  let ws: WebSocket
  let alive = true

  function connect() {
    ws = new WebSocket(buildUrl('/ws', 'ws'))
    ws.on('open', () => onOpen?.())
    ws.on('message', (data) => {
      try { onMessage(JSON.parse(data.toString())) } catch {}
    })
    ws.on('close', () => {
      if (alive) setTimeout(connect, 2000)
    })
    ws.on('error', () => ws.terminate())
  }

  connect()
  return () => { alive = false; ws.terminate() }
}
```

Note: the `@juliocsilvestre/pomodoro-server` import requires the server package to export its types. Add to `packages/server/src/index.ts` (or create a separate `packages/server/src/exports.ts`):

```typescript
// add to bottom of packages/server/src/index.ts (or a new exports.ts)
export type { Task, Session, Settings, TimerState, ServerMessage, ClientMessage, TaskCategory, TaskStatus, SessionType, TimerStatus } from './types.js'
```

And in `packages/server/package.json` ensure `"exports"` is set:
```json
"exports": {
  ".": "./dist/index.js"
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
cd packages/tui && npx vitest run test/client.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/tui/src/client.ts packages/tui/test/client.test.ts packages/server/src/index.ts
git commit -m "✨ add TUI client module (REST + WS) with reconnect"
```

---

## Task 10: TUI — Components

**Files:**
- Create: `packages/tui/src/components/ProgressBar.tsx`
- Create: `packages/tui/src/components/TimerPanel.tsx`
- Create: `packages/tui/src/components/TasksPanel.tsx`
- Create: `packages/tui/src/components/AddTaskForm.tsx`

- [ ] **Step 1: Create `packages/tui/src/components/ProgressBar.tsx`**

```tsx
import React from 'react'
import { Text } from 'ink'

interface Props {
  total: number
  remaining: number
  width?: number
}

export function ProgressBar({ total, remaining, width = 20 }: Props) {
  const pct = total > 0 ? (total - remaining) / total : 0
  const filled = Math.round(pct * width)
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled)
  return <Text>{bar}  {Math.round(pct * 100)}%</Text>
}
```

- [ ] **Step 2: Create `packages/tui/src/components/TimerPanel.tsx`**

```tsx
import React from 'react'
import { Box, Text } from 'ink'
import type { TimerState, Settings } from '../client.js'
import { ProgressBar } from './ProgressBar.js'

interface Props {
  timer: TimerState
  settings: Settings
  focused: boolean
}

const SESSION_LABEL: Record<string, string> = {
  work: 'TRABALHO',
  short_break: 'PAUSA CURTA',
  long_break: 'PAUSA LONGA',
}

const STATUS_LABEL: Record<string, string> = {
  idle: 'parado',
  running: 'rodando',
  paused: 'pausado',
}

function fmt(s: number) {
  const m = String(Math.floor(s / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  return `${m}:${sec}`
}

function totalFor(timer: TimerState, settings: Settings) {
  if (timer.sessionType === 'work') return settings.work_duration
  if (timer.sessionType === 'short_break') return settings.short_break
  return settings.long_break
}

export function TimerPanel({ timer, settings, focused }: Props) {
  const border = focused ? 'bold' : undefined
  const dots = '●'.repeat(timer.pomodoroNumber) + '○'.repeat(Math.max(0, settings.long_break_interval - timer.pomodoroNumber))

  return (
    <Box flexDirection="column" width={26} borderStyle={border} borderColor="white" paddingX={1}>
      <Text bold>{SESSION_LABEL[timer.sessionType]}  #{timer.pomodoroNumber}</Text>
      <Text> </Text>
      <Text color="white">{fmt(timer.remainingSeconds)}</Text>
      <Text> </Text>
      <ProgressBar total={totalFor(timer, settings)} remaining={timer.remainingSeconds} width={18} />
      <Text color="gray">{dots}</Text>
      <Text> </Text>
      <Text color={timer.status === 'running' ? 'green' : 'gray'}>{STATUS_LABEL[timer.status]}</Text>
      <Text> </Text>
      <Text color="gray">[p] pausar  [s] pular</Text>
      <Text color="gray">[q] sair</Text>
    </Box>
  )
}
```

- [ ] **Step 3: Create `packages/tui/src/components/AddTaskForm.tsx`**

```tsx
import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import type { TaskCategory } from '../client.js'

interface Props {
  onSubmit: (title: string, category: TaskCategory) => void
  onCancel: () => void
}

const CATEGORIES: TaskCategory[] = ['work', 'study', 'personal']
const CAT_KEY: Record<string, TaskCategory> = { w: 'work', s: 'study', p: 'personal' }

export function AddTaskForm({ onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<TaskCategory>('work')
  const [step, setStep] = useState<'title' | 'category'>('title')

  useInput((input, key) => {
    if (key.escape) { onCancel(); return }

    if (step === 'title') {
      if (key.return) { if (title.trim()) setStep('category'); return }
      if (key.backspace || key.delete) { setTitle(t => t.slice(0, -1)); return }
      if (!key.ctrl && !key.meta) setTitle(t => t + input)
    } else {
      const cat = CAT_KEY[input]
      if (cat) { onSubmit(title.trim(), cat); return }
    }
  })

  return (
    <Box flexDirection="column" paddingX={1}>
      {step === 'title' ? (
        <>
          <Text color="gray">nova tarefa:</Text>
          <Text>{title}<Text color="gray">_</Text></Text>
          <Text color="gray">[enter] continuar  [esc] cancelar</Text>
        </>
      ) : (
        <>
          <Text>{title}</Text>
          <Text color="gray">categoria: [w]ork  [s]tudy  [p]ersonal</Text>
        </>
      )}
    </Box>
  )
}
```

- [ ] **Step 4: Create `packages/tui/src/components/TasksPanel.tsx`**

```tsx
import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import type { Task, TaskCategory } from '../client.js'
import { AddTaskForm } from './AddTaskForm.js'

interface Props {
  tasks: Task[]
  focused: boolean
  onAdd: (title: string, category: TaskCategory) => void
  onDone: (id: string) => void
  onArchive: (id: string) => void
  onSelect: (id: string) => void
}

const CAT_LABEL: Record<string, string> = { work: 'w', study: 's', personal: 'p' }
const STATUS_ICON: Record<string, string> = { pending: '○', done: '✓', archived: '·' }

export function TasksPanel({ tasks, focused, onAdd, onDone, onArchive, onSelect }: Props) {
  const [cursor, setCursor] = useState(0)
  const [adding, setAdding] = useState(false)
  const border = focused ? 'bold' : undefined
  const pending = tasks.filter(t => t.status === 'pending')
  const done = tasks.filter(t => t.status === 'done')
  const visible = [...pending, ...done]

  useInput((input, key) => {
    if (!focused || adding) return
    if (key.upArrow) setCursor(c => Math.max(0, c - 1))
    if (key.downArrow) setCursor(c => Math.min(visible.length - 1, c + 1))
    if (input === 'a') setAdding(true)
    if (input === 'd' && visible[cursor]) onDone(visible[cursor].id)
    if (input === 'x' && visible[cursor]) onArchive(visible[cursor].id)
    if (key.return && visible[cursor]) onSelect(visible[cursor].id)
  })

  return (
    <Box flexDirection="column" flexGrow={1} borderStyle={border} borderColor="white" paddingX={1}>
      <Text bold>TAREFAS</Text>
      <Text> </Text>
      {visible.map((t, i) => (
        <Text key={t.id} color={t.status === 'done' ? 'gray' : 'white'}>
          {i === cursor && focused ? '▶ ' : '  '}
          <Text color="gray">[{CAT_LABEL[t.category]}] </Text>
          <Text strikethrough={t.status === 'done'}>{t.title}</Text>
          {t.pomodoro_count > 0 && <Text color="gray"> ·{t.pomodoro_count}</Text>}
        </Text>
      ))}
      {visible.length === 0 && <Text color="gray">  nenhuma tarefa</Text>}
      {adding && (
        <AddTaskForm
          onSubmit={(title, cat) => { onAdd(title, cat); setAdding(false) }}
          onCancel={() => setAdding(false)}
        />
      )}
      <Text> </Text>
      <Text color="gray">[a] add  [d] concluir  [x] arquivar</Text>
      <Text color="gray">[↑↓] navegar  [enter] selecionar</Text>
    </Box>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/tui/src/components/
git commit -m "✨ add TUI components: ProgressBar, TimerPanel, TasksPanel, AddTaskForm"
```

---

## Task 11: TUI — App Root and Entry Point

**Files:**
- Create: `packages/tui/src/App.tsx`
- Create: `packages/tui/src/index.ts`

- [ ] **Step 1: Create `packages/tui/src/App.tsx`**

```tsx
import React, { useState, useEffect } from 'react'
import { Box, useInput, useApp } from 'ink'
import type { Task, TimerState, Settings, ServerMessage } from './client.js'
import { connectWs, fetchTasks, fetchSettings, timerAction, createTask, updateTask } from './client.js'
import { TimerPanel } from './components/TimerPanel.js'
import { TasksPanel } from './components/TasksPanel.js'

const DEFAULT_TIMER: TimerState = {
  status: 'idle', sessionType: 'work', remainingSeconds: 1500,
  pomodoroNumber: 1, currentTaskId: null, sessionStartedAt: null,
}
const DEFAULT_SETTINGS: Settings = {
  work_duration: 1500, short_break: 300, long_break: 900,
  long_break_interval: 4, sound_type: 'generated', sound_volume: 0.7,
}

export function App() {
  const { exit } = useApp()
  const [focus, setFocus] = useState<'timer' | 'tasks'>('timer')
  const [timer, setTimer] = useState<TimerState>(DEFAULT_TIMER)
  const [tasks, setTasks] = useState<Task[]>([])
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

  useEffect(() => {
    fetchTasks().then(setTasks).catch(() => {})
    fetchSettings().then(setSettings).catch(() => {})

    const disconnect = connectWs((msg: ServerMessage) => {
      if (msg.type === 'tick') {
        setTimer(t => ({ ...t, remainingSeconds: msg.remaining, status: msg.status, sessionType: msg.session, pomodoroNumber: msg.pomodoro }))
      } else if (msg.type === 'session_complete') {
        setTimer(t => ({ ...t, status: 'idle', sessionType: msg.next }))
      } else if (msg.type === 'state') {
        setTimer(msg.timer); setTasks(msg.tasks)
      } else if (msg.type === 'task_updated') {
        setTasks(ts => { const i = ts.findIndex(t => t.id === msg.task.id); return i >= 0 ? ts.map(t => t.id === msg.task.id ? msg.task : t) : [...ts, msg.task] })
      } else if (msg.type === 'task_deleted') {
        setTasks(ts => ts.filter(t => t.id !== msg.id))
      } else if (msg.type === 'settings_updated') {
        setSettings(msg.settings)
      }
    })
    return disconnect
  }, [])

  useInput((input, key) => {
    if (input === 'q') { exit(); return }
    if (key.tab) { setFocus(f => f === 'timer' ? 'tasks' : 'timer'); return }
    if (focus === 'timer') {
      if (input === 'p') timerAction('pause')
      if (input === 's') timerAction('skip')
    }
  })

  return (
    <Box flexDirection="row" gap={1}>
      <TimerPanel timer={timer} settings={settings} focused={focus === 'timer'} />
      <TasksPanel
        tasks={tasks.filter(t => t.status !== 'archived')}
        focused={focus === 'tasks'}
        onAdd={(title, cat) => createTask(title, cat).then(task => setTasks(ts => [...ts, task]))}
        onDone={(id) => updateTask(id, { status: 'done' }).then(task => setTasks(ts => ts.map(t => t.id === id ? task : t)))}
        onArchive={(id) => updateTask(id, { status: 'archived' }).then(() => setTasks(ts => ts.filter(t => t.id !== id)))}
        onSelect={(id) => timerAction('start', id)}
      />
    </Box>
  )
}
```

- [ ] **Step 2: Create `packages/tui/src/index.ts`**

```typescript
import { render } from 'ink'
import React from 'react'
import { App } from './App.js'
import { execFile, spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const PORT = process.env.POMODORO_PORT ?? '3333'

async function isServerRunning(): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:${PORT}/timer`)
    return res.ok
  } catch {
    return false
  }
}

async function startServer(): Promise<void> {
  const serverIndex = join(dirname(fileURLToPath(import.meta.url)), '../../server/dist/index.js')
  const child = spawn(process.execPath, [serverIndex], { detached: true, stdio: 'ignore' })
  child.unref()
  // wait for server to be ready
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 300))
    if (await isServerRunning()) return
  }
  throw new Error('Server did not start in time')
}

async function main() {
  if (!(await isServerRunning())) {
    process.stdout.write('starting pomodoro server...\n')
    await startServer()
  }
  render(React.createElement(App))
}

main().catch(err => { console.error(err); process.exit(1) })
```

- [ ] **Step 3: Commit**

```bash
git add packages/tui/src/App.tsx packages/tui/src/index.ts
git commit -m "✨ add TUI App root and entry point with auto server spawn"
```

---

## Task 12: Web — Scaffold, HTML, and API Client

**Files:**
- Create: `packages/web/index.html`
- Create: `packages/web/src/api.ts`
- Create: `packages/web/src/state.ts`
- Create: `packages/web/public/assets/bell.mp3` *(placeholder — replace with real bell audio)*

- [ ] **Step 1: Add bell.mp3**

Download a free short bell sound (e.g., from freesound.org, CC0 license) and save it as `packages/web/public/assets/bell.mp3`. Any short single-note bell or chime sound in MP3 format works. Alternatively, run:

```bash
mkdir -p packages/web/public/assets
# Download a public-domain bell sound:
curl -L "https://freesound.org/data/previews/411/411089_5121236-lq.mp3" -o packages/web/public/assets/bell.mp3 2>/dev/null || echo "Place a bell.mp3 in packages/web/public/assets/"
```

If download fails, place any `.mp3` file there named `bell.mp3` — the generated-tone fallback will be used if the file is missing.

- [ ] **Step 2: Create `packages/web/index.html`**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pomodoro</title>
  <link rel="stylesheet" href="/src/styles/main.css" />
</head>
<body>
  <div id="app">
    <header>
      <span class="brand">POMODORO</span>
      <nav class="tabs">
        <button class="tab active" data-tab="timer">Timer</button>
        <button class="tab" data-tab="tasks">Tarefas</button>
        <button class="tab" data-tab="history">Histórico</button>
      </nav>
      <button id="btn-settings" title="Configurações">⚙</button>
    </header>

    <main>
      <section id="tab-timer" class="tab-panel active">
        <div class="timer-session-label" id="session-label">TRABALHO</div>
        <div class="timer-pomodoro" id="pomodoro-num">#1</div>
        <div class="timer-display" id="timer-display">25:00</div>
        <div class="timer-progress-wrap">
          <div class="timer-progress-bar" id="progress-bar"></div>
        </div>
        <div class="timer-dots" id="timer-dots">○○○○</div>
        <div class="timer-current-task" id="current-task"></div>
        <div class="timer-controls">
          <button id="btn-skip">⏭ pular</button>
          <button id="btn-pause" class="primary">⏸ iniciar</button>
          <button id="btn-pip" title="Picture-in-Picture">⧉</button>
        </div>
      </section>

      <section id="tab-tasks" class="tab-panel">
        <div class="task-group" id="group-work">
          <div class="task-group-header">Trabalho</div>
          <ul class="task-list" id="list-work"></ul>
        </div>
        <div class="task-group" id="group-study">
          <div class="task-group-header">Estudo</div>
          <ul class="task-list" id="list-study"></ul>
        </div>
        <div class="task-group" id="group-personal">
          <div class="task-group-header">Pessoal</div>
          <ul class="task-list" id="list-personal"></ul>
        </div>
        <div class="task-add">
          <input id="new-task-title" type="text" placeholder="nova tarefa..." />
          <select id="new-task-category">
            <option value="work">Trabalho</option>
            <option value="study">Estudo</option>
            <option value="personal">Pessoal</option>
          </select>
          <button id="btn-add-task">+</button>
        </div>
        <button id="btn-archive-done">Arquivar concluídas</button>
      </section>

      <section id="tab-history" class="tab-panel">
        <div id="history-list"></div>
      </section>
    </main>
  </div>

  <div id="modal-settings" class="modal hidden">
    <div class="modal-content">
      <h2>Configurações</h2>
      <label>Trabalho (min) <input type="number" id="s-work" min="1" max="120" /></label>
      <label>Pausa curta (min) <input type="number" id="s-short" min="1" max="60" /></label>
      <label>Pausa longa (min) <input type="number" id="s-long" min="1" max="60" /></label>
      <label>Intervalo (pomodoros) <input type="number" id="s-interval" min="1" max="10" /></label>
      <label>Som
        <select id="s-sound-type">
          <option value="generated">Gerado</option>
          <option value="file">Sino (arquivo)</option>
        </select>
      </label>
      <label>Volume <input type="range" id="s-volume" min="0" max="1" step="0.1" /></label>
      <div class="modal-actions">
        <button id="btn-settings-save">Salvar</button>
        <button id="btn-settings-cancel">Cancelar</button>
      </div>
    </div>
  </div>

  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 3: Create `packages/web/src/api.ts`**

```typescript
import type { ServerMessage, ClientMessage, Task, Settings, TaskCategory, TaskStatus } from '../../../packages/server/src/types.js'

export type { ServerMessage, Task, Settings, TaskCategory, TaskStatus }

const PORT = (window as unknown as { POMODORO_PORT?: string }).POMODORO_PORT ?? '3333'
const BASE = `http://localhost:${PORT}`
const WS_BASE = `ws://localhost:${PORT}`

export async function getTasks(): Promise<Task[]> {
  return (await fetch(`${BASE}/tasks`)).json()
}
export async function postTask(title: string, category: TaskCategory): Promise<Task> {
  return (await fetch(`${BASE}/tasks`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title, category }) })).json()
}
export async function patchTask(id: string, patch: Partial<Pick<Task, 'title' | 'status' | 'category'>>): Promise<Task> {
  return (await fetch(`${BASE}/tasks/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) })).json()
}
export async function deleteTask(id: string): Promise<void> {
  await fetch(`${BASE}/tasks/${id}`, { method: 'DELETE' })
}
export async function getSessions(date?: string) {
  const url = date ? `${BASE}/sessions?date=${date}` : `${BASE}/sessions`
  return (await fetch(url)).json()
}
export async function getSettings(): Promise<Settings> {
  return (await fetch(`${BASE}/settings`)).json()
}
export async function putSettings(patch: Partial<Record<string, unknown>>): Promise<Settings> {
  return (await fetch(`${BASE}/settings`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) })).json()
}
export async function timerPost(action: 'start' | 'pause' | 'skip' | 'reset', body?: object) {
  return (await fetch(`${BASE}/timer/${action}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) })).json()
}

export function connectWs(onMessage: (msg: ServerMessage) => void): () => void {
  let alive = true
  let ws: WebSocket

  function connect() {
    ws = new WebSocket(`${WS_BASE}/ws`)
    ws.onmessage = (e) => { try { onMessage(JSON.parse(e.data)) } catch {} }
    ws.onclose = () => { if (alive) setTimeout(connect, 2000) }
    ws.onerror = () => ws.close()
  }

  connect()
  return () => { alive = false; ws.close() }
}
```

Note: In Vite, the `packages/server/src/types.js` import path won't work directly from the web package since it resolves differently. Update `packages/web/src/api.ts` to use a local re-export instead:

Create `packages/web/src/types.ts`:
```typescript
export type TaskCategory = 'work' | 'study' | 'personal'
export type TaskStatus = 'pending' | 'done' | 'archived'
export type SessionType = 'work' | 'short_break' | 'long_break'
export type TimerStatus = 'idle' | 'running' | 'paused'

export interface Task { id: string; title: string; category: TaskCategory; status: TaskStatus; pomodoro_count: number; created_at: number; completed_at: number | null }
export interface Session { id: string; task_id: string | null; type: SessionType; started_at: number; ended_at: number; duration_s: number }
export interface Settings { work_duration: number; short_break: number; long_break: number; long_break_interval: number; sound_type: 'generated' | 'file'; sound_volume: number }
export interface TimerState { status: TimerStatus; sessionType: SessionType; remainingSeconds: number; pomodoroNumber: number; currentTaskId: string | null; sessionStartedAt: number | null }
export type ServerMessage =
  | { type: 'tick'; remaining: number; status: TimerStatus; session: SessionType; pomodoro: number }
  | { type: 'session_complete'; session: SessionType; next: SessionType }
  | { type: 'task_updated'; task: Task }
  | { type: 'task_deleted'; id: string }
  | { type: 'settings_updated'; settings: Settings }
  | { type: 'state'; timer: TimerState; tasks: Task[] }
```

Then update `packages/web/src/api.ts` to import from `./types.js` instead.

- [ ] **Step 4: Create `packages/web/src/state.ts`**

```typescript
import type { Task, Settings, TimerState, SessionType, TimerStatus } from './types.js'

export interface AppState {
  timer: TimerState
  tasks: Task[]
  settings: Settings
  activeTab: 'timer' | 'tasks' | 'history'
}

const DEFAULT_TIMER: TimerState = {
  status: 'idle', sessionType: 'work', remainingSeconds: 1500,
  pomodoroNumber: 1, currentTaskId: null, sessionStartedAt: null,
}
const DEFAULT_SETTINGS: Settings = {
  work_duration: 1500, short_break: 300, long_break: 900,
  long_break_interval: 4, sound_type: 'generated', sound_volume: 0.7,
}

export const state: AppState = {
  timer: { ...DEFAULT_TIMER },
  tasks: [],
  settings: { ...DEFAULT_SETTINGS },
  activeTab: 'timer',
}

type Listener = (state: AppState) => void
const listeners = new Set<Listener>()

export function subscribe(fn: Listener) { listeners.add(fn); return () => listeners.delete(fn) }
export function notify() { for (const fn of listeners) fn(state) }

export function setTimer(partial: Partial<TimerState>) { Object.assign(state.timer, partial); notify() }
export function setTasks(tasks: Task[]) { state.tasks = tasks; notify() }
export function upsertTask(task: Task) {
  const i = state.tasks.findIndex(t => t.id === task.id)
  if (i >= 0) state.tasks[i] = task; else state.tasks.push(task)
  notify()
}
export function removeTask(id: string) { state.tasks = state.tasks.filter(t => t.id !== id); notify() }
export function setSettings(s: Settings) { state.settings = s; notify() }
export function setTab(tab: AppState['activeTab']) { state.activeTab = tab; notify() }
```

- [ ] **Step 5: Commit**

```bash
git add packages/web/index.html packages/web/src/api.ts packages/web/src/state.ts packages/web/src/types.ts packages/web/public/
git commit -m "✨ add web scaffold, HTML structure, API client, and state store"
```

---

## Task 13: Web — CSS Theme

**Files:**
- Create: `packages/web/src/styles/main.css`

- [ ] **Step 1: Create `packages/web/src/styles/main.css`**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0 }

:root {
  --bg: #000;
  --fg: #fff;
  --muted: #444;
  --border: #1a1a1a;
  --font-mono: ui-monospace, 'Cascadia Code', 'SF Mono', monospace;
}

body { background: var(--bg); color: var(--fg); font-family: system-ui, sans-serif; min-height: 100vh }

/* Header */
header {
  display: flex; align-items: center; gap: 16px;
  padding: 12px 20px; border-bottom: 1px solid var(--border);
}
.brand { font-size: 11px; letter-spacing: 3px; color: var(--muted) }
.tabs { display: flex; gap: 2px; flex: 1 }
.tab {
  background: none; border: none; color: var(--muted); font-size: 13px;
  padding: 4px 12px; cursor: pointer; border-bottom: 1px solid transparent;
}
.tab.active { color: var(--fg); border-bottom-color: var(--fg) }
.tab:hover:not(.active) { color: #888 }
#btn-settings { background: none; border: none; color: var(--muted); font-size: 16px; cursor: pointer; padding: 4px 8px }
#btn-settings:hover { color: var(--fg) }

/* Tab panels */
main { padding: 40px 20px; max-width: 560px; margin: 0 auto }
.tab-panel { display: none }
.tab-panel.active { display: block }

/* Timer tab */
.timer-session-label { font-size: 10px; letter-spacing: 3px; color: var(--muted); margin-bottom: 4px; text-align: center }
.timer-pomodoro { font-size: 11px; color: var(--muted); text-align: center; margin-bottom: 8px }
.timer-display {
  font-family: var(--font-mono); font-size: 72px; font-weight: 200;
  letter-spacing: 8px; text-align: center; margin: 16px 0;
}
.timer-progress-wrap { background: var(--border); border-radius: 100px; height: 2px; margin: 12px auto; width: 80% }
.timer-progress-bar { background: var(--fg); height: 2px; border-radius: 100px; width: 0%; transition: width 1s linear }
.timer-dots { text-align: center; font-size: 12px; color: var(--muted); letter-spacing: 4px; margin: 8px 0 }
.timer-current-task { text-align: center; font-size: 13px; color: #888; margin: 12px 0; min-height: 20px }
.timer-controls { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 24px }

/* Buttons */
button {
  background: var(--border); border: none; color: var(--muted);
  padding: 8px 16px; border-radius: 100px; font-size: 12px; cursor: pointer;
}
button.primary { background: var(--fg); color: var(--bg); font-weight: 600 }
button:hover:not(.primary) { background: #1e1e1e; color: var(--fg) }
button.primary:hover { background: #ddd }
#btn-pip { padding: 8px 10px; font-size: 14px }

/* Tasks tab */
.task-group { margin-bottom: 24px }
.task-group-header { font-size: 10px; letter-spacing: 2px; color: var(--muted); margin-bottom: 8px }
.task-list { list-style: none }
.task-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 0; border-bottom: 1px solid var(--border);
}
.task-item.done .task-title { text-decoration: line-through; color: var(--muted) }
.task-check { width: 14px; height: 14px; border: 1px solid var(--muted); border-radius: 2px; cursor: pointer; flex-shrink: 0 }
.task-check.checked { background: var(--fg); border-color: var(--fg) }
.task-title { flex: 1; font-size: 14px }
.task-pomodoros { font-size: 11px; color: var(--muted) }
.task-add { display: flex; gap: 8px; margin-top: 24px }
.task-add input, .task-add select {
  background: var(--border); border: none; color: var(--fg);
  padding: 8px 12px; border-radius: 4px; font-size: 13px;
}
.task-add input { flex: 1 }
.task-add select { color: var(--muted) }
#btn-archive-done { margin-top: 16px; font-size: 11px; color: var(--muted) }

/* History tab */
#history-list { font-size: 13px }
.history-date { font-size: 10px; letter-spacing: 2px; color: var(--muted); margin: 16px 0 8px }
.history-session {
  display: flex; justify-content: space-between;
  padding: 6px 0; border-bottom: 1px solid var(--border); color: #888;
}
.history-session.work { color: var(--fg) }

/* Settings modal */
.modal { position: fixed; inset: 0; background: rgba(0,0,0,.8); display: flex; align-items: center; justify-content: center; z-index: 100 }
.modal.hidden { display: none }
.modal-content { background: #0a0a0a; border: 1px solid var(--border); border-radius: 8px; padding: 24px; min-width: 300px }
.modal-content h2 { font-size: 13px; letter-spacing: 2px; color: var(--muted); margin-bottom: 20px }
.modal-content label { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; font-size: 13px; color: #888 }
.modal-content input[type=number], .modal-content select {
  background: var(--border); border: none; color: var(--fg);
  padding: 4px 8px; border-radius: 4px; width: 80px; font-size: 13px;
}
.modal-content select { width: 120px }
.modal-content input[type=range] { width: 120px; accent-color: var(--fg) }
.modal-actions { display: flex; gap: 8px; margin-top: 20px; justify-content: flex-end }
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/styles/main.css
git commit -m "🎨 add web CSS theme — black and white minimal"
```

---

## Task 14: Web — Sound and Picture-in-Picture Modules

**Files:**
- Create: `packages/web/src/sound.ts`
- Create: `packages/web/src/pip.ts`

- [ ] **Step 1: Create `packages/web/src/sound.ts`**

```typescript
import type { Settings } from './types.js'

let audioCtx: AudioContext | null = null

function getCtx() {
  if (!audioCtx) audioCtx = new AudioContext()
  return audioCtx
}

function playGenerated(volume: number) {
  const ctx = getCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain); gain.connect(ctx.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(528, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3)
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
  osc.start(); osc.stop(ctx.currentTime + 0.8)
}

function playFile(volume: number) {
  const audio = new Audio('/assets/bell.mp3')
  audio.volume = volume
  audio.play().catch(() => playGenerated(volume))
}

export function playNotification(settings: Settings) {
  const volume = settings.sound_volume
  if (settings.sound_type === 'file') playFile(volume)
  else playGenerated(volume)
}
```

- [ ] **Step 2: Create `packages/web/src/pip.ts`**

```typescript
import type { TimerState, Settings } from './types.js'

let pipWindow: Window | null = null

const SESSION_LABEL: Record<string, string> = {
  work: 'TRABALHO', short_break: 'PAUSA CURTA', long_break: 'PAUSA LONGA',
}

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function pipHtml(timer: TimerState) {
  return `
    <style>
      body { margin:0; background:#000; color:#fff; font-family:ui-monospace,monospace;
             display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; }
      .label { font-size:9px; letter-spacing:2px; color:#555; margin-bottom:4px }
      .time { font-size:48px; font-weight:200; letter-spacing:6px }
      .task { font-size:11px; color:#666; margin-top:6px }
      button { margin-top:12px; background:#1a1a1a; border:none; color:#fff; padding:6px 16px; border-radius:100px; font-size:11px; cursor:pointer }
    </style>
    <div class="label">${SESSION_LABEL[timer.sessionType]}</div>
    <div class="time">${fmt(timer.remainingSeconds)}</div>
    <div class="task">${timer.currentTaskId ? '●' : ''}</div>
    <button onclick="window.opener?.postMessage({type:'timer_action',action:'pause'},'*')">
      ${timer.status === 'running' ? '⏸' : '▶'}
    </button>
  `
}

export async function openPip(timer: TimerState) {
  if (!('documentPictureInPicture' in window)) {
    alert('Picture-in-Picture não suportado neste browser (requer Chrome 116+)')
    return
  }
  const dPiP = (window as unknown as { documentPictureInPicture: { requestWindow: (o: object) => Promise<Window> } }).documentPictureInPicture
  pipWindow = await dPiP.requestWindow({ width: 200, height: 180 })
  pipWindow.document.body.innerHTML = pipHtml(timer)
  pipWindow.addEventListener('pagehide', () => { pipWindow = null })
}

export function updatePip(timer: TimerState) {
  if (!pipWindow) return
  pipWindow.document.body.innerHTML = pipHtml(timer)
}

export function isPipOpen() { return pipWindow !== null }
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/sound.ts packages/web/src/pip.ts
git commit -m "✨ add sound module (Web Audio + file) and Picture-in-Picture"
```

---

## Task 15: Web — Tab Modules

**Files:**
- Create: `packages/web/src/tabs/timer.ts`
- Create: `packages/web/src/tabs/tasks.ts`
- Create: `packages/web/src/tabs/history.ts`
- Create: `packages/web/src/tabs/settings.ts`

- [ ] **Step 1: Create `packages/web/src/tabs/timer.ts`**

```typescript
import type { AppState } from '../state.js'

const SESSION_LABEL: Record<string, string> = {
  work: 'TRABALHO', short_break: 'PAUSA CURTA', long_break: 'PAUSA LONGA',
}

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function renderTimer(s: AppState) {
  const { timer, settings } = s

  const total = timer.sessionType === 'work' ? settings.work_duration
    : timer.sessionType === 'short_break' ? settings.short_break
    : settings.long_break
  const pct = total > 0 ? ((total - timer.remainingSeconds) / total) * 100 : 0

  const dots = Array.from({ length: settings.long_break_interval }, (_, i) =>
    i < timer.pomodoroNumber - (timer.status === 'idle' && timer.sessionType === 'work' ? 1 : 0) ? '●' : '○'
  ).join('')

  const task = s.tasks.find(t => t.id === timer.currentTaskId)

  document.getElementById('session-label')!.textContent = SESSION_LABEL[timer.sessionType]
  document.getElementById('pomodoro-num')!.textContent = `#${timer.pomodoroNumber}`
  document.getElementById('timer-display')!.textContent = fmt(timer.remainingSeconds)
  ;(document.getElementById('progress-bar') as HTMLElement).style.width = `${pct}%`
  document.getElementById('timer-dots')!.textContent = dots
  document.getElementById('current-task')!.textContent = task ? task.title : ''

  const btn = document.getElementById('btn-pause')!
  btn.textContent = timer.status === 'running' ? '⏸ pausar' : timer.status === 'paused' ? '▶ retomar' : '▶ iniciar'
  btn.className = 'primary'
}
```

- [ ] **Step 2: Create `packages/web/src/tabs/tasks.ts`**

```typescript
import type { AppState } from '../state.js'
import type { Task } from '../types.js'

function taskEl(task: Task, onCheck: (id: string) => void): HTMLLIElement {
  const li = document.createElement('li')
  li.className = `task-item${task.status === 'done' ? ' done' : ''}`

  const check = document.createElement('div')
  check.className = `task-check${task.status === 'done' ? ' checked' : ''}`
  check.onclick = () => onCheck(task.id)

  const title = document.createElement('span')
  title.className = 'task-title'
  title.textContent = task.title

  const poms = document.createElement('span')
  poms.className = 'task-pomodoros'
  if (task.pomodoro_count > 0) poms.textContent = `·${task.pomodoro_count}`

  li.append(check, title, poms)
  return li
}

export function renderTasks(s: AppState, onCheck: (id: string) => void) {
  const categories: Array<{ key: string; listId: string }> = [
    { key: 'work', listId: 'list-work' },
    { key: 'study', listId: 'list-study' },
    { key: 'personal', listId: 'list-personal' },
  ]

  for (const { key, listId } of categories) {
    const ul = document.getElementById(listId)!
    ul.innerHTML = ''
    s.tasks
      .filter(t => t.category === key && t.status !== 'archived')
      .forEach(t => ul.appendChild(taskEl(t, onCheck)))
  }
}
```

- [ ] **Step 3: Create `packages/web/src/tabs/history.ts`**

```typescript
import type { Session } from '../types.js'

const TYPE_LABEL: Record<string, string> = {
  work: 'Trabalho', short_break: 'Pausa curta', long_break: 'Pausa longa',
}

function fmt(ms: number) {
  return new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

function minStr(s: number) { return `${Math.round(s / 60)} min` }

export async function renderHistory(fetchSessions: () => Promise<Session[]>) {
  const sessions = await fetchSessions()
  const container = document.getElementById('history-list')!
  container.innerHTML = ''

  if (sessions.length === 0) {
    container.innerHTML = '<p style="color:#444;font-size:13px">Nenhuma sessão ainda.</p>'
    return
  }

  const byDate = new Map<string, Session[]>()
  for (const s of sessions) {
    const key = fmtDate(s.started_at)
    if (!byDate.has(key)) byDate.set(key, [])
    byDate.get(key)!.push(s)
  }

  for (const [date, group] of byDate) {
    const header = document.createElement('div')
    header.className = 'history-date'
    header.textContent = date
    container.appendChild(header)

    for (const s of group) {
      const row = document.createElement('div')
      row.className = `history-session${s.type === 'work' ? ' work' : ''}`
      row.innerHTML = `<span>${TYPE_LABEL[s.type]}</span><span>${fmt(s.started_at)} — ${minStr(s.duration_s)}</span>`
      container.appendChild(row)
    }
  }
}
```

- [ ] **Step 4: Create `packages/web/src/tabs/settings.ts`**

```typescript
import type { Settings } from '../types.js'

export function openSettings(settings: Settings) {
  ;(document.getElementById('s-work') as HTMLInputElement).value = String(settings.work_duration / 60)
  ;(document.getElementById('s-short') as HTMLInputElement).value = String(settings.short_break / 60)
  ;(document.getElementById('s-long') as HTMLInputElement).value = String(settings.long_break / 60)
  ;(document.getElementById('s-interval') as HTMLInputElement).value = String(settings.long_break_interval)
  ;(document.getElementById('s-sound-type') as HTMLSelectElement).value = settings.sound_type
  ;(document.getElementById('s-volume') as HTMLInputElement).value = String(settings.sound_volume)
  document.getElementById('modal-settings')!.classList.remove('hidden')
}

export function closeSettings() {
  document.getElementById('modal-settings')!.classList.add('hidden')
}

export function readSettingsForm(): Partial<Record<string, number | string>> {
  return {
    work_duration: Number((document.getElementById('s-work') as HTMLInputElement).value) * 60,
    short_break: Number((document.getElementById('s-short') as HTMLInputElement).value) * 60,
    long_break: Number((document.getElementById('s-long') as HTMLInputElement).value) * 60,
    long_break_interval: Number((document.getElementById('s-interval') as HTMLInputElement).value),
    sound_type: (document.getElementById('s-sound-type') as HTMLSelectElement).value,
    sound_volume: Number((document.getElementById('s-volume') as HTMLInputElement).value),
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/tabs/
git commit -m "✨ add web tab modules: timer, tasks, history, settings"
```

---

## Task 16: Web — Main Entry Point

**Files:**
- Create: `packages/web/src/main.ts`

- [ ] **Step 1: Create `packages/web/src/main.ts`**

```typescript
import './styles/main.css'
import { state, subscribe, setTimer, setTasks, upsertTask, removeTask, setSettings, setTab, notify } from './state.js'
import { connectWs, getTasks, getSettings, timerPost, postTask, patchTask, getSessions } from './api.js'
import { renderTimer } from './tabs/timer.js'
import { renderTasks } from './tabs/tasks.js'
import { renderHistory } from './tabs/history.js'
import { openSettings, closeSettings, readSettingsForm } from './tabs/settings.js'
import { playNotification } from './sound.js'
import { openPip, updatePip, isPipOpen } from './pip.js'
import { putSettings } from './api.js'

// Boot
async function init() {
  const [tasks, settings] = await Promise.all([getTasks(), getSettings()])
  setTasks(tasks)
  setSettings(settings)

  connectWs((msg) => {
    if (msg.type === 'tick') {
      setTimer({ remainingSeconds: msg.remaining, status: msg.status, sessionType: msg.session, pomodoroNumber: msg.pomodoro })
    } else if (msg.type === 'session_complete') {
      setTimer({ status: 'idle', sessionType: msg.next })
      playNotification(state.settings)
    } else if (msg.type === 'state') {
      setTimer(msg.timer); setTasks(msg.tasks)
    } else if (msg.type === 'task_updated') {
      upsertTask(msg.task)
    } else if (msg.type === 'task_deleted') {
      removeTask(msg.id)
    } else if (msg.type === 'settings_updated') {
      setSettings(msg.settings)
    }
  })
}

// Render loop
subscribe((s) => {
  renderTimer(s)
  renderTasks(s, (id) => {
    const task = s.tasks.find(t => t.id === id)!
    const newStatus = task.status === 'done' ? 'pending' : 'done'
    patchTask(id, { status: newStatus }).then(upsertTask)
  })
  if (isPipOpen()) updatePip(s.timer)
})

// Tab switching
document.querySelectorAll<HTMLButtonElement>('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab as 'timer' | 'tasks' | 'history'
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'))
    btn.classList.add('active')
    document.getElementById(`tab-${tab}`)!.classList.add('active')
    setTab(tab)
    if (tab === 'history') renderHistory(() => getSessions())
  })
})

// Timer controls
document.getElementById('btn-pause')!.addEventListener('click', () => timerPost('pause'))
document.getElementById('btn-skip')!.addEventListener('click', () => timerPost('skip'))
document.getElementById('btn-pip')!.addEventListener('click', () => openPip(state.timer))

// Listen for PiP messages
window.addEventListener('message', (e) => {
  if (e.data?.type === 'timer_action') timerPost(e.data.action)
})

// Task add
document.getElementById('btn-add-task')!.addEventListener('click', () => {
  const title = (document.getElementById('new-task-title') as HTMLInputElement).value.trim()
  const category = (document.getElementById('new-task-category') as HTMLSelectElement).value as 'work' | 'study' | 'personal'
  if (!title) return
  postTask(title, category).then(upsertTask)
  ;(document.getElementById('new-task-title') as HTMLInputElement).value = ''
})
document.getElementById('new-task-title')!.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('btn-add-task')!.click()
})

// Archive done tasks
document.getElementById('btn-archive-done')!.addEventListener('click', async () => {
  const done = state.tasks.filter(t => t.status === 'done')
  await Promise.all(done.map(t => patchTask(t.id, { status: 'archived' }).then(upsertTask)))
})

// Settings
document.getElementById('btn-settings')!.addEventListener('click', () => openSettings(state.settings))
document.getElementById('btn-settings-cancel')!.addEventListener('click', closeSettings)
document.getElementById('btn-settings-save')!.addEventListener('click', async () => {
  const updates = readSettingsForm()
  const newSettings = await putSettings(updates)
  setSettings(newSettings)
  closeSettings()
})

init().then(() => notify())
```

- [ ] **Step 2: Build and verify**

```bash
cd packages/server && npm run build
cd ../web && npm run build
```

Expected: both build without errors. `packages/web/dist/` is created.

- [ ] **Step 3: Start server and open web in dev mode**

```bash
# Terminal 1: start server
cd packages/server && node dist/index.js

# Terminal 2: start web dev server
cd packages/web && npm run dev
```

Open `http://localhost:5173` and verify: timer displays, tabs work, tasks can be added.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/main.ts
git commit -m "✨ add web main entry point — wires all modules together"
```

---

## Task 17: CLI Entry Point

**Files:**
- Create: `bin/cli.js`

- [ ] **Step 1: Create `bin/cli.js`**

```javascript
#!/usr/bin/env node
import { spawn, execFile } from 'child_process'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
import { createRequire } from 'module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const serverEntry = join(root, 'packages/server/dist/index.js')
const tuiEntry = join(root, 'packages/tui/dist/index.js')
const PORT = process.env.POMODORO_PORT ?? '3333'

async function isServerRunning() {
  try {
    const res = await fetch(`http://localhost:${PORT}/timer`)
    return res.ok
  } catch { return false }
}

async function startServer(wait = true) {
  if (await isServerRunning()) return
  const child = spawn(process.execPath, [serverEntry], { detached: true, stdio: 'ignore', env: { ...process.env } })
  child.unref()
  if (!wait) return
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 300))
    if (await isServerRunning()) return
  }
  throw new Error('Server did not start. Run `pomodoro server` to debug.')
}

function openBrowser(url) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
  spawn(cmd, [url], { detached: true, stdio: 'ignore' }).unref()
}

const [,, command] = process.argv

if (command === 'server') {
  const child = spawn(process.execPath, [serverEntry], { stdio: 'inherit', env: { ...process.env } })
  child.on('exit', code => process.exit(code ?? 0))
} else if (command === 'web') {
  await startServer()
  openBrowser(`http://localhost:${PORT}`)
  console.log(`Web app open at http://localhost:${PORT}`)
} else if (command === 'tui' || !command) {
  await startServer()
  const child = spawn(process.execPath, [tuiEntry], { stdio: 'inherit', env: { ...process.env } })
  child.on('exit', code => process.exit(code ?? 0))
} else {
  console.log(`Usage: pomodoro [server|tui|web]`)
  process.exit(1)
}
```

- [ ] **Step 2: Make CLI executable**

```bash
chmod +x bin/cli.js
```

- [ ] **Step 3: Test CLI locally**

```bash
# build all packages first
npm run build

# test server command
node bin/cli.js server &
sleep 1 && curl -s http://localhost:3333/timer && kill %1
```

Expected: JSON with `status: "idle"`.

- [ ] **Step 4: Commit**

```bash
git add bin/cli.js
git commit -m "✨ add CLI entry point with server/tui/web subcommands"
```

---

## Task 18: README.md

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Rewrite `README.md`**

```markdown
# pomodoro

Timer Pomodoro com interface de terminal (TUI) e web app sincronizados em tempo real.

## Features

- ⏱ Timer Pomodoro configurável (padrão 25 min / 5 min pausa / 15 min pausa longa)
- 📋 Lista de tarefas diárias por categoria: Trabalho, Estudo, Pessoal
- 🔗 TUI + Web App sincronizados via WebSocket — abra os dois ao mesmo tempo
- 🔔 Notificação sonora ao fim de cada sessão (tom gerado ou arquivo de áudio)
- ⧉ Picture-in-Picture no browser — contador flutuante sobre qualquer janela (Chrome 116+)
- 💾 Dados persistidos em SQLite — nenhuma informação é perdida ao reiniciar
- 🖤 Design minimalista preto e branco

---

## Instalação

```bash
npm install -g @juliocsilvestre/pomodoro
```

> Requer Node.js 20 ou superior.

---

## Uso

| Comando | O que faz |
|---|---|
| `pomodoro` | Inicia servidor + abre TUI no terminal |
| `pomodoro tui` | Só a interface de terminal (sobe servidor se necessário) |
| `pomodoro web` | Abre o app no browser (sobe servidor se necessário) |
| `pomodoro server` | Só o servidor local (porta 3333) |

### Variáveis de ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `POMODORO_PORT` | `3333` | Porta do servidor local |

### Arquivos

| Caminho | Descrição |
|---|---|
| `~/.pomodoro/data.db` | Banco SQLite com tarefas, sessões e configurações |

---

## TUI — Atalhos de teclado

| Tecla | Ação |
|---|---|
| `p` | Pausar / retomar timer |
| `s` | Pular sessão atual |
| `Tab` | Alternar foco entre Timer e Tarefas |
| `↑` / `↓` | Navegar nas tarefas (painel Tarefas focado) |
| `Enter` | Vincular tarefa selecionada ao timer |
| `a` | Adicionar nova tarefa |
| `d` | Marcar tarefa como concluída |
| `x` | Arquivar tarefa |
| `q` | Sair |

---

## Web App

Abra `http://localhost:3333` no browser após iniciar `pomodoro server` ou `pomodoro web`.

### Picture-in-Picture

Clique em ⧉ na aba Timer para abrir um widget flutuante com o contador. Funciona em Chrome 116+.

---

## Desenvolvimento local

```bash
# Clone e instale dependências
git clone https://github.com/juliocsilvestre/pomodoro.git
cd pomodoro
npm install

# Build de todos os pacotes
npm run build

# Desenvolver com hot-reload
npm run dev:server   # servidor com tsx watch
npm run dev:web      # Vite dev server em :5173

# Testes
npm test
```

### Estrutura do projeto

```
pomodoro/
├── bin/cli.js          CLI global
├── packages/
│   ├── server/         Fastify + WebSocket + SQLite
│   ├── tui/            Interface terminal (ink + React)
│   └── web/            Web app (Vite + TypeScript)
```

---

## Configuração

Abra ⚙ na web app ou edite `~/.pomodoro/data.db` diretamente via `sqlite3`.

| Configuração | Padrão |
|---|---|
| Duração do trabalho | 25 min |
| Pausa curta | 5 min |
| Pausa longa | 15 min |
| Intervalo para pausa longa | 4 pomodoros |
| Tipo de som | Gerado (Web Audio) |
| Volume | 70% |

---

## Licença

MIT
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "📝 add comprehensive README with install, usage, shortcuts, and architecture"
```

---

## Task 19: Final Integration Check

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: all tests pass across server and tui packages.

- [ ] **Step 2: Full build**

```bash
npm run build
```

Expected: no TypeScript errors in any package.

- [ ] **Step 3: End-to-end smoke test**

```bash
# Start server
node bin/cli.js server &
SERVER_PID=$!

# Verify REST
curl -s http://localhost:3333/timer
curl -s http://localhost:3333/tasks
curl -s http://localhost:3333/settings

# Create a task
curl -s -X POST http://localhost:3333/tasks \
  -H 'content-type: application/json' \
  -d '{"title":"Test task","category":"work"}'

# Start timer
curl -s -X POST http://localhost:3333/timer/start

# Wait 2 seconds, verify tick decreased remaining
sleep 2 && curl -s http://localhost:3333/timer

# Stop server
kill $SERVER_PID
```

Expected: all curl calls return valid JSON.

- [ ] **Step 4: Merge develop → main**

```bash
git checkout main
git merge develop --no-ff -m "🚀 release v0.1.0 — TUI + web Pomodoro timer"
git push origin main
git push origin develop
```

---

*End of implementation plan.*
