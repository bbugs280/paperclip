/**
 * Instruction Versioning Service
 *
 * Tracks changes to agent instructions with version history and changelogs.
 * Maintains an audit trail of when instructions changed and what changed.
 */

import type { Db } from "@paperclipai/db";
import { agents } from "@paperclipai/db";

export interface InstructionChange {
  timestamp: string;
  version: number;
  actor?: {
    userId?: string | null;
    agentId?: string | null;
  };
  changeType: "created" | "updated" | "restored";
  changeDescription?: string;
  hash?: string; // Content hash to detect actual changes
}

export interface InstructionVersionMetadata {
  currentVersion: number;
  lastUpdatedAt: string;
  lastUpdatedBy?: {
    userId?: string | null;
    agentId?: string | null;
  };
  changelog: InstructionChange[];
}

/**
 * Get or initialize instruction version metadata for an agent
 */
export function getInstructionVersionMetadata(agent: typeof agents.$inferSelect): InstructionVersionMetadata {
  const metadata = (agent.metadata ?? {}) as Record<string, unknown>;
  const versionData = metadata.instructionVersion as InstructionVersionMetadata | undefined;

  if (versionData) {
    return versionData;
  }

  return {
    currentVersion: 1,
    lastUpdatedAt: agent.createdAt.toISOString(),
    changelog: [
      {
        timestamp: agent.createdAt.toISOString(),
        version: 1,
        changeType: "created",
        changeDescription: "Initial agent instructions",
      },
    ],
  };
}

/**
 * Increment instruction version when instructions change
 */
export function incrementInstructionVersion(
  metadata: InstructionVersionMetadata,
  options: {
    actor?: { userId?: string | null; agentId?: string | null };
    description?: string;
    changeType?: "updated" | "restored";
  } = {},
): InstructionVersionMetadata {
  const newVersion = metadata.currentVersion + 1;
  const now = new Date().toISOString();

  const change: InstructionChange = {
    timestamp: now,
    version: newVersion,
    actor: options.actor,
    changeType: options.changeType ?? "updated",
    changeDescription: options.description,
  };

  return {
    currentVersion: newVersion,
    lastUpdatedAt: now,
    lastUpdatedBy: options.actor,
    changelog: [...(metadata.changelog ?? []), change],
  };
}

/**
 * Format instruction version metadata as markdown changelog
 */
export function formatInstructionChangelog(meta: InstructionVersionMetadata): string {
  const lines: string[] = [
    "# Instruction Changelog",
    "",
    `**Current Version**: ${meta.currentVersion}`,
    `**Last Updated**: ${meta.lastUpdatedAt}`,
    "",
    "## Version History",
    "",
  ];

  // Show changelog in reverse order (newest first)
  const sorted = [...(meta.changelog ?? [])].sort((a, b) => b.version - a.version);

  for (const change of sorted) {
    const actorInfo = change.actor
      ? change.actor.userId
        ? ` by user ${change.actor.userId}`
        : change.actor.agentId
        ? ` by agent ${change.actor.agentId}`
        : ""
      : "";

    lines.push(
      `## Version ${change.version} — ${change.changeType.toUpperCase()}${actorInfo}`,
    );
    lines.push(`_${change.timestamp}_`);
    lines.push("");

    if (change.changeDescription) {
      lines.push(change.changeDescription);
    }

    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Get version summary for agent display
 */
export function getVersionSummary(meta: InstructionVersionMetadata): string {
  const total = meta.changelog?.length ?? 1;
  const lastChange = meta.changelog?.[meta.changelog.length - 1];
  const lastType = lastChange?.changeType ?? "created";

  return `v${meta.currentVersion} (${total} change${total === 1 ? "" : "s"}, last ${lastType})`;
}
