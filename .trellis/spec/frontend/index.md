# Frontend Development Guidelines

> Actual React, state, persistence, and quality conventions for Baixi Qipai.

---

## Overview

This is a React 19 and Vite desktop-browser game written in strict TypeScript.
The UI consumes a deterministic local engine through a Redux Toolkit
application layer and persists all durable state to IndexedDB. These documents
describe the patterns already enforced by source code and tests.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Module organization and dependency direction | Active |
| [Component Guidelines](./component-guidelines.md) | Components, props, composition, styling, motion | Active |
| [Hook Guidelines](./hook-guidelines.md) | Typed Redux hooks and local React effects | Active |
| [State Management](./state-management.md) | Redux, engine state, IndexedDB, URL, local UI state | Active |
| [Quality Guidelines](./quality-guidelines.md) | Static, unit, browser, visual, and build gates | Active |
| [Type Safety](./type-safety.md) | Strict TypeScript and runtime validation | Active |
| [Gameplay and Local Persistence](./gameplay-contracts.md) | Deterministic engine, commands, IndexedDB, and stage contracts | Active |
| [Release Integration and Quality](./release-quality-contracts.md) | Release ledger, replay, transaction fault, browser, and build-budget contracts | Active |

---

## Pre-Development Checklist

Before changing frontend code:

1. Read Directory Structure and Type Safety for every change.
2. Read Component Guidelines and Hook Guidelines for React work.
3. Read State Management for Redux, route, settings, or persistence work.
4. Read Quality Guidelines before choosing the validation matrix.
5. Read Gameplay and Local Persistence for command, deterministic-state,
   tutorial, sorting, shop, or IndexedDB behavior.
6. Read Release Integration and Quality for schema, migration, replay,
   browser-baseline, content-ledger, or build-budget changes.

---

## Quality Check

Always read Quality Guidelines, then re-read the guide for each changed
frontend concern. Use Gameplay and Local Persistence for engine, command,
tutorial, shop, sorting, or IndexedDB changes. Use Release Integration and
Quality for durable schemas, migrations, replay, catalog closure, browser
baselines, or build budgets. Run npm run check plus targeted Chromium and
WebKit coverage for browser-visible behavior.

---

**Language**: All documentation should be written in **English**.
