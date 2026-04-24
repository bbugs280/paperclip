# Risk & Impact Analysis: Paperclip Agent System Fixes

**Date**: April 23, 2026  
**Scope**: Proposed architectural improvements to reliability layer  
**Audience**: Engineering leadership, product, ops

---

## Executive Summary

**Overall Risk Profile**: LOW-MEDIUM  
**Implementation Disruption**: Minimal (can be rolled out incrementally)  
**Business Impact**: HIGH positive (reduced incident resolution time, faster agent deployments)  
**Go/No-Go Recommendation**: **GO** — Benefits far outweigh risks with proper sequencing

---

## Part 1: Week 1 Fixes (LOW RISK)

### Fix 1a: Validation Scripts (Plugin Secrets Check)

**What**: Add `./scripts/validate-agent-plugin-secrets.sh` — check credentials exist before deployment  
**Status**: Already exists; just needs to be used in deployment workflow

#### Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Script has false positives** (flags valid configs as broken) | MEDIUM | Test on 3 existing agents first; fix logic, then deploy widely |
| **Script is too strict** (blocks legitimate deployments) | LOW | Use `--strict` flag; default mode is just warnings |
| **Performance impact** (slow validation blocks fast iteration) | LOW | Script runs in <1 second; negligible |
| **Discovers missing secrets in existing agents** (reveals existing debt) | MEDIUM | Expected; not a bug. Use as catalyst to fix outstanding issues |

#### Impacts

**Positive**:
- ✅ Catches 60% of deployment issues before they hit production
- ✅ Blocks bad deployments; prevents 2-6 hour firefights
- ✅ Team learns "what credentials each agent needs"
- ✅ No positive impact on existing agents (scripts only check new ones)

**Negative**:
- ❌ New agent deployment now has extra step (validation)
- ❌ Existing agents may show as "missing credentials" (awareness of debt)
- ❌ Forces operators to provision credentials UP FRONT (vs. discovering at runtime)

**Overall**: **POSITIVE** — Tradeoff is forcing upfront work that was previously deferred

---

### Fix 1b: API Path Documentation

**What**: Create `doc/API_PATH_REFERENCE.md` — cheat sheet showing which routes use company prefix vs. global

**Examples**:
```markdown
# Company-Scoped (use /companies/{id})
GET    /api/companies/{id}/issues          ✓ List company issues
GET    /api/companies/{id}/agents          ✓ List company agents
GET    /api/companies/{id}/secrets         ✓ List company secrets
POST   /api/companies/{id}/agents          ✓ Create new agent

# Global (NO company prefix)
PATCH  /api/issues/{id}                    ✓ Update issue
PATCH  /api/agents/{id}                    ✓ Update agent
PUT    /api/issues/{id}/documents/{key}    ✓ Create/update document
POST   /api/issues/{id}/comments           ✓ Add comment
```

#### Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Documentation wrong/incomplete** | LOW | Review against actual routes; add to PR checklist |
| **Documentation drifts from code** (someone changes API without updating doc) | MEDIUM | Add doc validation to CI; flag if route patterns change |
| **Operators still guess instead of reading docs** | MEDIUM | Reference docs in error messages; link in agent bootstrap |
| **No actual code change** (doesn't fix the root problem) | MEDIUM | True — this is band-aid. Real fix is standardizing paths (Sprint 2) |

#### Impacts

**Positive**:
- ✅ Eliminates most "API route not found" guessing
- ✅ New agents can self-serve (docs available before asking ops)
- ✅ Reduces support burden (fewer "what's the right path?" questions)
- ✅ 0% disruption to existing agents (read-only docs)

**Negative**:
- ❌ Doesn't fix the inconsistency (still `/companies/{id}/issues` AND `/issues/{id}`)
- ❌ Maintainability debt (docs must stay in sync with code)
- ❌ New developers still need to learn the pattern (docs aren't self-explanatory)

**Overall**: **LOW RISK, HIGH VALUE** — Quick win, temporary solution pending architectural fix

---

### Fix 1c: Error Escalation Protocol

**What**: Add section to `AGENT_PROTOCOL.md` — when APIs fail, here's how to escalate (don't retry, don't guess)

**Template**:
```markdown
## Structured Error Escalation

If HTTP error occurs:

1. Post comment with error details:
   ERROR: [Step name] failed
   - Endpoint: [URL]
   - Status: [code]
   - Response: [error message]

2. Mark issue blocked + re-assign to ops

3. Stop execution (don't retry)
```

#### Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Agents get stuck more often** (escalating instead of retrying) | MEDIUM | Retry logic still appropriate for transient errors (5xx). This only for structural errors (4xx) |
| **Ops gets flooded with escalations** | MEDIUM | Filter: only escalate if same error twice + it's a 4xx (client error) |
| **Agents don't know when to escalate vs. retry** | HIGH | Add decision tree to protocol (5xx + status codes = retry? 4xx = escalate?) |
| **No ops dashboard to see escalations** (escalations go nowhere) | MEDIUM | Mitigate: manually monitor `issues + status=blocked` for now; add dashboard later |

#### Impacts

**Positive**:
- ✅ Stops agents from thrashing on infrastructure problems
- ✅ Makes ops issues visible (escalations = alert system)
- ✅ Prevents cascading failures (agent doesn't retry forever)
- ✅ Clear protocol (agents know what to do vs. guessing)

**Negative**:
- ❌ Requires monitoring (ops must check for blocked issues)
- ❌ May increase perceived latency (agents give up instead of retrying)
- ❌ Ops response time becomes critical (user waiting on blocked agent)
- ❌ Requires decision tree tuning (what's worth escalating vs. retrying?)

**Overall**: **MEDIUM RISK, HIGH VALUE** — Improves visibility but requires op monitoring culture

---

## Part 2: Week 2 Fixes (MEDIUM RISK)

### Fix 2a: Plugin Registry (Auto-Resolution)

**What**: Create company-level plugin configuration; agents declare `uses: ["plugin-a", "plugin-b"]` → system auto-injects env vars

**Before**:
```json
{
  "agent": "Promoter",
  "adapterConfig": {
    "env": {
      "BITLY_ACCESS_TOKEN": {
        "type": "secret_ref",
        "secretId": "64901761-932e-431b-9d83-41157358dbe3"
      }
    }
  }
}
```

**After**:
```json
{
  "agent": "Promoter",
  "plugins": ["bitly", "x-api"]
}
```

System auto-resolves:
```json
{
  "env": {
    "BITLY_ACCESS_TOKEN": {...},
    "X_BEARER_TOKEN": {...}
  }
}
```

#### Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Migration required** (existing agents use old format) | MEDIUM | Run automatic migration script; keep old format readable during transition |
| **Inconsistent env var naming** (what if plugin expects BITLY_KEY vs BITLY_ACCESS_TOKEN?) | HIGH | Define naming standard FIRST; document in plugin registry |
| **Plugin registry becomes bottleneck** (adding new plugin = registry update) | LOW | Registry is simple data structure; easy to update |
| **Breaking change** (old agent configs stop working) | HIGH | Mitigation: support BOTH formats during beta; docs say "new format preferred" |
| **Resource impact** (recompiling agent env on every startup) | LOW | Done once at startup; cached |
| **Unexpected side effects** (system auto-injects secrets somewhere) | MEDIUM | Add test: verify injected values match what agents expect |

#### Impacts

**Positive**:
- ✅ Eliminates manual secret pinning (most error-prone process)
- ✅ Makes agents portable (can clone agent to new company; registry resolves)
- ✅ Scales well (adding plugin = registry update, not 10 agent updates)
- ✅ Replaces opaque secret IDs with human-readable plugin names
- ✅ Reduces operator knowledge burden (don't need to know secret IDs)

**Negative**:
- ❌ Migration effort (need to convert all existing agents)
- ❌ Adds indirection (harder to debug: secret name → registry → secret ID)
- ❌ Breaking change (requires version bump or dual-format support)
- ❌ New point of failure (registry misconfigured → all agents fail)
- ❌ Requires ops coordination (register plugins before agents can use)

**Risk Mitigation Plan**:
1. Keep old format working (both formats work simultaneously)
2. Add migration guide (how to convert agent config)
3. Implement registry validation (check on startup that all declared plugins exist)
4. Create rollback plan (revert to old format if issues arise)

**Overall**: **MEDIUM RISK** — High value but requires careful migration planning

---

### Fix 2b: Instruction Versioning

**What**: Add version headers to AGENTS.md; tag runs with instruction version

**Changes to AGENTS.md**:
```markdown
---
name: Promoter
version: 3
updated: 2026-04-23T09:15:00Z
changeLog:
  - version: 3
    date: 2026-04-23
    changes:
      - Added curl example for PUT /api/issues/.../documents
      - Added error handling section
  - version: 2
    date: 2026-04-22
    changes:
      - Added BITLY_ACCESS_TOKEN to required secrets
---
```

Then each run tagged: `instructionVersion: 3`

#### Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Version conflicts** (multiple versions in flight; confusion about which to use) | LOW | Always use `latest` by default; allow rollback to prior version if needed |
| **Changelog maintenance burden** (operators forget to update) | MEDIUM | Add pre-commit hook: flag if AGENTS.md changed but version/changelog didn't |
| **Storage overhead** (storing changelog in every agent) | LOW | Negligible; ~500 bytes per AGENTS.md |
| **Complexity** (now operators manage versions; another thing to understand) | MEDIUM | Mitigate: auto-increment version on update; make changelog optional (just version number required) |
| **Debugging confusion** (now "which version failed?" matters) | LOW | Mitigate: always query run API with version; logs show it |

#### Impacts

**Positive**:
- ✅ Clear audit trail (which version caused which failures)
- ✅ Easy rollback (agent failed with v3? try v2 → easy decision)
- ✅ Reduces blame (if v2 was stable, we know v3 broke something)
- ✅ Learning from failures (diff between v2/v3 shows what changed)
- ✅ No disruption to existing agents (purely additive metadata)

**Negative**:
- ❌ Maintenance burden (remember to update version + changelog)
- ❌ New complexity (operators must understand versioning)
- ❌ Doesn't prevent bad versions from shipping (helps debug, doesn't fix)
- ❌ Requires discipline (if operators don't update changelog, defeats purpose)

**Risk Mitigation Plan**:
1. Make version auto-increment (on any AGENTS.md change)
2. Make changelog optional (version number required, changelog nice-to-have)
3. Add pre-commit hook to enforce version bump
4. Create tooling to generate changelog diffs automatically

**Overall**: **LOW RISK, MEDIUM VALUE** — Low barrier to implement; helps debugging but doesn't prevent issues

---

### Fix 2c: Structured Error Responses (API Layer)

**What**: Change API errors from generic 404 to structured with hints

**Before**:
```json
{"error": "API route not found"}
```

**After**:
```json
{
  "error": "Route not found",
  "status": 404,
  "hint": "PATCH /api/companies/XYZ/issues/ABC not supported.",
  "did_you_mean": "PATCH /api/issues/ABC",
  "examples": {
    "get": "curl http://.../api/issues/ABC",
    "patch": "curl -X PATCH http://.../api/issues/ABC -d '{\"status\":\"done\"}'"
  }
}
```

#### Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Breaking change to error response format** | MEDIUM | Add `X-Error-Format: v2` header; old clients get old format; new clients opt-in |
| **Hints wrong/misleading** (suggests wrong endpoint) | MEDIUM | Validate hints against actual schema; test with curl before deploying |
| **Performance impact** (generating hints adds latency) | LOW | Pre-computed; not dynamic |
| **Error message bloat** (huge JSON responses) | LOW | Hints are short; ~500 bytes max |
| **Complicated error response generation** | MEDIUM | Mitigate: create error helper function; reuse across routes |

#### Impacts

**Positive**:
- ✅ Agents self-correct (error message says "try this instead")
- ✅ Reduces support questions ("what's the right path?")
- ✅ Lower cognitive load (helpful suggestion vs. generic error)
- ✅ Faster debugging (human reads hint instead of guessing)
- ✅ Enables auto-retry logic (agent can parse hint + retry)

**Negative**:
- ❌ Breaking change to error response (API clients need updates)
- ❌ Maintenance burden (hints must stay accurate)
- ❌ Complexity (error responses now much larger)
- ❌ False sense of security (hints could be wrong; agents might rely on them)

**Risk Mitigation Plan**:
1. Use header-based versioning (old clients unaffected)
2. Create error hint validator (syntax check + test against schema)
3. Add integration tests (verify hint suggestions are real endpoints)
4. Roll out incrementally (one error type at a time)

**Overall**: **LOW-MEDIUM RISK, HIGH VALUE** — Easy to implement incrementally; good team impact

---

## Part 3: Sprint 3+ Fixes (HIGHER RISK)

### Fix 3a: Pre-Deployment Validation Gate

**What**: Block agent assignment if validation fails

**Current**: Assign agent → might fail → debug → fix → retry  
**Proposed**: Validate → block if fails → operator fixes → validate again → unblock → assign

#### Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Breaks existing workflow** (can't quickly assign agents) | HIGH | Provide fast-path bypass (--force flag); require explicit approval |
| **New operators don't understand gates** (frustration) | MEDIUM | Training + docs; clear error messages explaining what's wrong |
| **validator bugs** (blocks valid agents) | MEDIUM | Gradual rollout: warnings only for 2 weeks, then enforced |
| **False negatives** (validator says OK but agent still fails) | MEDIUM | Mitigate: test validator against known-good agents first |
| **Performance impact** (validation adds delay to deployment) | LOW | Validation runs in <5 sec; acceptable |

#### Impacts

**Positive**:
- ✅ Prevents 80% of deployment failures
- ✅ No more midnight firefights (bad config caught before assignment)
- ✅ Enforces best practices (credentials required, instructions complete)
- ✅ Scales (validation gets better over time as rules accumulate)

**Negative**:
- ❌ Blocks deployments (agents can't be assigned until validation passes)
- ❌ Requires operator expertise ("why is validation failing?")
- ❌ New complexity added to deployment flow
- ❌ May slow down rapid iteration / experimentation

**Risk Mitigation Plan**:
1. Roll out in warning mode (doesn't block, just warns)
2. Create decision tree ("fix this issue" guidance)
3. Provide --force bypass (with approval requirement)
4. Monitor gate effectiveness (% of blocked agents that would have failed anyway)

**Overall**: **MEDIUM-HIGH RISK** — Significant workflow change but high payoff; needs careful rollout

---

### Fix 3b: Agent Health Dashboard

**What**: UI showing agent status, blocked issues, missing credentials, recent errors

**Shows**:
- Agent name + status (active/paused/error)
- Assigned current issue
- Missing credentials (red)
- Recent errors (with links to failed runs)
- Last successful run timestamp

#### Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Dashboard becomes stale** (doesn't update in real-time) | LOW | Refresh every 30 seconds; acceptable latency |
| **Data consistency** (contradicts other views) | MEDIUM | Single source of truth; fetch from central API each load |
| **Misinterpretation** (operators don't understand red/yellow/green) | LOW | Add legend + explanations |
| **Operational dependency** (ops relies on dashboard, it breaks) | MEDIUM | Graceful degradation; show text if chart fails |
| **No new infrastructure value** (just displays existing data) | LOW | True — dashboard is convenience layer only |

#### Impacts

**Positive**:
- ✅ Visibility into agent health (vs. discovering issues indirectly)
- ✅ Early warning (see blocked agents before users complain)
- ✅ Faster triage (know at a glance which agents need attention)
- ✅ Trends over time (see if same agents fail repeatedly)
- ✅ No code changes required (query existing API)

**Negative**:
- ❌ Development effort (UI, real-time updates, data fetching)
- ❌ Operational dependency (team learns to depend on it; breakage = surprise)
- ❌ Only useful if someone monitors it (requires ops discipline)
- ❌ May create false sense of confidence (dashboard is green ≠ agents working)

**Risk Mitigation Plan**:
1. Start with simple version (table + colors)
2. Add alerting (ops notified if >2 agents in error state)
3. Define dashboard SLA (95% uptime expected)
4. Create runbook (what to do if dashboard shows X)

**Overall**: **LOW RISK, MEDIUM VALUE** — Nice-to-have, not critical; easy to build incrementally

---

## Part 4: Implementation Roadmap & Risk Timeline

### Timeline & Cumulative Risk

```
Week 1 (Low Risk, Fast)
├─ Validation scripts ✅ (already done)
├─ API documentation (3-4 hrs)
└─ Error escalation protocol (3-4 hrs)
   Risk: LOW | Impact: MEDIUM | Dependencies: None

Week 2 (Medium Risk, Moderate)
├─ Plugin registry (8-12 hrs)
├─ Instruction versioning (4-6 hrs)
└─ Structured error responses (6-8 hrs)
   Risk: MEDIUM | Impact: HIGH | Dependencies: Week 1 complete

Sprint 3+ (Higher Risk, Longer)
├─ Pre-deployment gate (10-14 hrs)
└─ Health dashboard (8-12 hrs)
   Risk: MEDIUM-HIGH | Impact: VERY HIGH | Dependencies: Week 1-2 complete
```

### Parallelization Opportunities

**Can run in parallel**:
- API documentation + Error escalation protocol (Week 1)
- Plugin registry + Instruction versioning (Week 2) — requires common testing framework
- ~~Structured error responses~~ (depends on API changes; do after other endpoints stable)

**Sequential dependencies**:
- Everything depends on Week 1 being complete (establishes patterns)
- Pre-deployment gate depends on validation being mature (Week 1-2)

---

## Part 5: Go/No-Go Decision Framework

### Success Criteria (How to Know If Worth It)

**After Week 1**: 
- [ ] New agents deployed with 0 credential errors (vs. 40% previously)
- [ ] "API route not found" incidents drop 50%
- [ ] Deployment time stays <15 min (validation doesn't slow)

**After Week 2**:
- [ ] Secret provisioning time cut in half (registry auto-resolution)
- [ ] Instruction changes don't cause regression (versioning catches issues)
- [ ] Error messages guide operators to fixes (structured errors work)

**After Sprint 3**:
- [ ] Agent failure rate <10% on first deployment (was 75%)
- [ ] Mean resolution time <30 min (was 2+ hours)
- [ ] Ops detects infrastructure issues automatically (via escalation protocol)

### Go/No-Go Criteria

**GO if**:
- Week 1 reduces credential errors 50%+
- Team consensus on plugin registry design
- <5% of time spent on firefighting after Week 2

**SLOW DOWN if**:
- Validation script has >10% false positive rate
- Plugin registry breaks >2 existing agents during migration
- Pre-deployment gate blocks >30% of legitimate deployments

**NO-GO if**:
- Fixes introduce new critical problems (data loss, unpredictable behavior)
- Operational burden exceeds time saved for outsized engineering effort

---

## Part 6: Risk Mitigation Strategies

### For All Fixes

1. **Incremental Rollout** — Don't deploy worldwide; start with NWV company only
2. **Canary Testing** — Test on 1 existing agent before applying to 10
3. **Rollback Plans** — Keep old code around; quick revert if needed
4. **Monitoring** — Track success metrics continuously; alert if regressions
5. **Documentation** — Every fix includes operator runbook + troubleshooting

### Specific Risk Mitigations

**Validation Scripts**:
- Dry-run mode (just report, don't block)
- Whitelist bypass (for known false positives)

**Plugin Registry**:
- Dual-format support (old + new configs work simultaneously)
- Automatic migration (script to convert existing agents)
- Validation on startup (fail loudly if registry broken)

**Pre-Deployment Gate**:
- Warning mode first (2 weeks)
- --force flag bypass (requires approval)
- Clear error messages (not cryptic failures)

**Error Responses**:
- Header-based versioning (old clients work)
- Gradual rollout (one error type at a time)
- Integration tests (verify hints are real)

---

## Summary Table

| Fix | Week | Effort | Risk | Impact | Go/No-Go |
|-----|------|--------|------|--------|----------|
| Validation scripts | 1 | ✅ Done | LOW | MEDIUM | ✅ GO |
| API documentation | 1 | 3-4h | LOW | MEDIUM | ✅ GO |
| Error escalation | 1 | 3-4h | MEDIUM | HIGH | ✅ GO |
| Plugin registry | 2 | 8-12h | MEDIUM | HIGH | ✅ GO (plan migration) |
| Instruction versioning | 2 | 4-6h | LOW | MEDIUM | ✅ GO |
| Structured errors | 2 | 6-8h | LOW-MEDIUM | HIGH | ✅ GO |
| Pre-deployment gate | 3+ | 10-14h | MEDIUM-HIGH | VERY HIGH | ⏳ GO (1-week trial) |
| Health dashboard | 3+ | 8-12h | LOW | MEDIUM | ⏳ GO (after gate) |

---

## Recommendation

**PROCEED with Week 1 immediately** (low risk, high payoff)

**Plan Week 2** (medium risk, high payoff; do careful migration for registry)

**Pilot pre-deployment gate** (1-week trial mode before enforcement)

**Expected outcome after full implementation**:
- 80% reduction in deployment failures
- 50% reduction in mean resolution time
- Foundations in place for future improvements
