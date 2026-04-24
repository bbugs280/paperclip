# Governance Review: Definition of DONE, Notifications, and Human Coordination (All Companies)

**Date:** 2026-04-22  
**Scope:** FundStarter, IdeaFactory, New World Value, OpenClaw (absent)  
**Purpose:** Document how each company defines issue completion, notifies humans, separates AGENT vs HUMAN work, and escalates for human attention

---

## Executive Summary

### Governance Framework

All Paperclip companies operate under a **3-layer governance model**:

| Layer | What | Who Decides | Tool |
|-------|------|------------|------|
| **Definition of DONE** | When a task is truly complete | Agent (with protocol), verified by PM/board | AGENT_PROTOCOL.md + agent instructions |
| **Human Notification** | Alerting humans to completed work | Agent (via Slack/system) | Slack hooks, paperclip skill, activity logs |
| **Approval Gates** | When human sign-off is required | Policy per issueType (execution policies) | Board approval, PM audit, investor review |

### Critical Finding

**All companies require:** Deliverable evidence posted as comments before marking done. Empty completions are not tolerated.

---

## COMPANY PROFILES

---

## 1. FUNDSTARTER

**Focus:** Investment management, talent scouting, client advisory pipeline  
**Board Operator:** Single human managing all approvals  
**Active Agents:** 3 (Talent Scout, Investment Strategist, Client Advisor)

### 1.1 Definition of DONE

#### Talent Scout
- **Discovery List:** Add entries immediately (no approval)
- **Core List & Removed List:** Add immediately THEN post comment requesting board approval before finalizing
- **Evidence required:** Full breakdown comment with added count, promoted count, removed count, total expert count
- **Mandatory re-verification:** Even if no changes, must re-PUT each collection weekly to confirm current

#### Investment Strategist
- **Evidence required:** Follow-up ticket creation (not just analysis)
- **Output format validated:** Each opportunity includes EXPERT, WHAT HAPPENED, WHY IT MATTERS, OPPORTUNITY, BEGINNER FRIENDLY, RISK LEVEL, CONFIDENCE, NOTES
- **Never mark done early:** Only mark AFTER follow-up ticket successfully created and comment posted
- **On failure:** If ticket creation fails, mark `blocked` with analysis in comment (preserve work)

#### Client Advisor
- **Evidence required:** Full brief body posted as comment (not empty)
- **Real prices mandatory:** All financial data from plugin calls (not guessed)
- **Calculation required:** Include HKD amounts using live USD/HKD rate
- **Fallback handling:** If plugin errors, use description price but note as fallback
- **Handoff requirement:** Brief handed off to board for approval before completion (agent does NOT mark done)

**Compliance Pattern:** All 3 agents post evidence → Slack notification → specific approval gate per agent

### 1.2 Human Notification

#### Notification Method: Slack via `slack_notifications.py`

| Agent | Notification Function | Details Included |
|-------|----------------------|------------------|
| Talent Scout | `notify_watchlist_updated()` | Added count, promoted count, removed count, total experts |
| Talent Scout (blocked) | `notify_pipeline_blocked()` | Agent name, task ID, reason, blocking item |
| Investment Strategist | `notify_pipeline_health()` | Status of scout/strategist/advisor stages, timing metrics |
| Investment Strategist (blocked) | `notify_pipeline_blocked()` | Agent name, task ID, reason, what's needed |
| Client Advisor | `notify_brief_published()` | Date, issue ID, topics (3 sections), brief excerpt (max 500 chars), subscriber count |

**Notification Timing:**
- Scout: Every weekly cycle completion
- Strategist: Every analysis completion
- Advisor: BEFORE marking done (posted when comment posted, before board review)

**Board notification pathway:** Most critical notifications copied to `#board-alerts` channel for human visibility

### 1.3 AGENT vs HUMAN Responsibility

| Work Phase | AGENT | HUMAN (Board) |
|------------|-------|---------------|
| **Discovery** | Scout finds new experts | (not involved) |
| **Analysis** | Strategist validates opportunities | Reviews findings (async) |
| **Brief compilation** | Advisor writes brief with live data | **APPROVAL GATE:** Approves brief before publication |
| **Publication** | (agent waits for board) | **Marks done** after brief review |
| **Promotion/Removal** | Scout updates lists | **APPROVAL GATE:** Approves after seeing reasons |

**Key:** Agent creates, humans approve → only humans mark as done for client-facing work (brief)

### 1.4 Escalation for Human Attention

**When:** Task blocked (API errors, data issues, missing credentials, etc.)

**How:** Agent posts to Slack via `notify_pipeline_blocked()` with:
- Agent name
- Task ID (e.g., "FUN-92")
- Reason for blockage
- What is stopping progress

**Board action:** Reads Slack alert, visits task issue, provides unblocking action (fix credentials, resolve data issue, etc.)

**Example blocker scenarios:**
- X/Twitter API rate limit exceeded
- Missing plugin credentials
- Zero relevant search results (no opportunities found)
- Follow-up ticket creation failed

---

## 2. IDEAFACTORY

**Focus:** Innovation pipeline, idea-to-market workflow
**Board Operator:** Single human managing approvals + project oversight
**Active Agents:** 2 (Project Manager, Build Monitor)

### 2.1 Definition of DONE

#### Project Manager (CRITICAL AUDIT ENFORCED 2026-04-19)

**Before closing any epic or accepting agent-marked-done tasks, verify ALL:**

- [ ] Task has description/comment (not just "done" or empty text)
- [ ] **Link to deliverable exists** — Document, code commit, artifact, or external link must be present
- [ ] **Deliverable type matches task intent:**
  - ❌ Bad: "Build" task with only scan report delivered
  - ❌ Bad: "Collect screenshots" task with only specification document
  - ✅ Good: "Build" task with commit/PR/artifact links posted
  - ✅ Good: "Copy" task with actual copy posted in comment
- [ ] **If human/physical execution needed:** Create follow-up task marked blocked (not done)
  - Example: Task "Screenshots & demo" → Create IDE-137-follow (execution), mark IDE-127 blocked
- [ ] **No red flags present:**
  - Single-word completions: "Done." ❌
  - Specifications instead of deliverables ❌
  - Reports instead of actual work ❌
  - Zero explanation ❌

**Audit failure consequence:** Comment with "Please describe deliverables and post links or I will reopen this task."

#### Build Monitor

**Before marking task done, verify:**

- [ ] **If task is "monitoring/scanning":** Post report with findings (not just empty completion)
- [ ] **If task is "build/create artifact":** Post link to:
  - Commits/PRs merged with references
  - Build logs or CI status
  - Deployment/artifact reference
  - NOT just a report of "found untracked work"
- [ ] **Deliverable posted in comment** with evidence/link
- [ ] **If cannot execute:** (e.g., need device/environment)
  - Create follow-up task with clear instructions
  - Mark original task `blocked` (NOT done)
  - Assign follow-up to appropriate agent/human

**Real Example (WRONG):**
```
Task: "Create TestFlight build"
Posted: GitHub scan report
Status: marked done ❌
PROBLEM: Scanning report ≠ TestFlight artifact. No build uploaded.
FIX: Mark blocked, post what tools/environment you need.
```

**Compliance Pattern:** Agents post evidence → PM audits → marks truly done only if evidence matches intent

### 2.2 Human Notification

#### Notification Method: Slack or Activity Log

| Agent | Notification | Frequency | Details |
|-------|--------------|-----------|---------|
| Project Manager | Heartbeat summary to Slack | Every heartbeat completion | Tasks assigned (count), Epics closed (count), Next priorities |
| Project Manager | Per-action comments | During execution | Explains task assignment rationale to assignee |
| Build Monitor | GitHub query comment | Every heartbeat completion | Commits count, PRs merged/closed, CI pass rate, avg review time, scope changes |
| Both | Activity log entries | Per mutation | Automatic via paperclip skill |

**Board notification pathway:** Critical blockers posted as comments (board reads issue activity feed)

### 2.3 AGENT vs HUMAN Responsibility

| Work Phase | AGENT | HUMAN (Board) |
|------------|-------|---------------|
| **Triage** | PM assigns tasks to agents | (not involved) |
| **Execution** | Build Monitor codes/builds, Marketer creates assets | (reviews async) |
| **Verification** | PM audits deliverables match intent | (not involved) |
| **Epic closure** | PM marks done only if audit passes | (not involved) |
| **Idea promotion** | PM creates projects | (not involved) |
| **Strategy** | (not involved) | **APPROVAL GATE:** Approves strategic ideas before execution |

**Key:** Agent creates + verifies, humans don't need to approve routine execution (board approval only for strategy)

### 2.4 Escalation for Human Attention

**When:** Task blocked, scope creep detected, externally unblockable issue

**How:** Agent posts to board as comments on issue

**What to include:**
- Blocker details
- Why agent cannot resolve
- What board action needed (provide credentials, resolve scope conflict, get stakeholder decision, etc.)

**Examples:**
- External API down
- Conflicting priorities (from multiple humans)
- Need stakeholder input on feature scope
- Unassigned critical path items

---

## 3. NEW WORLD VALUE (NWV)

**Focus:** Question generation and weekly retrospectives for market intelligence
**Board Operator:** Single human managing approvals + editorial oversight
**Active Agents:** 2 (Operations Manager, Research Analyst)

### 3.1 Definition of DONE

#### Operations Manager

**Multi-step process, each step must provide evidence:**

**Step 1 (Mark Published):**
- Find matching question document
- Append to archive under `## Published — Edition #N` heading
- Include: question text, score, article URL, podcast URL
- Delete/blank question document with redirect note
- Evidence: Question moved to NEW-5 archive

**Step 2 (Create Edition):**
- New edition document created in NEW-6 with all required template sections
- Includes: Content, Metrics, Retrospective
- Evidence: Edition document exists and has all sections

**Step 3 (Human-Dependent Block):**
- If edition requires image URLs, Ops Manager creates follow-up task blocked
- Task description includes: Image requirements, delivery format, where to post URLs
- Assignment: Assigned to board (human must provide images or URLs)
- Operations Manager DOES NOT move forward until human completes follow-up

**Critical rule:** Permanent document stores (NEW-5 archive, NEW-6 templates) must ALWAYS stay in backlog — never mark done, always available

#### Research Analyst

**Question generation with 6-criteria framework:**
- [ ] Question is answerable
- [ ] Question is relevant to market intelligence
- [ ] Question is within scope of available data
- [ ] Multi-angle research required (minimum 3 data sources)
- [ ] Question score calculated (1-10 based on criteria)
- [ ] Evidence posted: research findings + scoring rationale + article links

**Evidence required:** Full research methodology posted as comment with source URLs + scoring breakdown

**Compliance Pattern:** Analysts post evidence → Ops Manager validates scoring → Ops Manager publishes

### 3.2 Human Notification

#### Notification Method: Paperclip Activity Log + Follow-up Tasks

| Agent | Notification | Frequency | Details |
|-------|--------------|-----------|---------|
| Operations Manager | New task created (blocked) | When images needed | "BLOCKED: Image sourcing for Edition #N" |
| Operations Manager | Activity log update | Per edition published | Automatic status change to done |
| Research Analyst | Task assignment | Per generated question | Provides context to next agent |
| Both | Comments with evidence | Per completion | Detailed research/scoring/publishing rationale |

**Board notification pathway:**
- Critical: Blocked task assigned to board (board must complete before Ops Manager can finish)
- Async: Activity log shows publishes (board reviews via dashboard)

### 3.3 AGENT vs HUMAN Responsibility

| Work Phase | AGENT | HUMAN (Board) |
|------------|-------|---------------|
| **Question generation** | Research Analyst scores + researches | (not involved) |
| **Research validation** | Research Analyst provides methodology | (not involved) |
| **Edition creation** | Ops Manager compiles content | Provides images/URLs if needed |
| **Publication** | Ops Manager archives question | **BLOCKING GATE:** Must provide images/URLs |
| **Retrospective** | Ops Manager analyzes metrics | (not involved) |

**Key:** Agents execute workflow, humans hold-up points for creative/editorial decisions (images, content review)

### 3.4 Escalation for Human Attention

**When:** Image URLs needed, content approval required, editorial decision needed

**How:** Agent creates blocked task assigned to board

**Blocked task includes:**
- What is needed (e.g., "3 high-quality images for Edition #22")
- Format requirements (e.g., "PNG/JPG, landscape 16:9")
- Where to post (e.g., "NEW-6 template, section: visuals")
- Deadline (if urgent)

**Board action:** Completes task (provides images/URLs), posts as comment, marks task done

**Example escalations:**
- Missing image URLs for edition
- Editorial review of question score
- Content approval for sensitive topics
- Scope clarification (out-of-scope question received)

---

## 4. OPENCLAW

**Status:** Not active in current instance (gateway adapter layer only)  
**Skip:** Governance practices not yet documented

---

## CROSS-COMPANY GOVERNANCE PATTERNS

### Universal Rules

1. **Evidence-Based Completion**
   - All companies require evidence posted before marking done
   - No empty completions accepted
   - Evidence must match task intent (not just reports)

2. **Slack Notifications (vs Activity Log)**
   - FundStarter: Heavy Slack usage for pipeline alerts
   - IdeaFactory: Slack for PM summaries + GitHub findings
   - NWV: Minimal Slack (activity log primary, tasks for blocking)

3. **Approval Gate Types**

   | Type | Company | Example |
   |------|---------|---------|
   | **Board approval** | FundStarter | Brief approval, list promotions |
   | **PM audit** | IdeaFactory | Epic closure, deliverable verification |
   | **Human blocking** | NWV | Image provision, content approval |
   | **Execution policy** | Core | Review/approval workflows (optional per issue) |

4. **Escalation Paths**

   | Trigger | FundStarter | IdeaFactory | NWV |
   |---------|------------|------------|-----|
   | **Blocked** | Slack alert to board | Comment to board | Blocked task assigned to board |
   | **Needs approval** | Post comment, wait | (PM decides) | Create tasks, assign |
   | **Missing info** | Request via comment | Audit failure comment | Blocked task |

---

## PROTOCOL RULES (All Companies)

### AGENT_PROTOCOL.md Standards

**Every agent must:**

1. **Use `paperclip` skill for all Paperclip operations**
   - Step 1: Fetch (read task context)
   - Step 2: Update (change status/priority/assignee)
   - Step 3: Comment (post findings/progress)
   - Step 4: Query (search for other issues)
   - Step 9: Delegate (create follow-up tasks)

2. **Never make direct HTTP calls** to Paperclip API
   - Missing auth context injection
   - No automatic retry logic
   - Breaks versioning

3. **Post evidence before marking done**
   - Deliverable links or content
   - Comments with rationale
   - Activity log entries per mutation

4. **Define Done Checklist (from AGENT_PROTOCOL.md)**
   - [ ] Deliverable exists (not spec/plan)
   - [ ] Deliverable is verified
   - [ ] Testing/validation complete (if applicable)
   - [ ] Human review gate satisfied (if required)
   - [ ] No anti-patterns present (empty comments, specs instead of work, reports instead of artifacts)

---

## EXECUTION POLICIES (Optional Per Issue)

### How it Works

Issues can define optional review/approval stages that run AFTER executor finishes:

```json
{
  "stages": [
    { "type": "review", "participants": [{ "type": "agent", "agentId": "qa-agent" }] },
    { "type": "approval", "participants": [{ "type": "user", "userId": "board-user" }] }
  ]
}
```

**Flow:**
1. Executor marks `done`
2. Runtime intercepts → status becomes `in_review` (not done)
3. Reviewer approves → status stays `in_review`, moves to approver
4. Approver approves → status becomes actual `done`

### Usage Per Company

| Company | Policies Used | Examples |
|---------|---------------|----------|
| FundStarter | Yes (implicit) | Client brief review by board |
| IdeaFactory | Yes (implicit) | PM audit before epic closure |
| NWV | No (uses blocking tasks instead) | Edition images provided via blocked task |

---

## RECOMMENDATIONS FOR EXPANSION

### To Add New Company Governance

1. **Define company's approval gates** (board approval? PM audit? blocking tasks?)
2. **Document agent Definition of Done** (what evidence is required? who verifies?)
3. **Add to AGENT_PROTOCOL.md** (extend with company-specific patterns if needed)
4. **Implement notification strategy** (Slack? Custom? Activity log?)
5. **Set escalation path** (comments? tasks? Slack?)

### To Improve Existing Governance

**FundStarter:**
- [ ] Formalize approval gate response SLA (how fast must board respond?)
- [ ] Add notification for rejected approvals (why was it rejected?)

**IdeaFactory:**
- [ ] Expand PM audit to all project types (currently focused on MVP)
- [ ] Automate deliverable validation (check for links in comments pre-done)

**NWV:**
- [ ] Document image URL SLA (how long before board must provide?)
- [ ] Add research validation gate (optional second reviewer for high-score questions?)

---

## DEFINITION OF DONE AUDIT TOOL

**Location:** [AGENT_PROTOCOL.md](AGENT_PROTOCOL.md#definition-of-done-dod) (lines 261-290)

**For board operators:** Use this checklist when auditing completed tasks:

1. **Comment exists** with deliverable summary
2. **Link in comment** to actual artifact (not just "done")
3. **Artifact is accessible** (try clicking link)
4. **Artifact matches task** (e.g., build artifact for "create build," not scan report)
5. **If human-required → follow-up task exists** (not marked done, marked blocked)
6. **No red flags:**
   - Single-word comment ("Done")
   - Specification instead of deliverable
   - Scanning/planning instead of execution
   - Zero explanation of output

**If audit fails → Reopen issue + demand completion.**

---

## MATRIX: COMPLETE GOVERNANCE AT A GLANCE

| Question | FundStarter | IdeaFactory | NWV |
|----------|-------------|------------|-----|
| **How to define DONE?** | Evidence in comment + Slack alert | Evidence in comment + PM audit | Evidence in comment + multi-step publication |
| **Who notifies humans?** | Agent (Slack) | Agent (Slack for summaries) | Agent (activity log, blocked tasks) |
| **When do humans approve?** | After agent completes (brief review) | PM audits (before epic closes) | Before agent publishes (image block) |
| **How to escalate?** | Slack alert to board | Comment to board | Create blocked task assigned to board |
| **What if blocked?** | Post reason, wait for response | Comment with blocker details | Create follow-up task (blocking) |
| **Response SLA?** | Not formalized | ASAP (PM checks daily) | Not formalized (blocking task waits) |
| **Evidence format?** | Slack message summary | GitHub links + comment | Document archive + config |

---

## NEXT STEPS

1. **Review this document** with each company's board operator
2. **Identify gaps** in your company (missing SLAs? unclear escalation?)
3. **Extend to new companies** using this template
4. **Monitor Definition of Done** compliance (quarterly audit)
5. **Update AGENT_PROTOCOL.md** with company-specific patterns as needed

---

**Document owner:** Paperclip governance  
**Last updated:** 2026-04-22  
**Review cycle:** Quarterly (next review: 2026-07-22)
