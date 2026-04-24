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

## Plugin Credential Validation (BEFORE Agent Assignment)

**CRITICAL**: Agents that use plugins (tools) MUST have all required credentials available before being assigned tasks. Failure to validate causes silent failures and wasted work.

### Why This Matters

Each plugin requires environment variables:
- `web-search` → needs `TAVILY_API_KEY`
- `x-api` → needs `X_BEARER_TOKEN`
- `bitly` → needs `BITLY_ACCESS_TOKEN`
- `slack` → needs `SLACK_WEBHOOK_URL`

If an agent's instructions mention a plugin but the secret is NOT in the agent's `adapterConfig.env`, the plugin will fail with a cryptic error at runtime.

**Real example from NWV-7**: Research Analyst tried to use `web-search` plugin → but Tavily API key wasn't provisioned as a company secret → agent marked blocked, no clear error message.

### Pre-Assignment Validation Checklist

**When creating or updating an agent:**

1. **Scan instructions for plugin mentions**
   ```bash
   grep -i "web-search\|bitly\|slack\|x-api\|web-crawl" AGENTS.md
   ```

2. **For each plugin found, create a security table in instructions:**
   ```markdown
   ## 🔑 Required Secrets
   
   | Plugin | Environment Var | Secret Name | Status |
   |--------|-----------------|------------|--------|
   | web-search | TAVILY_API_KEY | tavily_api_key | ✅ Provisioned |
   | x-api | X_BEARER_TOKEN | x_bearer_token | ✅ Provisioned |
   ```

3. **Verify all secrets exist in company**
   ```bash
   COMPANY_ID="..."
   curl -s http://localhost:3100/api/companies/$COMPANY_ID/secrets \
     -H "Authorization: Bearer test-key" | jq '.[] | {name, id}'
   ```

4. **Add ALL secrets to agent's env config**
   ```json
   {
     "adapterConfig": {
       "env": {
         "TAVILY_API_KEY": {
           "type": "secret_ref",
           "secretId": "2f767de6-...",
           "version": "latest"
         },
         "X_BEARER_TOKEN": {
           "type": "secret_ref",
           "secretId": "abc123...",
           "version": "latest"
         }
       }
     }
   }
   ```

5. **Test immediately on first assignment**
   - Don't wait for scheduled heartbeat
   - Manually trigger a run on a simple task
   - Watch for "invalid secret reference" or "plugin not found" errors
   - If error occurs, fix before assigning critical tasks

### Creating Missing Secrets (Quick Reference)

```bash
# Example: Create Tavily API Key secret
curl -X POST http://localhost:3100/api/companies/{COMPANY_ID}/secrets \
  -H "Authorization: Bearer test-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "tavily_api_key",
    "provider": "local_encrypted",
    "value": "tvly-dev-[YOUR_KEY]"
  }'
```

### Red Flags (Don't Do These)

| ❌ WRONG | ✅ RIGHT |
|---------|----------|
| Create agent without scanning for plugin usage | Audit instructions first, list all plugins, create secrets |
| Add secret to company but NOT to agent's env | Add `secret_ref` entry to agent's `adapterConfig.env` |
| Mention plugin in instructions with no setup docs | Include "Required Secrets" table showing which secrets are pre-configured |
| Test later (wait for heartbeat) | Test immediately after assignment with manual task trigger |
| Assume global env vars are available | Always verify agent's `env` config holds the references |

### Documentation (Add to Every Agent Using Plugins)

In agent instructions, add this section at the top:

```markdown
## 🔐 Plugin Configuration

This agent uses external plugins that require API credentials.

**All required secrets are pre-configured:**
- ✅ Tavily (`web-search`, `web-crawl`): `TAVILY_API_KEY`
- ✅ X/Twitter (`x-api`): `X_BEARER_TOKEN`
- ✅ Slack: `SLACK_WEBHOOK_URL` (webhook-based, no token needed)

**Status**: ✅ Ready to use — no additional setup required

If you see errors like "Invalid secret reference" or "Plugin not found," report to platform ops immediately.
```

---

## System: Plugin Config Architecture (CRITICAL SETUP REQUIREMENT)

**STATUS**: Architectural design - plugin config fields reference secret UUIDs, NOT raw keys or names

### The Correct Pattern

Global plugin settings store **secret UUIDs** (not raw keys, not secret names):

**Global Plugin Settings** (CORRECT):
```json
{
  "provider": "tavily",
  "maxResults": 5,
  "tavilyApiKeyRef": "2f767de6-4869-48b7-b2f4-a3578fd9b535",
  "xApiKeyRef": "7bb6425f-1605-4f65-a90a-4c24337796b5",
  "googleApiKeyRef": "12345678-1234-1234-1234-123456789012",
  "googleEngineIdRef": "87654321-4321-4321-4321-210987654321"
}
```

### Why UUIDs, Not Names or Raw Keys?

1. **Plugin schema declares `format: "secret-ref"`** on these fields
2. Paperclip validates all values match UUID pattern at config save time
3. At runtime, plugin calls `ctx.secrets.resolve(uuidValue)` → Paperclip looks up the UUID → returns decrypted value
4. Raw keys (e.g., `tvly-dev-...`) fail UUID validation with "Invalid secret reference"
5. Secret names (e.g., `tavily_api_key`) also fail UUID validation

### Setup Flow (Correct Order)

1. **Create company secrets** (identifies them in the store):
   ```bash
   curl -X POST /api/companies/{ID}/secrets \
     -d '{ "name": "tavily_api_key", "value": "tvly-dev-..." }'
   # Response includes secretId: "2f767de6-..."
   ```

2. **Get secret UUIDs from company secrets list**:
   ```bash
   curl /api/companies/{ID}/secrets
   # Shows all names + IDs
   ```

3. **Configure plugin with those UUIDs**:
   ```bash
   curl -X POST /api/plugins/{pluginId}/config \
     -d '{
       "configJson": {
         "tavilyApiKeyRef": "2f767de6-4869-48b7-b2f4-a3578fd9b535"
       }
     }'
   ```

4. **Plugin runtime resolves UUIDs → decrypted values**:
   - Plugin loads config with UUID
   - Plugin calls `ctx.secrets.resolve("2f767de6-...")`  
   - Paperclip looks up UUID → finds secret → decrypts value
   - Plugin gets the real API key

### Common Mistakes (❌ Don't Do These)

| ❌ WRONG | Why | ✅ CORRECT |
|---------|-----|-----------|
| `tavilyApiKeyRef: "tvly-dev-xxx"` | Raw key fails UUID validation | `tavilyApiKeyRef: "2f767de6-..."` |
| `tavilyApiKeyRef: "tavily_api_key"` | Secret name fails UUID validation | Use the secret's UUID ID |
| Configure plugin, skip creating secrets | Plugin tries to resolve non-existent UUID | Create secret first, use its UUID |
| Assume agent env overrides plugin config | Agent env ignored for plugins | Plugin tools use ONLY global config |

### Error: "Invalid secret reference: [value]"

**Cause**: The value in plugin config field doesn't match UUID pattern

**Fix**: 
1. Get list of company secrets: `GET /api/companies/{ID}/secrets`
2. Find the secret you need, copy its `id` field
3. Update plugin config with that UUID, not the name or key value

---

## Error Escalation Protocol (CRITICAL)

**PURPOSE**: When infrastructure or API errors occur, agents MUST escalate in a structured way instead of retrying blindly or failing silently.

**PRINCIPLE**: Errors fall into two categories:
- **Transient** (5xx errors, timeouts, network blips) → **RETRY** (automatic backoff)
- **Structural** (4xx errors, malformed requests, invalid references) → **ESCALATE** (stop work, post comment)

### Decision Tree

```
Error occurs (API call fails, plugin error, etc.)

Is it a 5xx status code (500, 502, 503, 504)?
├─ YES → Retry up to 3x with exponential backoff (1s, 2s, 4s)
│         If still fails after 3 retries → Go to "Escalate"
└─ NO → Check next

Is it a 4xx status code (400, 401, 403, 404, 422)?
├─ YES → Go to "Escalate" (structural error, retrying won't help)
└─ NO → Check next

Is it a plugin error (tool not found, invalid secret, etc.)?
├─ YES → Go to "Escalate" (infrastructure issue)
└─ NO → Treat as unknown error → Escalate
```

### Escalate: Structured Error Posting

When escalating, **ALWAYS** post in this format:

```markdown
🚨 **ERROR ESCALATION** — Work blocked on [Step Name]

**Error Type**: [API error | Plugin error | Timeout | Invalid reference | etc.]

**Endpoint**: [URL that failed]
```
GET /api/issues/629c0ffb.../documents/edition-3.md
```

**HTTP Status**: [code and reason]
```
404 Not Found
```

**Response Body**:
```
[Full error response from server, if available]
```

**Attempted Fix**:
- Retried 3x with backoff: ❌ Still fails
- Checked configuration: [What I checked and result]

**Next Steps**: 
- Cannot proceed without human intervention
- This issue is blocked and requires platform ops review

**Required Action**: Verify API endpoint, check if secret is provisioned, check if resource exists
```

Then **ALWAYS DO THIS**:
1. Post the comment above
2. Update issue status to `blocked` with reason: "API error on [endpoint]"
3. **STOP EXECUTION** — DO NOT RETRY, DO NOT GUESS, DO NOT CONTINUE

### Anti-Patterns (❌ Don't Do This)

| ❌ WRONG | ✅ RIGHT |
|---------|----------|
| Retry forever if API fails | Retry 3x for 5xx, escalate on 4xx immediately |
| Fail silently with no comment | Post structured error comment before stopping |
| Guess what the error means | Quote the actual error response |
| Try workarounds (hardcode URLs, guess different endpoints) | Post error and wait for human review |
| Mark task done despite errors | Mark blocked with error details |
| Continue with next step even though previous failed | Stop execution, escalate, wait |

### Real Example: Correct Error Escalation

**Scenario**: Promoter agent tries to update issue with document, gets 404

**WRONG** ❌:
```
Comment: "Got error. Trying different endpoint."
→ Tries 10 different endpoint variations
→ Still fails
→ Marks done anyway
```

**RIGHT** ✅:
```
Comment:
🚨 **ERROR ESCALATION** — Work blocked on Document Update

**Error Type**: API route not found

**Endpoint**:
```
PATCH /api/companies/bf8c322a-ed79-4421-9fff-b4be5ee9a148/issues/629c0ffb-a6dc-4e54-b16c-63dc09f14c9b
```

**HTTP Status**: 404 Not Found

**Response Body**:
```
{"status": 404, "error": "Route not found"}
```

**Attempted Fix**:
- Retried 3x with backoff: ❌ Still 404
- Checked: Uses correct company ID: ✅
- Checked: Issue ID is valid: ✅

**Next Steps**: 
- API path may have changed. See doc/API_PATH_REFERENCE.md
- Correct path might be: `PATCH /api/issues/{id}` (without company prefix)
- Cannot proceed; blocked on infrastructure clarification.

Status: blocked
```

Then manual fix (human or ops checks): Yes, wrong path! Should be `/api/issues/{id}`.

Agent retries with correct path: ✅ Works

### What Happens After Escalation?

When an issue is marked `blocked` with error escalation:

1. **Platform monitors** see blocked issues (ops dashboard)
2. **Human ops** reads the structured error comment
3. **Human ops** either:
   - Fixes infrastructure (creates missing secret, fixes API route)
   - Fixes agent config (adds missing env var, corrects endpoint)
   - Escalates to engineering (reports API bug)
4. **Agent can proceed** once fix is in place (operator resumes agent or marks issue unblocked)

### Error Escalation Template (Copy & Paste)

```markdown
🚨 **ERROR ESCALATION** — Work blocked on [STEP NAME]

**Error Type**: [Type]

**Endpoint**:
​```
[Full URL]
​```

**HTTP Status**: [Code]

**Response Body**:
​```
[Full error response]
​```

**Attempted Fix**:
- Retried [N]x with backoff: [Result]
- Checked [condition]: [Result]

**Next Steps**: [What needs to happen to unblock]

**Requires**: Human ops review
```

Then:
1. Post comment using template above
2. Status: `blocked`
3. Reassign to ops or platform team
4. Stop execution

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
