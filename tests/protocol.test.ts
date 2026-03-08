import { describe, expect, it } from "vitest";

import {
  PROTOCOL_V1,
  PROTOCOL_V2,
  encodeCompletionPayload,
  encodeControlSignal,
  encodeRunEvent,
  encodeRunJob,
  normalizeCompletionPayload,
  normalizeControlSignal,
  normalizeRunEvent,
  normalizeRunJob,
  parseCompletionPayload,
  parseCompletionPayloadJSON,
  parseControlSignal,
  parseControlSignalJSON,
  parseRunEvent,
  parseRunEventJSON,
  parseRunJob,
  parseRunJobJSON,
  toCompletionPayloadV1,
  toCompletionPayloadV2,
  toControlSignalV1,
  toControlSignalV2,
  toRunEventV1,
  toRunEventV2,
  toRunJobV1,
  toRunJobV2,
} from "../src/index.js";

describe("runner-protocol-kit", () => {
  it("parses valid RunJob payloads from both versions", () => {
    const v1 = parseRunJob({
      version: PROTOCOL_V1,
      id: "job-1",
      tool: "search",
      input: { q: "weather" },
    });
    const v2 = parseRunJob({
      version: PROTOCOL_V2,
      jobId: "job-2",
      toolName: "summarize",
      payload: { text: "hello" },
      submittedAt: "2025-10-11T12:30:00.000Z",
    });

    expect(v1.version).toBe(PROTOCOL_V1);
    expect(v2.version).toBe(PROTOCOL_V2);
  });

  it("fails parsing malformed payloads", () => {
    expect(() => parseRunJob({ version: PROTOCOL_V2, jobId: "x" })).toThrow();
    expect(() => parseRunEvent({ version: PROTOCOL_V1, runId: "1", type: "started" })).toThrow();
    expect(() => parseControlSignal({ version: PROTOCOL_V2, kind: "stop" })).toThrow();
    expect(() =>
      parseCompletionPayload({
        version: PROTOCOL_V1,
        runId: "r1",
        success: false,
        durationMs: 10,
      }),
    ).toThrow();
    expect(() =>
      parseRunJob({
        version: PROTOCOL_V2,
        jobId: "x",
        toolName: "tool",
        payload: {},
        submittedAt: "March 3, 2024",
      }),
    ).toThrow();
  });

  it("supports JSON parse and encode helpers", () => {
    const jobJson = encodeRunJob({
      version: PROTOCOL_V1,
      id: "job-json",
      tool: "lint",
      input: { path: "/tmp" },
    });

    const eventJson = encodeRunEvent({
      version: PROTOCOL_V2,
      runId: "run-json",
      event: "progress",
      sequence: 2,
      at: "2025-01-01T00:00:02.000Z",
      message: "step",
      detail: { step: 1 },
    });

    const signalJson = encodeControlSignal({
      version: PROTOCOL_V1,
      signal: "pause",
      reason: "quota",
    });

    const completionJson = encodeCompletionPayload({
      version: PROTOCOL_V2,
      runId: "run-json",
      status: "success",
      output: { ok: true },
      startedAt: "2025-01-01T00:00:00.000Z",
      finishedAt: "2025-01-01T00:00:01.500Z",
    });

    expect(parseRunJobJSON(jobJson)).toMatchObject({ id: "job-json" });
    expect(parseRunEventJSON(eventJson)).toMatchObject({ event: "progress" });
    expect(parseControlSignalJSON(signalJson)).toMatchObject({ signal: "pause" });
    expect(parseCompletionPayloadJSON(completionJson)).toMatchObject({ status: "success" });

    expect(() => parseRunJobJSON("not-json")).toThrow(/Invalid JSON payload/);
  });

  it("upgrades and downgrades RunJob values", () => {
    const v1 = parseRunJob({
      version: PROTOCOL_V1,
      id: "legacy-job",
      tool: "plan",
      input: { objective: "migrate" },
      metadata: { tenant: "acme" },
      requestedAtMs: 1730000000000,
    });

    const v2 = toRunJobV2(v1);
    const backToV1 = toRunJobV1(v2);
    const canonical = normalizeRunJob(v2);

    expect(v2).toMatchObject({ jobId: "legacy-job", toolName: "plan" });
    expect(backToV1).toMatchObject({ id: "legacy-job", tool: "plan" });
    expect(canonical.metadata).toMatchObject({ tenant: "acme" });
  });

  it("preserves epoch timestamps when normalizing/upgrading RunJob values", () => {
    const epoch = parseRunJob({
      version: PROTOCOL_V1,
      id: "epoch-job",
      tool: "plan",
      input: {},
      requestedAtMs: 0,
    });

    const upgraded = toRunJobV2(epoch);
    const canonical = normalizeRunJob(epoch);

    expect(upgraded.submittedAt).toBe("1970-01-01T00:00:00.000Z");
    expect(canonical.submittedAt).toBe("1970-01-01T00:00:00.000Z");
  });

  it("upgrades and downgrades RunEvent values", () => {
    const v1 = parseRunEvent({
      version: PROTOCOL_V1,
      runId: "run-ev",
      type: "started",
      timestampMs: 100,
      message: "boot",
    });

    const v2 = toRunEventV2(v1);
    const backToV1 = toRunEventV1(v2);
    const canonical = normalizeRunEvent(v2);

    expect(v2).toMatchObject({ event: "start", runId: "run-ev" });
    expect(backToV1.type).toBe("started");
    expect(canonical.event).toBe("start");
  });

  it("upgrades and downgrades ControlSignal values", () => {
    const v2 = parseControlSignal({
      version: PROTOCOL_V2,
      kind: "abort",
      reason: "operator abort",
      requestedBy: "ops",
    });

    const downgraded = toControlSignalV1(v2);
    const upgraded = toControlSignalV2(downgraded);
    const canonical = normalizeControlSignal(v2);

    expect(downgraded.signal).toBe("cancel");
    expect(downgraded.reason).toContain("downgraded-from-abort");
    expect(upgraded.kind).toBe("cancel");
    expect(canonical.kind).toBe("abort");
  });

  it("upgrades and downgrades CompletionPayload values", () => {
    const v2 = parseCompletionPayload({
      version: PROTOCOL_V2,
      runId: "run-c",
      status: "failed",
      error: { message: "boom" },
      startedAt: "2025-01-01T00:00:00.000Z",
      finishedAt: "2025-01-01T00:00:02.250Z",
    });

    const v1 = toCompletionPayloadV1(v2);
    const backToV2 = toCompletionPayloadV2(v1);
    const canonical = normalizeCompletionPayload(v1);

    expect(v1.success).toBe(false);
    expect(v1.durationMs).toBe(2250);
    expect(backToV2.status).toBe("failed");
    expect(canonical.durationMs).toBe(2250);
  });
});

// Refinement.

// Refinement.
