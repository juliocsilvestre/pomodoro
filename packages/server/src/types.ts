export type TaskCategory = 'work' | 'study' | 'personal'
export type TaskStatus = 'pending' | 'done' | 'archived'
export type SessionType = 'work' | 'short_break' | 'long_break'
export type TimerStatus = 'idle' | 'running' | 'paused'

export interface Task {
  id: string
  title: string
  category: TaskCategory
  status: TaskStatus
  pomodoro_count: number
  created_at: number
  completed_at: number | null
}

export interface Session {
  id: string
  task_id: string | null
  type: SessionType
  started_at: number
  ended_at: number
  duration_s: number
}

export interface Settings {
  work_duration: number
  short_break: number
  long_break: number
  long_break_interval: number
  sound_type: 'generated' | 'file'
  sound_volume: number
}

export interface TimerState {
  status: TimerStatus
  sessionType: SessionType
  remainingSeconds: number
  pomodoroNumber: number
  currentTaskId: string | null
  sessionStartedAt: number | null
}

export type ServerMessage =
  | { type: 'tick'; remaining: number; status: TimerStatus; session: SessionType; pomodoro: number }
  | { type: 'session_complete'; session: SessionType; next: SessionType }
  | { type: 'task_updated'; task: Task }
  | { type: 'task_deleted'; id: string }
  | { type: 'settings_updated'; settings: Settings }
  | { type: 'state'; timer: TimerState; tasks: Task[] }

export type ClientMessage =
  | { type: 'timer_action'; action: 'start' | 'pause' | 'skip' | 'reset'; taskId?: string }
