---
applyTo: "todo-*.md"
---

# Task Tracking

## Which file?

| File | Use for |
|------|---------|
| `todo-core.md` | Platform-wide work, infrastructure, releases |
| `todo-[company].md` | Company-specific tasks (e.g. `todo-fundstarter.md`, `todo-nwv.md`) |
| `todo-openclaw.md` | Gateway-specific work |

**Rule:** if a company-layer task reveals a platform bug, file the platform fix in `todo-core.md` first. Do not patch it inside the company todo.

## Format

```markdown
- [ ] Task description
- [x] Completed task
```

## Layer order for new tasks

When adding a batch of related tasks, order them:
1. System-wide tasks first (highest priority)
2. Company-scoped tasks second
3. Agent-specific tasks last

## Useful commands

```bash
# All pending tasks across every company
grep -h "^\- \[ \]" todo-*.md | sort

# Pending tasks for one company
grep "^\- \[ \]" todo-fundstarter.md
```
