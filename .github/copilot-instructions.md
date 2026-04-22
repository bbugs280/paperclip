# Paperclip Development Workflow

## Service Management for Active Development

**When making code changes via AI Copilot:**

1. **Before making server changes**, pause the launchd service:
   ```bash
   ./paperclip-service.sh pause
   ```

2. **After completing changes**, restart the dev server:
   ```bash
   cd /Users/home/paperclip && pnpm dev
   ```

3. **Before going idle** (stopping active development), re-enable autostart:
   ```bash
   ./paperclip-service.sh resume
   ```

## Why?

- The launchd service auto-restarts Paperclip on port 3100
- When you modify code, the dev server HMR triggers restarts
- Two restart sources cause port conflicts and unstable service

## Copilot Protocol

When modifying any file in `server/` or `packages/`, always:
1. Inform the user to run: `./paperclip-service.sh pause`
2. Make the changes
3. Remind the user to either restart dev server manually OR run: `./paperclip-service.sh resume`

## Key directories requiring service pause:
- `server/`
- `packages/db/`
- `packages/shared/`
- `packages/adapters/`

## No pause needed for:
- `ui/` (separate Vite dev server)
- `doc/`, `cli/`, or configuration-only changes
- Non-code file modifications

## Task Tracking

When implementing changes or discovering pending work:

**Add tasks to the appropriate todo file:**
- `todo-core.md` — Platform-wide work, infrastructure, releases
- `todo-[company].md` — Company-specific tasks (e.g., `todo-fundstarter.md`, `todo-nwv.md`)
- `todo-openclaw.md` — Gateway-specific work

Use this format:
```markdown
- [ ] Task description
```

Mark complete when done:
```markdown
- [x] Task description
```

**Quick reference:**
```bash
# View all pending tasks (core + all companies)
grep -h "^\- \[ \]" todo-*.md | sort

# View pending tasks for a specific company
grep "^\- \[ \]" todo-fundstarter.md
```

## Helper Commands

```bash
./paperclip-service.sh pause    # Disable autostart for development
./paperclip-service.sh resume   # Enable autostart when done
./paperclip-service.sh status   # Check service status
```
