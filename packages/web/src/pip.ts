import type { TimerState } from './types.js'

let pipWindow: Window | null = null

const SESSION_LABEL: Record<string, string> = {
  work: 'TRABALHO',
  short_break: 'PAUSA CURTA',
  long_break: 'PAUSA LONGA',
}

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function pipHtml(timer: TimerState) {
  return `
    <style>
      body { margin:0; background:#000; color:#fff; font-family:ui-monospace,monospace;
             display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; }
      .label { font-size:9px; letter-spacing:2px; color:#555; margin-bottom:4px }
      .time { font-size:48px; font-weight:200; letter-spacing:6px }
      .task { font-size:11px; color:#666; margin-top:6px }
      button { margin-top:12px; background:#1a1a1a; border:none; color:#fff; padding:6px 16px; border-radius:100px; font-size:11px; cursor:pointer }
    </style>
    <div class="label">${SESSION_LABEL[timer.sessionType]}</div>
    <div class="time">${fmt(timer.remainingSeconds)}</div>
    <div class="task">${timer.currentTaskId ? '●' : ''}</div>
    <button onclick="window.opener?.postMessage({type:'timer_action',action:'${timer.status === 'idle' ? 'start' : 'pause'}'},'*')">
      ${timer.status === 'running' ? '⏸' : '▶'}
    </button>
  `
}

export async function openPip(timer: TimerState) {
  if (!('documentPictureInPicture' in window)) {
    alert('Picture-in-Picture não suportado neste browser (requer Chrome 116+)')
    return
  }
  const dPiP = (window as unknown as { documentPictureInPicture: { requestWindow: (o: object) => Promise<Window> } }).documentPictureInPicture
  pipWindow = await dPiP.requestWindow({ width: 200, height: 180 })
  pipWindow.document.body.innerHTML = pipHtml(timer)
  pipWindow.addEventListener('pagehide', () => {
    pipWindow = null
  })
}

export function updatePip(timer: TimerState) {
  if (!pipWindow) return
  pipWindow.document.body.innerHTML = pipHtml(timer)
}

export function isPipOpen() {
  return pipWindow !== null
}
