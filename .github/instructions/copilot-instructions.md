# Paperclip Development Workflow

Scoped instruction files apply automatically by context — see `.github/instructions/` for details.

## Change Ordering Rule (always follow this sequence)

Before touching any code, decide which layer the fix belongs to, then work **top-down**:

1. **System-wide** (`packages/db/`, `packages/shared/`, `packages/adapters/`, `server/`)  
   Core platform bugs, schema changes, shared types, API surface changes.  
   These must land and pass CI before the layers below are touched.

2. **Company-scoped** (`todo-[company].md`, company config, company-specific routes/services)  
   Changes that apply to a single tenant / agent company.  
   Must not break other companies.

3. **Agent-specific** (adapter configs, individual agent prompts, `agent_api_keys`)  
   Configuration or behaviour changes for one agent.  
   Always the last layer — never work around a platform bug here.

> If a company or agent fix needs a system-wide change first, file it in `todo-core.md`, implement it at the platform layer, then revisit the company/agent layer.

## Service Management (server/packages changes)

Before touching `server/` or any `packages/` directory:
```bash
./paperclip-service.sh pause
```
After completing changes, restart dev server:
```bash
cd /Users/home/paperclip && pnpm dev
```
Before going idle, re-enable autostart:
```bash
./paperclip-service.sh resume
```

**No pause needed for:** `ui/`, `doc/`, `cli/`, or configuration-only changes.

Full details → [`.github/instructions/service-management.instructions.md`](.github/instructions/service-management.instructions.md)

## Testing & Regression

Every code change requires:
1. **New tests** for new behaviour (colocate: `src/feature.ts` → `src/feature.test.ts`)
2. **Regression check** — existing test suite must remain green after your change
3. **Run before any hand-off:**
   ```bash
   pnpm -r typecheck
   pnpm test:run
   pnpm build
   ```

Applies to: `server/`, `packages/*`, `cli/`, `ui/` (where test infrastructure exists).

Full details → [`.github/instructions/testing.instructions.md`](.github/instructions/testing.instructions.md)

## Task Tracking

Add discovered work to the correct todo file:
- `todo-core.md` — platform-wide, infrastructure, releases
- `todo-[company].md` — company-specific (e.g. `todo-fundstarter.md`, `todo-nwv.md`)
- `todo-openclaw.md` — gateway-specific

```bash
# View all pending tasks
grep -h "^\- \[ \]" todo-*.md | sort
```

Full details → [`.github/instructions/task-tracking.instructions.md`](.github/instructions/task-tracking.instructions.md)

## Doc Rules

- `doc/` — hand-authored, tracked in git
- `docs/` — generated site output, do not edit directly
- `doc/generated/` — AI-produced or exported drafts, git-ignored

Full details → [`.github/instructions/doc-rules.instructions.md`](.github/instructions/doc-rules.instructions.md)
