import type { AppState } from '../state.js'
import type { Task } from '../types.js'

const categories = [
  { key: 'work', listId: 'list-work', countId: 'count-work' },
  { key: 'study', listId: 'list-study', countId: 'count-study' },
  { key: 'personal', listId: 'list-personal', countId: 'count-personal' },
] as const

const collapsed = new Set<string>()

export function initTaskGroups() {
  document.querySelectorAll<HTMLElement>('.task-group-header[data-category]').forEach(header => {
    const key = header.dataset.category!
    header.addEventListener('click', () => {
      if (collapsed.has(key)) collapsed.delete(key)
      else collapsed.add(key)
      const ul = document.getElementById(`list-${key}`)!
      ul.hidden = collapsed.has(key)
      header.classList.toggle('collapsed', collapsed.has(key))
    })
  })
}

function taskEl(task: Task, onCheck: (id: string) => void, onDelete: (id: string) => void): HTMLLIElement {
  const li = document.createElement('li')
  li.className = `task-item${task.status === 'done' ? ' done' : ''}`

  const check = document.createElement('div')
  check.className = `task-check${task.status === 'done' ? ' checked' : ''}`
  check.onclick = () => onCheck(task.id)

  const title = document.createElement('span')
  title.className = 'task-title'
  title.textContent = task.title

  const poms = document.createElement('span')
  poms.className = 'task-pomodoros'
  if (task.pomodoro_count > 0) poms.textContent = `·${task.pomodoro_count}`

  const del = document.createElement('button')
  del.className = 'task-delete'
  del.textContent = '×'
  del.onclick = () => onDelete(task.id)

  li.append(check, title, poms, del)
  return li
}

export function renderTasks(s: AppState, onCheck: (id: string) => void, onDelete: (id: string) => void) {
  for (const { key, listId, countId } of categories) {
    const ul = document.getElementById(listId)!
    const countEl = document.getElementById(countId)

    ul.innerHTML = ''
    const filtered = s.tasks.filter(t => t.category === key && t.status !== 'archived')
    filtered.forEach(t => ul.appendChild(taskEl(t, onCheck, onDelete)))

    if (countEl) countEl.textContent = filtered.length > 0 ? String(filtered.length) : ''
    ul.hidden = collapsed.has(key)
  }
}
