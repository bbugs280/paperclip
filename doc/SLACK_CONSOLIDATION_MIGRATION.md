# Slack Integration Consolidation - Migration Complete

**Date**: 2026-04-20
**Status**: ✅ Complete

This document tracks the consolidation of Slack notification systems across all 3 companies to use the standardized FundStarter-based Python module.

---

## What Changed

### ✅ Task 1: Standardized Link Generation

**Issue**: Hardcoded URLs like `https://paperclip.local/` in notification messages not respecting environment.

**Fix Applied**:
- Updated all 3 companies to use `BASE_URL = os.getenv("PAPERCLIP_API_URL", "https://paperclip.local")`
- All issue links now respect `$PAPERCLIP_API_URL` environment variable
- Fallback to `https://paperclip.local` for dev environments

**Files Modified**:
- FundStarter: `/Users/home/.paperclip/instances/default/companies/211243a4-3547-44fa-bc65-308b8982f5c8/shared/slack_notifications.py`
- IdeaFactory: `/Users/home/.paperclip/instances/default/companies/e9d7733b-7adb-4885-ae21-7c22b7c8b3dc/shared/slack_notifications.py`
- New World Value: `/Users/home/.paperclip/instances/default/companies/bf8c322a-ed79-4421-9fff-b4be5ee9a148/shared/slack_notifications.py`

---

### ✅ Task 2: IdeaFactory Consolidation (Removed Plugin Duplication)

**Issue**: IdeaFactory had 2 bots posting to same channel:
1. "paperclip APP" (webhook via agent instructions)
2. "IdeaFactory APP" (plugin bot)

**Fix Applied**:
- Migrated IdeaFactory to use standardized Python module (same as FUN)
- Removed dependency on `paperclip-plugin-slack` for notification transport
- Created unified `/shared/slack_notifications.py` with all 6 notification types
- **Result**: Now single bot source per notification call

**Before**:
```
IdeaFactory channel had 2 uncoordinated bot sources
- Manual webhook calls from agent instructions
- Plugin-based automatic hooks
```

**After**:
```
IdeaFactory channel has 1 bot source
All notifications go through slack_notifications.py Python module
```

---

### ✅ Task 3: NWV Upgraded (Added Rich Formatting)

**Issue**: New World Value only had basic shell script (`post_slack_notification.sh`).

**Fix Applied**:
- Created full `slack_notifications.py` module for NWV
- All 6 notification functions now available with Block Kit formatting
- Added comprehensive test suite
- Company-specific context adapted for operations domain

**Before**:
```bash
post_slack_notification.sh "message" "emoji" "title"
# Basic text-based notifications only
```

**After**:
```python
from slack_notifications import notify_task_done, notify_pipeline_blocked, ...
# 6 rich-formatted notification types available
```

**Benefits**:
- Consistent formatting across all companies
- Rich interactive buttons (View Issue)
- Better readability with Block Kit layout
- Easier to extend with new notification types

---

### ✅ Task 4: Unified Documentation Created

**Document**: `/Users/home/paperclip/doc/SLACK_NOTIFICATIONS_STANDARD.md`

**Coverage**:
- Overview table of all webhook configurations
- 6 notification function references with examples
- Integration patterns for agent instructions
- Testing procedures for each company
- Troubleshooting guide
- Company-specific customization guide
- File locations and system architecture
- Link verification rules

---

## New Standard Format

All 3 companies now use identical structure:

```python
# /path/to/company/shared/slack_notifications.py

WEBHOOK_URL = os.getenv("COMPANY_SLACK_WEBHOOK", "default_webhook")
BASE_URL = os.getenv("PAPERCLIP_API_URL", "https://paperclip.local")
COMPANY_SHORT = "FUN"  # or IDE, NWV

def post_to_slack(blocks: list) -> bool: ...
def notify_task_done(...): ...
def notify_pipeline_blocked(...): ...
def notify_brief_published(...): ...
def notify_high_impact_finding(...): ...
def notify_watchlist_updated(...): ...
def notify_pipeline_health(...): ...

if __name__ == "__main__":
    # Test all functions
```

---

## Environment Variables Required

### For Each Company

```bash
# FundStarter
export FUNDSTARTER_SLACK_WEBHOOK="https://hooks.slack.com/services/..."

# IdeaFactory
export IDEAFACTORY_SLACK_WEBHOOK="https://hooks.slack.com/services/..."

# New World Value
export NWV_SLACK_WEBHOOK="https://hooks.slack.com/services/..."

# ALL companies use this for link generation
export PAPERCLIP_API_URL="http://localhost:3100"  # or https://api.paperclip.io
```

---

## Migration Steps for Agents

If your agent currently posts Slack messages:

### Old Pattern (Manual curl in agent instructions)
```bash
curl -X POST "$SLACK_WEBHOOK" \
  -H 'Content-Type: application/json' \
  -d '{"text": "Task done..."}'
```

### New Pattern (Use Python module)
```python
import sys, os
sys.path.insert(0, os.environ.get("PAPERCLIP_WORKSPACE_CWD", ".") + "/../shared")
from slack_notifications import notify_task_done

notify_task_done(
    task_title="...",
    issue_id="...",
    agent_name="Your Agent Name",
    completion_comment="..."
)
```

**Benefits**:
- ✅ Consistent formatting across all agents
- ✅ Automatic truncation and validation
- ✅ Single button to view issue
- ✅ Company code auto-detected
- ✅ Easy to maintain centrally

---

## Removed/Deprecated

### Files No Longer Used

1. **NWV `post_slack_notification.sh`**
   - Location: `/Users/home/.paperclip/instances/default/companies/bf8c322a-ed79-4421-9fff-b4be5ee9a148/shared/post_slack_notification.sh`
   - Reason: Replaced by unified Python module
   - Status: Can be archived/removed (kept for reference)

2. **IdeaFactory Plugin Configuration**
   - Package: `paperclip-plugin-slack@2.0.6`
   - Reason: Consolidated to Python webhook approach
   - Status: Still installed but no longer primary source (can be removed)

### What to Update in Agent Instructions

If your agent's instructions reference:
- ❌ `post_slack_notification.sh` → Replace with Python module call
- ❌ Direct webhook curl calls → Replace with Python module call
- ❌ Shell-based message formatting → Use Python module for Block Kit

---

## Verification

### Test Each Company

```bash
# FundStarter
cd /Users/home/.paperclip/instances/default/companies/211243a4-3547-44fa-bc65-308b8982f5c8/shared
python3 slack_notifications.py

# IdeaFactory
cd /Users/home/.paperclip/instances/default/companies/e9d7733b-7adb-4885-ae21-7c22b7c8b3dc/shared
python3 slack_notifications.py

# New World Value
cd /Users/home/.paperclip/instances/default/companies/bf8c322a-ed79-4421-9fff-b4be5ee9a148/shared
python3 slack_notifications.py
```

**Expected Output** (6 tests):
```
✅ Brief Published
✅ Pipeline Blocked
✅ High-Impact Finding
✅ Watchlist Updated
✅ Pipeline Health
✅ Task Done

✨ Test complete. Check Slack channel...
```

---

## API Reference

All companies now have identical function signatures:

```python
notify_task_done(
    task_title: str,
    issue_id: str,
    agent_name: Optional[str] = None,
    completion_comment: Optional[str] = None,
    company_short: str = "FUN"  # Auto-detected, can override
) -> bool

notify_pipeline_blocked(
    agent: str,
    issue_id: str,
    reason: str,
    blocking_item: Optional[str] = None
) -> bool

notify_brief_published(
    date: str,
    issue_id: str,
    topics: Optional[list] = None,
    subscriber_count: int = 0,
    brief_excerpt: Optional[str] = None
) -> bool

notify_high_impact_finding(
    expert: str,
    finding: str,
    signal_type: str,
    relevance_score: int = 0,
    impact: Optional[str] = None
) -> bool

notify_watchlist_updated(
    date: str,
    count: int,
    changes: Optional[dict] = None
) -> bool

notify_pipeline_health(
    scout_status: str,
    strategist_status: str,
    advisor_status: str,
    scout_time: Optional[str] = None,
    strategist_time: Optional[str] = None,
    advisor_time: Optional[str] = None
) -> bool
```

---

## Summary

| Task | Status | Benefits |
|------|--------|----------|
| **Fix link generation** | ✅ Done | Links respect `$PAPERCLIP_API_URL` environment |
| **Consolidate IdeaFactory** | ✅ Done | Single bot source instead of 2 conflicting sources |
| **Upgrade NWV** | ✅ Done | Rich formatting + all 6 notification types |
| **Unified documentation** | ✅ Done | Comprehensive guide with examples & troubleshooting |

**Result**: All 3 companies now use the same standardized, maintainable Slack notification system based on FundStarter's proven patterns.

---

## Next Steps

1. Update agent instructions to use new Python module pattern (see Migration Steps above)
2. Set webhook URLs in environment or agent config for each company
3. Run test suite to verify Slack connectivity
4. Archive/remove deprecated shell scripts and plugin configurations
5. Monitor Slack channels to confirm messages are appearing with correct formatting

---

## Contact/Questions

Refer to: [SLACK_NOTIFICATIONS_STANDARD.md](./SLACK_NOTIFICATIONS_STANDARD.md)
