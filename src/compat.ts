import {
  CompletionPayload,
  CompletionPayloadSchema,
  CompletionPayloadV1,
  CompletionPayloadV1ValidatedSchema,
  CompletionPayloadV2,
  ControlSignal,
  ControlSignalSchema,
  ControlSignalV1,
  ControlSignalV2,
  PROTOCOL_V1,
  PROTOCOL_V2,
  RunEvent,
  RunEventSchema,
  RunEventV1,
  RunEventV2,
  RunJob,
  RunJobSchema,
  RunJobV1,
  RunJobV2,
} from "./schemas.js";

function parseJson(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parse error";
    throw new Error(`Invalid JSON payload: ${message}`);
  }
}

function asIsoDateFromMs(timestampMs: number): string {
  return new Date(timestampMs).toISOString();
}

function asTimestampMsFromIso(isoDate: string): number {
  const parsed = Date.parse(isoDate);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function durationMs(startedAt: string, finishedAt: string): number {
  const duration = asTimestampMsFromIso(finishedAt) - asTimestampMsFromIso(startedAt);
  return duration > 0 ? duration : 0;
}

export interface CanonicalRunJob {
  id: string;
  tool: string;
  payload: unknown;
  priority?: number;
  submittedAt?: string;
  metadata: Record<string, unknown>;
  sourceVersion: RunJob["version"];
}

export interface CanonicalRunEvent {
  runId: string;
  event: "start" | "progress" | "output" | "error" | "done";
  timestampMs: number;
  message?: string;
  detail?: unknown;
  sourceVersion: RunEvent["version"];
}

export interface CanonicalControlSignal {
  kind: "pause" | "resume" | "cancel" | "abort";
  reason?: string;
  requestedBy?: string;
  sourceVersion: ControlSignal["version"];
}

export interface CanonicalCompletionPayload {
  runId: string;
  status: "success" | "failed" | "cancelled";
  output?: unknown;
  errorMessage?: string;
  durationMs: number;
  sourceVersion: CompletionPayload["version"];
}

const runEventMapV1ToV2: Record<RunEventV1["type"], RunEventV2["event"]> = {
  started: "start",
  progress: "progress",
  output: "output",
  error: "error",
  done: "done",
};

const runEventMapV2ToV1: Record<RunEventV2["event"], RunEventV1["type"]> = {
  start: "started",
  progress: "progress",
  output: "output",
  error: "error",
  done: "done",
};

export function parseRunJob(input: unknown): RunJob {
  return RunJobSchema.parse(input);
}

export function parseRunJobJSON(input: string): RunJob {
  return parseRunJob(parseJson(input));
}

export function encodeRunJob(input: unknown): string {
  return JSON.stringify(parseRunJob(input));
}

export function toRunJobV2(input: RunJob): RunJobV2 {
  if (input.version === PROTOCOL_V2) {
    return input;
  }

  return {
    version: PROTOCOL_V2,
    jobId: input.id,
    toolName: input.tool,
    payload: input.input,
    context: input.metadata,
    submittedAt:
      input.requestedAtMs === undefined ? undefined : asIsoDateFromMs(input.requestedAtMs),
  };
}

export function toRunJobV1(input: RunJob): RunJobV1 {
  if (input.version === PROTOCOL_V1) {
    return input;
  }

  const metadata = Object.fromEntries(
    Object.entries(input.context ?? {}).filter((entry): entry is [string, string] =>
      typeof entry[1] === "string",
    ),
  );

  return {
    version: PROTOCOL_V1,
    id: input.jobId,
    tool: input.toolName,
    input: input.payload,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    requestedAtMs: input.submittedAt ? asTimestampMsFromIso(input.submittedAt) : undefined,
  };
}

export function normalizeRunJob(input: RunJob): CanonicalRunJob {
  if (input.version === PROTOCOL_V1) {
    return {
      id: input.id,
      tool: input.tool,
      payload: input.input,
      submittedAt:
        input.requestedAtMs === undefined ? undefined : asIsoDateFromMs(input.requestedAtMs),
      metadata: input.metadata ?? {},
      sourceVersion: input.version,
    };
  }

  return {
    id: input.jobId,
    tool: input.toolName,
    payload: input.payload,
    priority: input.priority,
    submittedAt: input.submittedAt,
    metadata: input.context ?? {},
    sourceVersion: input.version,
  };
}

export function parseRunEvent(input: unknown): RunEvent {
  return RunEventSchema.parse(input);
}

export function parseRunEventJSON(input: string): RunEvent {
  return parseRunEvent(parseJson(input));
}

export function encodeRunEvent(input: unknown): string {
  return JSON.stringify(parseRunEvent(input));
}

export function toRunEventV2(input: RunEvent): RunEventV2 {
  if (input.version === PROTOCOL_V2) {
    return input;
  }

  return {
    version: PROTOCOL_V2,
    runId: input.runId,
    event: runEventMapV1ToV2[input.type],
    sequence: 0,
    at: asIsoDateFromMs(input.timestampMs),
    message: input.message,
    detail: input.data,
  };
}

export function toRunEventV1(input: RunEvent): RunEventV1 {
  if (input.version === PROTOCOL_V1) {
    return input;
  }

  return {
    version: PROTOCOL_V1,
    runId: input.runId,
    type: runEventMapV2ToV1[input.event],
    timestampMs: asTimestampMsFromIso(input.at),
    message: input.message,
    data: input.detail,
  };
}

export function normalizeRunEvent(input: RunEvent): CanonicalRunEvent {
  if (input.version === PROTOCOL_V1) {
    return {
      runId: input.runId,
      event: runEventMapV1ToV2[input.type],
      timestampMs: input.timestampMs,
      message: input.message,
      detail: input.data,
      sourceVersion: input.version,
    };
  }

  return {
    runId: input.runId,
    event: input.event,
    timestampMs: asTimestampMsFromIso(input.at),
    message: input.message,
    detail: input.detail,
    sourceVersion: input.version,
  };
}

export function parseControlSignal(input: unknown): ControlSignal {
  return ControlSignalSchema.parse(input);
}

export function parseControlSignalJSON(input: string): ControlSignal {
  return parseControlSignal(parseJson(input));
}

export function encodeControlSignal(input: unknown): string {
  return JSON.stringify(parseControlSignal(input));
}

export function toControlSignalV2(input: ControlSignal): ControlSignalV2 {
  if (input.version === PROTOCOL_V2) {
    return input;
  }

  return {
    version: PROTOCOL_V2,
    kind: input.signal,
    reason: input.reason,
  };
}

export function toControlSignalV1(input: ControlSignal): ControlSignalV1 {
  if (input.version === PROTOCOL_V1) {
    return input;
  }

  return {
    version: PROTOCOL_V1,
    signal: input.kind === "abort" ? "cancel" : input.kind,
    reason:
      input.kind === "abort"
        ? [input.reason, "downgraded-from-abort"].filter(Boolean).join("; ")
        : input.reason,
  };
}

export function normalizeControlSignal(input: ControlSignal): CanonicalControlSignal {
  if (input.version === PROTOCOL_V1) {
    return {
      kind: input.signal,
      reason: input.reason,
      sourceVersion: input.version,
    };
  }

  return {
    kind: input.kind,
    reason: input.reason,
    requestedBy: input.requestedBy,
    sourceVersion: input.version,
  };
}

export function parseCompletionPayload(input: unknown): CompletionPayload {
  const parsed = CompletionPayloadSchema.parse(input);
  if (parsed.version === PROTOCOL_V1) {
    return CompletionPayloadV1ValidatedSchema.parse(parsed);
  }
  return parsed;
}

export function parseCompletionPayloadJSON(input: string): CompletionPayload {
  return parseCompletionPayload(parseJson(input));
}

export function encodeCompletionPayload(input: unknown): string {
  return JSON.stringify(parseCompletionPayload(input));
}

export function toCompletionPayloadV2(input: CompletionPayload): CompletionPayloadV2 {
  if (input.version === PROTOCOL_V2) {
    return input;
  }

  return {
    version: PROTOCOL_V2,
    runId: input.runId,
    status: input.success ? "success" : "failed",
    output: input.result,
    error: input.error ? { message: input.error } : undefined,
    startedAt: asIsoDateFromMs(0),
    finishedAt: asIsoDateFromMs(input.durationMs),
  };
}

export function toCompletionPayloadV1(input: CompletionPayload): CompletionPayloadV1 {
  if (input.version === PROTOCOL_V1) {
    return input;
  }

  return {
    version: PROTOCOL_V1,
    runId: input.runId,
    success: input.status === "success",
    result: input.output,
    error:
      input.status === "success"
        ? undefined
        : input.error?.message ?? (input.status === "cancelled" ? "cancelled" : "failed"),
    durationMs: durationMs(input.startedAt, input.finishedAt),
  };
}

export function normalizeCompletionPayload(input: CompletionPayload): CanonicalCompletionPayload {
  if (input.version === PROTOCOL_V1) {
    return {
      runId: input.runId,
      status: input.success ? "success" : "failed",
      output: input.result,
      errorMessage: input.error,
      durationMs: input.durationMs,
      sourceVersion: input.version,
    };
  }

  return {
    runId: input.runId,
    status: input.status,
    output: input.output,
    errorMessage: input.error?.message,
    durationMs: durationMs(input.startedAt, input.finishedAt),
    sourceVersion: input.version,
  };
}

// Refinement.

// Refinement.

// Refinement.
