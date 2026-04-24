import { render } from 'ink'
import React from 'react'
import { App } from './App.js'
import { spawn } from 'child_process'
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
