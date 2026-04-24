# Pomodoro — Design Spec

**Data:** 2026-04-23  
**Status:** Aprovado

---

## Visão geral

Aplicação Pomodoro com dois clientes integrados — TUI (terminal) e Web App (browser) — compartilhando estado em tempo real via um servidor local. Foco em design minimalista preto e branco, sem distrações.

---

## Arquitetura

### Estrutura do repositório

```
pomodoro/
├── packages/
│   ├── server/          — daemon Node.js (Fastify + WebSocket + SQLite)
│   ├── tui/             — interface terminal (ink + React)
│   └── web/             — interface browser (Vite + TypeScript)
├── package.json         — npm workspaces
├── tsconfig.json        — base TypeScript config
└── README.md
```

### Fluxo de dados

```
TUI ──WebSocket──┐
                 ├── Server (timer engine + SQLite)
Web ──WebSocket──┘       │
                    REST (CRUD tarefas, configurações)
```

O servidor é a fonte da verdade. O timer engine roda no processo do servidor. Ambos os clientes recebem ticks a cada segundo via WebSocket. Se apenas um cliente estiver aberto, funciona normalmente — o servidor garante a continuidade do estado.

### CLI global

Instalação: `npm install -g @juliocsilvestre/pomodoro`

| Comando | Comportamento |
|---|---|
| `pomodoro` | Sobe servidor + abre TUI |
| `pomodoro server` | Só o servidor (em background) |
| `pomodoro tui` | Só o TUI (sobe servidor automaticamente se não estiver rodando) |
| `pomodoro web` | Abre o browser em `http://localhost:3333` (sobe servidor automaticamente) |

---

## Pacote: server

**Stack:** Node.js + TypeScript, Fastify, `ws`, `better-sqlite3`

**Porta padrão:** `3333` (configurável via `~/.pomodoro/config.json`)  
**Banco de dados:** `~/.pomodoro/data.db` (SQLite)

### API REST

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/tasks` | Lista tarefas (filtro: status, categoria) |
| `POST` | `/tasks` | Cria tarefa |
| `PATCH` | `/tasks/:id` | Atualiza tarefa (título, status, categoria) |
| `DELETE` | `/tasks/:id` | Remove tarefa |
| `GET` | `/sessions` | Histórico de sessões Pomodoro |
| `GET` | `/settings` | Lê configurações |
| `PUT` | `/settings` | Atualiza configurações |
| `GET` | `/timer` | Estado atual do timer |
| `POST` | `/timer/start` | Inicia timer |
| `POST` | `/timer/pause` | Pausa/retoma |
| `POST` | `/timer/skip` | Pula sessão atual |
| `POST` | `/timer/reset` | Reseta timer |

### WebSocket — eventos

**Servidor → Clientes:**
```json
{ "type": "tick", "remaining": 1247, "status": "running", "session": "work", "pomodoro": 3 }
{ "type": "session_complete", "session": "work", "next": "short_break" }
{ "type": "task_updated", "task": { ... } }
{ "type": "settings_updated", "settings": { ... } }
```

**Cliente → Servidor:**
```json
{ "type": "timer_action", "action": "pause" | "skip" | "reset" }
{ "type": "task_action", "action": "create" | "update" | "delete", "payload": { ... } }
```

### Modelo de dados (SQLite)

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT CHECK(category IN ('work', 'study', 'personal')) NOT NULL,
  status TEXT CHECK(status IN ('pending', 'done', 'archived')) DEFAULT 'pending',
  pomodoro_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  completed_at INTEGER
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  task_id TEXT REFERENCES tasks(id),
  type TEXT CHECK(type IN ('work', 'short_break', 'long_break')) NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER NOT NULL,
  duration_s INTEGER NOT NULL
);
-- sessões são gravadas somente ao concluir (término natural ou skip)

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

**Configurações padrão:**
| Chave | Valor padrão |
|---|---|
| `work_duration` | `1500` (25 min em segundos) |
| `short_break` | `300` (5 min) |
| `long_break` | `900` (15 min) |
| `long_break_interval` | `4` (a cada 4 pomodoros) |
| `sound_type` | `"generated"` (Web Audio API) |
| `sound_volume` | `"0.7"` |

### Timer engine (in-memory)

Estado mantido em memória no processo do servidor:

```typescript
interface TimerState {
  status: 'idle' | 'running' | 'paused';
  sessionType: 'work' | 'short_break' | 'long_break';
  remainingSeconds: number;
  pomodoroNumber: number;
  currentTaskId: string | null;
}
```

A cada segundo (`setInterval`), decrementa `remainingSeconds` e faz broadcast via WebSocket. Ao atingir zero, persiste a sessão no SQLite, determina a próxima sessão e emite `session_complete`.

---

## Pacote: tui

**Stack:** TypeScript, `ink` (React para terminal), `ws`

### Layout — dois painéis lado a lado

```
┌──────────────────────┬──────────────────────────────┐
│  TIMER               │  TAREFAS                     │
│                      │                              │
│  TRABALHO · #3       │  ✓ Revisar pull request      │
│                      │  ▶ Escrever documentação  ←  │
│       20:47          │  ○ Reunião de alinhamento    │
│                      │  ○ Estudar TypeScript        │
│  ████████░░  45%     │                              │
│  ●●●○○○○○            │  [a] adicionar               │
│                      │  [d] concluir                │
│  [p] pausar          │  [↑↓] navegar                │
│  [s] pular           │  [tab] trocar painel         │
│  [q] sair            │                              │
└──────────────────────┴──────────────────────────────┘
```

**Categorias:** texto puro sem emoji (clean, sem dependência de font).  
`[w]` work · `[s]` study · `[p]` personal — mostrado como label pequeno ao lado do título.

### Comportamento

- `Tab` alterna foco entre painel Timer e painel Tarefas
- No painel Tarefas: `↑↓` navega, `Enter` seleciona tarefa para o timer atual, `a` abre form inline para adicionar, `d` marca como concluída, `x` arquiva
- Ao iniciar, tenta conectar ao servidor em `localhost:3333`. Se não estiver rodando, sobe o servidor como processo filho e aguarda conexão
- Reconexão automática com backoff exponencial se o servidor cair

---

## Pacote: web

**Stack:** Vite + TypeScript (sem framework), CSS puro

### Tema visual

- Fundo: `#000000`
- Texto principal: `#ffffff`
- Texto secundário: `#444444`
- Bordas/divisores: `#1a1a1a`
- Elemento ativo/destaque: `#ffffff`
- Fonte: `system-ui` (sem fonte externa)
- Fonte timer: monospace, weight 200, letter-spacing generoso

### Estrutura de abas

**Aba Timer:**
- Tipo de sessão (TRABALHO / PAUSA CURTA / PAUSA LONGA) em label pequeno
- Número do pomodoro
- Contador grande centralizado
- Barra de progresso fina
- Indicador de sessões do dia (pontos: `●●●○○○○○`)
- Tarefa atual em texto abaixo
- Botões: Pausar / Pular
- Botão Picture-in-Picture (canto superior direito)

**Aba Tarefas:**
- Três seções colapsáveis: Trabalho · Estudo · Pessoal
- Cada tarefa: checkbox, título, contador de pomodoros
- Botão "Arquivar concluídas"
- Input inline para adicionar nova tarefa

**Aba Histórico:**
- Lista de sessões do dia atual
- Agrupamento por data para dias anteriores
- Totais: pomodoros completados, tempo de foco

**Settings (modal):**
- Tempos de trabalho, pausa curta, pausa longa, intervalo
- Tipo de som: Gerado (Web Audio) / Arquivo de áudio
- Volume (slider)

### Picture-in-Picture

Usa a **Document Picture-in-Picture API** (Chrome 116+). O mini-widget exibe:
- Contador regressivo (fonte grande)
- Tipo de sessão
- Tarefa atual
- Botão pausar/retomar

Recebe ticks via mensagem do contexto pai (não abre nova conexão WebSocket).

### Som

Dois modos selecionáveis nas configurações:
- **Gerado (padrão):** tom suave via Web Audio API (`OscillatorNode`, tipo `sine`, ~440hz, fade out rápido)
- **Arquivo:** sino clássico (`/assets/bell.mp3`) incluso no bundle

Ambos respeitam o volume configurado. Som tocado ao completar qualquer sessão (trabalho ou pausa).

---

## README.md

O README deve conter:
- Badge de versão e licença
- GIF/screenshot do TUI e da web app
- Instalação em um comando
- Tabela de comandos
- Atalhos de teclado do TUI
- Configuração (localização dos arquivos, variáveis disponíveis)
- Seção de desenvolvimento local (como rodar os pacotes individualmente)
- Seção de contribuição

---

## Convenções de desenvolvimento

- **Commits:** gitmoji obrigatório (ex: `✨ add timer engine`, `🐛 fix ws reconnect`)
- **Sem Co-Authored-By** em nenhum commit
- **Branch strategy:** feature branches → `develop` → `main`
- **TypeScript strict** em todos os pacotes
- **Sem dependências desnecessárias** — manter bundle leve
