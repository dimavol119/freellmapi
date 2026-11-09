# Agent guide

Shared instructions for every coding agent working in this repo. **Codex** reads this file directly;
**Claude Code** reads it through `CLAUDE.md`. Keep project rules here, in one place, so both agents
work from the same rules. Human contributor rules live in [CONTRIBUTING.md](CONTRIBUTING.md) and
apply to agents too.

## Project

FreeLLMAPI: one OpenAI-compatible `/v1` endpoint in front of many free LLM provider tiers.
npm workspaces: `shared/`, `server/` (API + router, vitest), `client/` (dashboard), `cli/`.
`desktop/` is a separate Electron package.

```bash
npm install
npm run dev              # server :3001, dashboard :5173
npm run db:migration:up  # local database
npm test                 # all suites - keep green
npm run lint             # server + cli
npm run build
```

Client translations: run `npm run check:i18n` from `client/` when you touch UI strings.

## Rules for both agents

- Small, focused diffs. Every behaviour change ships with a test that actually exercises it.
- Run `npm test` (and `npm run lint` for server/cli changes) before saying a change is done. Report
  failures honestly with the output; never skip, disable or weaken a test to get green.
- Never invent provider limits, model names or pricing - cite the provider's docs in the PR.
- Never commit secrets, API keys or `.env` files.
- Do not rewrite history on a branch another agent or person is working on.

## How Claude and Codex work together

Claude Code is the **driver**; Codex (via OpenAI's `codex` plugin for Claude Code) is
the **second pair of eyes** and the **extra hands**. One agent edits a given file at a time.

1. **Plan** - Claude writes the plan. For risky changes (router, key storage/encryption,
   migrations, rate-limit accounting) run `/codex:adversarial-review` on the plan or the first draft
   before going further.
2. **Build** - Claude implements and runs the tests.
3. **Review** - before every commit that changes code, run `/codex:review` (use `--base main` for a
   whole branch). Fix what it finds, or say in the commit/PR why a finding was not applied.
4. **Delegate** - a self-contained side task (a failing test in another workspace, a refactor in a
   file Claude is not touching) can go to Codex with `/codex:rescue --background`. Check it with
   `/codex:status`, pull it in with `/codex:result`, and review its diff before committing it.
5. **Hand off** - when switching agent mid-task, leave the state in the branch (commit WIP) and a
   short note: what is done, what is next, what is unverified.

When the two agents disagree, neither silently wins: list both positions for the human and let them
decide.

### One-time setup (per machine)

In Claude Code:

```bash
/plugin marketplace add openai/codex-plugin-cc
/plugin install codex@openai-codex
/reload-plugins
```

Then:

```bash
/codex:setup       # installs the Codex CLI if missing
!codex login       # ChatGPT account (Free works) or OpenAI API key
```

Optional, and only when you are watching the session: `/codex:setup --enable-review-gate` makes
Codex review every Claude reply before it finishes. It can loop and burn usage limits quickly.
