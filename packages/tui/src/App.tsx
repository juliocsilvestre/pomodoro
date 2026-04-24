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
