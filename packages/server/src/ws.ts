import type { WebSocket } from 'ws'
import type { ServerMessage } from './types.js'

export class WsManager {
  private clients = new Set<WebSocket>()

  add(ws: WebSocket) {
    this.clients.add(ws)
    ws.on('close', () => this.clients.delete(ws))
  }

  broadcast(msg: ServerMessage) {
    const data = JSON.stringify(msg)
    for (const client of this.clients) {
      if (client.readyState === 1 /* OPEN */) client.send(data)
    }
  }

  size() { return this.clients.size }
}
