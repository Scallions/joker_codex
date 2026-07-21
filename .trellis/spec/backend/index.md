# Backend Development Guidelines

> Non-UI and persistence boundaries for this browser-only project.

---

## Overview

Baixi Qipai does not ship an HTTP service, server process, server database, or
remote logging pipeline. These documents define that absence and describe the
non-UI boundaries that would otherwise be mistaken for a backend: the pure game
engine, local content assembly, application orchestration, and IndexedDB
persistence.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Non-UI module boundaries and file layout | Active |
| [Database Guidelines](./database-guidelines.md) | IndexedDB repository, validation, and migrations | Active |
| [Error Handling](./error-handling.md) | Domain rejection, invariant, and persistence failures | Active |
| [Quality Guidelines](./quality-guidelines.md) | Determinism, boundaries, and verification | Active |
| [Logging Guidelines](./logging-guidelines.md) | No-runtime-logger policy and script output | Active |

---

## Pre-Development Checklist

Before changing non-UI behavior:

1. Read Directory Structure for the permitted dependency direction.
2. Read Database Guidelines for any profile, run, settings, export, or migration change.
3. Read Error Handling before adding a rejection or catch boundary.
4. Read Quality Guidelines before changing deterministic rules or transactions.
5. Read Logging Guidelines before adding any console or diagnostic output.

If a real network service is introduced, update this whole layer in the same
task. Do not silently apply browser-persistence conventions to a server.

---

## Quality Check

For every non-UI change, read Quality Guidelines and the guide matching the
changed boundary. Persistence changes also require Database Guidelines and
Error Handling; new output requires Logging Guidelines. Verify that npm run
check passes and that no server-only convention or runtime logger was invented.

---

**Language**: All documentation should be written in **English**.
