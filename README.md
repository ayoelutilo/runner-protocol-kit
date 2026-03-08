# runner-protocol-kit

Versioned Zod schemas for runner-facing protocol messages, plus compatibility helpers for migration across versions.

## Features

- Runtime validation for `RunJob`, `RunEvent`, `ControlSignal`, and `CompletionPayload`
- Parse and encode helpers for object and JSON-string inputs
- Cross-version conversion helpers (`1.0` <-> `2.0`)
- Canonical normalization helpers for consumers that need a stable internal shape

## Install

```bash
npm install runner-protocol-kit
```

## Usage

```ts
import {
  PROTOCOL_V1,
  PROTOCOL_V2,
  parseRunJob,
  parseRunEventJSON,
  toRunJobV2,
  normalizeCompletionPayload,
} from "runner-protocol-kit";

const legacyJob = parseRunJob({
  version: PROTOCOL_V1,
  id: "job-1",
  tool: "search",
  input: { q: "zod schema" },
});

const latestJob = toRunJobV2(legacyJob);
// latestJob.version === "2.0"

const event = parseRunEventJSON(
  JSON.stringify({
    version: PROTOCOL_V2,
    runId: "run-1",
    event: "progress",
    sequence: 3,
    at: "2024-08-01T12:00:00.000Z",
    message: "halfway",
  }),
);

const canonical = normalizeCompletionPayload({
  version: PROTOCOL_V2,
  runId: "run-1",
  status: "success",
  output: { total: 42 },
  startedAt: "2024-08-01T12:00:00.000Z",
  finishedAt: "2024-08-01T12:00:00.600Z",
});

console.log(latestJob.toolName, event.event, canonical.durationMs);
```

## Development

```bash
npm install
npm test
npm run build
```

## Architecture

See `docs/adr/0001-architecture.md`.

- Changelog: minor updates.

- Changelog: minor updates.

- Changelog: minor updates.
