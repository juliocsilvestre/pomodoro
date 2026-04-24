import type { AppState } from '../state.js'
import type { Task } from '../types.js'

function taskEl(task: Task, onCheck: (id: string) => void): HTMLLIElement {
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

  li.append(check, title, poms)
  return li
}

export function renderTasks(s: AppState, onCheck: (id: string) => void) {
  const categories: Array<{ key: string; listId: string }> = [
    { key: 'work', listId: 'list-work' },
    { key: 'study', listId: 'list-study' },
    { key: 'personal', listId: 'list-personal' },
  ]

  for (const { key, listId } of categories) {
    const ul = document.getElementById(listId)!
    ul.innerHTML = ''
    s.tasks
      .filter(t => t.category === key && t.status !== 'archived')
      .forEach(t => ul.appendChild(taskEl(t, onCheck)))
  }
}
