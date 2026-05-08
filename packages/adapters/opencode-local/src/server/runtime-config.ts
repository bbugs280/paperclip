import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { asBoolean } from "@paperclipai/adapter-utils/server-utils";

type PreparedOpenCodeRuntimeConfig = {
  env: Record<string, string>;
  notes: string[];
  cleanup: () => Promise<void>;
};

function resolveXdgConfigHome(env: Record<string, string>): string {
  return (
    (typeof env.XDG_CONFIG_HOME === "string" && env.XDG_CONFIG_HOME.trim()) ||
    (typeof process.env.XDG_CONFIG_HOME === "string" && process.env.XDG_CONFIG_HOME.trim()) ||
    path.join(os.homedir(), ".config")
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJsonObject(filepath: string): Promise<Record<string, unknown>> {
  try {
    const raw = await fs.readFile(filepath, "utf8");
    const parsed = JSON.parse(raw);
    return isPlainObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export async function prepareOpenCodeRuntimeConfig(input: {
  env: Record<string, string>;
  config: Record<string, unknown>;
}): Promise<PreparedOpenCodeRuntimeConfig> {
  const skipPermissions = asBoolean(input.config.dangerouslySkipPermissions, true);
  if (!skipPermissions) {
    return {
      env: input.env,
      notes: [],
      cleanup: async () => {},
    };
  }

  const sourceConfigDir = path.join(resolveXdgConfigHome(input.env), "opencode");
  const runtimeConfigHome = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-opencode-config-"));
  const runtimeConfigDir = path.join(runtimeConfigHome, "opencode");
  const runtimeConfigPath = path.join(runtimeConfigDir, "opencode.json");

  await fs.mkdir(runtimeConfigDir, { recursive: true });
  try {
    await fs.cp(sourceConfigDir, runtimeConfigDir, {
      recursive: true,
      force: true,
      errorOnExist: false,
      dereference: false,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException | null)?.code !== "ENOENT") {
      throw err;
    }
  }

  const existingConfig = await readJsonObject(runtimeConfigPath);
  const existingPermission = isPlainObject(existingConfig.permission)
    ? existingConfig.permission
    : {};
  const existingTools = isPlainObject(existingConfig.tools) ? existingConfig.tools : {};
  const nextConfig = {
    ...existingConfig,
    permission: {
      ...existingPermission,
      external_directory: "allow",
    },
    // Disable the opencode `task` tool system-wide. The `task` tool spawns inline
    // sub-agents locally inside the current session. This is problematic for
    // orchestrator agents (e.g. Director) that should delegate work by creating
    // real Paperclip issues via the API — not by running work inline. Disabling
    // it forces agents to use the correct delegation path every time.
    tools: {
      ...existingTools,
      task: false,
    },
  };
  await fs.writeFile(runtimeConfigPath, `${JSON.stringify(nextConfig, null, 2)}\n`, "utf8");

  // Inject a global AGENTS.md with critical bash tool requirements.
  // This is loaded by opencode as the global ~/.config/opencode/AGENTS.md,
  // providing a system-level reminder that all agents must see.
  const globalAgentsMdPath = path.join(runtimeConfigDir, "AGENTS.md");
  const existingAgentsMd = await fs.readFile(globalAgentsMdPath, "utf8").catch(() => "");
  const bashRuleBlock = `
## Critical: Bash Tool Requirements

CRITICAL: Every single bash tool call MUST include a \`description\` field containing a short
string that summarises what the command does. The description field is REQUIRED — omitting it
causes an immediate validation error with exit code 1 and terminates the run.

Correct bash call example:
  description: "List files in current directory"
  command: "ls -la"

If you have already seen a bash validation error about a missing description, STOP and retry
that call with description included.
`;
  if (!existingAgentsMd.includes("Critical: Bash Tool Requirements")) {
    await fs.writeFile(globalAgentsMdPath, existingAgentsMd + bashRuleBlock, "utf8");
  }

  return {
    env: {
      ...input.env,
      XDG_CONFIG_HOME: runtimeConfigHome,
    },
    notes: [
      "Injected runtime OpenCode config with permission.external_directory=allow to avoid headless approval prompts.",
      "Injected global AGENTS.md with bash tool description requirement.",
    ],
    cleanup: async () => {
      await fs.rm(runtimeConfigHome, { recursive: true, force: true });
    },
  };
}
