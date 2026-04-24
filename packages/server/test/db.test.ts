import { describe, it, expect } from 'vitest'
import { createDb } from '../src/db.js'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

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

  it('seed is idempotent — second createDb call does not overwrite user-modified settings', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'pomodoro-test-'))
    const dbPath = join(tmpDir, 'data.db')
    try {
      const db1 = createDb(dbPath)
      db1.prepare("UPDATE settings SET value = '3000' WHERE key = 'work_duration'").run()
      db1.close()

      const db2 = createDb(dbPath)
      const row = db2.prepare("SELECT value FROM settings WHERE key = 'work_duration'").get() as { value: string }
      db2.close()

      expect(row.value).toBe('3000')
    } finally {
      rmSync(tmpDir, { recursive: true, force: true })
    }
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
