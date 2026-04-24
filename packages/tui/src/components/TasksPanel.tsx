import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import type { Task, TaskCategory } from '../client.js'
import { AddTaskForm } from './AddTaskForm.js'

interface Props {
  tasks: Task[]
  focused: boolean
  onAdd: (title: string, category: TaskCategory) => void
  onDone: (id: string) => void
  onArchive: (id: string) => void
  onSelect: (id: string) => void
}

const CAT_LABEL: Record<string, string> = { work: 'w', study: 's', personal: 'p' }

export function TasksPanel({ tasks, focused, onAdd, onDone, onArchive, onSelect }: Props) {
  const [cursor, setCursor] = useState(0)
  const [adding, setAdding] = useState(false)
  const border = focused ? 'bold' : undefined
  const pending = tasks.filter(t => t.status === 'pending')
  const done = tasks.filter(t => t.status === 'done')
  const visible = [...pending, ...done]

  useInput((input, key) => {
    if (!focused || adding) return
    if (key.upArrow) setCursor(c => Math.max(0, c - 1))
    if (key.downArrow) setCursor(c => Math.min(visible.length - 1, c + 1))
    if (input === 'a') setAdding(true)
    if (input === 'd' && visible[cursor]) onDone(visible[cursor].id)
    if (input === 'x' && visible[cursor]) onArchive(visible[cursor].id)
    if (key.return && visible[cursor]) onSelect(visible[cursor].id)
  })

  return (
    <Box flexDirection="column" flexGrow={1} borderStyle={border} borderColor="white" paddingX={1}>
      <Text bold>TAREFAS</Text>
      <Text> </Text>
      {visible.map((t, i) => (
        <Text key={t.id} color={t.status === 'done' ? 'gray' : 'white'}>
          {i === cursor && focused ? '▶ ' : '  '}
          <Text color="gray">[{CAT_LABEL[t.category]}] </Text>
          <Text strikethrough={t.status === 'done'}>{t.title}</Text>
          {t.pomodoro_count > 0 && <Text color="gray"> ·{t.pomodoro_count}</Text>}
        </Text>
      ))}
      {visible.length === 0 && <Text color="gray">  nenhuma tarefa</Text>}
      {adding && (
        <AddTaskForm
          onSubmit={(title, cat) => { onAdd(title, cat); setAdding(false) }}
          onCancel={() => setAdding(false)}
        />
      )}
      <Text> </Text>
      <Text color="gray">[a] add  [d] concluir  [x] arquivar</Text>
      <Text color="gray">[↑↓] navegar  [enter] selecionar</Text>
    </Box>
  )
}
