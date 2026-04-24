import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import type { TaskCategory } from '../client.js'

interface Props {
  onSubmit: (title: string, category: TaskCategory) => void
  onCancel: () => void
}

const CAT_KEY: Record<string, TaskCategory> = { w: 'work', s: 'study', p: 'personal' }

export function AddTaskForm({ onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<TaskCategory>('work')
  const [step, setStep] = useState<'title' | 'category'>('title')

  useInput((input, key) => {
    if (key.escape) { onCancel(); return }

    if (step === 'title') {
      if (key.return) { if (title.trim()) setStep('category'); return }
      if (key.backspace || key.delete) { setTitle(t => t.slice(0, -1)); return }
      if (!key.ctrl && !key.meta) setTitle(t => t + input)
    } else {
      const cat = CAT_KEY[input]
      if (cat) { onSubmit(title.trim(), cat); return }
    }
  })

  return (
    <Box flexDirection="column" paddingX={1}>
      {step === 'title' ? (
        <>
          <Text color="gray">nova tarefa:</Text>
          <Text>{title}<Text color="gray">_</Text></Text>
          <Text color="gray">[enter] continuar  [esc] cancelar</Text>
        </>
      ) : (
        <>
          <Text>{title}</Text>
          <Text color="gray">categoria: [w]ork  [s]tudy  [p]ersonal</Text>
        </>
      )}
    </Box>
  )
}
