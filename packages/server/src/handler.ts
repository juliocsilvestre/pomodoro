import type { ClientMessage } from './types.js'
import type { TimerEngine } from './timer.js'

export function handleClientMessage(msg: ClientMessage, timer: TimerEngine) {
  if (msg.type !== 'timer_action') return
  if (msg.action === 'start') timer.start(msg.taskId)
  else if (msg.action === 'pause') {
    const s = timer.getState()
    if (s.status === 'running') timer.pause()
    else if (s.status === 'paused') timer.resume()
  }
  else if (msg.action === 'skip') timer.skip()
  else if (msg.action === 'reset') timer.reset()
}
