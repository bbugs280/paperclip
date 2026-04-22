# Agent Adapter Configuration Template

When creating new agents in Paperclip, always include these environment configurations to ensure agents can access system tools and commands.

## Standard Adapter Environment

```json
{
  "adapterConfig": {
    "env": {
      "PATH": {
        "type": "plain",
        "value": "/usr/local/bin:/usr/local/sbin:/usr/bin:/bin:/usr/sbin:/sbin"
      }
    }
  }
}
```

## Why This Matters

- **PATH** must be set so agents can find system commands like `opencode`, `git`, `curl`, etc.
- Without explicit PATH, agents inherit a minimal environment that may not include necessary binaries
- This is especially critical for adapter types that shell out to external tools (OpenCode, Codex, etc.)

## Common Tools Agents Need

| Tool | Path | Used For |
|------|------|----------|
| `opencode` | `/usr/local/bin/opencode` | GitHub Copilot CLI execution |
| `git` | `/usr/bin/git` | Version control operations |
| `curl` | `/usr/bin/curl` | HTTP requests |
| `python3` | `/usr/bin/python3` | Script execution |
| `bash` | `/bin/bash` | Shell commands |

## Patterns for Critical Tools

When a tool is critical to the agent's function, use its **absolute path** in instructions:

### Example 1: OpenCode Agent
```bash
# Instead of relying on PATH:
opencode run-task ...

# Use absolute path for reliability:
/usr/local/bin/opencode run-task ...
```

### Example 2: Helper Scripts
```bash
# Store shared scripts in company/shared directory
bash /Users/home/.paperclip/instances/default/companies/{COMPANY_ID}/shared/script.sh

# This works regardless of working directory or PATH
```

## Setup Checklist for New Agents

- [ ] **Set PATH env** in adapter config (see above)
- [ ] **Use absolute paths** for critical tools in agent instructions
- [ ] **Store shared scripts** in `companies/{COMPANY_ID}/shared/` directory
- [ ] **Test agent run** with a simple task to verify PATH is working
- [ ] **Document any custom tools** that the agent depends on

## Troubleshooting

**Error: "Command not found in PATH"**
1. Check if agent has PATH env configured
2. Verify tool symlink exists: `ls -la /usr/local/bin/[tool]`
3. Test manually: `ssh to agent environment` and run command
4. Use absolute path as fallback

**Example: opencode not found**
```bash
# Option 1: Verify symlink
sudo ln -sf /Users/home/.opencode/bin/opencode /usr/local/bin/opencode

# Option 2: Use full path in instructions
/Users/home/.opencode/bin/opencode run-task ...

# Option 3: Add to agent env
"PATH": "/Users/home/.opencode/bin:/usr/local/bin:..."
```

## NWV Applied Pattern

All New World Value agents (Monitor, Operations Manager, Research Analyst, Promoter) follow this pattern:

```json
{
  "adapterConfig": {
    "env": {
      "PATH": {
        "type": "plain",
        "value": "/usr/local/bin:/usr/local/sbin:/usr/bin:/bin:/usr/sbin:/sbin"
      },
      "SLACK_WEBHOOK_URL": {
        "type": "secret_ref",
        "secretId": "...",
        "version": "latest"
      },
      "PAPERCLIP_API_URL": {
        "type": "plain",
        "value": "http://localhost:3100"
      }
    }
  }
}
```

When adding new agents, follow this same pattern as a baseline.
