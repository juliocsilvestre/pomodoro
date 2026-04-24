import React from 'react'
import { Box, Text } from 'ink'
import type { TimerState, Settings } from '../client.js'
import { ProgressBar } from './ProgressBar.js'

interface Props {
  timer: TimerState
  settings: Settings
  focused: boolean
}

const SESSION_LABEL: Record<string, string> = {
  work: 'TRABALHO',
  short_break: 'PAUSA CURTA',
  long_break: 'PAUSA LONGA',
}

const STATUS_LABEL: Record<string, string> = {
  idle: 'parado',
  running: 'rodando',
  paused: 'pausado',
}

function fmt(s: number) {
  const m = String(Math.floor(s / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  return `${m}:${sec}`
}

function totalFor(timer: TimerState, settings: Settings) {
  if (timer.sessionType === 'work') return settings.work_duration
  if (timer.sessionType === 'short_break') return settings.short_break
  return settings.long_break
}

export function TimerPanel({ timer, settings, focused }: Props) {
  const border = focused ? 'bold' : undefined
  const dots = '●'.repeat(timer.pomodoroNumber) + '○'.repeat(Math.max(0, settings.long_break_interval - timer.pomodoroNumber))

  return (
    <Box flexDirection="column" width={26} borderStyle={border} borderColor="white" paddingX={1}>
      <Text bold>{SESSION_LABEL[timer.sessionType]}  #{timer.pomodoroNumber}</Text>
      <Text> </Text>
      <Text color="white">{fmt(timer.remainingSeconds)}</Text>
      <Text> </Text>
      <ProgressBar total={totalFor(timer, settings)} remaining={timer.remainingSeconds} width={18} />
      <Text color="gray">{dots}</Text>
      <Text> </Text>
      <Text color={timer.status === 'running' ? 'green' : 'gray'}>{STATUS_LABEL[timer.status]}</Text>
      <Text> </Text>
      <Text color="gray">[p] pausar  [s] pular</Text>
      <Text color="gray">[q] sair</Text>
    </Box>
  )
}
