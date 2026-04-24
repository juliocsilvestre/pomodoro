#!/usr/bin/env node
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

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
  console.log('Usage: pomodoro [server|tui|web]')
  process.exit(1)
}
