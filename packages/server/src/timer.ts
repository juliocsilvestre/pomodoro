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
