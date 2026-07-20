# Full Integration and Quality Gate

## Goal

Turn the completed child implementations into one evidence-backed local release
candidate for **百戏奇牌**. The gate must prove that the frozen catalogs, gameplay,
profiles, persistence, modes, presentation, audio, and supported desktop-browser
flows work together without hidden fixtures, stale release documentation, or an
unverified parent criterion.

This task may fix integration defects and missing regression coverage. It may not
add new gameplay, silently rebalance content, or weaken a previously approved
contract merely to make a gate pass.

## Background and Confirmed Baseline

- The eight preceding implementation children are archived. This is the ninth and
  final child of `07-17-chinese-joker-card-web-game`; the parent remains the owner
  of the frozen product requirements and is not itself an implementation target.
- The planning baseline is clean `main` at `9a26ed5`. The immediately preceding
  presentation child recorded a passing baseline of 126 Vitest files / 581 tests,
  10 Playwright specs / 48 Chromium-and-WebKit project cases, and a production
  build. This task must rerun and record current results rather than treating those
  historical numbers as final evidence.
- New production runs use logical schema V7 and content version
  `joker-catalog-3`. The production catalog contains exactly 230 non-Joker rows and
  150 real Joker rows (380 total), with no unresolved shipped Joker dependency.
- The frozen parent scope additionally owns 52 standard playing cards, 12 poker
  hands, 31 visible achievements, three isolated profiles, campaign/seeded/
  challenge/tutorial run classes, eight stakes, and post-win endless play.
- All runtime media is local. The approved presentation budgets are: initial
  JS+CSS gzip below 350 KiB; each of 15 scenes at most 350 KiB and at most 5 MiB
  combined; each of 230 emblems at most 8 KiB and at most 1.5 MiB combined; three
  music stems at most 20 MiB combined; SFX/stingers at most 3 MiB combined; motion
  frame-gap P95 at most 50 ms and zero Chromium Long Tasks above 50 ms.
- The user approved the existing browser exception on 2026-07-20: real Edge plus
  full Playwright Chromium/WebKit evidence is accepted while Google Chrome is not
  installed and Safari remote automation remains disabled. The final gate must
  recheck the local environment, run any newly available named browser, and record
  the exception without silently substituting one browser for another.
- Current release documentation still describes the earlier V4/50-Joker state,
  and several early archived PRDs retain unchecked historical boxes despite their
  completed task status. Archived task artifacts remain historical records; this
  task creates current evidence and updates live parent/release documentation
  rather than rewriting archived history.

## Requirements

### R1 — One strict release-completeness ledger

1. Build one deterministic audit over every frozen parent count and the production
   manifests: IDs, localization, ownership, assets/provenance, handlers, discovery,
   availability/unlock rules, contract coverage, and test ownership.
2. The audit must enumerate all 380 production rows and separately prove the 52-card,
   12-hand, 31-achievement, and progression registries. Range or family rules may
   reduce boilerplate, but no content row may fall through an unowned default.
3. A test-only coverage registry must map every catalog row or closed range to its
   executable positive/boundary coverage owner and applicable interaction/debuff/
   persistence coverage. It must not enter production snapshots or runtime logic.
4. Production and browser audits must reject duplicate, missing, remote, fixture,
   unresolved, unlocalized, unowned, unillustrated, unhandled, or uncovered rows.

### R2 — Cross-content interaction and deterministic replay closure

1. Cover the shared interaction classes that can cross catalogs: all 26 effect
   windows; copy/retrigger/debuff ordering; listed chance; destruction; sale;
   boss suppression; tags; vouchers; packs; consumables; card modifiers; capacity;
   progression observations; and terminal settlement.
2. Derive the interaction ledger from declared capabilities, dependencies, and
   effect operations. Add named cases for non-commutative or historically risky
   combinations instead of attempting an unbounded Cartesian product.
3. Add a reusable V2-compatible scenario transcript runner. For a fixed content
   version, profile snapshot, seed, and command sequence, repeated pure runs,
   persisted reloads, Chromium, and WebKit must reach the same transfer-safe
   canonical profile/run state, RNG, choices, history, and checkpoint.
4. Rejected commands, false random branches, cycles, budget failures, and injected
   write failures must preserve the complete prior canonical state and RNG.

### R3 — Persistence, migration, and profile isolation fault matrix

1. Exercise every durable write surface and its meaningful internal transaction
   stages: settings, active-profile metadata, profile save/delete/reset/restore,
   checkpoint commit, profile replacement/import, run clear/abandon/finish, and
   recovery records.
2. Use a bounded test-only fault seam at transaction write stages where the current
   repository cannot otherwise force an IndexedDB abort. The production default
   must remain behaviorally identical and must not expose fault controls to UI or
   durable data.
3. A failure at any stage must leave the previous durable profile/run/recovery/
   settings state byte-equivalent and must not expose optimistic gameplay state.
   Retrying after the fault is removed must commit exactly once.
4. Verify V1 through V6 run migration into V7, terminal-version idempotence, exact
   recovery preimages, future-version rejection, 2 MB UTF-8 import limits, checksum
   and identity failures, target-slot remapping, positive-Infinity score transfer,
   and invalid-import non-mutation.
5. Verify all three profiles remain isolated across create/select/rename/delete,
   progression, active runs, import/export, reset/restore, and device-only settings.

### R4 — Complete supported-mode browser flows

1. Chromium and WebKit must each complete deterministic mouse-first flows for
   campaign win, campaign loss, post-win endless continuation, seeded play,
   challenge success, challenge loss, tutorial completion/skip/replay, profile
   maintenance, progression, collection, achievements, statistics, and help.
2. Browser scenarios may import deterministic release fixtures to reach expensive
   late-game checkpoints, but every state transition under test must use the real
   UI command and persistence path. Fixtures must use shipped contracts and remain
   clearly test-only.
3. Refresh at representative action and terminal boundaries, compare IndexedDB to
   the canonical scenario state, and prove no duplicated rewards, actions, notices,
   progression, or presentation playback.

### R5 — Desktop performance, presentation, audio, and offline gate

1. Preserve fixed-stage usability and no outer-page scroll at 1280x720 and
   1920x1080. Required actions must remain visible and mouse-operable.
2. Rerun the approved build, asset, resource-loading, scene/emblem/Joker decode,
   visual-baseline, motion, and audio-failure gates against the exact budgets in
   the confirmed baseline.
3. Include a large endless/score-wire scenario so high scores, collection size,
   and long-run history do not cause correctness or responsiveness regressions.
4. Initial navigation and all tested routes must make zero remote runtime requests;
   autoplay, media, scene, or asset failure may degrade presentation only.
5. Record Playwright engine versions, installed real-browser versions, both target
   viewports, observed console/network failures, and any already-approved browser
   exception in the final evidence.

### R6 — Current release documentation and parent evidence

1. Update `README.md` and command descriptions to V7, 150 Jokers, 380 production
   rows, current modes, device settings, audit pages, and the actual local commands.
   No release-facing statement may remain at the earlier 50/100-Joker baseline.
2. Create `evidence.md` in this task with a live matrix for parent AC-01 through
   AC-13. Each row must link to current commands/tests/manual evidence, identify the
   owning child commit, and record pass/fail/approved-exception status.
3. Reconcile all eight archived children by current regression evidence. Do not edit
   archived task files solely to change historical checkboxes.
4. Update the live parent acceptance state only after the complete gate passes.
   Finishing this child does not authorize archiving the parent; parent archival
   requires a separate explicit user confirmation after AC review.

### R7 — Defect and change control

1. Every critical or warning finding must be verified against code and reproduced
   before prioritization. False positives are recorded as verified non-defects.
2. Fix release-blocking integration defects in the owning layer and add a regression
   at the narrowest authoritative boundary plus the full affected gate.
3. Any required change to frozen counts, mappings, balance, supported-browser policy,
   persistence semantics, or out-of-scope boundaries returns to parent planning.
4. The gate cannot pass with a skipped required test, an unexplained flaky retry,
   an unreviewed snapshot update, or an unresolved critical/warning defect.

## Acceptance Criteria

- [x] **AC1 (R1):** One generated release audit reports every exact parent count
      and zero missing, duplicate, remote, fixture, unresolved, unlocalized,
      unowned, unillustrated, unhandled, or uncovered production row.
- [x] **AC2 (R2):** The capability-derived interaction ledger and named risky
      combinations pass, and canonical replay is byte-equivalent across repeated
      pure runs, persisted reloads, Chromium, and WebKit.
- [x] **AC3 (R3):** Every named repository write/fault stage rolls back atomically;
      the complete V1-to-V7 migration/import matrix, invalid-input non-mutation,
      retry-once behavior, and three-profile isolation suites pass.
- [x] **AC4 (R4):** Both Playwright engines pass campaign win/loss/endless, seeded,
      challenge success/loss, tutorial, progression, profile, collection,
      achievement, statistics, help, and representative reload flows.
- [x] **AC5 (R5):** Both viewports, all approved build/asset/loading/motion/audio
      budgets, large-value behavior, visual review, and zero-remote-request gates
      pass; the real-browser matrix is current and every exception is explicit.
- [x] **AC6 (R6):** README and release-facing copy describe the current V7/380-row
      product, and `evidence.md` links parent AC-01 through AC-13 plus all eight
      archived children to current evidence with no unexplained gap.
- [x] **AC7 (R7):** `npm ci`, format, lint, strict TypeScript, full Vitest,
      coverage, generator checks, content audits, production build, full Playwright,
      Trellis validation, and `git diff --check` pass with no unresolved verified
      critical or warning defect.

## Out of Scope

- New gameplay, new catalog rows, independent rebalance, or compatibility with
  another product's seeds, saves, IDs, assets, or rules.
- Mobile/touch-first layouts, gamepad support, dedicated accessibility modes,
  backend services, accounts, cloud sync, analytics, public deployment, packaging,
  or store-release work.
- Installing third-party browsers or changing Safari developer settings without
  separate user action. Environment detection and the already-approved exception
  remain in scope.
- Rewriting archived child histories or completing the unrelated
  `00-bootstrap-guidelines` task.
