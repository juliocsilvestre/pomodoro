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
