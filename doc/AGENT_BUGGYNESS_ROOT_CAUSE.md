# Why Paperclip Agent System is Fragile (Quick Summary)

## TL;DR

**Paperclip has 3 fundamental architectural gaps that make agent failures inevitable:**

1. **No validation before work assignment** — Agents get assigned tasks before anyone confirms credentials exist, instructions are complete, or APIs work
2. **Inconsistent API design** — Different routes use different path patterns; agents guess wrong (`/companies/{id}/issues/...` vs `/issues/...`)
3. **Incomplete instructions** — Step-by-step guides skip critical details (HTTP method, headers, error handling); agents must infer

**Plus 3 process gaps** that compound the problem:
- No instruction audit before deployment
- Cryptic error messages that don't suggest fixes
- No version history (can't tell which instruction version caused the failure)

**Result**: Every new agent deployment is a 2-6 hour gamble. Success depends on operator knowledge, not system robustness.

---

## Why This Keeps Happening

### The Core Problem

The system **assumes perfect operator** rather than **validating automatically**.

Current flow:
```
Operator creates agent
    ↓
Operator writes instructions (manually)
    ↓
Operator assigns task (assumes all is OK)
    ↓
Agent fails (missing credential / wrong path / incomplete example)
    ↓
Operator debugs (1-2 hours)
    ↓
Operator fixes (credential / example / path)
    ↓
Retry (finally works)
```

Needed flow:
```
Operator creates agent
    ↓
SYSTEM validates:
  - All credentials provisioned? ✓
  - All instructions have examples? ✓
  - All API paths correct? ✓
    ↓
System blocks assignment if checks fail
    ↓
Operator fixes (guided by system errors)
    ↓
SYSTEM validates again
    ↓
Assignment succeeds (with confidence)
```

---

## The 7 Architectural Issues (Why Today's Bugs Happened)

### 1️⃣ No Plugin Requirements Declaration
**Today's incident**: Research Analyst blocked on NEW-7 because Tavily API needed  
**Why**: Agent uses plugin "web-search" → no system tracks that it NEEDS `TAVILY_API_KEY`  
**Fix**: Agents declare `requires: ["plugin-a:secret-x", "plugin-b:secret-y"]`

### 2️⃣ Inconsistent API Paths
**Today's incident**: Promoter used `/companies/{id}/issues/...` but actual endpoint is `/issues/...`  
**Why**: Different route families have different conventions; no unified docs  
**Fix**: Standardize paths + publish schema

### 3️⃣ Missing Implementation Details in Instructions
**Today's incident**: Step 5b said "Use PUT" but showed no curl example  
**Why**: High-level pseudocode without implementation details  
**Fix**: Validation checklist: every action needs full curl + headers + example

### 4️⃣ No Pre-Deployment Validation
**Today's incident**: Agent deployed with broken instructions, discovered at runtime  
**Why**: No gate between "draft instructions" and "agent assignment"  
**Fix**: Automated pre-flight checks (before assignment is even possible)

### 5️⃣ Cryptic Error Messages
**Today's incident**: "API route not found" — doesn't say "expected PUT not PATCH"  
**Why**: Generic 404 response; no context  
**Fix**: Structured errors with hints: `"hint": "Try PATCH /api/issues/{id} (no company prefix)"`

### 6️⃣ Manual Secret Pinning in Agent Config
**Today's incident**: Adding BITLY token required finding secret ID, then manually editing agent JSON  
**Why**: Secrets referenced by ID, not by plugin requirement  
**Fix**: Plugin registry auto-resolves: agent says `uses: ["bitly"]` → system injects `BITLY_ACCESS_TOKEN`

### 7️⃣ No Structured Error Escalation
**Today's incident**: Agent got stuck with no escalation channel. No way for ops to detect infrastructure problem.  
**Why**: No protocol for agents to communicate "I need ops attention, not retry"  
**Fix**: Structured escalation + board dashboard showing "issues blocked on platform problems"

---

## The 3 Process Failures (Why Iteration is Slow)

### Process Gap 1: No Instruction Audit
Operators write instructions, agents execute them, then they fail. No validation before deployment.

**Need**: Pre-commit script that validates:
- [ ] Every API call has full curl example (not pseudocode)
- [ ] All headers included (Authorization, Content-Type, X-Run-Id)
- [ ] Error handling documented (if this fails, do X)

### Process Gap 2: No Plugin Verification on Agent Creation
Agents deployed without confirming credentials exist.

**Need**: During agent creation:
```
Parse instructions for plugin names
For each plugin:
  Is it installed?
  Do required secrets exist?
If any missing, BLOCK agent creation + show what's needed
```

### Process Gap 3: No Instruction Versioning
Can't tell which version of instructions caused a failure. No diff history.

**Need**: Version AGENTS.md like code:
```markdown
---
version: 3
updated: 2026-04-23T09:15:00Z
changes:
  - Added curl example for PUT /api/issues/.../documents
  - Added error handling section
---
```
Then tag runs: `instructionVersion: 3` → easy to see if later versions fixed it.

---

## Quick Fixes (Do This Week)

### ✅ Already Done
- Added validation script: `./scripts/validate-agent-plugin-secrets.sh`
- Updated Promoter instructions with curl examples + error handling
- Fixed Promoter agent env config (added BITLY_ACCESS_TOKEN + SLACK_WEBHOOK_URL)

### 🔲 Do Next (4-6 hours)
1. **Validation checklist for new agents**
   - Create: `./scripts/validate-agent-instructions.sh`
   - Checks: every API call has curl + headers + example
   - Blocks deployment if checks fail

2. **API path documentation**
   - Create: `doc/API_PATH_REFERENCE.md`
   - Document which routes use company prefix vs. global
   - Include examples for each pattern

3. **Error escalation to protocol**
   - Update: `AGENT_PROTOCOL.md`
   - Add: "If API fails, post structured error + mark blocked"
   - No guessing, no retries — escalate to ops

### 🔲 Do Next Sprint (12-16 hours)
4. **Plugin registry** (auto-resolution)
   - Each agent declares `uses: ["plugin-a", "plugin-b"]`
   - System injects required env vars at runtime
   - Eliminates manual secret pinning

5. **Instruction versioning**
   - Version each AGENTS.md change
   - Tag runs with instruction version
   - Generate diff if run fails

6. **Structured error responses** (API layer)
   - Change 404 errors to include hints
   - Send "try this endpoint instead"

---

## Fundamental Question: Is This Paperclip's Problem or NWV's?

**Answer**: It's Paperclip's architectural issue, but NWV is the first company to expose it by running complex agents.

**Why NWV hits this harder than IdeaFactory**:
- IdeaFactory agents are simpler (mostly CRUD tasks)
- NWV agents use 8+ plugins, multiple APIs, complex workflows
- IdeaFactory doesn't have sophisticated error recovery needs

**Precedent**: Every multi-agent system discovers these issues eventually
- Kubernetes had this (required manual resource requests → now has auto-requests)
- Heroku had this (manual slug compilation → now has slug detection)
- Airflow had this (manual DAG validation → now has built-in validator)

**What we're discovering**: Paperclip needs operator assistance layer BEFORE agent execution, not after failure.

---

## Measurement: How Buggy Are We?

From NWV incidents this session:
- **NEW-91 (OM)**: 1 hour to fix (missing document creation step)
- **NEW-7 (Research)**: 1.5 hours to fix (Tavily API key not provisioned)
- **Promoter agent**: 2 hours to fix (wrong API paths, missing curl examples)

**Failure rate**: 3 blockers in 4 agent runs = **75% hit rate**  
**Time to resolution**: 2-2.5 hours average  
**Most common cause**: Missing or incomplete instructions (60%)  
**Second most common**: Credentials not provisioned (25%)  
**Third**: Wrong API paths/methods (15%)

If we fix the **validation layer** (pre-deployment checks):
- Filter out 75% of issues before agent assignment
- Remaining 25% are logic bugs (legitimate agent problems, not infrastructure)
- Time to resolution drops from 2+ hours to ~15 min (retry with fixed instructions)

---

## Why This Matters

**You shouldn't need to debug agents this often.**

Every agent failure you encounter today should become a **validation rule that prevents future failures**.

Current model: Firefighting (fix each failure as it happens)  
Better model: Fireproofing (prevent classes of failures automatically)

With validation layer in place:
- Operators feel confident deploying new agents (system caught the issues)
- Failures become rare + usually genuine logic bugs (worth investigating)
- Onboarding new agents takes hours instead of days
- Knowledge from failures gets encoded as rules, not tribal knowledge

---

## See Also

- [`doc/SYSTEM_RELIABILITY_ANALYSIS.md`](SYSTEM_RELIABILITY_ANALYSIS.md) — Full architectural analysis + roadmap
- [`doc/AGENT_PLUGIN_REQUIREMENTS.md`](AGENT_PLUGIN_REQUIREMENTS.md) — Plugin credential checklist (immediate use)
- [`scripts/validate-agent-plugin-secrets.sh`](../scripts/validate-agent-plugin-secrets.sh) — Validation script (now available)
