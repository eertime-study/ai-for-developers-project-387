---
name: root-cause-debugging
description: When something errors or fails, find and fix the root cause instead of patching the first visible symptom. Use whenever you hit a bug, failing test, type error, build failure, or unexpected runtime behavior in this repo.
---

# Root-cause debugging

This repo's policy (see the "Отладка и работа с ошибками" section of `CLAUDE.md` for the full version): **don't fix the surface symptom — find the root cause first.**

## Steps
1. Read the whole error + context (stack, nearby logs, recent changes).
2. Reproduce it — don't guess from the message.
3. Trace the chain: data → types → config → dependencies → API contract (`spec/main.tsp`). A frontend/backend symptom is often a contract imprecision. See [[contract-first-openapi]].
4. Fix the source, not the failing line.
5. Verify: types, build, relevant tests, a manual run of the scenario.

## Anti-patterns (do NOT do, even if it "works")
- weaken types (`any`, `as unknown as`, dropping `strict`);
- swallow exceptions with empty `catch`, suppress warnings;
- delete/skip a failing test instead of understanding what it caught;
- bump timeouts, add retries, hardcode values to dodge the problem;
- local workaround when the root cause is out of scope — instead flag it to the user and agree on scope.

After a non-trivial fix, give a 1–3 line summary: what the root cause was and what changed.
