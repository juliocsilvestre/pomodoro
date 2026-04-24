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
