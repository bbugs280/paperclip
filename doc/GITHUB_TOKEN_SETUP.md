# GitHub Fine-Grained PAT Setup for Build Monitor

**Goal**: Create a fine-grained Personal Access Token (PAT) scoped to `bbugs280/paw-mind` with read permissions, then store it as `GITHUB_TOKEN` environment secret in Paperclip.

---

## Step 1: Create Fine-Grained PAT on GitHub.com

1. Go to: https://github.com/settings/personal-access-tokens/new
2. Fill in the form:
   - **Token name**: `paperclip-build-monitor-paw-mind`
   - **Expiration**: 90 days (or your preference)
   - **Description**: `Read-only token for Paperclip Build Monitor to scan bbugs280/paw-mind commits, PRs, checks, and CI status`

3. **Repository access** section:
   - Select: **☑ Only select repositories**
   - Find and select: `bbugs280/paw-mind`

4. **Permissions** section — Set the following to **Read** only:
   - ✅ **Checks** — Read
   - ✅ **Contents** — Read
   - ✅ **Pull requests** — Read
   - ✅ **Issues** — Read
   - ✅ **Actions** — Read
   - ✅ **Commit statuses** — Read
   - ✅ **Metadata** — Read (this is required by GitHub and already included)

   **Leave all others as "No access"** (Write/Admin permissions not needed)

5. Click **"Generate token"**

6. **⚠️ IMPORTANT**: You will see the token value **only once**. Copy it immediately and save it somewhere secure (password manager, etc.). You cannot view it again.

---

## Step 2: Store Token in Paperclip as Environment Secret

Run this command to store the token as `GITHUB_TOKEN` environment secret:

```bash
#!/bin/bash

# Replace <YOUR_TOKEN_HERE> with the actual token from Step 1
TOKEN="<YOUR_TOKEN_HERE>"
COMPANY_ID="e9d7733b-7adb-4885-ae21-7c22b7c8b3dc"  # IdeaFactory

curl -s -X POST "http://localhost:3100/api/companies/$COMPANY_ID/secrets" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"GITHUB_TOKEN\",
    \"value\": \"$TOKEN\",
    \"description\": \"Fine-grained PAT for bbugs280/paw-mind read access (Build Monitor agent)\"
  }" | jq '{id: .id, name: .name, createdAt}'
```

**What this does**:
- Creates a new secret named `GITHUB_TOKEN` in IdeaFactory company
- Stores the token securely (encrypted at rest)
- Makes it available to agent runtime as environment variable

**Expected output**:
```json
{
  "id": "secret-id-here",
  "name": "GITHUB_TOKEN",
  "createdAt": "2026-04-21T..."
}
```

---

## Step 3: Verify Token is Accessible

Run this to confirm the token is stored (without revealing its value):

```bash
COMPANY_ID="e9d7733b-7adb-4885-ae21-7c22b7c8b3dc"

curl -s "http://localhost:3100/api/companies/$COMPANY_ID/secrets" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" | jq '.[] | select(.name == "GITHUB_TOKEN") | {name, createdAt, id: .id[0:8]}'
```

**Expected output**:
```json
{
  "name": "GITHUB_TOKEN",
  "createdAt": "2026-04-21T...",
  "id": "xxxxx..."
}
```

---

## Step 4: Post Confirmations to IDE-159

Once the token is stored, post these two confirmations to IDE-159:

```bash
# First confirmation: Secret revoked
curl -s -X POST "http://localhost:3100/api/issues/IDE-159/comments" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "Secret revoked - Previous GitHub token (if any) has been rotated. Using new fine-grained PAT."
  }' | jq '.id'

# Second confirmation: GITHUB_TOKEN set
curl -s -X POST "http://localhost:3100/api/issues/IDE-159/comments" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "GITHUB_TOKEN set - Fine-grained Personal Access Token (Option A) created and stored securely as GITHUB_TOKEN environment secret in IdeaFactory company. Token has read-only permissions (Checks, Contents, Pull requests, Issues, Actions, Commit statuses, Metadata) scoped to bbugs280/paw-mind repository."
  }' | jq '.id'
```

---

## Step 5: Update IDE-159 Status

Once both confirmations are posted, update IDE-159 to `todo` so Build Monitor can proceed:

```bash
curl -s -X PATCH "http://localhost:3100/api/issues/IDE-159" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "todo",
    "comment": "GitHub token access provisioned. Build Monitor can now proceed with repo scan."
  }' | jq '{status, identifier}'
```

---

## Checklist

- [ ] Created fine-grained PAT on GitHub.com with correct permissions
- [ ] Copied token value (secret, only shown once!)
- [ ] Stored token as `GITHUB_TOKEN` environment secret in Paperclip
- [ ] Verified token is in secrets list
- [ ] Posted "Secret revoked" confirmation to IDE-159
- [ ] Posted "GITHUB_TOKEN set" confirmation to IDE-159
- [ ] Updated IDE-159 status to `todo`
- [ ] Build Monitor can now proceed with GitHub scan on next heartbeat

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Token not found" when Build Monitor runs | Verify token was stored with exact name `GITHUB_TOKEN` (case-sensitive) |
| "Permission denied" error from GitHub | Check that token has Read permissions for: Checks, Contents, Pull requests, Issues, Actions, Commit statuses |
| "Repository not found" | Ensure token is scoped to `bbugs280/paw-mind` (no other repos, no public repos) |
| Lost the token value | Create a new token (old one cannot be viewed again) and update the secret |

---

## Security Notes

- ✅ Token is read-only (no write/admin permissions)
- ✅ Scoped to single repository (no access to other repos)
- ✅ Stored encrypted in Paperclip (not in logs, comments, or config files)
- ✅ Can be rotated anytime by creating a new token and updating the secret
- ✅ Recommended: Set expiration to 90 days and rotate regularly

Once complete, Build Monitor will have the access it needs and IDE-158/IDE-159 can proceed! 🚀
