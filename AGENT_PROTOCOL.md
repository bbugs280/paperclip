# Agent Paperclip Protocol

**Shared protocol for all Paperclip agents across all companies.**

## Golden Rule

**All Paperclip operations must use the `paperclip` skill. Never make direct HTTP calls to the Paperclip API.**

### Why?

- ✅ Automatic environment variable injection (`PAPERCLIP_API_KEY`, `PAPERCLIP_TASK_ID`, etc.)
- ✅ Built-in retry logic and error handling
- ✅ Proper auth context and company/project scoping
- ✅ Activity logging and audit trail
- ✅ Consistent API versioning across agents

### Why NOT direct HTTP calls?

- ❌ Missing env vars (`PAPERCLIP_API_KEY`, `PAPERCLIP_TASK_ID`, `PAPERCLIP_RUN_ID`)
- ❌ No automatic context injection
- ❌ Breaks when API URLs change
- ❌ No retry logic on transient failures
- ❌ Harder to debug and trace

---

## Standard Agent Instructions Pattern

All agent instructions should follow this structure:

```markdown
## Tools

**[Domain] Operations** — Use [appropriate tool] for [domain]:
- List of domain-specific tools with examples

**Paperclip Operations** — Use the `paperclip` skill (NOT direct API calls):
- Step 1: Fetch (read current task)
- Step 2: Update (change status, priority, assignee)
- Step 3: Comment (post progress, findings)
- Step 4: [Query operations if needed]
- Step 9: Delegate (create follow-up tasks, assign to agents)

## Heartbeat Procedure

1. **paperclip Step 1 (Fetch)**: Read your assigned task context
2. [Domain-specific work...]
3. **paperclip Step X**: [Update/comment as needed]
4. **paperclip Step 2**: Mark task `done` when complete
```

---

## Paperclip Skill Steps Reference

| Step | Action | Use Case |
|------|--------|----------|
| **1** | Fetch | Read current task details, context, parent epic |
| **2** | Update | Change status (todo/in_progress/done/blocked), priority, assignee |
| **3** | Comment | Post findings, progress updates, blocker descriptions |
| **4** | Query | Search for other issues, get issue context |
| **5** | Create | Make a new issue (rarely needed) |
| **9** | Delegate | Create follow-up task, assign to another agent |

### Example Usage in Agent Instructions

```markdown
Using paperclip skill Step 1 (Fetch): Read your assigned task to get the latest context.

Using paperclip skill Step 3 (Comment): Post findings about untracked work.

Using paperclip skill Step 2 (Update): If you find blockers, update the issue status/priority.

Using paperclip skill Step 9 (Delegate): Create a follow-up issue for the next agent in the pipeline.

Using paperclip skill Step 2: Set your task status to `done`.
```

---

## Definition of Done (DoD)

**CRITICAL**: Before marking a task `done`, agents MUST verify:

1. **Deliverable exists** — Not just a spec or plan, but actual output:
   - ✅ Copy written → Posted in issue comment (not just outlined)
   - ✅ Code built → Deployed/merged (not just local)
   - ✅ Screenshots/video → Files uploaded (not just a spec)
   - ✅ Analysis completed → Document/table posted (not just started)
   - ❌ "Design spec created" → Not done. Link to actual design.
   - ❌ "Will do next" → Not done. Do it now, then mark done.

2. **Deliverable is verified** — Agent must confirm:
   - The output exists and is accessible
   - The output meets quality standards defined in the task
   - If the output requires human review, DON'T mark done

3. **Testing/validation complete** (if applicable):
   - Code tests pass
   - Builds succeed
   - Functionality works as specified

4. **Comments posted with results**:
   - Link to deliverable artifact (file, PR, deploy, document link)
   - Summary of what was delivered
   - Any blockers or follow-ups needed

### Example: WRONG vs RIGHT

**WRONG** ❌:
```
Status: done
(No comment, no deliverable attached)
```

**RIGHT** ✅:
```
Status: in_progress → (work) → then:
Comment: "Copy drafted and posted in document at [link]"
Attachment or link to actual deliverable
Status: done
```

### PROHIBITED Anti-Patterns (Real failures from IDE-115 audit)

**❌ Pattern 1: Scanned report instead of actual work**
```
Comment: "Scanned GitHub, found 10 commits"
Status: done
(No artifacts, builds, or outputs)
→ WRONG. What was actually BUILT or DELIVERED?
→ Example: IDE-117, IDE-126 ("Build," "TestFlight") marked done with only scan reports
```

**❌ Pattern 2: Specification sheet instead of deliverable**
```
Comment: "Created spec for how to capture screenshots"
Status: done
(No actual screenshots, only instructions)
→ WRONG. Who will execute? Create follow-up + reassign.
→ Example: IDE-127 (Agent posted 8-asset spec, not the 8 assets)
```

**❌ Pattern 3: Marked done with zero description**
```
Comment: "Done."
Status: done
(No explanation of what was delivered)
→ DEMAND EVIDENCE. "Post links to deliverables or reopen."
→ Example: IDE-120, IDE-121 ("Build MVP core," "Marketing launch prep")
```

**❌ Pattern 4: Acknowledged existing work, marked done anyway**
```
Comment: "The plan already exists from previous heartbeat."
Status: done
(No new work by this agent)
→ WRONG. Task shouldn't exist or should be skipped.
→ Example: IDE-119 (duplicate design work)
```

---

## Human-Required Tasks: Reassign, Don't Fake

**CRITICAL RULE**: If a task requires human execution or physical action, **REASSIGN IT TO THE HUMAN**, don't mark it done.

### Examples of Human-Required Tasks

| Task | Problem | Fix |
|------|---------|-----|
| "Collect screenshots from iPhone" | Requires device + physical interaction | Create follow-up task; assign to user (with `parentId` = original) |
| "Call customer for feedback" | Requires voice communication | Reassign via paperclip Step 9 (Delegate) |
| "Design new logo in Figma" | Requires design tool + creative judgment | Reassign to designer; create parent task |
| "Record demo video" | Requires screen + audio capture skills | Reassign to human with equipment |
| "Review PR and approve" | Requires human judgment / governance | Reassign to appropriate reviewer |

### Pattern: Agents Should NOT Mark Done

If you can't physically do the work or it requires human judgment beyond data processing:

1. **Create a spec or brief** (post in comment)
2. **Create a follow-up issue** assigning to the human
3. **DO NOT mark your task done** - mark it `blocked` with comment: "Waiting for human execution of follow-up task [ID]"
4. **Link the follow-up task** in parent issue context

### Real Example: IDE-127 (WRONG PATTERN)

**What happened:**
- Task: "Collect screenshots & demo video"
- Agent action: Created a **spec** for how to collect them
- Status: Marked `done` ❌

**What should have happened:**
1. Agent creates spec ✅
2. Agent comments: "Spec posted. Cannot execute without device. See follow-up task below."
3. Agent creates follow-up: "IDE-127-follow: Execute screenshot capture" → Assign to user
4. Agent marks original: `blocked` (reason: "Awaiting human capture execution")

Or if agent truly can't start:
- Post comment: "Assigned task requires iPhone + TestFlight build. Cannot execute."
- Mark status: `blocked`
- Reassign back to PM with comment

---

## Task Deliverable Inventory

When defining tasks in instructions or creating sub-tasks, specify EXACTLY what output is expected:

### Template

```markdown
## [Task Title]

**Deliverable**: 
- [ ] Type: (document | code | file | analysis | etc.)
- [ ] Format: (markdown | PDF | JSON | video | etc.)
- [ ] Location: (issue comment | repo path | external link | etc.)
- [ ] Acceptance: (criteria for "done")

**Human Required?**: Yes / No
- If Yes: Who? (designer | PM | end user | etc.)

**Example Output**:
[Link or description of what done looks like]
```

### Real Example: Good Definition

```markdown
## Marketing Launch Prep

**Deliverable**: 
- [ ] Type: document
- [ ] Format: markdown + links
- [ ] Location: issue comment + linked Google Doc
- [ ] Acceptance: Copy reviewed by PM, includes 3 messaging angles, social media sample posts

**Human Required?**: Email sending (assign as follow-up)
```

---

## Verification Checklist: Before Marking "done"

**Agents MUST answer these questions before changing status to `done`:**

- [ ] **Does a deliverable exist?** (file, document, code, artifact, etc. — not just a plan)
- [ ] **Can I link to it?** (issue comment link, repo commit, file path, external link)
- [ ] **Did I post the link in a comment?** (not just in my head)
- [ ] **Can another person access it?** (not locked to my account)
- [ ] **Does it meet the task's definition of done?** (not a spec of how someone else will do it)
- [ ] **Is it verified working?** (builds pass, code compiles, tests pass, output correct)
- [ ] **Would I accept this if someone else submitted it?** (honest assessment)

**If you answered NO to any question → DO NOT mark done. Reopen or reassign.**

---

## Auditing Task Completion: Board/PM Checklist

When reviewing a task marked "done," verify:

1. **Comment exists** with deliverable summary
2. **Link in comment** to actual artifact (not just "done")
3. **Artifact is accessible** (try clicking link)
4. **Artifact matches task** (e.g., build artifact for "create build," not scan report)
5. **If human-required → follow-up task exists** (not marked done, marked blocked)
6. **No red flags**:
   - Single-word comment ("Done")
   - Specification instead of deliverable
   - Scanning/planning instead of execution
   - Zero explanation of output

**If audit fails → Reopen issue + demand completion.**

---

## Company-Specific Patterns

### IdeaFactory (IDE prefix)

**Allowed agents** to use direct API calls:
- ❌ None (use paperclip skill)

**Agents**:
- Strategist (evaluates ideas)
- PM (triage, assign, coordinate)
- Build Monitor (GitHub monitoring)
- Marketer (launch tasks)
- Monitor (health checks)

### FundStarter (FUN prefix)

**Agents**:
- Research Analyst (Daily)
- Talent Scout (Weekly)
- Investment Strategist
- Client Advisor

**Pattern**: All use paperclip skill exclusively

### New World Value (NWV prefix)

**Agents**:
- Research Analyst
- [Other TBD]

**Pattern**: All use paperclip skill exclusively

---

## Troubleshooting

### Error: "Missing Paperclip environment variables"

**Cause**: Agent is making direct HTTP calls instead of using paperclip skill

**Fix**: Update agent instructions to use `paperclip` skill for all Paperclip operations

### Error: "API route not found"

**Cause**: Direct API call to non-existent endpoint

**Fix**: Same as above - switch to paperclip skill

### Error: "PAPERCLIP_TASK_ID is undefined"

**Cause**: Trying to access env vars in direct API calls

**Solution**: These vars are only available inside paperclip skill context. Use the skill instead.

---

## Migration Checklist

For existing agents making direct API calls:

- [ ] Read agent's current instructions
- [ ] Identify all direct HTTP calls to `/api/issues/*`
- [ ] Map each to appropriate paperclip skill step (1, 2, 3, 4, 9)
- [ ] Document new procedure with paperclip skill steps
- [ ] Test by triggering a heartbeat
- [ ] Verify no "missing env vars" errors
- [ ] Confirm issue status updates properly

---

## File Locations

This protocol applies to all agent instruction files at:
```
/Users/home/.paperclip/instances/default/companies/{companyId}/agents/{agentId}/instructions/AGENTS.md
```

Last updated: 2026-04-19
