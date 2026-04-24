import './styles/main.css'
import { state, subscribe, setTimer, setTasks, upsertTask, removeTask, setSettings, setTab, notify } from './state.js'
import { connectWs, getTasks, getSettings, timerPost, postTask, patchTask, getSessions, putSettings } from './api.js'
import { renderTimer } from './tabs/timer.js'
import { renderTasks } from './tabs/tasks.js'
import { renderHistory } from './tabs/history.js'
import { openSettings, closeSettings, readSettingsForm } from './tabs/settings.js'
import { playNotification } from './sound.js'
import { openPip, updatePip, isPipOpen } from './pip.js'

async function init() {
  const [tasks, settings] = await Promise.all([getTasks(), getSettings()])
  setTasks(tasks)
  setSettings(settings)

  connectWs((msg) => {
    if (msg.type === 'tick') {
      setTimer({
        remainingSeconds: msg.remaining,
        status: msg.status,
        sessionType: msg.session,
        pomodoroNumber: msg.pomodoro,
      })
    } else if (msg.type === 'session_complete') {
      setTimer({ status: 'idle', sessionType: msg.next })
      playNotification(state.settings)
    } else if (msg.type === 'state') {
      setTimer(msg.timer)
      setTasks(msg.tasks)
    } else if (msg.type === 'task_updated') {
      upsertTask(msg.task)
    } else if (msg.type === 'task_deleted') {
      removeTask(msg.id)
    } else if (msg.type === 'settings_updated') {
      setSettings(msg.settings)
    }
  })
}

subscribe((s) => {
  renderTimer(s)
  renderTasks(s, (id) => {
    const task = s.tasks.find(t => t.id === id)!
    const newStatus = task.status === 'done' ? 'pending' : 'done'
    patchTask(id, { status: newStatus }).then(upsertTask)
  })
  if (isPipOpen()) updatePip(s.timer)
})

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

document.getElementById('btn-pause')!.addEventListener('click', () => timerPost('pause'))
document.getElementById('btn-skip')!.addEventListener('click', () => timerPost('skip'))
document.getElementById('btn-pip')!.addEventListener('click', () => openPip(state.timer))

window.addEventListener('message', (e) => {
  if ((e.data as { type?: string; action?: string })?.type === 'timer_action')
    timerPost((e.data as { action: 'start' | 'pause' | 'skip' | 'reset' }).action)
})

document.getElementById('btn-add-task')!.addEventListener('click', () => {
  const title = (document.getElementById('new-task-title') as HTMLInputElement).value.trim()
  const category = (document.getElementById('new-task-category') as HTMLSelectElement).value as
    | 'work'
    | 'study'
    | 'personal'
  if (!title) return
  postTask(title, category).then(upsertTask)
  ;(document.getElementById('new-task-title') as HTMLInputElement).value = ''
})

document.getElementById('new-task-title')!.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('btn-add-task')!.click()
})

document.getElementById('btn-archive-done')!.addEventListener('click', async () => {
  const done = state.tasks.filter(t => t.status === 'done')
  await Promise.all(done.map(t => patchTask(t.id, { status: 'archived' }).then(upsertTask)))
})

document.getElementById('btn-settings')!.addEventListener('click', () => openSettings(state.settings))
document.getElementById('btn-settings-cancel')!.addEventListener('click', closeSettings)
document.getElementById('btn-settings-save')!.addEventListener('click', async () => {
  const updates = readSettingsForm()
  const newSettings = await putSettings(updates)
  setSettings(newSettings)
  closeSettings()
})

init().then(() => notify())
