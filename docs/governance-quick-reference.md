# Governance Quick Reference Card

**Print/bookmark for daily use**

---

## Q: What is Definition of DONE?

**Answer:** Every task must have:
1. ✅ **Deliverable exists** (not just spec/plan)
2. ✅ **Evidence posted** as comment (links or content)
3. ✅ **Deliverable matches task intent** (not reports instead of work)
4. ✅ **No red flags** (single-word comments, specs, etc.)

**Source:** [AGENT_PROTOCOL.md#definition-of-done](../AGENT_PROTOCOL.md#definition-of-done-dod)

---

## Q: When issue is completed, how to notify HUMAN?

### By Company

| Company | Notification Method | Who Posts | When | Link |
|---------|-------------------|----------|------|------|
| **FundStarter** | Slack alert to `#board-alerts` | Agent | BEFORE approval gate | `slack_notifications.notify_*()` |
| **IdeaFactory** | Slack + GitHub comment | Agent | AFTER work, BEFORE PM audit | Activity log + comment |
| **NWV** | Activity log + task assignment | Agent | AFTER completion | Blocked task → board |

**Key:** All companies use comments on issues; FundStarter adds Slack for critical alerts.

---

## Q: Is this DONE issue for HUMAN or other AGENTS?

### By Issue Type

```
AGENT-to-AGENT → Next agent reads comment + executes (inherit work)
Example: Investment Strategist creates ticket → Client Advisor reads and executes

AGENT-to-HUMAN → Human approves before issue is truly done
Examples:
  - FundStarter: Brief awaits board approval
  - IdeaFactory: Epic awaits PM audit
  - NWV: Edition awaits image URLs from board

AGENT-ONLY → Human notified but no approval gate needed
Examples:
  - FundStarter: Watchlist updates (notification only)
  - IdeaFactory: GitHub monitoring (notification only)
```

**How to tell:** Look for `assigneeUserId` or `executionPolicy` on the issue:
- If assigned to board + status `in_review` → human approval needed
- If assigned to agent → agent-to-agent handoff
- If status `done` + activity log shows comment → completed

---

## Q: When need HUMAN attention, HOW TO GET HELP?

### Escalation Paths

#### FundStarter
1. **Blocked on data/API?** → Post comment on issue
2. **Slack alert:** `notify_pipeline_blocked(agent_name, task_id, reason)`
3. **Board action:** Reads Slack, visits issue, posts comment with solution
4. **Agent retry:** Continues on next heartbeat

**SLA:** Not formalized (expect response within 24h)

#### IdeaFactory
1. **Blocked on external issue?** → Comment on issue
2. **Critical unassigned tasks?** → Escalate to board comment
3. **Board action:** Reads activity feed, resolves blocker
4. **Agent retry:** Continues on next heartbeat

**SLA:** ASAP (PM checks daily)

#### NWV
1. **Need images for edition?** → Create blocked task
2. **Assign to:** Board user
3. **Task description:** Image requirements, count, format, deadline
4. **Board action:** Provides images, posts comment, marks task done
5. **Agent continues:** After blocked task completed

**SLA:** Not formalized (blocking task indicates urgency)

---

## Q: What Approval Gates Exist?

### By Company

| Gate | Company | When Triggered | Human Role | Escalation |
|------|---------|----------------|-----------|------------|
| **Brief review** | FundStarter | Client Advisor hands off | Board approves brief | Slack alert |
| **List promotion** | FundStarter | Scout promotes expert | Board OKs change | Comment request |
| **PM audit** | IdeaFactory | Agent marks epic done | PM verifies all sub-tasks | Audit comment |
| **Image block** | NWV | Ops Manager needs URLs | Board provides images | Create blocked task |

**Key:** Approval gates = human must act; notifications = FYI only

---

## Q: What if Agent Cannot Execute Task?

### Pattern

1. **Mark issue:** `status: "blocked"`
2. **Post comment:** Explain why (missing credential, need environment, etc.)
3. **If follow-up needed:** Create new issue with clear instructions
4. **Assign follow-up:** To appropriate agent or board
5. **Never mark done** unless deliverable actually exists

**Example:**
```
Task: "Create TestFlight build"
Agent: Build Monitor
Status: blocked
Comment: "Need Apple Developer credentials to upload TestFlight. 
           Creating follow-up IDE-137 with setup instructions.
           Ready to execute once credentials provided."
Follow-up: IDE-137 (backlog, assigned to board)
```

---

## Q: What's the Difference Between These?

### Status vs Execution State

| Status | Meaning | Human Visible | Example |
|--------|---------|--------------|---------|
| `todo` | Not started | Yes | Issue in backlog |
| `in_progress` | Agent working | Yes | Agent assigned + executing |
| `blocked` | Agent stuck, waiting | Yes | Missing credentials |
| `in_review` | Awaiting human review | Yes (CRITICAL) | Execution policy stage 1 |
| `done` | Truly complete | Yes | No more action needed |

### Wrong Status Use

- ❌ Mark `done` if human hasn't approved → use `in_review` instead
- ❌ Mark `done` if blocked → use `blocked`
- ❌ Mark `done` without evidence comment → add comment first

---

## Q: How Do I Audit Task Completion?

### Checklist (For Board Operators)

When reviewing issue marked `done`, verify **ALL**:

- [ ] **Comment exists** with deliverable summary
- [ ] **Link in comment** to actual artifact (not just "done")
- [ ] **Artifact matches task intent**
  - ❌ Bad: "Build" task with only scan report
  - ✅ Good: "Build" task with commit/artifact links
- [ ] **No red flags:** single-word completions, specs instead of work, reports instead of artifacts
- [ ] **If human-required step:** follow-up task exists (not marked done, marked blocked)

**If audit fails:**
1. Reopen issue
2. Comment: "Please describe deliverables and post links"
3. Return to agent for completion

**Audit tool:** [AGENT_PROTOCOL.md#definition-of-done](../AGENT_PROTOCOL.md#definition-of-done-dod)

---

## Q: How Are Agent Handoffs Verified?

### Pattern

Agent A completes → Posts comment with evidence → Creates ticket for Agent B → Marks A done → B reads comment + executes

**Example (FundStarter pipeline):**

1. **Scout** finds experts → posts comment with summary → creates ticket for Strategist
2. **Strategist** analyzes → posts comment with analysis → creates ticket for Advisor
3. **Advisor** writes brief → posts comment in issue → hands off to board for approval

**Key:** Each agent MUST read the comment from previous agent before executing

---

## Q: When Should I Create a Follow-up Task?

### Decision Tree

```
Agent cannot execute?
├─ Yes: Cannot get required environment/tools
│  ├─ Create new issue (status: blocked, assigned to board/agent)
│  ├─ Original issue: mark blocked (NOT done)
│  └─ Move to next work
│
└─ No: Agent can execute but task is multi-step
   └─ Use explicit task handoff pattern (see Agent Handoffs)
```

**Examples:**

✅ **Create follow-up:**
- Task: "Screenshots & demo" → Can't execute, need device/TestFlight → Create IDE-137 (blocked)
- Task: "Publish edition" → Need board to provide images → Create blocked task (assigned to board)

❌ **Don't create follow-up:**
- Task: "Analyze opportunities" → Just multi-step, agent does all steps → Continue

---

## Q: What's the Paperclip Skill?

### Golden Rule
**For ALL Paperclip operations, use the `paperclip` skill. NEVER make direct HTTP calls.**

### Why?
- ✅ Auto-injects auth (`PAPERCLIP_API_KEY`, `PAPERCLIP_TASK_ID`)
- ✅ Built-in retry + error handling
- ✅ Automatic activity logging
- ✅ Maintains context + company scoping

### Paperclip Skill Steps

| Step | Use Case | Example |
|------|----------|---------|
| **1** | Fetch task details | Read current task context |
| **2** | Update status/priority | Mark done, change priority |
| **3** | Comment on issue | Post findings, progress |
| **4** | Query/search | Find other issues |
| **9** | Delegate (create ticket) | Create follow-up task |

**Source:** [AGENT_PROTOCOL.md#paperclip-skill-steps](../AGENT_PROTOCOL.md#paperclip-skill-steps-reference)

---

## Links

| Document | Purpose |
|----------|---------|
| [Full Governance Review](./governance-review-all-companies-2026-04-22.md) | Comprehensive breakdown by company |
| [AGENT_PROTOCOL.md](../AGENT_PROTOCOL.md) | Shared protocol (do's & don'ts) |
| [Execution Policy Guide](./guides/execution-policy.md) | Review/approval workflows |
| [Definition of Done Audit](../docs/issue-completion-audit-fixes-2026-04-19.md) | Problem cases + fixes |
| [Slack Notifications](../doc/SLACK_TASK_COMPLETION_NOTIFICATIONS.md) | FundStarter notification examples |
| [Approvals Guide](./guides/board-operator/approvals.md) | Board approval operations |

---

**Last updated:** 2026-04-22  
**For questions:** See full [governance review document](./governance-review-all-companies-2026-04-22.md)
