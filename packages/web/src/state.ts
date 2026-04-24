import type { Task, Settings, TimerState } from './types.js'

export interface AppState {
  timer: TimerState
  tasks: Task[]
  settings: Settings
  activeTab: 'timer' | 'tasks' | 'history'
}

const DEFAULT_TIMER: TimerState = {
  status: 'idle',
  sessionType: 'work',
  remainingSeconds: 1500,
  pomodoroNumber: 1,
  currentTaskId: null,
  sessionStartedAt: null,
}

const DEFAULT_SETTINGS: Settings = {
  work_duration: 1500,
  short_break: 300,
  long_break: 900,
  long_break_interval: 4,
  sound_type: 'generated',
  sound_volume: 0.7,
}

export const state: AppState = {
  timer: { ...DEFAULT_TIMER },
  tasks: [],
  settings: { ...DEFAULT_SETTINGS },
  activeTab: 'timer',
}

type Listener = (state: AppState) => void
const listeners = new Set<Listener>()

export function subscribe(fn: Listener) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function notify() {
  for (const fn of listeners) fn(state)
}

export function setTimer(partial: Partial<TimerState>) {
  Object.assign(state.timer, partial)
  notify()
}

export function setTasks(tasks: Task[]) {
  state.tasks = tasks
  notify()
}

export function upsertTask(task: Task) {
  const i = state.tasks.findIndex(t => t.id === task.id)
  if (i >= 0) state.tasks[i] = task
  else state.tasks.push(task)
  notify()
}

export function removeTask(id: string) {
  state.tasks = state.tasks.filter(t => t.id !== id)
  notify()
}

export function setSettings(s: Settings) {
  state.settings = s
  notify()
}

export function setTab(tab: AppState['activeTab']) {
  state.activeTab = tab
  notify()
}
