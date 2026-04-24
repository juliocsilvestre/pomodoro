import type { Settings } from '../types.js'

export function openSettings(settings: Settings) {
  ;(document.getElementById('s-work') as HTMLInputElement).value = String(settings.work_duration / 60)
  ;(document.getElementById('s-short') as HTMLInputElement).value = String(settings.short_break / 60)
  ;(document.getElementById('s-long') as HTMLInputElement).value = String(settings.long_break / 60)
  ;(document.getElementById('s-interval') as HTMLInputElement).value = String(settings.long_break_interval)
  ;(document.getElementById('s-sound-type') as HTMLSelectElement).value = settings.sound_type
  ;(document.getElementById('s-volume') as HTMLInputElement).value = String(settings.sound_volume)
  document.getElementById('modal-settings')!.classList.remove('hidden')
}

export function closeSettings() {
  document.getElementById('modal-settings')!.classList.add('hidden')
}

export function readSettingsForm(): Partial<Record<string, number | string>> {
  return {
    work_duration: Number((document.getElementById('s-work') as HTMLInputElement).value) * 60,
    short_break: Number((document.getElementById('s-short') as HTMLInputElement).value) * 60,
    long_break: Number((document.getElementById('s-long') as HTMLInputElement).value) * 60,
    long_break_interval: Number((document.getElementById('s-interval') as HTMLInputElement).value),
    sound_type: (document.getElementById('s-sound-type') as HTMLSelectElement).value,
    sound_volume: Number((document.getElementById('s-volume') as HTMLInputElement).value),
  }
}
