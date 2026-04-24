import type { Session } from '../types.js'

const TYPE_LABEL: Record<string, string> = {
  work: 'Trabalho',
  short_break: 'Pausa curta',
  long_break: 'Pausa longa',
}

function fmt(ms: number) {
  return new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

function minStr(s: number) {
  return `${Math.round(s / 60)} min`
}

export async function renderHistory(fetchSessions: () => Promise<Session[]>) {
  const sessions = await fetchSessions()
  const container = document.getElementById('history-list')!
  container.innerHTML = ''

  if (sessions.length === 0) {
    container.innerHTML = '<p style="color:#444;font-size:13px">Nenhuma sessão ainda.</p>'
    return
  }

  const byDate = new Map<string, Session[]>()
  for (const s of sessions) {
    const key = fmtDate(s.started_at)
    if (!byDate.has(key)) byDate.set(key, [])
    byDate.get(key)!.push(s)
  }

  for (const [date, group] of byDate) {
    const header = document.createElement('div')
    header.className = 'history-date'
    header.textContent = date
    container.appendChild(header)

    for (const s of group) {
      const row = document.createElement('div')
      row.className = `history-session${s.type === 'work' ? ' work' : ''}`
      row.innerHTML = `<span>${TYPE_LABEL[s.type]}</span><span>${fmt(s.started_at)} — ${minStr(s.duration_s)}</span>`
      container.appendChild(row)
    }
  }
}
