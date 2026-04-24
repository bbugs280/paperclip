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

## Doc rules (authoring vs generated)

- `doc/` is the authoritative source-of-truth for editable, reviewable documentation and templates. Keep hand-authored content here and track it in git.
- `docs/` is the published/site output (rendered site or website artifacts). Treat it as generated site content; do not edit `docs/` directly unless you are updating site assets intentionally.
- `doc/generated/` is for exported, auto-generated, or company-private drafts and one-off exports. Files placed here should be ignored by git (add `doc/generated/` to `.gitignore`) and kept local to your instance or in a private storage location.

When moving generated files out of `doc/` into `doc/generated/` use this pattern:

```bash
# create generated folder
mkdir -p doc/generated/<subdir>

# if file is tracked, copy then untrack
cp doc/SomeGenerated.md doc/generated/<subdir>/SomeGenerated.md
git rm --cached doc/SomeGenerated.md

# if file is untracked, move directly
mv doc/SomeGenerated.md doc/generated/<subdir>/

# ensure generated is ignored
grep -qxF 'doc/generated/' .gitignore || echo 'doc/generated/' >> .gitignore
git add .gitignore
git commit -m "chore(docs): move generated docs to doc/generated and ignore them"
```

Notes:
- Keep `doc/` small and author-focused; store ephemeral or company-private drafts in `doc/generated/` or outside the repo (e.g., private cloud storage).
- No service pause is required for `doc/` changes (see "No pause needed for:" in this file). If you modify `server/` or `packages/`, follow the pause/resume steps above.

## AI-generated Markdown rule

- All Markdown files ("*.md") produced or substantially authored by AI agents or automated exports MUST be placed under `doc/generated/` and should not be committed to the main authoring tree in `doc/`.
- If an AI produces or updates a draft in `doc/`, move it to `doc/generated/` (or copy+untrack) and follow the move pattern above. Treat `doc/generated/` as local/export-only storage.

```
