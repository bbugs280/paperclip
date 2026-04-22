# IdeaFactory Company Todo

**Focus:** IdeaFactory agent company — innovation workflows, idea management, and collaboration tools.

---

## GitHub Token Provisioning (IDE-159) — In Progress

**Issue**: IDE-159 "Provide GitHub repo read access for Build Monitor"

**Status**: Awaiting user action (fine-grained PAT creation)

**What's needed**:
1. ✅ Step-by-step guide created: [GITHUB_TOKEN_SETUP.md](doc/GITHUB_TOKEN_SETUP.md)
2. ✅ Instructions posted to IDE-159 with exact commands
3. ⏳ User creates fine-grained PAT on GitHub.com (Option A)
4. ⏳ User stores token as GITHUB_TOKEN environment secret in Paperclip
5. ⏳ User posts two confirmations: "Secret revoked" + "GITHUB_TOKEN set"
6. ⏳ IDE-159 status updated to todo
7. ⏳ Build Monitor can then retry IDE-158 GitHub scan

**Blocked by**: Awaiting completion of token creation (user action required)

---

## Build Monitor GitHub Integration Fix (2026-04-21)

**Issue**: IDE-158 "Daily Build Report" failed with `adapter_failed: description parameter undefined`

**Root Cause**: Build Monitor instructions didn't require `description` field in bash tool invocations

**Fix Applied**:
- ✅ Updated Build Monitor instructions with bash tool template including `description` field
- ✅ Added CRITICAL rule about description requirement
- ✅ Provided concrete examples for gh CLI queries
- ✅ IDE-158 reopened (status: todo) for retry on next heartbeat

**Prevention**: All agent instructions now show bash tool format with required `description` parameter

---

## Paw Mind MVP (IDE-115) — Quality Remediation

**Status**: Audit completed 2026-04-19. 7/8 sub-tasks had deliverable issues. Implementing Definition of Done enforcement.

| Issue | Type | Status | Owner | Notes |
|-------|------|--------|-------|-------|
| IDE-127 | Deliverable | `blocked` 🔴 | Marketer | Spec sheet instead of assets. Reopened 2026-04-19. Follow-up IDE-137 created. |
| IDE-137 | Execution | `backlog` ⏳ | (ready for assignment) | Execute screenshot & video capture of Paw Mind. Depends on IDE-126 TestFlight. |
| IDE-120 | Quality | `done` (unverified) ❓ | Build Monitor | Demand comment: needs deliverable description + links. 1 heartbeat to respond. |
| IDE-121 | Quality | `done` (unverified) ❓ | Marketer | Demand comment: needs marketing plan + timeline + messaging links. 1 heartbeat to respond. |

**Prevention Rules Now Enforced**:
- ✅ Marketer: DoD verification + artifact link requirement
- ✅ Build Monitor: Artifact vs scan report distinction
- ✅ PM: Audit checklist before epic closure
- ✅ AGENT_PROTOCOL.md: Definition of Done + anti-patterns documented

**Next Actions**:
- [ ] Monitor IDE-120 & IDE-121 responses (demand deliverable evidence)
- [ ] Assign IDE-137 to user once TestFlight artifact available
- [ ] Verify agents follow new DoD rules in next sprint

---

## Urgent (Priority 1)

- [x] Paw Mind MVP Quality Audit (completed, see table above)

---

## Planned (Priority 2)

- [ ] 

---

## Backlog

- [ ] 

---

## Completed

- [x] Paw Mind MVP Deliverable Audit (2026-04-19) — Identified 7/8 sub-tasks with issues, implemented prevention

---

## Notes

- **Reference**: `docs/issue-completion-audit-fixes-2026-04-19.md` (full audit + prevention details)
- **Epic**: IDE-115 (8 sub-tasks total)
- **Audit Pattern**: Apply same DoD enforcement to future epics
