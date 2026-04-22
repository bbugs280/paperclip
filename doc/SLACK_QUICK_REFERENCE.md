# Slack Integration - Quick Reference

## 🎯 3 Companies, 1 Standard

All 3 companies now use identical FundStarter-based notification system.

---

## Configuration Quick Reference

```bash
# Set these environment variables (in .env or agent config)

# 1. Webhook URLs (one per company)
export FUNDSTARTER_SLACK_WEBHOOK="https://hooks.slack.com/services/T0N55R2BW/B0AU6GCUKPB/YOUR_TOKEN"
export IDEAFACTORY_SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR_WORKSPACE/YOUR_CHANNEL/YOUR_TOKEN"
export NWV_SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR_WORKSPACE/YOUR_CHANNEL/YOUR_TOKEN"

# 2. Base URL (shared by all companies for issue links)
export PAPERCLIP_API_URL="http://localhost:3100"  # or https://api.example.com
```

---

## 6 Notification Functions

All available in `shared/slack_notifications.py` for every company:

```python
# In agent heartbeat or task script:
import sys, os
sys.path.insert(0, os.environ.get("PAPERCLIP_WORKSPACE_CWD", ".") + "/../shared")
from slack_notifications import (
    notify_task_done,
    notify_pipeline_blocked,
    notify_brief_published,
    notify_high_impact_finding,
    notify_watchlist_updated,
    notify_pipeline_health
)

# Use them:
notify_task_done("Task Title", "IDE-143", "Agent Name", "Summary")
notify_pipeline_blocked("Agent", "IDE-60", "Reason")
notify_brief_published("2026-04-18", "FUN-61")
notify_high_impact_finding("Expert", "Finding description", "Signal Type")
notify_watchlist_updated("2026-04-18", 24)
notify_pipeline_health("✅ done", "✅ done", "⏳ in_progress")
```

---

## Test Any Company

```bash
# FundStarter
python3 /Users/home/.paperclip/instances/default/companies/211243a4-3547-44fa-bc65-308b8982f5c8/shared/slack_notifications.py

# IdeaFactory
python3 /Users/home/.paperclip/instances/default/companies/e9d7733b-7adb-4885-ae21-7c22b7c8b3dc/shared/slack_notifications.py

# New World Value
python3 /Users/home/.paperclip/instances/default/companies/bf8c322a-ed79-4421-9fff-b4be5ee9a148/shared/slack_notifications.py
```

---

## Company Profiles

| | **FundStarter** | **IdeaFactory** | **New World Value** |
|---|---|---|---|
| **Code** | FUN | IDE | NWV |
| **Module** | `211243a4.../shared/slack_notifications.py` | `e9d7733b.../shared/slack_notifications.py` | `bf8c322a.../shared/slack_notifications.py` |
| **Webhook Env** | `FUNDSTARTER_SLACK_WEBHOOK` | `IDEAFACTORY_SLACK_WEBHOOK` | `NWV_SLACK_WEBHOOK` |
| **Channel** | C0ATTJK4466 | C0AU5JM5HPT | (configured) |
| **Domain** | Finance/Investing | Product Development | Operations |
| **Agent Names** | Research Analyst,<br/>Investment Strategist,<br/>Client Advisor | Scout,<br/>Architect,<br/>Builder | Monitor,<br/>Analyst,<br/>Ops Manager |

---

## Link Format

**All companies use same format**:
```
{PAPERCLIP_API_URL}/{COMPANY_SHORT}/issues/{ISSUE_ID}
```

**Examples**:
```
http://localhost:3100/FUN/issues/FUN-62
https://api.paperclip.io/IDE/issues/IDE-143
http://local:3101/NWV/issues/NWV-5
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Links broken | Check `PAPERCLIP_API_URL` is set correctly |
| Notification not appearing | Verify webhook URL in env variable, check Slack channel exists |
| "Error posting to Slack" | Validate webhook URL starts with `https://hooks.slack.com/services/` |
| Wrong company code in links | Ensure `COMPANY_SHORT` matches actual code (FUN, IDE, NWV) |

---

## Documentation

- **Comprehensive Guide**: `doc/SLACK_NOTIFICATIONS_STANDARD.md`
- **Migration Notes**: `doc/SLACK_CONSOLIDATION_MIGRATION.md`
- **Implementation Summary**: `doc/SLACK_IMPLEMENTATION_SUMMARY.md` (this file)

---

## Status

✅ **All 4 tasks complete**:
1. ✅ Fixed link generation (all companies respect $PAPERCLIP_API_URL)
2. ✅ Consolidated IdeaFactory (removed 2-bot duplication)
3. ✅ Upgraded NWV (added rich formatting)
4. ✅ Created unified documentation

**Result**: Single standardized system across all 3 companies
