import type { Settings } from './types.js'

let audioCtx: AudioContext | null = null

function getCtx() {
  if (!audioCtx) audioCtx = new AudioContext()
  return audioCtx
}

function playGenerated(volume: number) {
  const ctx = getCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(528, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3)
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
  osc.start()
  osc.stop(ctx.currentTime + 0.8)
}

function playFile(volume: number) {
  const audio = new Audio('/assets/bell.mp3')
  audio.volume = volume
  audio.play().catch(() => playGenerated(volume))
}

export function playNotification(settings: Settings) {
  const volume = settings.sound_volume
  if (settings.sound_type === 'file') playFile(volume)
  else playGenerated(volume)
}
