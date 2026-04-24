import { describe, it, expect } from 'vitest'
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
