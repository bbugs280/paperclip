---
applyTo: "**/*.md,doc/**"
---

# Doc Rules

## Directory purposes

| Path | Purpose |
|------|---------|
| `doc/` | Hand-authored, reviewable docs. Tracked in git. |
| `docs/` | Generated site output. Do not edit directly. |
| `doc/generated/` | AI-produced or exported drafts. Git-ignored. |

## AI-generated content

All Markdown files produced or substantially authored by AI **must** go in `doc/generated/`. Do not commit them to `doc/` directly.

## Moving a file into `doc/generated/`

```bash
mkdir -p doc/generated/<subdir>

# If tracked:
cp doc/File.md doc/generated/<subdir>/File.md
git rm --cached doc/File.md

# If untracked:
mv doc/File.md doc/generated/<subdir>/

# Ensure the folder is ignored:
grep -qxF 'doc/generated/' .gitignore || echo 'doc/generated/' >> .gitignore
git add .gitignore
git commit -m "chore(docs): move generated docs to doc/generated"
```

## Plan files

New plan documents belong in `doc/plans/` using `YYYY-MM-DD-slug.md` filenames.  
Do not create ad-hoc markdown files at the repo root.

## No service pause required

Doc-only changes (`doc/`, `docs/`, `*.md`) do not require `./paperclip-service.sh pause`.
