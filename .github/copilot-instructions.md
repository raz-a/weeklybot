# WeeklyBot

WeeklyBot is a Twitch chatbot (TypeScript / Node.js / ESM) built for the **"Weekly Wednesday"** stream co-hosted by **razstrats** and **naircat**. It started as a one-purpose relay so viewers of one channel could interact with viewers of the other, and is growing into a general **supplement to the stream**. Its core job today is to **bridge chat across multiple Twitch channels** (now also integrating Twitch's native Shared Chat); it also exposes many chat commands and a Socket.IO web dashboard.

Most commands are **inside jokes** rather than general-purpose features — the biggest being `poopcam` (a running bit about viewers requesting "poopcam" from naircat). Treat the humor and voice of existing commands as intentional when adding or editing them.

## Goals & roadmap

Direction to keep in mind when proposing or designing changes:
- **Multi-platform chat bridging:** eventually relay between Twitch and **YouTube** and **Kick** chats, not just Twitch ↔ Twitch.
- **Stream context awareness:** adapt responses to what's happening on stream — which game is being played, who is live, etc. Example: `!rules` is currently hardcoded to the latest game; the goal is for it to return the right rules based on the game the broadcasters are currently playing.
- **Automated integration testing (current emphasis):** the repo has very little testing. A priority is an automated integration-test framework that validates the bot before deploying to the server. Prefer changes that move toward testability.

## Deployment target

Production is a **small Linux machine on the maintainer's home network** (`weeklybot.lan`), managed by PM2. Keep resource use and setup modest — don't assume cloud-scale infrastructure.

## Working with the maintainer

razstrats is an experienced **Windows kernel developer (~10 years)** who is **new to web development** and uses this project to learn it. When making web-related changes, **explain what you're doing and why, call out web-dev best practices, and relate concepts to kernel/systems ideas** he already knows (e.g. the Node event loop vs. DPCs/work items, sockets vs. IRP-based I/O) wherever a genuinely useful analogy exists.

## Build / run / deploy

- **Build:** `npm run build` (runs `tsc`). Compiled output goes to `weeklybot/` (the `outDir`), not next to the sources.
- **Run:** `npm start` (`node weeklybot/app.js`). Build first. **Must be run from the repo root** — `client.ts` reads `./private/*.json`, the JSON DBs live in `./save/`, and Express serves `webpage/`, all via cwd-relative paths.
- **No test suite and no linter exist yet.** Validate changes by getting a clean `npm run build`. (Building an automated integration-test framework is a current goal — see *Goals & roadmap*.)
- **Deploy:** to the `weeklybot.lan` production box via `pm2 deploy ecosystem.config.cjs production`. Prefer the `pm2-deploy` skill (`.github/skills/pm2-deploy/`), which enforces "build must pass before deploy". Never deploy a failing build.

## Architecture (the big picture)

- **`client.ts`** builds the Twurple auth + shared `apiClient` / `chatClient` singletons using **top-level `await`** to load `./private/clientinfo.json` and `./private/token.json`. Most modules import these singletons from here.
- **`app.ts`** is the entry point and wiring hub: registers the Twitch message handler, the terminal-stdin handler, and the web dashboard callbacks; connects to Twitch; and joins default channels **razstrats** and **naircat** on (re)connect.
- **Inbound message flow** (`onMessageHandler` in `app.ts`): drop non-native Shared Chat copies → relay to other channels → run command sets **in order: `broadcastercommands` → `modcommands` → `usercommands`** → fall through to special non-command checks. The first set that handles the input short-circuits.

### Command system (`commands.ts`) — key convention

Commands are `Command` objects grouped in a `CommandSet(name, prefix, stateValidator, ...commands)`. **A command's invocation name is derived from its function name** (`fn.name.toLowerCase()`). To add a command: write a function `(args: string[], state) => void` and register it in the right set — the function name *is* the chat command (e.g. `function bingo(...)` → `!bingo`). An empty description string hides a command from `help`/listings but keeps it callable.

The sets and their gates:
| Set | File | Prefix | Who can run it |
| --- | --- | --- | --- |
| `broadcastercommands` | `broadcaster.ts` | `~` | broadcaster only |
| `modcommands` | `modcommands.ts` | `!` | broadcaster or mod |
| `usercommands` | `usercommands.ts` | `!` | anyone in chat |
| `termcommands` | `termcommands.ts` | `!` | terminal stdin + web UI command box |

### Shared-Chat-aware relaying (`util.ts`) — the subtlest logic

Twitch "Shared Chat" natively mirrors messages between channels in a session, so naive relaying would duplicate. WeeklyBot partitions connected channels into **chat groups** discovered dynamically from each message's `source-room-id` IRC tag (`recordSharedChatMessage` / `getChatGroups`). Consequences any change here must preserve:
- Only **native** messages are processed (`isNativeMessage`), so each user message is handled exactly once.
- `broadcast()` posts once per group; `relay(source, msg)` posts to every group except the source's; `send(channel, msg)` hits one channel.
- **Always emit chat via `broadcast` / `relay` / `send`, never `chatClient.say` directly**, so grouping is respected.

### Persistence & external data

- Local state uses **`node-json-db`** files under `./save/` (gitignored). Pattern: an `abstract class` with `static #db = new JsonDB(new Config("./save/<name>.json", true, true))` and static async methods (see `poopcam.ts`, `pisscam.ts`, `piss.ts`, `dictionary.ts`).
- **Feature requests are GitHub issues, not local** — `feature_requests.ts` uses Octokit, authed from `./private/githubinfo.json`, labeled `feature-request`.
- **Web dashboard:** `webserver.ts` is an Express static server (`webpage/`) + Socket.IO on port 3000. `app.ts` supplies a `DashboardCallbacks` object; the server forwards socket events to those callbacks and emits state back. Frontend is plain `webpage/{index.html,script.js,style.css}`.

## Conventions & gotchas

- **ESM with NodeNext:** local imports use a **`.js` extension** even though the source is `.ts` (e.g. `import { send } from "./util.js"`). `package.json` is `"type": "module"`; `tsconfig` is `strict`, `module: NodeNext`, `target: ES2017`.
- **Logging:** use `weeklyBotPrint()` (util.ts) for operator/status output — it both `console.log`s and pushes to the dashboard.
- **Secrets** live only in `./private/` (`clientinfo.json`, `token.json`, `githubinfo.json`) — gitignored, never committed, and present on the server already (not deployed via git).
- `razstrats` is a protected channel and cannot be removed via `removeBroadcaster`.
