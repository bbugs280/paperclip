---
applyTo: "server/**,packages/**"
---

# Service Management

The launchd service auto-restarts Paperclip on port 3100. Editing code while it runs causes port conflicts.

## Protocol

**Before any edit to `server/` or `packages/`:**
```bash
./paperclip-service.sh pause
```

**After changes are complete:**
```bash
cd /Users/home/paperclip && pnpm dev
```

**Before going idle:**
```bash
./paperclip-service.sh resume
```

## Directories requiring pause

| Path | Reason |
|------|--------|
| `server/` | Express API — restarts on change |
| `packages/db/` | Schema / migration changes |
| `packages/shared/` | Shared types and constants |
| `packages/adapters/` | Adapter implementations |

## No pause needed

- `ui/` — served by a separate Vite process
- `doc/`, `cli/`, config-only, non-code files

## Status check

```bash
./paperclip-service.sh status
```
