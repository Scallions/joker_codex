# Type Safety

> Strict TypeScript and runtime validation conventions.

---

## Overview

The application uses TypeScript in strict mode with noUncheckedIndexedAccess,
exactOptionalPropertyTypes, isolatedModules, and noEmit. ESLint requires
consistent type imports and forbids type-only side effects.

Types prevent invalid internal combinations; Zod and explicit validators guard
data crossing durable or user-controlled boundaries.

---

## Type Organization

- Put domain types beside their owner under src/game-core/model or command
  modules.
- Put persistence-only schemas and repository contracts under src/persistence.
- Put component props beside the component unless several modules share the
  same presentation contract.
- Derive store types from createGameStore instead of duplicating them.
- Use import type whenever an import is erased at runtime.
- Mark immutable inputs, events, state fields, and props readonly.

Versioned durable types use explicit V suffixes. A type alias without a new
runtime contract should not receive a new durable version.

---

## Discriminated and Branded Types

Closed unions model phases, routes, commands, events, and results:

~~~ts
export type CommandResultV2 =
  | {
      readonly ok: true;
      readonly state: RunStateV2;
      readonly domainEvents: readonly DomainEventV2[];
      readonly presentationEvents: readonly PresentationEventV2[];
    }
  | { readonly ok: false; readonly rejection: CommandRejectionV2 };
~~~

Narrow on the discriminator before reading variant fields. Stable identifiers
use StableId brands so a CardId, ProfileId, and RunId are not interchangeable.
Use stableId at controlled creation/migration boundaries.

---

## Runtime Validation

- Zod schemas validate IndexedDB, import, and versioned content payloads.
- safeParse is preferred when the caller must try multiple historical schemas.
- Game-state invariant validators run after schema parsing and after proposed
  commands.
- Manual unknown/object checks are acceptable for small legacy or browser
  boundaries, as in routeState.ts and decodeLegacyProfile.
- Cross-record rules such as profile/run ownership require a separate
  validator; a field schema alone is insufficient.

Schema adapters occasionally use a localized unknown assertion after a runtime
validator establishes the contract. Keep such assertions inside the schema
module and cover them with invalid-payload tests.

---

## Common Patterns

- Record<Union, Value> makes label maps exhaustive, as with suit and rank
  labels in GameTableScreen.
- ReturnType derives GameStore, RootState, and AppDispatch.
- ReadonlySet and readonly arrays communicate non-mutating component inputs.
- satisfies or as const preserves literal types for authored catalogs and
  command fixtures.
- Exhaustive switch statements route discriminated commands and phases.

---

## Forbidden Patterns

- any in application source.
- Blind casting of imported JSON, IndexedDB records, URL values, or event
  payloads to domain types.
- Non-null assertions without an immediately established invariant.
- Optional properties used to represent mutually exclusive states when a
  discriminated union can express them.
- Re-declaring domain shapes in presentation code.
- Value imports used only for types, circular imports, and casing drift.
