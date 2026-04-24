# Pomodoro Timer

A cross-platform Pomodoro timer application built with TypeScript, featuring a Terminal User Interface (TUI), Web interface, and REST API server with WebSocket real-time synchronization.

## Overview

This is a monorepo containing three interconnected packages:

- **Server** (`packages/server/`) — Fastify-based REST API + WebSocket server with SQLite persistence
- **TUI** (`packages/tui/`) — Terminal User Interface built with Ink and React
- **Web** (`packages/web/`) — Web interface built with Vite and vanilla TypeScript

All components share a unified data model and synchronize in real-time via WebSocket, allowing multiple clients to view and modify tasks and timer state simultaneously.

## Project Structure

```
pomodoro/
├── packages/
│   ├── server/                 # REST API + WebSocket server
│   │   ├── src/
│   │   │   ├── types.ts        # Shared TypeScript types
│   │   │   ├── db.ts           # SQLite database interface
│   │   │   ├── timer.ts        # Pomodoro timer engine
│   │   │   ├── ws.ts           # WebSocket manager
│   │   │   ├── server.ts       # Fastify application setup
│   │   │   └── index.ts        # Server entry point
│   │   ├── test/               # Vitest test suite
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── tui/                    # Terminal User Interface
│   │   ├── src/
│   │   │   ├── client.ts       # REST + WebSocket client
│   │   │   ├── index.ts        # TUI export entry point
│   │   │   └── components/     # Ink/React components
│   │   ├── test/               # Vitest test suite
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                    # Web Browser Interface
│       ├── src/
│       │   ├── index.html      # HTML entry point
│       │   ├── main.ts         # Web entry point
│       │   ├── client.ts       # REST + WebSocket client
│       │   ├── theme.ts        # CSS theme definition
│       │   ├── sound.ts        # Web Audio API + file audio
│       │   └── tabs/           # Tab components
│       ├── dist/               # Built artifacts
│       ├── public/             # Static assets (bell.mp3)
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
│
├── bin/
│   └── cli.js                  # CLI entry point (stub)
│
├── docs/
│   └── superpowers/
│       ├── specs/              # Design specifications
│       └── plans/              # Implementation plans
│
├── package.json                # Root monorepo configuration
├── tsconfig.json               # Root TypeScript configuration
└── README.md                   # This file
```

## Installation

### Prerequisites

- **Node.js** ≥ 18.0.0
- **npm** ≥ 9.0.0

### Setup

1. Clone the repository:
   ```bash
   git clone git@github.com:juliocsilvestre/pomodoro.git
   cd pomodoro
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build all packages:
   ```bash
   npm run build
   ```

## Development

### Scripts

From the root directory, you can run:

```bash
# Install dependencies across all packages
npm install

# Build all packages
npm run build

# Run tests for all packages
npm run test

# Run server in development mode
npm run dev --workspace=@juliocsilvestre/pomodoro-server

# Run TUI in development mode
npm run dev --workspace=@juliocsilvestre/pomodoro-tui

# Run web in development mode
npm run dev --workspace=@juliocsilvestre/pomodoro-web
```

### Individual Package Scripts

Each package has its own `package.json` with scripts:

**Server (`packages/server/`):**
```bash
npm run build     # Compile TypeScript
npm run dev       # Watch mode with tsx
npm run test      # Run tests
```

**TUI (`packages/tui/`):**
```bash
npm run build     # Compile TypeScript
npm run dev       # Run TUI with tsx
npm run test      # Run tests
```

**Web (`packages/web/`):**
```bash
npm run build     # Build with Vite
npm run dev       # Development server
npm run test      # Run tests
npm run preview   # Preview production build
```

## Usage

### Running the Server

```bash
cd packages/server
npm run dev
```

The server will start on `http://localhost:3333` by default. Set the `POMODORO_PORT` environment variable to use a different port:

```bash
POMODORO_PORT=4000 npm run dev
```

### Running the TUI Client

In another terminal:

```bash
cd packages/tui
npm run dev
```

The TUI will connect to the server on `localhost:3333` (or the port specified by `POMODORO_PORT`).

### Running the Web Interface

In another terminal:

```bash
cd packages/web
npm run dev
```

The web interface will be available at `http://localhost:5173` and will connect to the API server.

## Architecture

### Data Model

#### Core Types

- **Task** — A unit of work to complete (work, study, or personal category)
- **Session** — A completed pomodoro, short break, or long break
- **Settings** — User preferences (timings, sound, etc.)
- **TimerState** — Current timer status and progress

See `packages/server/src/types.ts` for complete type definitions.

### Server

The server is built with **Fastify** and provides:

- **REST API** for CRUD operations on tasks and settings
- **WebSocket** endpoint for real-time state synchronization
- **SQLite Database** for persistent storage at `~/.pomodoro/data.db`
- **Timer Engine** that manages Pomodoro sessions (work, short break, long break cycles)

#### API Endpoints

**Tasks:**
- `GET /tasks` — List all tasks
- `POST /tasks` — Create a new task
- `PATCH /tasks/:id` — Update a task
- `DELETE /tasks/:id` — Delete a task

**Settings:**
- `GET /settings` — Get user settings
- `POST /settings` — Update settings

**Timer:**
- `POST /timer/start` — Start the timer
- `POST /timer/pause` — Pause the timer
- `POST /timer/skip` — Skip to next session
- `POST /timer/reset` — Reset the timer

**WebSocket:**
- `WS /ws` — Real-time state updates and message broadcasting

### Client Architecture

Both TUI and Web clients share a common client module (`packages/*/src/client.ts`) that provides:

- **HTTP client** for REST operations
- **WebSocket client** with automatic reconnection
- **Type-safe message handling** using shared types from the server

#### Real-time Synchronization

The WebSocket connection broadcasts:

- `tick` — Timer state updates (remaining seconds, status)
- `session_complete` — When a pomodoro/break completes
- `task_updated` — When a task is modified
- `task_deleted` — When a task is deleted
- `settings_updated` — When settings change
- `state` — Full state snapshot on connection

### Visual Design

#### Color Scheme

- **Background:** Pure black (`#000000`)
- **Text:** Pure white (`#ffffff`)
- **Font:** System UI (`system-ui, -apple-system, sans-serif`)

#### TUI Layout (Ink + React)

Two-panel layout:
- **Left panel** — Timer display with session info and controls
- **Right panel** — Task list with add/edit/delete functionality

#### Web Tabs

1. **Timer** — Large timer display with session controls
2. **Tarefas** (Tasks) — Task management interface
3. **Histórico** (History) — Session history and statistics
4. **Configurações** (Settings) — User preferences

### Audio

The application supports two audio output modes:

1. **Generated** — Web Audio API synthesized beep
2. **File** — External MP3 file (bell.mp3in `packages/web/public/`)

Users can select their preferred mode and volume in settings. The TUI uses the generated beep; the Web interface allows selection.

## Testing

This project uses **Vitest** for unit and integration tests with **TDD** (Test-Driven Development).

### Run Tests

```bash
# All packages
npm run test

# Specific package
npm run test --workspace=@juliocsilvestre/pomodoro-server
npm run test --workspace=@juliocsilvestre/pomodoro-tui
npm run test --workspace=@juliocsilvestre/pomodoro-web
```

### Testing Strategies

- **Server**: Use `:memory:` SQLite and Fastify's `inject()` method
- **Timer**: Use `vi.useFakeTimers()` for deterministic timing tests
- **Clients**: Mock WebSocket and fetch

## Environment Variables

### Server

- `POMODORO_PORT` — Server port (default: `3333`)

### Clients (TUI, Web)

- `POMODORO_PORT` — Server port for API/WS connection (default: `3333`)

## Data Persistence

The application stores data in:

```
~/.pomodoro/data.db
```

This SQLite database persists across reboots and contains:
- All tasks
- Session history
- User settings

## Git Workflow

**Branch Strategy:**
- Work on `develop` branch
- Feature branches (if needed) merge to `develop`
- Final release: `develop` → `main`

**Commit Conventions:**
- Every commit message starts with a **gitmoji**
- Examples: `✨` (feature), `🐛` (bugfix), `📝` (docs), `🎉` (release), `🗑️` (cleanup)
- **Never** add `Co-Authored-By` lines

**Example commits:**
```bash
git commit -m "✨ add TUI client module"
git commit -m "🐛 fix timer reconnection logic"
git commit -m "📝 update README with API docs"
```

## Troubleshooting

### Server won't start

1. Check if port 3333 is already in use:
   ```bash
   lsof -i :3333
   ```

2. Try a different port:
   ```bash
   POMODORO_PORT=4000 npm run dev
   ```

### TUI can't connect to server

1. Ensure the server is running:
   ```bash
   curl http://localhost:3333/tasks
   ```

2. Check the port matches (default 3333):
   ```bash
   POMODORO_PORT=3333 npm run dev
   ```

### WebSocket disconnects frequently

The client automatically reconnects every 2 seconds. If this happens repeatedly:
- Check server logs for errors
- Verify network connectivity
- Check for firewall rules blocking WebSocket

## Performance

- **Database**: Indexed queries on task status and timestamps
- **WebSocket**: Message batching and debouncing to reduce network traffic
- **TUI**: Efficient React renders with memoization
- **Web**: Lazy-loaded tabs and async image loading

## License

MIT

## Contributing

1. Create a feature branch from `develop`
2. Follow TDD with Vitest
3. Use gitmoji in commit messages
4. Submit PR with description of changes
5. Ensure all tests pass
6. Merge to `develop`, then to `main` for release

## Support

For issues or questions, please check the implementation plans in `docs/superpowers/plans/` or open an issue on GitHub.
