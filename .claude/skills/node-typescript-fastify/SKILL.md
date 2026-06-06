---
name: node-typescript-fastify
description: Conventions for the Node.js + TypeScript + Fastify backend in backend/. Use when adding or editing backend route handlers, domain modules, server bootstrap, or build/tsconfig for the Call Calendar API.
---

# Node + TypeScript + Fastify backend

Backend lives in `backend/`. ESM (`"type": "module"`), `tsconfig` is `NodeNext` + `strict`.

## Rules
- **ESM imports use `.js` extensions** for relative paths (NodeNext requirement), even though sources are `.ts`.
- Keep **route handlers thin**: `service.ts` maps each `operationId` to a domain function; business logic lives in domain modules (`slots.ts`, `bookings.ts`, `eventTypes.ts`), not in handlers.
- **Casts:** avoid `any` / `as unknown` **in domain logic**. In the infrastructure layer (Fastify / openapi-glue / generated types) a local cast is fine **if** isolated, minimal, and accompanied by a one-line comment explaining why (e.g. mismatched Ajv types, untyped glue `request.params`/`request.body`). Goal: strict typing of the domain, not fighting TS on integration seams.
- Time only via `clock.now()` — never `new Date()` for "now". Parsing an input date string with `new Date(str)` is fine. See [[in-memory-domain-store]].
- `buildApp(options)` builds a fresh app (and fresh store); `server.ts` only does `listen`. Port `3000` (env `PORT`).
- Validation & error handling are contract-driven — see [[fastify-openapi-validation]].
- On any error, do root-cause analysis first — see [[root-cause-debugging]].
