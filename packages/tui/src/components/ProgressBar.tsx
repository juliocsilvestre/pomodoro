import React from 'react'
import { Text } from 'ink'

interface Props {
  total: number
  remaining: number
  width?: number
}

export function ProgressBar({ total, remaining, width = 20 }: Props) {
  const pct = total > 0 ? (total - remaining) / total : 0
  const filled = Math.round(pct * width)
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled)
  return <Text>{bar}  {Math.round(pct * 100)}%</Text>
}
