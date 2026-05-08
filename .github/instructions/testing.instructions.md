---
applyTo: "**/*.ts,**/*.tsx,**/*.js,**/*.jsx"
---

# Testing & Regression Requirements

These rules apply to every code change in `server/`, `packages/*`, `cli/`, and `ui/`.

## Change Ordering Before Writing Tests

Follow the project's layer order — do not write tests for a company-layer fix until the underlying system-layer fix is in place:

1. **System-wide** (`packages/`, `server/`) — fix and test first
2. **Company-scoped** — fix and test second
3. **Agent-specific** — test last

## Every Change Requires

### 1. New tests for new behaviour

Colocate tests next to the implementation:

```
src/feature.ts         ← implementation
src/feature.test.ts    ← tests
```

For `cli/`, place tests in `src/__tests__/`.

### 2. Regression check

Before marking any task done, confirm the **existing** test suite is still green:

```bash
pnpm test:run
```

All pre-existing tests must pass. A change that breaks unrelated tests is **not done**.

### 3. Full verification before hand-off

```bash
pnpm -r typecheck   # type errors across all packages
pnpm test:run       # full test suite
pnpm build          # production build
```

If any step cannot be run, report it explicitly — do not silently skip.

## What to test

| Change type | What to cover |
|-------------|---------------|
| New API endpoint | Happy path + auth/permission rejection + 404/409 edge cases |
| Schema change | Migration applies cleanly; existing queries still pass |
| Shared type change | All consumers compile; no silent breakage |
| Bug fix | Regression test that would have caught the original bug |
| Agent adapter change | Adapter contract still satisfied; integration smoke |

## Definition of Done (testing gate)

A change is **not done** until:
- [ ] New tests added for new behaviour
- [ ] `pnpm test:run` exits 0
- [ ] `pnpm -r typecheck` exits 0
- [ ] `pnpm build` exits 0
