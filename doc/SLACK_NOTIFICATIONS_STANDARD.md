# Slack Notifications - Standardized Setup Across All Companies

**Status**: ✅ All 3 companies now use unified FundStarter-standard Slack notifications

This document describes the standardized Slack notification system deployed across FundStarter, IdeaFactory, and New World Value.

---

## Overview

All 3 companies use the same **Python-based, Block Kit-formatted** notification system with company-scoped customization:

| Company | Short Code | Webhook Env Var | Channel | Module Location |
|---------|--------|---------|--------|---------|
| **FundStarter** | FUN | `FUNDSTARTER_SLACK_WEBHOOK` | C0ATTJK4466 | `shared/slack_notifications.py` |
| **IdeaFactory** | IDE | `IDEAFACTORY_SLACK_WEBHOOK` | C0AU5JM5HPT | `shared/slack_notifications.py` |
| **New World Value** | NWV | `NWV_SLACK_WEBHOOK` | (configured) | `shared/slack_notifications.py` |

---

## 1. Configuration

Each company has the same `slack_notifications.py` module with company-specific settings:

### Environment Variables Required

```bash
# Set the Slack webhook URL (one per company)
export FUNDSTARTER_SLACK_WEBHOOK="https://hooks.slack.com/services/T0N55R2BW/B0AU6GCUKPB/YOUR_TOKEN"
export IDEAFACTORY_SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR_WORKSPACE/YOUR_CHANNEL/YOUR_TOKEN"
export NWV_SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR_WORKSPACE/YOUR_CHANNEL/YOUR_TOKEN"

# For issue links (all companies use this)
export PAPERCLIP_API_URL="http://localhost:3100"  # or production URL
```

### Link Generation

All links use environment-based URL generation:
- Base URL: `$PAPERCLIP_API_URL` (defaults to `https://paperclip.local`)
- Format: `{BASE_URL}/{COMPANY_SHORT}/issues/{ISSUE_ID}`
- Example: `http://localhost:3100/FUN/issues/FUN-62`

**NO hardcoded URLs**. All companies pull base URL from `PAPERCLIP_API_URL` environment variable.

---

## 2. Available Notification Functions

All 6 functions are available in every company's `slack_notifications.py`:

### `notify_task_done()`
Post when an agent completes a task with title, agent name, and completion summary.

```python
from slack_notifications import notify_task_done

notify_task_done(
    task_title="Collect Q1 analyst reports",
    issue_id="FUN-15",
    agent_name="Research Analyst",
    completion_comment="Found 8 high-quality reports. Summary in comments.",
    company_short="FUN"  # Auto-detected from module, can override
)
```

**Message Format**:
```
✅ Task Completed

Task: FUN-15
Title: Collect Q1 analyst reports
Completed by: Research Analyst
Time: 14:32 UTC

Completion Notes: Found 8 high-quality reports…

[View Issue] button
```

---

### `notify_pipeline_blocked()`
Alert when an agent's work is blocked.

```python
notify_pipeline_blocked(
    agent="Investment Strategist",
    issue_id="FUN-60",
    reason="Missing findings in task description",
    blocking_item="Scout report not uploaded"  # optional
)
```

**Message Format**:
```
⚠️ Pipeline Blocked

Agent: Investment Strategist
Task: FUN-60
Reason: Missing findings in task description
Severity: 🔴 High

Missing/Required: Scout report not uploaded

🚨 Action Required
Please investigate and resolve to resume pipeline.
```

---

### `notify_brief_published()`
Announce when a daily brief or report is published.

```python
notify_brief_published(
    date="2026-04-18",
    issue_id="FUN-61",
    topics=["Market Analysis", "Expert Insights", "HK Finance News"],
    subscriber_count=1250,
    brief_excerpt="Today's analysis focuses on..."  # optional
)
```

**Message Format**:
```
📰 Daily Brief Published

Date: 2026-04-18
Task: FUN-61
Status: ✅ Ready for Distribution
Reach: 1250 investors

Topics Covered:
• Market Analysis
• Expert Insights
• HK Finance News

Preview: Today's analysis focuses on…
```

---

### `notify_high_impact_finding()`
Surface high-priority findings that need attention.

```python
notify_high_impact_finding(
    expert="Warren Buffett",
    finding="New 13F filing shows 34% tech reallocation",
    signal_type="Filing",
    relevance_score=92,
    impact="Indicates major institutional shift away from tech."  # optional
)
```

**Message Format**:
```
🔴 High-Impact Finding

Expert: Warren Buffett
Signal Type: Filing
Relevance: 92/100

Finding: New 13F filing shows 34% tech reallocation

Why It Matters: Indicates major institutional shift away from tech.
```

---

### `notify_watchlist_updated()`
Track registry or watchlist changes (adapted per company).

```python
notify_watchlist_updated(
    date="2026-04-18",
    count=12,  # total expert/item count
    changes={"added": 2, "promoted": 1, "removed": 0}
)
```

**Message Format**:
```
✅ Expert Watchlist Updated

Update Date: 2026-04-18
Total Experts: 12

Added to Discovery: 2
Promoted to Core: 1
Removed: 0
No Change: 9

Weekly watchlist maintenance complete
```

---

### `notify_pipeline_health()`
Daily status snapshot of all agents.

```python
notify_pipeline_health(
    scout_status="✅ done",
    strategist_status="✅ done",
    advisor_status="⏳ in_progress",
    scout_time="09:30",
    strategist_time="12:15",
    advisor_time="14:00"
)
```

**Message Format**:
```
📊 Daily Pipeline Health

Date: 2026-04-18
Status: Running
Last Check: 14:32 UTC

Agent Status:
🔍 Research Analyst: ✅ done (09:30)
📊 Investment Strategist: ✅ done (12:15)
💬 Client Advisor: ⏳ in_progress (14:00)

🟢 Overall Health
Pipeline flowing normally. Brief publication in progress.
```

---

## 3. Integration in Agent Instructions

### Using notify_task_done() in Heartbeat

Add this Python code to any agent's "Mark Done" procedure:

```python
#!/usr/bin/env python3

import sys
import os

# Add shared modules to path
sys.path.insert(0, os.environ.get("PAPERCLIP_WORKSPACE_CWD", ".") + "/../shared")
from slack_notifications import notify_task_done

# After marking the issue done via curl/API:
notify_task_done(
    task_title=os.environ.get("PAPERCLIP_TASK_TITLE", "Task"),
    issue_id=os.environ.get("PAPERCLIP_TASK_ID", ""),
    agent_name="Your Agent Name",
    completion_comment="Summary of what was completed"
)
```

### Shell Script Example

```bash
#!/bin/bash
set -e

# 1. Do work
echo "Working on task..."
# ... agent logic ...

# 2. Mark task done
echo "Marking task complete..."
curl -s -X PATCH "$PAPERCLIP_API_URL/api/issues/$PAPERCLIP_TASK_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -d '{
    "status": "done",
    "comment": "All work complete and verified."
  }' | jq '.id'

# 3. Notify Slack
python3 << 'EOF'
import sys, os
sys.path.insert(0, os.environ.get("PAPERCLIP_WORKSPACE_CWD", ".") + "/../shared")
from slack_notifications import notify_task_done

notify_task_done(
    task_title="$PAPERCLIP_TASK_TITLE",
    issue_id="$PAPERCLIP_TASK_ID",
    agent_name="Marketer",
    completion_comment="Campaign finalized and uploaded to CDN."
)
EOF

echo "✅ Task done and Slack notification posted"
```

---

## 4. Testing Notifications

Each company's `slack_notifications.py` has a test suite. Run it to verify configuration:

### FundStarter
```bash
cd /Users/home/.paperclip/instances/default/companies/211243a4-3547-44fa-bc65-308b8982f5c8/shared/
python3 slack_notifications.py
# Output:
# ✅ Brief Published
# ✅ Pipeline Blocked
# ✅ High-Impact Finding
# ✅ Watchlist Updated
# ✅ Pipeline Health
# ✅ Task Done
```

### IdeaFactory
```bash
cd /Users/home/.paperclip/instances/default/companies/e9d7733b-7adb-4885-ae21-7c22b7c8b3dc/shared/
python3 slack_notifications.py
```

### New World Value
```bash
cd /Users/home/.paperclip/instances/default/companies/bf8c322a-ed79-4421-9fff-b4be5ee9a148/shared/
python3 slack_notifications.py
```

---

## 5. Company-Specific Customization

Each company's module tailors content while keeping function signatures identical:

### FundStarter (Finance)
- Topics: "Market Analysis", "Expert Insights", "HK Finance News"
- Subscribers: "investors"
- Finding context: "HK retail investors"
- Pipeline roles: Research Analyst, Investment Strategist, Client Advisor

### IdeaFactory (Product)
- Topics: "Feature Ideas", "Market Analysis", "User Feedback"
- Subscribers: "users"
- Finding context: "product roadmap" / "feature consideration"
- Pipeline roles: Scout, Architect, Builder
- Watchlist: "Idea Registry"

### New World Value (Operations)
- Topics: "Operations", "Strategic Insights", "Industry News"
- Subscribers: "stakeholders"
- Finding context: "strategic planning and operational decisions"
- Pipeline roles: Monitor, Analyst, Operations Manager
- Watchlist: "Watchlist"

---

## 6. Troubleshooting

| Problem | Solution |
|---------|----------|
| **Webhook URL not found** | Set `FUNDSTARTER_SLACK_WEBHOOK` (or IDE/NWV variant) in environment or `.env` file |
| **Links broken in Slack** | Verify `PAPERCLIP_API_URL` is set to correct base URL (e.g., `http://localhost:3100` or `https://api.paperclip.io`) |
| **"Error posting to Slack"** | Check webhook URL contains valid Slack service endpoint (starts with `https://hooks.slack.com/services/`) |
| **Notification not appearing** | Verify webhook channel is correct and bot has permission to post there |
| **Company code mismatch** | If using custom `company_short`, ensure it matches actual company prefix (FUN, IDE, NWV) |

---

## 7. Link Format Verification

All links follow the standardized format:

✅ **Correct**:
- `http://localhost:3100/FUN/issues/FUN-62` (dev)
- `https://paperclip.io/IDE/issues/IDE-127` (production)
- `http://vincent-mac-m4:3101/NWV/issues/NWV-5` (dev with custom port)

❌ **Incorrect**:
- `https://paperclip.local/FUN-62` (missing /issues/)
- `https://paperclip.local/issues/FUN-62` (wrong order)
- `https://paperclip.local/UNKNOWN/issues/UNKNOWN-1` (invalid company code)

---

## 8. Adding New Notifications

To add a new notification function to all companies:

1. **Update the base template** in FundStarter's `slack_notifications.py`
2. **Propagate** to IdeaFactory and NWV with company-specific customization
3. **Update this doc** with new function signature and example

### Example: Adding `notify_milestone_hit()`

**Step 1: Add to FUN's module**
```python
def notify_milestone_hit(milestone_name: str, issue_id: str, achieved_date: str) -> bool:
    """Notify when project milestone is achieved."""
    blocks = [
        {"type": "header", "text": {"type": "plain_text", "text": "🎉 Milestone Hit", "emoji": True}},
        {"type": "section", "fields": [
            {"type": "mrkdwn", "text": f"*Milestone*\n{milestone_name}"},
            {"type": "mrkdwn", "text": f"*Issue*\n<{BASE_URL}/{COMPANY_SHORT}/issues/{issue_id}|{issue_id}>"},
            {"type": "mrkdwn", "text": f"*Date*\n{achieved_date}"}
        ]}
    ]
    return post_to_slack(blocks)
```

**Step 2: Copy to IDE and NWV** with same structure

**Step 3: Document** in this file (section 2)

---

## Reference: System Architecture

```
slack_notifications.py (all 3 companies)
  ├── WEBHOOK_URL (from env: FUNDSTARTER_SLACK_WEBHOOK, etc.)
  ├── BASE_URL (from env: PAPERCLIP_API_URL)
  ├── COMPANY_SHORT (hardcoded: FUN, IDE, NWV)
  │
  ├── post_to_slack(blocks)      # Transport layer
  ├── notify_task_done()          # 6 notification types
  ├── notify_pipeline_blocked()   │
  ├── notify_brief_published()    │
  ├── notify_high_impact_finding()│
  ├── notify_watchlist_updated()  │
  └── notify_pipeline_health()    │
      └── __main__ test suite
```

Each company's module is **identical in structure**, differing only in:
- `WEBHOOK_URL` (and env var name)
- `COMPANY_SHORT` constant
- Context hints in message content (e.g., "investors" vs "users")

---

## File Locations

| Company | Path |
|---------|------|
| **FundStarter** | `/Users/home/.paperclip/instances/default/companies/211243a4-3547-44fa-bc65-308b8982f5c8/shared/slack_notifications.py` |
| **IdeaFactory** | `/Users/home/.paperclip/instances/default/companies/e9d7733b-7adb-4885-ae21-7c22b7c8b3dc/shared/slack_notifications.py` |
| **New World Value** | `/Users/home/.paperclip/instances/default/companies/bf8c322a-ed79-4421-9fff-b4be5ee9a148/shared/slack_notifications.py` |

---

## Deprecated

The following have been consolidated into the unified Python module:

- ❌ `post_slack_notification.sh` (NWV) → Use Python module instead
- ❌ paperclip-plugin-slack webhooks (IDE) → Use direct webhook + Python module

All companies now use: **unified Python module + environment-scoped webhooks**
