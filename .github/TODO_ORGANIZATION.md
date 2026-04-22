# Todo File Organization

This document describes the todo file structure for Paperclip development.

## Files

- **`todo-core.md`** — Core Paperclip platform work: infrastructure, releases, API changes, cross-company features
- **`todo-fundstarter.md`** — FundStarter AI company buildout: agent configuration, plugins, company-specific work
- **`todo-openclaw.md`** — OpenClaw gateway adapter: WhatsApp integration, messaging policy, gateway-specific issues
- **`todo-[company].md`** — Additional company-specific todos as new companies are added

## Template Structure

Each todo file should include:
- **Focus** — Brief description of what this todo file covers
- **Company ID** (if applicable) — UUID reference to the company in the database
- **Last updated** — Date and phase/status note
- **Main Sections** — Specific to the company's work (e.g., "Plugins" for FundStarter)
- **Priority Sections** — Standard: "Urgent (Priority 1)", "Planned (Priority 2)", "Backlog", "Completed"
- **Notes** — Context and decision tracking

## How to Add a New Company Todo

1. Create `todo-[company-slug].md` in the root of the repository
2. Follow the template structure above
3. Include the company ID (from `doc/SPEC-implementation.md` or the database)
4. Reference in this document

## Querying Company Todos

```bash
# List all company todos
ls -1 todo-*.md

# List only company-specific todos (exclude core)
ls -1 todo-*.md | grep -v "todo-core"

# Find active tasks across all todos
grep -h "^\- \[ \]" todo-*.md | sort

# Find completed tasks
grep -h "^\- \[x\]" todo-*.md
```
