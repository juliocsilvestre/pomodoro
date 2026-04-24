import Database from 'better-sqlite3'
import { join } from 'path'
import { homedir } from 'os'
import { mkdirSync } from 'fs'

const DATA_DIR = join(homedir(), '.pomodoro')

export type Db = Database.Database

export function createDb(path?: string): Db {
  let dbPath = path
  if (dbPath === undefined) {
    mkdirSync(DATA_DIR, { recursive: true })
    dbPath = join(DATA_DIR, 'data.db')
  }

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
  const seed = db.transaction((entries: [string, string][]) => {
    for (const [k, v] of entries) ins.run(k, v)
  })
  seed(Object.entries(defaults))

  return db
}
