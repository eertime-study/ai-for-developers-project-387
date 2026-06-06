---
name: fastify-openapi-validation
description: How runtime request/response validation is wired to the OpenAPI contract via fastify-openapi-glue + Ajv, and how errors are mapped to the contract shape. Use when editing routing, validation, Ajv/formats config, or the Fastify error handler in backend/.
---

# Fastify runtime validation from the contract

`backend/src/app.ts` registers `fastify-openapi-glue` with `specification: openapi.yaml`. Glue builds routes from the spec and validates requests against it. No hand-written routes or schemas.

## Rules
- **Service handler keys = `operationId` with interface prefix**, e.g. `GuestOperations_getOwner`, `AdminOperations_createEventType`. Mismatched names silently become `notImplemented` (500 at call time), not a registration error.
- Missing handlers do **not** fail registration — glue substitutes a `notImplemented` handler. So partial implementation is safe.
- **Formats:** Fastify's Ajv needs `ajv-formats` for `date-time` / `int32` / `email`. Registered via `Fastify({ ajv: { plugins: [addFormats] } })` (local cast needed — Ajv type version mismatch).
- **Success status is `200`** for every operation in this contract (including POSTs). Don't send `201`.
- **Error handler (`errors.ts` → `setErrorHandler`)** maps everything to the contract body `{ code, message, field? }`, never Fastify's default `{ statusCode, error, message }`:
  - Ajv validation error → `400 VALIDATION_ERROR`; `field` best-effort (`instancePath` → `params.missingProperty` → omit).
  - `DomainError` → its `code` + status (400/404/409).
- Business rules absent from the schema (email validity, slot-in-past, double-booking) are enforced in domain code and thrown as `DomainError`, not via the spec.
- Response schemas from the contract are attached by glue → Fastify serializes responses to the contract shape.
- If glue ever conflicts with the spec, do [[root-cause-debugging]] then fall back to manual Fastify routes whose `schema` is read from the parsed `openapi.yaml` (don't hand-duplicate it). See [[contract-first-openapi]].
