# Database Guidelines

> IndexedDB persistence conventions for this local-first application.

---

## Overview

The project has no server database or ORM. Durable data is stored locally with
idb in the browser's IndexedDB database named baixiqipai. The database has five
object stores: meta, settings, profiles, runs, and recovery.

UI and game rules do not open IndexedDB directly. They depend on the
GameRepository interface, which is injected into the Redux store by
createGameStore.

---

## Query Patterns

Use repository methods for all application reads and writes:

~~~ts
export interface GameRepository {
  getProfile(profileId: ProfileId): Promise<ProfileRecord | undefined>;
  commitCheckpoint(profile: ProfileRecord, run: RunStateV2): Promise<void>;
  replaceProfile(profile: ProfileRecord, run: RunStateV2 | null): Promise<void>;
}
~~~

The concrete implementation in src/persistence/indexedDbRepository.ts may use
idb transactions. Multi-record changes must share one readwrite transaction and
await transaction.done. Profile and run state are committed as a validated
pair; never expose a proposed checkpoint to Redux before that transaction
succeeds.

---

## Migrations

Durable run payloads are versioned independently from the IndexedDB container.
Current writes normalize to RunStateV7. Reads try the newest Zod schema first
and then migrate older V1 through V6 payloads in order.

- Add a new immutable schema module and a one-way migration under
  src/persistence/migrations for a durable shape change.
- Validate external data with Zod, migrate it, then run the corresponding
  game-state invariant validator.
- Preserve a recovery copy before overwriting migrated or current data.
- Add migration, recovery, export/import, and fault-injection tests.
- Never reinterpret an older schema version using the latest shape.

---

## Naming and Keys

- Object-store names are plural nouns except singleton meta and settings.
- Profiles use their branded ProfileId as key and expose a unique by-slot index.
- Runs are keyed by ProfileId so a profile/run pair can be transacted together.
- Recovery keys use kind:profileId, where kind is checkpoint,
  profile-action, or migration.
- Durable records include schemaVersion and, where relevant, contentVersion.

---

## Common Mistakes

- Writing directly from a component bypasses validation, rollback, and injected
  test repositories.
- Saving a run without its projected profile can desynchronize progression.
- Catching an IndexedDB error and still publishing the proposed Redux state
  violates persistence-first command semantics.
- Mutating old migration code makes existing local saves unreproducible.
- Treating browser storage as server state introduces unnecessary fetching and
  cache patterns; this application is offline and local-first.
