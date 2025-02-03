# ADR 0001: Versioned Protocol Contracts with Canonical Adapters

- Status: Accepted
- Date: 2024-06-15

## Context

Runner protocol messages evolve over time but consumers need strict runtime validation and a stable internal shape. Multiple clients may still emit legacy payloads.

## Decision

`runner-protocol-kit` provides:

- Versioned schemas using Zod discriminated unions by `version`
- Parse/encode helpers for object and JSON payloads
- Explicit up/down conversion helpers between protocol versions
- Canonical normalization helpers so runtime consumers can operate on a single shape

The package currently supports protocol versions `1.0` and `2.0`.

## Consequences

### Positive

- Backward compatibility can be handled at package boundaries.
- Validation errors are explicit and fail early.
- Consumers can migrate incrementally using canonical models.

### Negative

- Every versioned type requires a conversion matrix and tests.
- Some downgraded semantics are lossy (for example `abort` downgrades to `cancel`).

## Alternatives Considered

- Single schema with optional fields: rejected because it hides version intent and makes incompatibilities harder to reason about.
- JSON Schema only: rejected because we wanted native TypeScript inference and lightweight parse APIs.

- Changelog: minor updates.

- Changelog: minor updates.
