# Logging Guidelines

> No-runtime-logger policy for the local-first game.

---

## Overview

The browser runtime has no logging library, telemetry, analytics, or remote log
sink. Runtime failures are represented as typed results or user-visible Redux
state. Adding console output to src is not an observability strategy and should
not be done by default.

---

## Log Levels

Runtime debug, info, warn, and error levels are not defined. A future logging
system requires an explicit product decision because the game is local-first
and stores profile data only on the device.

Node maintenance scripts may print concise success summaries to stdout and
throw on failure. scripts/generate-catalog-emblems.mjs is the existing pattern.

---

## Structured Logging

There is no structured runtime log format. Tests should assert returned state,
events, and errors instead of scraping console output.

For scripts, output should be deterministic and operational: artifact counts,
changed counts, or budget totals. Error output should identify the failing
artifact and make the process exit non-zero.

---

## Allowed Output

- One-off developer scripts may report a final count or audit summary.
- Build tools and test runners own their normal diagnostic output.
- Temporary debugging output must be removed before the quality gate.

---

## What NOT to Log

- Never log exported profile JSON, seed/share payloads, display names, or full
  IndexedDB records.
- Never add analytics or network logging without explicit scope and consent.
- Do not leave console.log, console.warn, debugger, or ad hoc timing probes in
  src.
- Do not treat a console message as error handling; preserve the typed failure
  path and user-visible message.
