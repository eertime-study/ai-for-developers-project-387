---
name: vitest-backend-testing
description: How to write backend tests with vitest + Fastify app.inject(), fixed clock, and a clean store per test. Use when adding or changing tests in backend/test/.
---

# Backend testing (vitest + app.inject)

Tests live in `backend/test/*.test.ts`, run via `npm test` (`vitest run`).

## Rules
- **No real socket:** drive the app with `app.inject({ method, url, payload })`, read `res.statusCode` and `res.json()`.
- **Clean store per test:** `beforeEach` builds a fresh app (`buildApp({ clock })`) → fresh in-memory store; `afterEach` calls `app.close()`. No shared/global state between tests. See [[in-memory-domain-store]].
- **Fixed clock:** pass `fixedClock('2026-06-01T12:00:00.000Z')` so window/slot/past logic is deterministic and tests don't flap. Choose slot times relative to that fixed `now`.
- **Assert exact contract values**, not loose ones:
  - success status is `200` (never assert `201`);
  - error responses assert `body.code` against the contract `ErrorCode`, and that the shape is `{ code, message, field? }` (not Fastify's `{ statusCode, error }`).
- Cover happy paths **and** error paths: double-booking & interval overlap (409), offset normalization (same instant → 409), invalid email (400), not-found (404), past/outside-window (400), duplicate event type (409).
