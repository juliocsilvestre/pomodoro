import type { AppState } from '../state.js'

const SESSION_LABEL: Record<string, string> = {
  work: 'TRABALHO',
  short_break: 'PAUSA CURTA',
  long_break: 'PAUSA LONGA',
}

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function renderTimer(s: AppState) {
  const { timer, settings } = s

  const total =
    timer.sessionType === 'work'
      ? settings.work_duration
      : timer.sessionType === 'short_break'
        ? settings.short_break
        : settings.long_break
  const pct = total > 0 ? ((total - timer.remainingSeconds) / total) * 100 : 0

  const dots = Array.from({ length: settings.long_break_interval }, (_, i) =>
    i < timer.pomodoroNumber - (timer.status === 'idle' && timer.sessionType === 'work' ? 1 : 0) ? '●' : '○'
  ).join('')

  const task = s.tasks.find(t => t.id === timer.currentTaskId)

  document.getElementById('session-label')!.textContent = SESSION_LABEL[timer.sessionType]
  document.getElementById('pomodoro-num')!.textContent = `#${timer.pomodoroNumber}`
  ;(document.getElementById('timer-display') as HTMLElement).textContent = fmt(timer.remainingSeconds)
  ;(document.getElementById('progress-bar') as HTMLElement).style.width = `${pct}%`
  document.getElementById('timer-dots')!.textContent = dots
  document.getElementById('current-task')!.textContent = task ? task.title : ''

  const btn = document.getElementById('btn-pause')!
  btn.textContent = timer.status === 'running' ? '⏸ pausar' : timer.status === 'paused' ? '▶ retomar' : '▶ iniciar'
  btn.className = 'primary'
}
