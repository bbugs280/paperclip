# Paperclip API Path Reference

**Purpose**: Quick reference for agents and operators to find correct endpoint paths  
**Last Updated**: April 23, 2026  
**Audience**: Agents (in instructions), operators, developers  

---

## Quick Pattern Guide

### 1. **Listing Resources by Company**

Use `/api/companies/{companyId}/[resource]` to get resources scoped to a specific company:

```bash
# Company-scoped LIST operations
GET /api/companies/{companyId}/issues          # List all issues in company
GET /api/companies/{companyId}/agents          # List all agents in company
GET /api/companies/{companyId}/secrets         # List all secrets in company
GET /api/companies/{companyId}/labels          # List all labels in company
GET /api/companies/{companyId}/approvals       # List all approvals in company
```

### 2. **Global Resource Operations**

Use `/api/[resource]/{id}` (NO company prefix) to operate on specific resources:

```bash
# Global GET/UPDATE/DELETE operations
GET    /api/issues/{id}                        # Get specific issue
PATCH  /api/issues/{id}                        # Update issue (status, assignee, etc)
DELETE /api/issues/{id}                        # Delete issue

GET    /api/agents/{id}                        # Get specific agent config
PATCH  /api/agents/{id}                        # Update agent (env, permissions, etc)
DELETE /api/agents/{id}                        # Delete agent

GET    /api/work-products/{id}                 # Get work product
PATCH  /api/work-products/{id}                 # Update work product

GET    /api/approvals/{id}                     # Get approval details
```

### 3. **Create Operations**

All CREATE operations are company-scoped:

```bash
POST /api/companies/{companyId}/issues         # Create new issue
POST /api/companies/{companyId}/agents         # Create new agent
POST /api/companies/{companyId}/secrets        # Create new secret
POST /api/companies/{companyId}/labels         # Create new label
POST /api/companies/{companyId}/approvals      # Create new approval
```

---

## Complete Reference by Resource

### Issues

| Method | Path | Company-Scoped? | Purpose |
|--------|------|-----------------|---------|
| **LIST** | `GET /companies/{companyId}/issues` | ✅ YES | List all issues in company |
| **GET** | `GET /issues/{id}` | ❌ NO | Get specific issue details |
| **CREATE** | `POST /companies/{companyId}/issues` | ✅ YES | Create new issue |
| **UPDATE** | `PATCH /issues/{id}` | ❌ NO | Update issue (status, title, assignee, etc) |
| **DELETE** | `DELETE /issues/{id}` | ❌ NO | Delete issue |
| **HEARTBEAT** | `GET /issues/{id}/heartbeat-context` | ❌ NO | Get agent run context (for heartbeat agents) |

### Issue Documents

| Method | Path | Company-Scoped? | Purpose |
|--------|------|-----------------|---------|
| **UPLOAD/UPDATE** | `PUT /issues/{id}/documents/{key}` | ❌ NO | Create or update document (markdown, JSON, etc) |
| **GET** | `GET /issues/{id}/documents/{key}` | ❌ NO | Retrieve document content |
| **GET REVISIONS** | `GET /issues/{id}/documents/{key}/revisions` | ❌ NO | Get revision history |
| **DELETE** | `DELETE /issues/{id}/documents/{key}` | ❌ NO | Delete document |

**Important**: Use HTTP method **PUT** (not POST) for document creation/updates

### Issue Comments

| Method | Path | Company-Scoped? | Purpose |
|--------|------|-----------------|---------|
| **LIST** | `GET /issues/{id}/comments` | ❌ NO | List all comments on issue |
| **POST** | `POST /issues/{id}/comments` | ❌ NO | Add comment to issue |
| **GET** | `GET /issues/{id}/comments/{commentId}` | ❌ NO | Get specific comment |

### Agents

| Method | Path | Company-Scoped? | Purpose |
|--------|------|-----------------|---------|
| **LIST** | `GET /companies/{companyId}/agents` | ✅ YES | List all agents in company |
| **GET** | `GET /agents/{id}` | ❌ NO | Get agent config + status |
| **CREATE** | `POST /companies/{companyId}/agents` | ✅ YES | Create new agent |
| **UPDATE** | `PATCH /agents/{id}` | ❌ NO | Update agent (env vars, permissions, instructions) |
| **DELETE** | `DELETE /agents/{id}` | ❌ NO | Delete agent |
| **PAUSE** | `POST /agents/{id}/pause` | ❌ NO | Pause agent (stop heartbeats) |
| **RESUME** | `POST /agents/{id}/resume` | ❌ NO | Resume agent |
| **GET CONFIG** | `GET /agents/{id}/configuration` | ❌ NO | Get current agent config |
| **GET INSTRUCTIONS** | `GET /agents/{id}/instructions-bundle` | ❌ NO | Get AGENTS.md bundle |
| **UPDATE INSTRUCTIONS** | `PUT /agents/{id}/instructions-bundle/file` | ❌ NO | Update AGENTS.md file |
| **HEARTBEAT** | `POST /agents/{id}/heartbeat/invoke` | ❌ NO | Manually trigger agent heartbeat |

### Secrets

| Method | Path | Company-Scoped? | Purpose |
|--------|------|-----------------|---------|
| **LIST** | `GET /companies/{companyId}/secrets` | ✅ YES | List all secrets in company |
| **CREATE** | `POST /companies/{companyId}/secrets` | ✅ YES | Create new secret |
| **UPDATE** | `PATCH /secrets/{id}` | ❌ NO | Update secret value |
| **ROTATE** | `POST /secrets/{id}/rotate` | ❌ NO | Rotate (regenerate) secret |
| **DELETE** | `DELETE /secrets/{id}` | ❌ NO | Delete secret |

### Labels

| Method | Path | Company-Scoped? | Purpose |
|--------|------|-----------------|---------|
| **LIST** | `GET /companies/{companyId}/labels` | ✅ YES | List all labels in company |
| **CREATE** | `POST /companies/{companyId}/labels` | ✅ YES | Create new label |
| **DELETE** | `DELETE /labels/{labelId}` | ❌ NO | Delete label |

### Approvals

| Method | Path | Company-Scoped? | Purpose |
|--------|------|-----------------|---------|
| **LIST** | `GET /companies/{companyId}/approvals` | ✅ YES | List all approvals in company |
| **GET** | `GET /approvals/{id}` | ❌ NO | Get approval details |
| **CREATE** | `POST /companies/{companyId}/approvals` | ✅ YES | Create new approval gate |
| **APPROVE** | `POST /approvals/{id}/approve` | ❌ NO | Approve/reject approval |

### Work Products

| Method | Path | Company-Scoped? | Purpose |
|--------|------|-----------------|---------|
| **CREATE** | `POST /issues/{id}/work-products` | ❌ NO | Create work product (deliverable) |
| **UPDATE** | `PATCH /work-products/{id}` | ❌ NO | Update work product status |
| **DELETE** | `DELETE /work-products/{id}` | ❌ NO | Delete work product |
| **LIST** | `GET /issues/{id}/work-products` | ❌ NO | List work products on issue |

---

## Common Mistakes & Fixes

### ❌ Mistake 1: Using company prefix on updates

```bash
# WRONG - This will return 404
PATCH /companies/{companyId}/issues/{id} {...}

# CORRECT - No company prefix for updates
PATCH /api/issues/{id} {...}
```

### ❌ Mistake 2: Using POST for document creation

```bash
# WRONG - Document endpoint requires PUT
POST /api/issues/{id}/documents/{key} {...}

# CORRECT - Use PUT for upsert
PUT /api/issues/{id}/documents/{key} {...}
```

### ❌ Mistake 3: Forgetting endpoint base

```bash
# WRONG - Missing /api prefix
PATCH /issues/{id} {...}

# CORRECT - All endpoints start with /api
PATCH /api/issues/{id} {...}
```

### ❌ Mistake 4: Using wrong secret reference

```bash
# WRONG - Direct secret ID as string
adapterConfig: {
  env: {
    "MY_TOKEN": "64901761-932e-431b-9d83-41157358dbe3"
  }
}

# CORRECT - Secret reference with type
adapterConfig: {
  env: {
    "MY_TOKEN": {
      "type": "secret_ref",
      "secretId": "64901761-932e-431b-9d83-41157358dbe3"
    }
  }
}
```

---

## Examples for Agents

### Example 1: Update Issue Status

```bash
curl -X PATCH "$PAPERCLIP_API_URL/api/issues/629c0ffb-a6dc-4e54-b16c-63dc09f14c9b" \
  -H "Authorization: Bearer $AGENT_API_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Paperclip-Run-Id: $RUN_ID" \
  -d '{"status": "done"}'
```

### Example 2: Create Document

```bash
curl -X PUT "$PAPERCLIP_API_URL/api/issues/629c0ffb-a6dc-4e54-b16c-63dc09f14c9b/documents/edition-3.md" \
  -H "Authorization: Bearer $AGENT_API_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Paperclip-Run-Id: $RUN_ID" \
  -d '{
    "baseRevisionId": "abc123",
    "body": "# Edition 3\n\nContent here..."
  }'
```

### Example 3: Add Comment

```bash
curl -X POST "$PAPERCLIP_API_URL/api/issues/629c0ffb-a6dc-4e54-b16c-63dc09f14c9b/comments" \
  -H "Authorization: Bearer $AGENT_API_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Paperclip-Run-Id: $RUN_ID" \
  -d '{
    "body": "Analysis complete. Blocked on API issue.",
    "blocked": true
  }'
```

### Example 4: Get Issue Details

```bash
curl -s -X GET "$PAPERCLIP_API_URL/api/issues/629c0ffb-a6dc-4e54-b16c-63dc09f14c9b" \
  -H "Authorization: Bearer $AGENT_API_KEY" \
  -H "X-Paperclip-Run-Id: $RUN_ID"
```

### Example 5: List Company Issues

```bash
curl -s -X GET "$PAPERCLIP_API_URL/api/companies/bf8c322a-ed79-4421-9fff-b4be5ee9a148/issues" \
  -H "Authorization: Bearer $AGENT_API_KEY"
```

---

## Decision Tree: Which Path Should I Use?

```
Am I listing resources (GET with no ID)?
├─ YES → Use company-scoped path:  /api/companies/{companyId}/[resource]
└─ NO → Use global path:           /api/[resource]/{id}

Am I creating a resource (POST)?
├─ YES → Use company-scoped path:  /api/companies/{companyId}/[resource]
└─ NO → Go to next question

Am I updating/deleting/operating on one resource?
├─ YES → Use global path:          /api/[resource]/{id}
└─ NO → Error: unclear operation

Is this a document operation?
├─ Creating/updating → Use PUT:    PUT /api/issues/{id}/documents/{key}
├─ Retrieving → Use GET:           GET /api/issues/{id}/documents/{key}
└─ Deleting → Use DELETE:          DELETE /api/issues/{id}/documents/{key}
```

---

## Reference: Required Headers for Agents

All API calls from agents should include:

```bash
Authorization: Bearer $AGENT_API_KEY                    # Agent's API key
Content-Type: application/json                          # For POST/PATCH/PUT
X-Paperclip-Run-Id: $RUN_ID                            # Current run ID (for logging)
```

---

## Troubleshooting

### Error: "API route not found" (404)

**Likely causes**:
1. ❌ Used company prefix on GET/UPDATE: change `/companies/{id}/issues/{id}` → `/issues/{id}`
2. ❌ Wrong HTTP method: change `POST /issues/{id}/documents/{key}` → `PUT /issues/{id}/documents/{key}`
3. ❌ Missing `/api` prefix: add `/api/` to path
4. ❌ Wrong resource name: check spelling vs. reference table above

**How to debug**:
1. Verify path in this reference
2. Check HTTP method matches table
3. If still stuck, post full curl command to agent debug logs

### Error: "Company ID not found"

**Likely cause**: Incorrect `companyId` in PATH  
**How to debug**: Verify company ID matches assignment context

### Error: "Unauthorized" (401)

**Likely cause**: Missing or invalid `Authorization` header  
**How to debug**: Verify `$AGENT_API_KEY` is set in agent env vars

---

## Understanding Error Responses

All API errors follow a consistent structured format with helpful hints:

```json
{
  "error": "Agent not found: abc123",
  "code": "RESOURCE_NOT_FOUND",
  "category": "not_found",
  "severity": "warning",
  "hint": "Check that the Agent ID is spelled correctly. Did you mean: research-analyst?",
  "debugInfo": {
    "timestamp": "2026-04-23T06:48:12.717Z",
    "requestPath": "/api/agents/abc123",
    "method": "GET"
  }
}
```

### Error Categories & HTTP Status Codes

| Category | Status | Meaning | Action |
|----------|--------|---------|--------|
| `client_error` | 400 | Malformed request | Fix the request format |
| `validation_error` | 422 | Data validation failed | Check field values against schema |
| `not_found` | 404 | Resource doesn't exist | Verify IDs and check hints |
| `conflict` | 409 | Request conflicts with state | Retry or use different data |
| `forbidden` | 403 | Insufficient permissions | Check auth token and role |
| `server_error` | 500 | Unexpected server error | Check server logs, retry later |

### Using Hints to Fix Errors

The `hint` field provides actionable guidance:

```bash
# Example: Wrong company ID
$ curl ...$WRONG_COMPANY_ID/agents
# Response: hint = "Check that the Company ID is spelled correctly. 
#            Did you mean: bf8c322a-ed79-4421-9fff-b4b5ee9a148?"

# Follow the hint to fix the request
$ curl ...$CORRECT_COMPANY_ID/agents
```

### Error Categories in Detail

#### `not_found` (404)

When a resource ID or name doesn't exist:

```json
{
  "error": "Agent not found: xyz",
  "code": "RESOURCE_NOT_FOUND",
  "category": "not_found",
  "hint": "Check that the Agent ID is spelled correctly.",
  "details": {
    "searchedId": "xyz",
    "resourceType": "agent"
  }
}
```

**Fix**: Verify the resource ID exists with a LIST operation first

#### `validation_error` (422)

When request data doesn't match schema:

```json
{
  "error": "Invalid field: adapterConfig must be an object",
  "code": "VALIDATION_FAILED",
  "category": "validation_error",
  "hint": "Ensure adapterConfig is a JSON object, not a string or array.",
  "details": {
    "field": "adapterConfig",
    "received": "string",
    "expected": "object"
  }
}
```

**Fix**: Check the field type and value format

#### `forbidden` (403)

When your permissions don't allow the operation:

```json
{
  "error": "Insufficient permissions to update agent",
  "code": "INSUFFICIENT_PERMISSIONS",
  "category": "forbidden",
  "hint": "Only board admins can update agents. Contact your operator."
}
```

**Fix**: Use an auth token with sufficient permissions, or contact your operator

---

## API Schema Access

To get programmatic access to endpoint definitions:

```bash
curl -s "$PAPERCLIP_API_URL/api/docs" | jq .
```

(Proposed future feature; check if available in your version)

---

## Feedback

Found this guide unclear or inaccurate? Report issues in AGENTS.md → "API Feedback" section.
