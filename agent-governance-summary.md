# Agent Governance & Task Completion Practices Summary
**Generated: 2026-04-22 | Based on AGENTS.md instructions from company agent directories**

---

## 1. FUNDSTARTER

### Agent: Talent Scout (Weekly) — `5da4ff53-174a-4319-812a-2549e1481213`
**Role:** Maintain expert watchlist with weekly discovery, promotion, and removal cycles.

#### Definition of Done Verification Steps
- **Discovery List additions:** Document must be PUT immediately (no approval gate needed)
- **Core List promotions:** Must PUT the updated list immediately, THEN post a comment on the issue requesting approval before finalizing
- **Removals:** Must PUT the update to move expert to Removed List immediately, THEN post comment noting the removal
- **Mandatory re-PUT:** Even if no changes, must re-PUT the same document body every run to confirm list is current
- **Summary comment required:** All three tasks (discovery, promotion, removal) compiled into one report with full breakdown posted as issue comment

#### Human Notification on Task Completion
- **Slack notification:** Posts watchlist update to operations channel with detailed change breakdown
  - Breakdown includes: added count, promoted count, removed count, total expert count
  - Uses `slack_notifications.notify_watchlist_updated()` with date and change metrics
- **If blocked:** Alternative Slack notification via `notify_pipeline_blocked()` alerting operations with reason and blocking item

#### Approval/Review Gate Requirements
- **Core List promotions:** Require board approval (requested via comment, then executed)
- **Removed List changes:** Same approval pattern (comment request, then execute)
- **Discovery List additions:** NO approval gate — write immediately without waiting
- **Board approval trigger:** Post comment on issue noting what was promoted/removed and why, then proceed with update

#### Escalation When Blocked
- **Method:** Post to Slack via `notify_pipeline_blocked()` with:
  - Agent name ("Talent Scout")
  - Task ID
  - Reason for blockage
  - What is stopping progress
- **Example blocker scenarios:** API errors, data issues, missing X/Twitter credentials, zero relevant updates found

#### Heartbeat Procedure for Marking Tasks Done
1. Fetch all three expert lists from Paperclip API (core-list, discovery-list, removed-list)
2. Execute three tasks in order:
   - **Task 1 (Discovery):** Search for new experts using X API tools, PUT them to discovery-list immediately
   - **Task 2 (Promotion):** Review discovery-list for 7+ day entries with 3+ scan appearances, recommend promotion
   - **Task 3 (Removal):** Review both lists for 30+ day inactive experts, recommend removal
3. Compile all three tasks into single report
4. For each PUT operation:
   - GET document to fetch current `revisionId`
   - PUT updated body with `baseRevisionId` set to that revisionId
5. Post summary comment on issue with full report after all PUTs complete
6. Mark task done after all operations complete and Slack notification sent

---

### Agent: Client Advisor — `fb763109-aac8-457c-8c9e-688af7051fe4`
**Role:** Produce daily investment brief for retail investors from Investment Strategist analysis.

#### Definition of Done Verification Steps
- **Brief must be posted:** Comment with full brief body posted to task issue (not just empty completion)
- **Real prices required:** All financial data from plugin calls (not guessed)
- **HKD amounts mandatory:** Include calculated HKD amounts using live USD/HKD rate
- **Evidence of execution:** Financial data tool output and plugin responses must be evident
- **Beginner-friendly opportunities:** Maximum 3, all with step-by-step buy instructions for Futu/moomoo apps
- **Fallback handling:** If plugin returns error, use price from description but note it as fallback

#### Human Notification on Task Completion
- **Slack notification:** Posts to #fundstarter-ops with article excerpt preview
  - Uses `notify_brief_published()` with date, issue ID, topics, subscriber count, brief excerpt (max 500 chars)
  - Includes 3 major section topics from the brief
- **Handoff to board:** After posting comment, PATCH issue to:
  - Set status to `in_review`
  - Clear assigneeAgentId (set to null)
  - Assign to board (`assigneeUserId: "local-board"`)
  - Comment: "Brief is ready. Handing off for review — please mark done once read."

#### Approval/Review Gate Requirements
- **Board review gate:** Brief handed off to board for approval before final completion
- **Board marks done:** Only board can mark task as done after review
- **No agent re-approval:** Once posted and handed off, agent waits for board

#### Escalation When Blocked
- **Blockage scenarios:** Empty description field, plugin errors, missing data feeds
- **Slack alert:** Via `notify_pipeline_blocked()` with blocking item description
- **Recovery:** Re-read issue description, retry plugin calls, or request data from upstream Research Analyst

#### Heartbeat Procedure for Marking Tasks Done
1. Read task description via API to get Research Analyst findings
2. For each beginner-friendly opportunity:
   - Call financial-data plugin for live USD/HKD exchange rate
   - Call financial-data:stock-quote for each ticker with real prices
   - Format with HKD cost, step-by-step buy instructions, risk level, disclaimer
3. Write full report to temp file to avoid shell quoting issues
4. POST comment with brief body to task issue (using paperclip skill comment pattern)
5. PATCH issue to handoff to board:
   - status: "in_review"
   - assigneeAgentId: null
   - assigneeUserId: "local-board"
6. Post Slack notification to #fundstarter-ops with excerpt
7. **Do NOT mark done** — only board can do this after review

---

### Agent: Investment Strategist (Analyzer) — `7b14ebde-cd90-4c32-a7fb-49e2458695a3`
**Role:** Evaluate Research Analyst findings for beginner-friendly opportunities and create Client Advisor handoff.

#### Definition of Done Verification Steps
- **Follow-up ticket creation required:** Must successfully create task for Client Advisor, not just analyze
- **Output format validated:** Each opportunity includes EXPERT, WHAT HAPPENED, WHY IT MATTERS, OPPORTUNITY, BEGINNER FRIENDLY, RISK LEVEL, CONFIDENCE, NOTES
- **Ticket must include:** Full analysis in description, parentId set to current task, status: "todo", priority: "medium"
- **Comment on follow-up:** Must post comment: "Analysis complete. Please prepare the client brief and mark done."
- **On failure:** If ticket creation fails, set task to `blocked` with full analysis in comment (preserve work)
- **Never mark done early:** Only mark task done AFTER follow-up ticket is successfully created

#### Human Notification on Task Completion
- **Slack notification:** Posts daily health status with pipeline metrics via `notify_pipeline_health()`
  - Includes status of scout, strategist, advisor stages
  - Posts timing metrics: scout_time, strategist_time, advisor_time
- **Post-analysis notification:** Alternative format posting to Slack with analysis complete status and dashboard link
- **If blocked:** Alert via `notify_pipeline_blocked()` with blocking item

#### Approval/Review Gate Requirements
- **Implicit approval:** Investment Strategist analysis must be reviewed by Client Advisor (next stage)
- **No explicit board approval:** Strategist analysis is proposal, not final decision
- **Client Advisor holds approval:** Only Client Advisor can convert analysis into actionable brief; board approves final brief

#### Escalation When Blocked
- **Blockage scenarios:** Empty description field, no findings from Research Analyst, failed ticket creation
- **Slack escalation:** Post `notify_pipeline_blocked()` with:
  - Agent name ("Investment Strategist")
  - Task ID
  - Reason ("empty description" || "ticket creation failed")
  - What is needed (e.g., "Research Analyst findings required")

#### Heartbeat Procedure for Marking Tasks Done
1. Read task description via API (contains Research Analyst findings) — use GET call or PAPERCLIP_WAKE_PAYLOAD_JSON
2. For each opportunity found:
   - Verify via financial-data:stock-quote plugin
   - Verify via financial-data:stock-info plugin
   - Search for recent news via web-search plugin
   - Crawl full article if needed via web-crawl
   - Cross-check multiple expert signals
3. Compile output with all opportunities (or "NO OPPORTUNITIES" message)
4. Using paperclip skill Step 9 (Delegate):
   - Create follow-up ticket for Client Advisor
   - Set parentId to current task
   - Set status: "todo", priority: "medium"
   - Assign to: Client Advisor agent ID `fb763109-aac8-457c-8c9e-688af7051fe4`
   - Description: Your full analysis output
5. Post comment on follow-up ticket: "Analysis complete. Please prepare the client brief and mark done."
6. **Only then:** Mark your task as `done` (after ticket creation succeeds)

---

## 2. IDEAFACTORY

### Agent: Project Manager — `42403787-847c-428d-8dc9-a2c75598f5ee`
**Role:** Coordinate post-publish pipeline, manage task assignments, audit task completion, track project milestones.

#### Definition of Done Verification Steps (CRITICAL AUDIT — 2026-04-19)
**Before closing any epic or accepting agent-marked-done tasks, verify ALL of these:**
- [ ] **Task has description/comment:** Not just "done" or empty text
- [ ] **Link to deliverable exists:** Document, code commit, artifact, or external link must be present
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

**If audit fails:** Comment with "Please describe deliverables and post links or I will reopen this task."

#### Human Notification on Task Completion
- **Slack heartbeat summary:** Posted at end of heartbeat work via `post_to_slack()` with:
  - Header: "🗂️ PM Heartbeat Summary"
  - Body shows: Tasks assigned (count), Epics closed (count), Next priorities (description)
  - Links to dashboard and Idea Registry issue
- **Structured format:** Uses Slack block kit with header section and main "mrkdwn" text section
- **Per-action comments:** When assigning tasks to agents, add comment explaining rationale

#### Approval/Review Gate Requirements
- **Task assignment approval:** No gate — PM can assign directly based on task type
- **Epic closure requirement:** All child tasks must be verified done (pass audit) before epic closes
- **Project promotion gate:** Ideas promoted from Idea Registry need Project creation (checked by PM)
- **No explicit board approval for routine assignments:** Board approval only for governance changes

#### Escalation When Blocked
- **Escalation path:** Post blockers directly to board as comments
- **Example blockers:** Tasks blocked on external dependencies, unassigned critical path items, scope creep
- **Method:** Comment on issue with blocker details, assign to board for resolution
- **Never escalate completed but unverified tasks:** Instead, use audit failure pattern (ask for more info)

#### Heartbeat Procedure for Marking Tasks Done
1. **Work your own tasks first:** in_progress tasks first, then todo
2. **Triage unassigned project issues:** For each active project:
   - GET `/api/companies/{company_id}/issues?projectId={projectId}&status=backlog,todo&limit=50`
   - For each unassigned issue, assign to appropriate agent:
     - Design/architecture/research → Strategist
     - Build/implement/code → Build Monitor
     - Marketing/launch/growth → Marketer
     - Testing/QA → Monitor
   - PATCH with `assigneeAgentId`, set status to `todo` if backlog
3. **Check Idea Registry:** Issue `6c425b67-c5e8-4c6d-9198-4f0b0b9f276d` for PROCEED status ideas
   - Create Projects for promoted ideas if none exists
4. **Track active project milestones:** Audit task completion
   - IF child tasks marked done: Audit first (see Definition of Done checklist)
   - IF all verified done: Close parent epic
   - IF blocked: Escalate to board
5. **Post heartbeat summary** to Slack with counts and next priorities
6. **Mark task done** after heartbeat work complete

**Task Naming Convention (enforced on triage):**
- All sub-tasks MUST be prefixed with project name: `ProjectName: TaskDescription`
- Examples: `Merge Army: Design`, `Paw Mind: Camera pipeline POC`
- Applies to new task creation AND existing task renaming during triage
- If unprefixed task found under project, PM renames it

---

### Agent: Build Monitor — `063a4d5c-a44c-489a-b56a-6e56d4cf67ca`
**Role:** Monitor GitHub repository for code changes, map commits to Paperclip tasks, alert on CI failures and scope drift.

#### Definition of Done Verification Steps (CRITICAL)
Before marking ANY task `done`, verify:
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

#### Human Notification on Task Completion
- **GitHub query comment:** Post findings about activity as issue comment via paperclip skill Step 3 (Comment)
- **Format includes:** Commits count, PRs merged/closed, CI pass rate, avg review time, scope changes detected
- **Blocker alerts:** If critical issues found (failed CI, stale PRs >48h, scope drift), flag in comment

#### Approval/Review Gate Requirements
- **No approval gate:** Build Monitor is read-only on GitHub (monitoring only)
- **Report-based:** Findings posted as comments, no approval required
- **Escalation to team:** If blockers found, post in comment (team reads and acts on report)

#### Escalation When Blocked
- **Blockage scenarios:** Cannot execute task (missing environment/device), GitHub token issues
- **Method:** Always use paperclip skill — never make direct API calls
- **If cannot execute:** Create follow-up issue with clear instructions, mark original task `blocked`
- **Never skip Definition of Done:** Even if blocked, document why and what's needed

#### Heartbeat Procedure for Marking Tasks Done
1. **Using paperclip skill Step 1 (Fetch):** Read your assigned task
2. **GitHub Scan (REQUIRED):** Query GitHub repo with bash tool (ALWAYS include `description` field):
   - Query recent commits (last 20) → extract issue references [IDE-XX]
   - Check open/closed PRs → find feature/IDE-XX branches, extract task IDs
   - List active branches → map to Paperclip tasks using branch naming
   - Check CI status → flag failed outputs, stale work (>48h), scope drift
3. **Using paperclip skill Step 3 (Comment):** Post findings:
   - Commits count
   - PRs merged/closed
   - CI pass rate
   - Avg review time
   - Scope changes detected
   - Any blockers (failed CI, stale PRs, scope drift)
4. **Using paperclip skill Step 2 (Update):** If blockers found, update issue status/priority
5. **Using paperclip skill Step 9 (Delegate):** If major refactoring/bug fixes needed, create follow-up issue
6. **Verify Definition of Done:** Post report with findings (for monitoring task)
7. **Using paperclip skill Step 2 (Update):** Mark task status to `done`

**Critical Rule:** Bash tool ALWAYS requires `"description"` field explaining what command does and why.

---

## 3. NEW WORLD VALUE (NWV)

### Agent: Operations Manager — `69c6ebd1-ec4c-4ac5-98ea-6e2ea0ff0a07`
**Role:** Coordinate post-publish pipeline, manage question pipeline, deliver weekly retrospectives.

#### Definition of Done Verification Steps
- **Step 1 (Mark Published):** Question marked published in NEW-5 with archive updated:
  - Find matching question document
  - Append to archive under new `## Published — Edition #N` heading
  - Include: question text, score, article URL, podcast URL
  - Delete/blank question document with redirect note
- **Step 2 (Create Edition):** New edition document created in NEW-6 with:
  - All required template sections present (Content, Metrics, Retrospective)
  - Metrics marked as [pending] initially (to be filled by Monitor)
  - Proper document key format: `edition-N`
- **Step 3 (Request Image):** Block task and request social image URL from Human
  - Once received, update Social Image URL field in edition document
  - Mark task done after URL added

#### Human Notification on Task Completion
- **Human Input Required Protocol:** When blocking for social image:
  - Block current task issue (not NEW-5 or NEW-6)
  - Assign to Human
  - Clear, specific request message posted
- **Pipeline refill notifications:** Slack message:
  - If ✅ healthy (≥5 questions): "✅ Pipeline OK: {count} questions. No action needed."
  - If 🔄 low (<5 questions): "🔄 Pipeline Low: Only {count} questions. Refill needed."
- **Slack notification script:** Uses `post_slack_notification.sh` with status emoji and detail

#### Approval/Review Gate Requirements
- **NEW-5 and NEW-6 MUST stay in backlog:** Never change status, never assign to agents
- **These are permanent document stores, not work tasks**
- **Real work tracking:** Goes on dedicated task issues (NEW-7, NEW-8, etc.)
- **No approval gate for document updates:** Only PUT operations needed (no wait for review)
- **Task issue approval:** If blocking on Human, Human must reset task to `todo` after providing response

#### Escalation When Blocked
- **Blockage scenarios:** Missing human input (social image), pipeline falling below threshold, data missing from Monitor
- **Method 1 (Human dependency):** Block task to Human with specific request using Human Input Required Protocol
- **Method 2 (Pipeline low):** Post Slack alert, comment on task with pipeline threshold alert, assign to Human for candidate submission
- **Never change NEW-5 or NEW-6 status:** Block on task issue instead

#### Heartbeat Procedure for Marking Tasks Done
**On receiving new article from Human:**

**Step 1 — Mark Published in NEW-5:**
1. GET `/api/issues/b11b796f-715d-4790-90da-8debabb6aa1d/documents` (fetch all questions)
2. Find matching question document
3. GET `archive` document to fetch `latestRevisionId`
4. Append newly published question with:
   - Question text, score at selection, article URL, podcast URL
   - Performance: [pending — Monitor to fill]
   - Follow-up questions: [pending]
5. PUT updated archive doc with correct `baseRevisionId`
6. Update matching question document body to redirect note, use document's `latestRevisionId`
7. Update NEW-5 issue description to decrement active question count, update timestamp

**Step 2 — Create Edition Document in NEW-6:**
1. GET `/api/issues/629c0ffb-a6dc-4e54-b16c-63dc09f14c9b/documents` (count existing edition-N)
2. Determine next edition number (e.g., edition-47)
3. PUT new document with key `edition-N` (baseRevisionId: null for new)
4. Use full template with all sections (see file for template)
5. Fill in: question, article URL, podcast URL
6. Leave metrics as [pending] for Monitor to fill
7. Update NEW-6 issue description with increment total editions and new timestamp

**Step 3 — Request Social Image:**
1. Block current task to request social image URL from Human
2. Clear message with instructions
3. When Human replies, GET edition-N document to fetch `latestRevisionId`
4. PUT updated body with image URL filled in (replace placeholder)
5. PATCH task issue to `done` with comment describing completion

**Pipeline Refill Check (Weekly):**
1. Read NEW-5 issue description to parse `Active questions:` count
2. IF ≥5 questions: Slack message "✅ Pipeline healthy: {count} active questions"
3. IF <5 questions: 
   - Slack message "🔄 Pipeline low: Only {count} active"
   - Comment on task: "Pipeline below threshold. Awaiting Human to submit candidates for Research Analyst scoring"
   - Block task (assign to Human) to request new candidates

**API Variables (auto-injected):**
- PAPERCLIP_API_URL, PAPERCLIP_API_KEY, PAPERCLIP_AGENT_ID, PAPERCLIP_COMPANY_ID, PAPERCLIP_RUN_ID

---

### Agent: Research Analyst — `30032683-ee3a-404c-ad3c-48d676f931a5`
**Role:** Validate and score questions, maintain question pipeline, perform multi-angle research.

#### Definition of Done Verification Steps
- **Question document format mandatory:** Must follow exact NEW-5 template:
  - H1 heading = the question
  - Score table: **one row per line** (NEVER collapse onto single line)
  - Every section present: score table, Research Summary, Suggested Angle, Assessment
  - Status and Sources as bold-key lines at bottom
  - For unscored: use "Pending" and "—/10" placeholders
- **Research synthesis required:** Before scoring:
  - Consensus (3+ sources agree) forms core of summary
  - Contradictions noted with both positions
  - Specific numbers with source attribution
  - Recency check (flag if no sources <7 days)
- **6 criteria all scored:** Timeliness, Reader Interest, Data Availability, HK/APAC Relevance, Logical Chain Fit, Emotional Resonance
- **Acceptable sources only:** Official data (HKMA, PBOC, BIS), market data (Bloomberg, Reuters), credible media

#### Human Notification on Task Completion
- **Weekly re-score Slack post:** Posts top 3 questions with scores:
  - Format: `1. [Title] — 52/60 (Timeliness: 9, Reader: 8, ...)`
  - Posts via `post_slack_notification.sh` with status emoji
- **Summary comment on task issue:** Updated scores and notable changes posted
- **If blocked:** Slack alert via `notify_pipeline_blocked()` or message to operations

#### Approval/Review Gate Requirements
- **No approval gate for scoring:** RA publishes scores independently
- **NEW-5 document permanence:** NEVER change status of NEW-5 or NEW-6 (stay in backlog)
- **Work tracking separation:** All work goes on dedicated task issues (NEW-7, NEW-8), never on NEW-5/NEW-6
- **Pipeline refill approval:** Human must submit new candidates for scoring approval (Human approval gate on refill request)

#### Escalation When Blocked
- **Blockage scenarios:** No assigned work, missing candidate questions, data source access issues
- **Heartbeat behavior:** If no assigned tasks, exit immediately with no changes (do NOT post "nothing to do")
- **If candidates needed:** Wait for Operations Manager to assign refill task, don't self-assign

#### Heartbeat Procedure for Marking Tasks Done

**When assigned individual question validation task:**
1. Check assigned work: GET `/api/companies/{company_id}/issues?assigneeAgentId={agent_id}&status=todo`
2. For assigned question:
   - Read question description/document
   - Perform multi-angle research via web-search plugin (min 4 patterns):
     - `"{topic}" latest data 2026`
     - `"{topic}" Hong Kong OR APAC impact`
     - `"{topic}" criticism OR risk OR downside`
     - `"{topic}" statistics OR data OR metrics`
   - Cross-source synthesis: consensus, contradictions, data points, recency
   - Create research summary with 3-5 key findings (each with source and data point)
3. Score across 6 criteria (each out of 10):
   - Timeliness (trigger event freshness)
   - Reader Interest (HK/APAC audience relevance)
   - Data Availability (can sources verify claims)
   - HK/APAC Relevance (geographic institutional fit)
   - Logical Chain Fit (fits publication thesis)
   - Emotional Resonance (personal reader impact)
4. Create or update question document in NEW-5 using EXACT template:
   - GET to fetch current `latestRevisionId`
   - PUT with complete sections (no single-line tables!)
   - Suggested angle: 1-2 sentences concrete article angle
   - Assessment: honest evaluation, flag weak questions
5. POST comment on task issue with findings summary
6. Mark task done

**When assigned Weekly Question Re-score:**
1. Fetch all questions: GET `/api/issues/b11b796f-715d-4790-90da-8debabb6aa1d/documents`
2. For each active question:
   - Review latest data on topic (web-search plugin)
   - Re-score all 6 criteria (scores may change due to events)
   - Update question document in NEW-5 with new scores
   - Summarize what changed and why (1-2 sentences)
3. Extract Top 3 by total score with full breakdown
4. POST to Slack via script with formatted scores
5. POST summary comment to task issue with all updated scores
6. Mark task done

**When no assigned tasks:**
- Exit immediately with NO changes, NO comments, NO status updates
- Do NOT post "nothing to do"
- Wait for Operations Manager to assign work

---

## CROSS-COMPANY PATTERNS & GOVERNANCE PRINCIPLES

### Universal Task Completion Checklist
1. **Paperclip Skill Usage:** All agents reference `paperclip` skill for coordination (checkout, inbox, status, comments)
2. **Definition of Done:** Strict verification before marking done (no empty completions)
3. **Evidence Required:** Link to deliverable, report, or artifact must be posted as comment
4. **Escalation Path:** Blockers escalated to board or humans with specific, actionable details
5. **Slack Integration:** Most agents notify Slack on completion with structured, emoji-prefixed messages

### Approval Gate Patterns
- **FundStarter:** Board approval for Core List promotions/removals; Discovery additions unblocked
- **IdeaFactory:** PM audits child task completion; board approval for blockers/scope changes
- **NWV:** Human approval for pipeline refill; no approval for scoring/document updates

### Document Permanence Pattern (NWV)
- **NEW-5 & NEW-6 must ALWAYS stay in backlog:**
  - Never change status to in_progress/blocked/done
  - Never assign to agents
  - Only child documents updated via PUT
  - Work tracking on separate task issues

### Heartbeat Philosophy
1. **Check for assigned work first** (most agents)
2. **Complete assigned work using multi-step procedures** (not rushed single operations)
3. **Post findings/evidence as comments** (not silent completion)
4. **Mark done only after all verification + notifications** (never mark done early)
5. **If no work: exit silently** (NWV Research Analyst pattern)

---

## Note on OpenClaw
OpenClaw (mentioned in initial request) was not found in the active instance. The current Paperclip instance contains only:
- **FundStarter** (ID: 211243a4-3547-44fa-bc65-308b8982f5c8)
- **IdeaFactory** (ID: e9d7733b-7adb-4885-ae21-7c22b7c8b3dc)
- **New World Value** (ID: bf8c322a-ed79-4421-9fff-b4be5ee9a148)

See `/Users/home/paperclip/todo-openclaw.md` for OpenClaw planning if additional context needed.
