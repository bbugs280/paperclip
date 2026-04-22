# Core Paperclip Todo

**Focus:** Core platform development, infrastructure, releases, and cross-company concerns.

---

## Active Issues

- [ ] **AGENTS.md edit issue on UI** - Agents cannot edit AGENTS.md through UI, but file is fine in backend. Need to investigate why editing is blocked specifically for this file.

---

## Urgent (Priority 1)

### Definition of Done Enforcement (Cross-Company) — 2026-04-19 Implementation

**Status**: ✅ Completed. Prevention mechanisms implemented in all agent instructions + AGENT_PROTOCOL.md.

**What**: Identified systemic quality failure in Paw Mind MVP (IDE-115): 7 out of 8 completed sub-tasks marked done without proper deliverables. Implemented 4-layer prevention.

**Implemented**:
- ✅ AGENT_PROTOCOL.md: Added Definition of Done section + anti-patterns + verification procedures
- ✅ Marketer instructions: DoD verification + artifact linking requirement
- ✅ Build Monitor instructions: Artifact verification + monitoring distinction
- ✅ PM instructions: Audit checklist before epic closure
- ✅ Audit reference doc: `docs/issue-completion-audit-fixes-2026-04-19.md`

**Next Phase**:
- [ ] Expand DoD enforcement to other companies (FUN, NWV) — apply same pattern to agent instructions
- [ ] Apply audit pattern to all future epics (starting 2026-04-21)

---

## Planned (Priority 2)

- [ ] 

---

## Backlog

- [ ] 

---

## Completed

- [x] **Definition of Done Enforcement Implementation** (2026-04-19)
  - Root cause analysis: No DoD in agent instructions
  - 4-layer prevention implemented (agent, protocol, PM audit, human-required pattern)
  - Company-specific task tracking moved to todo-ideafactory.md
  - Reference doc created for audit procedures

---

## Notes

- **Paw Mind MVP tasks**: See [todo-ideafactory.md](todo-ideafactory.md) for company-specific tracking
- **Prevention Strategy**: 4-layer enforcement (agent DoD, PM audit gate, protocol rules, human-required pattern)
- **Reference**: `docs/issue-completion-audit-fixes-2026-04-19.md` for full remediation details
- **Pattern**: All future epics should follow same DoD audit procedure before closure
