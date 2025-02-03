import { z } from "zod";

export const PROTOCOL_V1 = "1.0" as const;
export const PROTOCOL_V2 = "2.0" as const;

const ISO_DATE_TIME_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

const isoDateTimeSchema = z.string().refine(
  (value) => ISO_DATE_TIME_REGEX.test(value) && !Number.isNaN(Date.parse(value)),
  "Expected an ISO-8601 date-time string",
);

export const RunJobV1Schema = z
  .object({
    version: z.literal(PROTOCOL_V1),
    id: z.string().min(1),
    tool: z.string().min(1),
    input: z.unknown(),
    metadata: z.record(z.string()).optional(),
    requestedAtMs: z.number().int().nonnegative().optional(),
  })
  .strict();

export const RunJobV2Schema = z
  .object({
    version: z.literal(PROTOCOL_V2),
    jobId: z.string().min(1),
    toolName: z.string().min(1),
    payload: z.unknown(),
    labels: z.array(z.string().min(1)).optional(),
    priority: z.number().int().min(0).max(10).optional(),
    submittedAt: isoDateTimeSchema.optional(),
    context: z.record(z.unknown()).optional(),
  })
  .strict();

export const RunJobSchema = z.discriminatedUnion("version", [
  RunJobV1Schema,
  RunJobV2Schema,
]);

export const RunEventV1Schema = z
  .object({
    version: z.literal(PROTOCOL_V1),
    runId: z.string().min(1),
    type: z.enum(["started", "progress", "output", "error", "done"]),
    timestampMs: z.number().int().nonnegative(),
    message: z.string().optional(),
    data: z.unknown().optional(),
  })
  .strict();

export const RunEventV2Schema = z
  .object({
    version: z.literal(PROTOCOL_V2),
    runId: z.string().min(1),
    event: z.enum(["start", "progress", "output", "error", "done"]),
    sequence: z.number().int().nonnegative(),
    at: isoDateTimeSchema,
    message: z.string().optional(),
    detail: z.unknown().optional(),
  })
  .strict();

export const RunEventSchema = z.discriminatedUnion("version", [
  RunEventV1Schema,
  RunEventV2Schema,
]);

export const ControlSignalV1Schema = z
  .object({
    version: z.literal(PROTOCOL_V1),
    signal: z.enum(["pause", "resume", "cancel"]),
    reason: z.string().optional(),
  })
  .strict();

export const ControlSignalV2Schema = z
  .object({
    version: z.literal(PROTOCOL_V2),
    kind: z.enum(["pause", "resume", "cancel", "abort"]),
    reason: z.string().optional(),
    requestedBy: z.string().optional(),
  })
  .strict();

export const ControlSignalSchema = z.discriminatedUnion("version", [
  ControlSignalV1Schema,
  ControlSignalV2Schema,
]);

export const CompletionPayloadV1Schema = z
  .object({
    version: z.literal(PROTOCOL_V1),
    runId: z.string().min(1),
    success: z.boolean(),
    result: z.unknown().optional(),
    error: z.string().optional(),
    durationMs: z.number().int().nonnegative(),
  })
  .strict();

export const CompletionPayloadV1ValidatedSchema = CompletionPayloadV1Schema.superRefine(
  (value, context) => {
    if (!value.success && !value.error) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "error is required when success is false",
        path: ["error"],
      });
    }
  },
);

export const CompletionPayloadV2Schema = z
  .object({
    version: z.literal(PROTOCOL_V2),
    runId: z.string().min(1),
    status: z.enum(["success", "failed", "cancelled"]),
    output: z.unknown().optional(),
    error: z
      .object({
        message: z.string().min(1),
        code: z.string().optional(),
      })
      .optional(),
    startedAt: isoDateTimeSchema,
    finishedAt: isoDateTimeSchema,
  })
  .strict();

export const CompletionPayloadSchema = z.discriminatedUnion("version", [
  CompletionPayloadV1Schema,
  CompletionPayloadV2Schema,
]);

export type ProtocolVersion = typeof PROTOCOL_V1 | typeof PROTOCOL_V2;

export type RunJobV1 = z.infer<typeof RunJobV1Schema>;
export type RunJobV2 = z.infer<typeof RunJobV2Schema>;
export type RunJob = z.infer<typeof RunJobSchema>;

export type RunEventV1 = z.infer<typeof RunEventV1Schema>;
export type RunEventV2 = z.infer<typeof RunEventV2Schema>;
export type RunEvent = z.infer<typeof RunEventSchema>;

export type ControlSignalV1 = z.infer<typeof ControlSignalV1Schema>;
export type ControlSignalV2 = z.infer<typeof ControlSignalV2Schema>;
export type ControlSignal = z.infer<typeof ControlSignalSchema>;

export type CompletionPayloadV1 = z.infer<typeof CompletionPayloadV1Schema>;
export type CompletionPayloadV2 = z.infer<typeof CompletionPayloadV2Schema>;
export type CompletionPayload = z.infer<typeof CompletionPayloadSchema>;

// Refinement.
