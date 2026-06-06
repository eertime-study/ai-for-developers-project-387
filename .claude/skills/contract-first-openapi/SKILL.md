---
name: contract-first-openapi
description: Rules for implementing features from the OpenAPI/TypeSpec contract in this Design-First repo. Use when touching the API contract, backend handlers, frontend API client, or generated types — anything where spec/main.tsp / openapi.yaml is the source of truth.
---

# Contract-first (Design First)

`spec/main.tsp` → `spec/tsp-output/@typespec/openapi3/openapi.yaml` is the **single source of truth**. Frontend and backend are both generated/validated from it.

## Rules
- **Never change the contract** (`spec/main.tsp`) without explicit user agreement. A frontend/backend mismatch is almost always a contract question — fix the contract first, then regenerate, then implement.
- **Реализация идёт от контракта, не от фреймворка.** Endpoints, statuses, schemas, error codes come from the contract; the framework only serves them.
- **Reuse generated types** instead of hand-writing models: `npm run gen:api` → `src/api/schema.ts` (openapi-typescript). Domain code imports aliases from `api/types.ts`.
- After editing `main.tsp`, run `cd spec && npm run compile`, then `gen:api` in `frontend/` and `backend/`.
- Don't invent business rules absent from the task/contract (no working hours, no extra field constraints). See [[in-memory-domain-store]].
- Statuses/enums must match the contract exactly: success codes (all `200` here, including POST), `ErrorCode`, `SlotStatus`.
