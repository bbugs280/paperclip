# Slack Task Completion Notifications

**Purpose**: When agents mark tasks done, send enhanced Slack notifications that include task title, completion summary, and a clickable link—instead of just the bare minimum message.

**Available in**: FundStarter company agents (can be extended to other companies)

---

## What This Provides

### **Before** (Minimal)
```
✅ Issue completed
IDE-133 is now done.
```

### **After** (Enhanced)
```
✅ Task Completed

Task: IDE-133
Title: Collect Q1 analyst reports
Completed by: Research Analyst
Time: 14:32 UTC

Completion Notes:
Found 8 high-quality reports from major brokerages. Summary attached in issue comments. Ready for strategist review.…

[View Issue] button
```

---

## How to Use in Agent Instructions

Add this helper code to any agent's heartbeat "Mark Done" step:

### **Python Helper Function**

```python
import sys, os
sys.path.insert(0, "$PAPERCLIP_WORKSPACE_CWD/../shared")
from slack_notifications import notify_task_done

# Call this AFTER the issue has been marked done
notify_task_done(
    task_title="$TASK_TITLE",
    issue_id="$TASK_ID",
    agent_name="Your Agent Name Here",
    completion_comment="Brief summary of what was completed (auto-truncates to 200 chars)",
    company_short="FUN"  # or "IDE", "NWV" depending on company
)
```

### **Integration Example: Marketer Agent**

In the heartbeat procedure, after marking the issue done:

```bash
#!/bin/bash
set -e

# 1. Checkout and work on the task
PAPERCLIP_TASK_ID="$PAPERCLIP_TASK_ID"
# ... do work ...

# 2. Mark task done with comment
echo "Marking task complete and posting to Slack..."
curl -s -X PATCH "$PAPERCLIP_API_URL/api/issues/$PAPERCLIP_TASK_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -d '{
    "status": "done",
    "comment": "Campaign assets finalized and uploaded to CDN. Ready for distribution."
  }' | jq '.id'

# 3. Post enhanced Slack notification
python3 << 'NOTIFY_EOF'
import sys, os
sys.path.insert(0, os.environ.get("PAPERCLIP_WORKSPACE_CWD", ".") + "/../shared")
from slack_notifications import notify_task_done

notify_task_done(
    task_title="$PAPERCLIP_TASK_TITLE",  # from issue description
    issue_id="$PAPERCLIP_TASK_ID",
    agent_name="Marketer",
    completion_comment="Campaign assets finalized and uploaded to CDN. Ready for distribution.",
    company_short="FUN"
)
NOTIFY_EOF

echo "✅ Task marked done and Slack notification posted"
```

---

## Function Reference

### **`notify_task_done()`**

```python
def notify_task_done(
    task_title: str,              # Issue title
    issue_id: str,                # Issue ID (e.g., "FUN-15")
    agent_name: Optional[str] = None,  # Agent role (e.g., "Research Analyst")
    completion_comment: Optional[str] = None,  # Summary (auto-truncates to 200 chars)
    company_short: str = "FUN"    # Company prefix for link
) -> bool:
    """
    Post task completion notification to Slack with rich formatting.
    
    Args:
        task_title: What was the task about
        issue_id: Issue identifier to link
        agent_name: Which agent completed it (for credit/traceability)
        completion_comment: What was done (brief summary, will be truncated if > 200 chars)
        company_short: Company short code for links (FUN, IDE, NWV, etc.)
    
    Returns:
        bool: True if posted successfully, False otherwise
    """
```

---

## Best Practices

### ✅ **DO**:
- Call `notify_task_done()` **AFTER** the issue is marked done (so the API call succeeds)
- Keep `completion_comment` to 1-2 sentences max (will be auto-truncated to 200 chars)
- Use proper `company_short` code for correct link generation
- Always include `agent_name` for traceability

### ❌ **DON'T**:
- Call before marking the issue done (the API call may not have completed)
- Use empty completion_comment (it's optional—omit if nothing to report)
- Try to post multiple times (will create duplicate Slack messages)
- Forget to update the company_short if extending to other companies

---

## Example Outputs

### Example 1: Build Completion
```
✅ Task Completed

Task: IDE-127
Title: Create TestFlight build
Completed by: Build Monitor
Time: 16:45 UTC

Completion Notes:
BUILD_IDENTIFIER="2026.404.0.4d7e8" uploaded to TestFlight. Awaiting beta tester signups.…

[View Issue] button
```

### Example 2: Research Completion
```
✅ Task Completed

Task: FUN-92
Title: Research Q1 Tech Earnings
Completed by: Research Analyst
Time: 09:30 UTC

Completion Notes:
Analyzed 12 tech companies' Q1 earnings. Key findings: AI investments up 34%, cloud revenue growth steady at 12%. Full report posted in issue.…

[View Issue] button
```

---

## Extending to Other Companies

### To use `notify_task_done()` in other company instances:

1. **Copy the function** to their `shared/slack_notifications.py`:
   ```bash
   cp /Users/home/.paperclip/instances/default/companies/211243a4-3547-44fa-bc65-308b8982f5c8/shared/slack_notifications.py \
      /path/to/other-company/shared/slack_notifications.py
   ```

2. **Update agent instructions** to call `notify_task_done()` when marking tasks done (see Integration Example above)

3. **Update company_short** parameter for correct Slack links:
   - FUN → FundStarter
   - IDE → IdeaFactory
   - NWV → NWV
   - etc.

4. **Test** with `python3 shared/slack_notifications.py` to verify Slack connectivity

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Notification not appearing | Check SLACK_WEBHOOK_URL environment variable is set and valid |
| "Agent not found" error | Verify `agent_name` parameter is spelled correctly |
| Link broken in Slack | Verify `company_short` matches actual company prefix (e.g., "IDE" not "idea") |
| Comment truncated oddly | Comment is auto-truncated to 200 chars; keep summaries brief |

---

## Integration with Definition of Done

This notification serves as **evidence** that a task was actually completed:
- ✅ The notification appears in Slack when you mark done
- ✅ It shows what you completed (task title + summary)
- ✅ Provides a direct link for verification
- ✅ Can be reviewed during PM audit phase to validate deliverables

**See also**: [AGENT_PROTOCOL.md](../AGENT_PROTOCOL.md) → Definition of Done section
