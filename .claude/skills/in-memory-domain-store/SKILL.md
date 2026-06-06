---
name: in-memory-domain-store
description: Rules for the in-memory store and booking domain logic (no global singleton, normalized time keys, interval-overlap conflict, UTC slot grid). Use when editing store.ts, slots.ts, bookings.ts, eventTypes.ts, or clock.ts in backend/.
---

# In-memory store & booking domain

Data is in-memory and resets on restart (allowed by the task). No database.

## Rules
- **No global singleton.** `createStore()` returns a fresh store; it's called inside `buildApp()`, so each app instance (and each test) is isolated.
- **Time only via `clock.now()`** for the current moment. `buildApp({ clock })` injects it; tests pass a fixed clock. Parsing an input `startTime` with `new Date(str)` is fine — that's not "getting now".
- **Normalize time keys:** a booking's map key is `new Date(input.startTime).toISOString()`. The same instant in different offsets/formats must collapse to one key (and one booking).
- **Anti double-booking is by interval overlap**, independent of `eventTypeId`: new `[start, end)` overlapping any existing `[start, end)` → `409 SLOT_ALREADY_BOOKED`. A 30-min and a 60-min type that overlap still conflict.
- **Slot grid is UTC**, step = `durationInMinutes`, anchored at UTC midnight of the current day. `owner.timeZone` is returned by the contract but is **not** used to restrict hours — no working-hours rule exists in the contract. See [[contract-first-openapi]].
- Slot status (matches booking validation): `start <= now` → past; `start > windowEnd` → outside_window; overlaps a booking → booked; else available.
- Don't invent constraints, but do guard against crashes (e.g. reject non-positive `durationInMinutes`, which would make the slot grid uncomputable).
