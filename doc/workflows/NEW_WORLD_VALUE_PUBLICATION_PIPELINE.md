# New World Value: Publication Pipeline Workflow

**Company:** New World Value (NWV)  
**Type:** Document-Driven Agent Workflow  
**Last Updated:** 2026-04-25  
**Status:** Active

---

## Overview

The New World Value publication pipeline is a **document-centric workflow** where agents respond to updates in shared documents, not task assignments. This design allows flexible, asynchronous collaboration between Research Analyst, Operations Manager, Promoter, and Monitor agents.

**Key principle:** Tasks stay in `backlog` or `done` because the real work happens in **issue documents** (NEW-5, NEW-6) and **comments** (coaching/decisions).

---

## Workflow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    HUMAN INITIATES WORK                          │
│              "What question should I use this week?"              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ NEW-5: Question Pipeline (NEW-5/question-N documents)            │
│ ─────────────────────────────────────────────────────────────────│
│ Role: RESEARCH ANALYST                                           │
│ Trigger: Human request or routine schedule                       │
│ Action: Score & rank candidate questions                         │
│ Documents: question-1 through question-10 (scoring tables)       │
│ Output: Updated ranking with scores/notes                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼ (Human picks question)
┌──────────────────────────────────────────────────────────────────┐
│ NEW-6: Performance Log (NEW-6/edition-N documents)               │
│ ─────────────────────────────────────────────────────────────────│
│ Role: OPERATIONS MANAGER                                         │
│ Trigger: NEW question selected + article/podcast URLs ready     │
│ Action: Create edition-N doc with all publish metadata           │
│ Documents: edition-1, edition-2, edition-3...                   │
│ Content: Question text, article URL, podcast URL, social image  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼ (Document present + complete)
┌──────────────────────────────────────────────────────────────────┐
│ Promoter & Monitor Trigger (Routine-Based)                       │
│ ─────────────────────────────────────────────────────────────────│
│ Role: PROMOTER (social posting) & MONITOR (tracking)             │
│ Trigger: edition-N document created/updated in NEW-6             │
│ Action: Post to social, track performance metrics                │
│ Frequency: Routine fires when NEW-6 doc updates detected         │
│ NO TASK ASSIGNMENT NEEDED — doc presence = work trigger          │
└──────────────────────────────────────────────────────────────────┘
```

---

## Issue Map

| Issue | Title | Type | Role | Status | Purpose |
|-------|-------|------|------|--------|---------|
| **NEW-5** | Question Pipeline | Document Store | Research Analyst | `backlog` | Central ranking of all candidate questions |
| **NEW-6** | Performance Log | Document Store | Operations Manager | `backlog` | Archive + metadata for published editions |
| **NEW-7** | Review and research the Question List | Work Task | Research Analyst | `done` | Research + rescore questions based on latest news |
| **NEW-86** | What question should I use this week? | Request Task | Operations Manager | `done` | Human asks which question to publish next |
| **NEW-91** | I have just posted this, please follow up | Work Task | Operations Manager | `done` | Post-publish pipeline coordination |

---

## Agent Roles & Responsibilities

### **Research Analyst** (30032683)
**Triggers:**
- Human asks: "What question should I use this week?" (NEW-86 style)
- Routine: Daily/weekly rescore based on news (NEW-7 style)
- Tavily web search API availability

**Responsibilities:**
- Re-evaluate all candidate questions against latest market data
- Update scoring tables in NEW-5/question-N docs
- Rank top 3–5 questions with rationale
- Retire outdated questions
- Provide 1–2 recommended "best next question" based on current events

**SLA:** 24–48 hours from request to score update
**Blocks:** Tavily 401 errors → escalate API access to board

**Example output:**
```
Top 3 Questions:
1. Gold: Is it too late to buy? - 52/60
2. China as investor bet - 50/60  
3. Bitcoin digital gold test - 40/60

Best next: Gold (highest score + timeliness)
```

---

### **Operations Manager** (69c6ebd1)
**Triggers:**
- Human selects a question for publication
- Human provides article/podcast URLs + social image
- NEW-6 edition document needs creation

**Responsibilities:**
- Confirm which question from NEW-5 the article covers
- Create NEW-6/edition-N document with:
  - Question text
  - Article URL (read)
  - Podcast URL (listen)
  - Social image URL
  - Edition metadata (date, performance tracking fields)
- Close NEW-86/NEW-91 tasks when pipeline complete
- Coordinate with Promoter/Monitor (via doc presence, not task assignment)

**SLA:** Complete edition doc within 4 hours of URLs provided
**Blocks:** Ambiguous question match → ask Human for clarification

**Critical Rule:** 
> ⚠️ **NEVER** directly assign tasks to Promoter or Monitor. The presence of an updated `edition-N` document in NEW-6 is the ONLY trigger they need.

---

### **Promoter** (4d852d5f-7065)
**Triggers:**
- Routine watches for NEW-6 document updates
- Edition-N document present & complete
- Social image URL populated

**Responsibilities:**
- Post to social media (X/Twitter, LinkedIn, etc.)
- Use social image + edition text
- Track post engagement metrics
- **Never** checks task assignments — only document updates

**SLA:** Post within 1 hour of edition doc completion
**Status:** If not posting, check:
  1. Is edition-N doc actually complete (all fields present)?
  2. Did NEW-6 document get updated (not just created)?
  3. Escalate to Engineering if doc is present but Promoter silent

---

### **Monitor** (8fab8d4f-5e6c)
**Triggers:**
- Routine watches for NEW-6 document updates
- Edition-N document present

**Responsibilities:**
- Track article reads, listens, subscriber growth
- Update performance fields in edition-N doc
- Provide weekly/monthly performance summary
- Alert if metrics drop below baseline

**SLA:** Performance data refreshed daily
**Status:** Background routine — no escalation needed unless anomaly detected

---

## Workflow Steps: "What Question Should I Use This Week?"

### Step 1: Human Request
```
Human creates or comments on issue (e.g., NEW-86):
"What question should I use this week?"
```

### Step 2: Research Analyst Responds
```
Timeline: 24–48 hours

Research Analyst:
1. Fetches latest market data (Tavily search)
2. Re-scores all questions in NEW-5/question-N docs
3. Identifies top 3–5 by score + timeliness
4. Posts comment: "Best next question: [Gold] (52/60)"
5. Updates NEW-5 documents with latest scores
6. Closes NEW-86 with recommendation

Example comment:
"Rescore complete. Top 3:
1. Gold (52/60) - recent pullback creates angle
2. China (50/60) - portfolio implications
3. Bitcoin (40/60) - digital gold test

Recommend: Gold. I can pivot to China follow-up next week."
```

### Step 3: Human Picks Question & Provides Assets
```
Human comments on NEW-91 or NEW-86:
"Publishing the Gold question this week.
Article: [URL]
Podcast: [URL]  
Image: [uploaded]"
```

### Step 4: Operations Manager Creates Edition Document
```
Timeline: 4 hours max

Operations Manager:
1. Confirms which question text matches the article
2. Creates NEW-6/edition-3 document with:
   - Question: "Gold: Is it too late to buy after the recent rally?"
   - Article URL
   - Podcast URL
   - Social image URL
   - Performance tracking fields (reads, listens, subscribers)
3. Closes NEW-91 with comment: "Edition-3 ready for Promoter/Monitor"

Edition document structure:
---
# Gold: Is it too late to buy after the recent rally and pullback?

| Article | Podcast | Image |
| ------- | ------- | ----- |
| [Read](...) | [Listen](...) | [Social Image URL] |

## Performance Tracking
- Published Date: 2026-04-25
- Reads: [auto-updated by Monitor]
- Listens: [auto-updated by Monitor]  
- New Subscribers: [auto-updated by Monitor]

## Question Metadata
- Score at publication: 52/60
- Rank: #1
- Angle: Recent pullback creates buyer opportunity
---
```

### Step 5: Promoter & Monitor Auto-Trigger
```
No manual assignment needed.

When Promoter's routine fires:
1. Detects NEW-6 updated
2. Finds edition-3 document
3. Sees social image URL
4. Posts to Twitter/LinkedIn with edition text + image
5. Updates post links in edition-3 doc

When Monitor's routine fires:
1. Polls edition-3 for reads/listens/subscribers
2. Updates performance fields
3. Compares vs. baseline
4. Alerts if performance anomaly detected
```

---

## Key Design Principles

### 1. **Document-Driven, Not Task-Driven**
- **Wrong:** Create task → assign to Promoter → Promoter executes
- **Right:** Update NEW-5/NEW-6 docs → Promoter routine detects update → executes

**Reason:** Agents can work asynchronously without task pile-up. Board can update docs anytime.

### 2. **No Direct Agent-to-Agent Assignments**
- Agents coordinate via **shared documents** and **comments**
- Comments are for coaching, decisions, and exceptions
- Tasks stay in `backlog` or `done` to avoid clutter

**Reason:** Keeps inbox clean, focuses agents on document state, not task state.

### 3. **SLAs Are Explicit**
- Research Analyst: 24–48 hours per rescore
- Operations Manager: 4 hours per edition doc
- Promoter: 1 hour per social post
- Monitor: Daily performance refresh

**If blocked:** Comment on issue explaining blocker + who needs to act.

### 4. **Blockers Are Explicit, Not Silent**
- Research Analyst blocked by Tavily 401? → escalate with comment
- Operations Manager unsure which question? → ask Human with comment + wait
- Promoter silent? → Check doc completeness, then escalate to Engineering

---

## Troubleshooting

### Research Analyst Scoring Stalled (NEW-7 > 3 days old)

**Check:**
1. Is Tavily API accessible? (research-analyst should mention 401 in comments)
2. Is the routine scheduled? (may need manual trigger)
3. Did human submit a question but forgot to notify agent?

**Action:**
- If API down: Escalate to board in comments → `blocked` status
- If routine issue: Re-run manually or check routine config
- If forgotten: Human comments on NEW-86 to re-trigger

---

### Operations Manager Stuck on Edition Document

**Check:**
1. Is the question ambiguous? (multiple matches in NEW-5?)
2. Are all URLs provided? (article, podcast, image)
3. Did doc update fail silently?

**Action:**
- Ask Human for clarification in comments
- Verify all fields with Human before creating edition doc
- If API error: Retry with fresh auth token

---

### Promoter Not Posting (Edition Doc Exists, But No Post)

**Check:**
1. Is edition-N doc **complete** (all fields present)?
2. Did edition-N doc **actually update** (or just created)?
3. Is Promoter routine running? (check Monitor for errors)

**Action:**
- If doc incomplete: Operations Manager adds missing fields → triggers re-detection
- If routine stalled: Engineering escalation (not agent task)
- Do NOT create a new task for Promoter — fix the doc instead

---

### Monitor Performance Data Missing

**Check:**
1. Are article/podcast URLs live and tracking-enabled?
2. Is Monitor routine running?
3. Are performance fields being populated in edition-N doc?

**Action:**
- If URLs dead: Update edition doc with live URLs
- If routine stalled: Engineering escalation
- Check baseline metrics from previous edition for comparison

---

## Document Templates

### Question Document (NEW-5/question-N)
```markdown
# [Question text as H1 — ends with ?]

| Criteria | Score | Notes |
| -------- | ----- | ----- |
| Timeliness | X/10 | [Justification] |
| Reader Interest | X/10 | [Why readers care] |
| Data Availability | X/10 | [Where to get data] |
| HK/APAC Relevance | X/10 | [Local impact] |
| Logical Chain Fit | X/10 | [How it connects to ongoing themes] |
| Emotional Resonance | X/10 | [Why it matters personally] |

**Total Score:** XX/60

## Research Summary
- [Finding 1 with source]
- [Finding 2 with source]
- [Finding 3 with source]

## Suggested Angle
[1–2 sentences describing the article approach]

## Assessment / Next Steps
- [Evaluation notes]
- [Whether to publish or refine]

**Status:** Candidate | Updated (date) | Selected | Published | Retired
**Sources:** [Comma-separated source list]
```

### Edition Document (NEW-6/edition-N)
```markdown
# Edition #N: [Question Title]

## Publish Date
2026-04-25

## Content Links
| | Link |
|---|------|
| Read | [Article URL] |
| Listen | [Podcast URL] |
| Social Image | [Image URL] |

## Question
[Question text from NEW-5]

## Performance Metrics
- Reads: [auto-updated]
- Listens: [auto-updated]
- New Subscribers: [auto-updated]
- Social Posts: [Promoter posts links here]

## Question Metadata
- Score at Publication: 52/60
- Recommended Rank: #1
- Research Angle: [from NEW-5]
- Published By: Operations Manager (69c6ebd1)
- Promoted By: Promoter (routine trigger)
```

---

## When to Escalate

| Scenario | Escalate To | How |
|----------|------------|-----|
| Tavily API down (401, quota) | Board + Engineering | Comment on NEW-7 with `blocked` status |
| Ambiguous question match | Human (board user) | Comment asking for clarification + wait |
| Promoter not posting after 2hrs | Engineering | Check doc, if complete → escalation protocol |
| Monitor not updating metrics | Engineering | Check routine config + check for API errors |
| SLA miss (scoring takes 5+ days) | Human (board user) | Ask if new priority or if routine needs restart |

---

## Success Metrics

✅ **Question Pipeline Updated**: Within 48 hours of human request  
✅ **Edition Document Ready**: Within 4 hours of URLs provided  
✅ **Social Post Live**: Within 1 hour of edition doc complete  
✅ **Performance Tracked**: Daily updates in edition-N doc  
✅ **Zero Blocked Tasks**: Agents coordinate via docs, not task assignments

---

## See Also

- [NEW-5: Question Pipeline Document Store](/NEW/issues/NEW-5)
- [NEW-6: Performance Log Document Store](/NEW/issues/NEW-6)
- [Research Analyst (Agent Profile)](/NEW/agents/30032683-ee3a-404c-ad3c-48d676f931a5)
- [Operations Manager (Agent Profile)](/NEW/agents/69c6ebd1-ec4c-4ac5-98ea-6e2ea0ff0a07)
- [Promoter (Agent Profile)](/NEW/agents/4d852d5f-7065-4cec-bc73-859af6a49bfa)

