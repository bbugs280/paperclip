import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  agents,
  agentWakeupRequests,
  companies,
  createDb,
  heartbeatRuns,
  issues,
} from "@paperclipai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";

const mockTelemetryClient = vi.hoisted(() => ({ track: vi.fn() }));
const mockTrackAgentFirstHeartbeat = vi.hoisted(() => vi.fn());

vi.mock("../telemetry.ts", () => ({
  getTelemetryClient: () => mockTelemetryClient,
}));

vi.mock("@paperclipai/shared/telemetry", async () => {
  const actual = await vi.importActual<typeof import("@paperclipai/shared/telemetry")>(
    "@paperclipai/shared/telemetry",
  );
  return {
    ...actual,
    trackAgentFirstHeartbeat: mockTrackAgentFirstHeartbeat,
  };
});

import { heartbeatService } from "../services/heartbeat.ts";

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping orphaned issue reaper tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

describeEmbeddedPostgres("reapOrphanedIssues", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-orphaned-issues-");
    db = createDb(tempDb.connectionString);
  }, 20_000);

  afterEach(async () => {
    vi.clearAllMocks();
    await db.delete(issues);
    await db.delete(heartbeatRuns);
    await db.delete(agentWakeupRequests);
    await db.delete(agents);
    await db.delete(companies);
  });

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  async function seedCompanyAndAgent() {
    const companyId = randomUUID();
    const agentId = randomUUID();
    const prefix = `T${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
    await db.insert(companies).values({ id: companyId, name: "Test Co", slug: prefix });
    await db.insert(agents).values({
      id: agentId,
      companyId,
      name: "PM Agent",
      urlKey: `pm-${companyId.slice(0, 8)}`,
      role: "pm",
      status: "idle",
      adapterType: "opencode_local",
      adapterConfig: {},
    });
    return { companyId, agentId, prefix };
  }

  async function seedTerminalRun(companyId: string, agentId: string) {
    const runId = randomUUID();
    const wakeupId = randomUUID();
    const past = new Date("2026-01-01T00:00:00.000Z");
    await db.insert(agentWakeupRequests).values({
      id: wakeupId,
      companyId,
      agentId,
      source: "assignment",
      triggerDetail: "system",
      reason: "issue_assigned",
      payload: {},
      status: "succeeded",
      runId,
      claimedAt: past,
    });
    await db.insert(heartbeatRuns).values({
      id: runId,
      companyId,
      agentId,
      invocationSource: "assignment",
      triggerDetail: "system",
      status: "succeeded",
      wakeupRequestId: wakeupId,
      contextSnapshot: {},
      startedAt: past,
      updatedAt: past,
    });
    return runId;
  }

  it("resets a zombie in_progress issue (checkoutRunId is null, no execution lock) to todo", async () => {
    const { companyId, agentId, prefix } = await seedCompanyAndAgent();
    const issueId = randomUUID();
    const past = new Date("2026-01-01T00:00:00.000Z");

    await db.insert(issues).values({
      id: issueId,
      companyId,
      title: "Zombie issue",
      status: "in_progress",
      priority: "medium",
      assigneeAgentId: agentId,
      checkoutRunId: null,
      executionRunId: null,
      executionLockedAt: null,
      issueNumber: 1,
      identifier: `${prefix}-1`,
      updatedAt: past,
    });

    const heartbeat = heartbeatService(db);
    const result = await heartbeat.reapOrphanedIssues({ staleThresholdMs: 0 });

    expect(result.reaped).toBe(1);
    expect(result.issueIds).toContain(issueId);

    const [row] = await db.select({ status: issues.status, checkoutRunId: issues.checkoutRunId })
      .from(issues)
      .where(eq(issues.id, issueId));
    expect(row?.status).toBe("todo");
    expect(row?.checkoutRunId).toBeNull();
  });

  it("resets a zombie in_progress issue where checkoutRunId references a terminal run", async () => {
    const { companyId, agentId, prefix } = await seedCompanyAndAgent();
    const issueId = randomUUID();
    const past = new Date("2026-01-01T00:00:00.000Z");
    const terminalRunId = await seedTerminalRun(companyId, agentId);

    await db.insert(issues).values({
      id: issueId,
      companyId,
      title: "Zombie issue with stale checkout run",
      status: "in_progress",
      priority: "medium",
      assigneeAgentId: agentId,
      checkoutRunId: terminalRunId,
      executionRunId: null,
      executionLockedAt: null,
      issueNumber: 2,
      identifier: `${prefix}-2`,
      updatedAt: past,
    });

    const heartbeat = heartbeatService(db);
    const result = await heartbeat.reapOrphanedIssues({ staleThresholdMs: 0 });

    expect(result.reaped).toBe(1);
    expect(result.issueIds).toContain(issueId);

    const [row] = await db.select({ status: issues.status, checkoutRunId: issues.checkoutRunId })
      .from(issues)
      .where(eq(issues.id, issueId));
    expect(row?.status).toBe("todo");
    expect(row?.checkoutRunId).toBeNull();
  });

  it("does NOT reap an issue that still has an active execution lock", async () => {
    const { companyId, agentId, prefix } = await seedCompanyAndAgent();
    const runId = randomUUID();
    const wakeupId = randomUUID();
    const past = new Date("2026-01-01T00:00:00.000Z");
    const issueId = randomUUID();

    await db.insert(agentWakeupRequests).values({
      id: wakeupId,
      companyId,
      agentId,
      source: "assignment",
      triggerDetail: "system",
      reason: "issue_assigned",
      payload: {},
      status: "claimed",
      runId,
      claimedAt: past,
    });
    await db.insert(heartbeatRuns).values({
      id: runId,
      companyId,
      agentId,
      invocationSource: "assignment",
      triggerDetail: "system",
      status: "running",
      wakeupRequestId: wakeupId,
      contextSnapshot: {},
      startedAt: past,
      updatedAt: past,
    });
    await db.insert(issues).values({
      id: issueId,
      companyId,
      title: "Actively running issue",
      status: "in_progress",
      priority: "medium",
      assigneeAgentId: agentId,
      checkoutRunId: runId,
      executionRunId: runId,
      executionLockedAt: past,
      issueNumber: 3,
      identifier: `${prefix}-3`,
      updatedAt: past,
    });

    const heartbeat = heartbeatService(db);
    const result = await heartbeat.reapOrphanedIssues({ staleThresholdMs: 0 });

    expect(result.reaped).toBe(0);

    const [row] = await db.select({ status: issues.status }).from(issues).where(eq(issues.id, issueId));
    expect(row?.status).toBe("in_progress");
  });

  it("does NOT reap an issue updated more recently than the threshold", async () => {
    const { companyId, agentId, prefix } = await seedCompanyAndAgent();
    const issueId = randomUUID();

    await db.insert(issues).values({
      id: issueId,
      companyId,
      title: "Recently updated issue",
      status: "in_progress",
      priority: "medium",
      assigneeAgentId: agentId,
      checkoutRunId: null,
      executionRunId: null,
      executionLockedAt: null,
      issueNumber: 4,
      identifier: `${prefix}-4`,
      // updatedAt defaults to now
    });

    const heartbeat = heartbeatService(db);
    // 2-hour threshold — a just-created issue should be newer than cutoff
    const result = await heartbeat.reapOrphanedIssues({ staleThresholdMs: 2 * 60 * 60 * 1000 });

    expect(result.reaped).toBe(0);

    const [row] = await db.select({ status: issues.status }).from(issues).where(eq(issues.id, issueId));
    expect(row?.status).toBe("in_progress");
  });

  it("does NOT reap a non-in_progress issue", async () => {
    const { companyId, agentId, prefix } = await seedCompanyAndAgent();
    const issueId = randomUUID();
    const past = new Date("2026-01-01T00:00:00.000Z");

    await db.insert(issues).values({
      id: issueId,
      companyId,
      title: "Blocked issue",
      status: "blocked",
      priority: "medium",
      assigneeAgentId: agentId,
      checkoutRunId: null,
      executionRunId: null,
      executionLockedAt: null,
      issueNumber: 5,
      identifier: `${prefix}-5`,
      updatedAt: past,
    });

    const heartbeat = heartbeatService(db);
    const result = await heartbeat.reapOrphanedIssues({ staleThresholdMs: 0 });

    expect(result.reaped).toBe(0);

    const [row] = await db.select({ status: issues.status }).from(issues).where(eq(issues.id, issueId));
    expect(row?.status).toBe("blocked");
  });
});
