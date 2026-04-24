# Pomodoro — Implementation Progress

## How to Resume

Open Claude Code in this directory and say:
> "Continue implementing the Pomodoro app using subagent-driven development. Read PROGRESS.md and the plan at docs/superpowers/plans/2026-04-24-pomodoro-implementation.md. Resume from the next pending task."

---

## Implementation Plan

Full plan: `docs/superpowers/plans/2026-04-24-pomodoro-implementation.md`
Design spec: `docs/superpowers/specs/2026-04-23-pomodoro-design.md`

---

## Task Status

| # | Task | Status |
|---|---|---|
| 1 | Initialize monorepo | ✅ Done |
| 2 | Shared types (`packages/server/src/types.ts`) | ✅ Done |
| 3 | Database module (`packages/server/src/db.ts`) | ⏳ Next |
| 4 | Timer engine (`packages/server/src/timer.ts`) | ⏳ Pending |
| 5 | WebSocket manager (`packages/server/src/ws.ts`) | ⏳ Pending |
| 6 | Task routes (`packages/server/src/routes/tasks.ts`) | ⏳ Pending |
| 7 | Sessions, settings, timer routes | ⏳ Pending |
| 8 | Server entry point (`server.ts`, `index.ts`, `handler.ts`) | ⏳ Pending |
| 9 | TUI client module (`packages/tui/src/client.ts`) | ⏳ Pending |
| 10 | TUI components (ProgressBar, TimerPanel, TasksPanel, AddTaskForm) | ⏳ Pending |
| 11 | TUI App root and entry point | ⏳ Pending |
| 12 | Web scaffold, HTML, API client, state | ⏳ Pending |
| 13 | Web CSS theme | ⏳ Pending |
| 14 | Web sound + Picture-in-Picture modules | ⏳ Pending |
| 15 | Web tab modules (timer, tasks, history, settings) | ⏳ Pending |
| 16 | Web main entry point | ⏳ Pending |
| 17 | CLI entry point (`bin/cli.js`) | ⏳ Pending |
| 18 | README.md | ⏳ Pending |
| 19 | Final integration check + merge to main | ⏳ Pending |

---

## Project Context

**Repository:** `git@github.com:juliocsilvestre/pomodoro.git`
**Active branch:** `develop`
**Merge strategy:** feature branches → `develop` → `main`

**Git conventions (MUST follow):**
- Every commit starts with a gitmoji (e.g. `✨`, `🐛`, `📝`, `🎉`)
- **Never** add Co-Authored-By lines to commits
- Work on `develop` branch; merge to `main` only on final release

**Architecture summary:**
- Monorepo: `packages/server`, `packages/tui`, `packages/web`
- Server: Fastify 4 + @fastify/websocket + better-sqlite3 + nanoid
- TUI: ink 4 + React 18 (two-panel layout: timer left, tasks right)
- Web: Vite 5 + TypeScript vanilla (tabs: Timer / Tarefas / Histórico)
- Shared state: WebSocket real-time sync, REST for CRUD
- Data: `~/.pomodoro/data.db` (SQLite), persists across reboots
- Visual: pure black (#000) + white (#fff), system-ui font

**Execution method:** Subagent-Driven Development (superpowers:subagent-driven-development skill)
- Dispatch one implementer subagent per task
- Follow with spec compliance review subagent
- Follow with code quality review subagent
- Fix any issues found before marking task complete

**User preferences:**
- README.md must be thorough and well-documented
- No emoji in code (only in commit messages)
- TypeScript strict mode everywhere
- Sound: Web Audio API (generated) + bell.mp3 file, selectable in settings
- Picture-in-Picture: Document PiP API (Chrome 116+)

---

## Current State of Codebase

```
packages/
  server/
    src/
      types.ts        ✅ complete
  tui/                (empty, needs src/)
  web/                (empty, needs src/)
bin/
  cli.js              (stub only — implemented in Task 17)
docs/
  superpowers/
    specs/2026-04-23-pomodoro-design.md
    plans/2026-04-24-pomodoro-implementation.md
```

---

## Notes for Resuming Agent

- Tasks 1-2 were completed with full spec + code quality review
- Task 1 had a critical issue (node_modules committed) that was fixed in commits `b93ee9e` and `ef77bfe`
- All subsequent tasks should follow TDD as specified in the plan
- The plan has complete code for every task — use it as the source of truth
- For server tests, use `:memory:` SQLite and Fastify's `inject()` method
- For timer tests, use `vi.useFakeTimers()` from vitest
