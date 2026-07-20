# Full Integration and Quality Gate — Evidence

> Live release dossier for 百戏奇牌. Baseline facts are retained for comparison;
> final claims below come from commands and desktop review run on 2026-07-20.

## 1. Release Identity

| Field | Value |
|---|---|
| Baseline HEAD | `9a26ed5` |
| Date / timezone | 2026-07-20 / Asia/Shanghai |
| OS | macOS 26.4.1 (25E253) |
| Node | 26.5.0 (`/opt/homebrew/Cellar/node/26.5.0/bin/node`) |
| npm | 11.17.0 |
| Playwright | 1.61.1 |
| Bundled Chromium | 149.0.7827.55 |
| Bundled WebKit | 26.5 |
| Google Chrome | 150.0.7871.129 |
| Microsoft Edge | 150.0.4078.83 |
| Safari / safaridriver | 26.4 / 21624.1.16.11.4 |
| Current logical run schema | V7 |
| Current production content | `joker-catalog-3` |

The presentation child had recorded Chrome as absent. Chrome is installed for this
gate, so the historical Chrome waiver is not used. Safari itself was reviewed in a
visible desktop session; only remote WebDriver control remains disabled.

## 2. Final Command Matrix

| Gate | Final result | Evidence |
|---|---|---|
| `npm ci` | PASS | 282 packages installed from lockfile; 283 audited; 0 vulnerabilities |
| `npm run format:check` | PASS | all matched files use Prettier style |
| `npm run lint` | PASS | ESLint exited 0 |
| `npm run typecheck` | PASS | `tsc -b` exited 0 |
| `npm run test` | PASS | 134 files / 644 tests |
| `npm run test:coverage` | PASS | 134 files / 644 tests; 81.90% statements, 75.12% branches, 88.56% functions, 85.11% lines |
| `npm run content:audit` | PASS | 2 files / 7 tests |
| emblem generator check | PASS | 230 catalog emblems verified |
| presentation-audio generator check | PASS | fixed seed `midnight-variety-audio-v1`; 29 WAV files; 19,643,516 bytes |
| `npm run build` | PASS | Vite transformed 675 modules |
| `npm run build:audit` | PASS | 288,276 / 358,400 initial gzip bytes |
| `npm run test:e2e` | PASS | 64/64 Chromium + WebKit cases; 2 workers; zero retries; 2.5 minutes |
| Trellis task validation | PASS | child and live parent context files both validated with zero errors |
| `git diff --check` | PASS | final documentation and implementation diff has no whitespace errors |

`npm ci` reported npm's informational `allow-scripts` review notice for optional
`fsevents` copies and `unrs-resolver`; the resulting lockfile install completed,
reported zero vulnerabilities, and passed every compile, test, build, and browser
gate. Vite also retains its non-blocking warning for an uncompressed chunk above
500 KiB; the approved release gate is the exact initial gzip graph, which passes at
80.43% of budget.

## 3. Strict Release Completeness

`tests/integration/release-catalog.test.ts` and
`tests/integration/release-coverage.test.ts` derive all values from live registries.

| Frozen group | Required | Observed | Result |
|---|---:|---:|---|
| Standard playing cards | 52 | 52 | PASS |
| Poker hands | 12 | 12 | PASS |
| Decks | 15 | 15 | PASS |
| Stakes | 8 | 8 | PASS |
| Challenges | 20 | 20 | PASS |
| Vouchers | 32 | 32 | PASS |
| Tarot-equivalents | 22 | 22 | PASS |
| Planet-equivalents | 12 | 12 | PASS |
| Spectral-equivalents | 18 | 18 | PASS |
| Tags | 24 | 24 | PASS |
| Blinds | 30 | 30 | PASS |
| Booster packs | 32 | 32 | PASS |
| Enhancements / seals / editions | 8 / 4 / 5 | 8 / 4 / 5 | PASS |
| Non-Joker rows | 230 | 230 | PASS |
| Jokers | 150 contiguous | 150 (`001` through `150`) | PASS |
| Production rows | 380 | 380 | PASS |
| Visible achievements | 31 | 31 | PASS |
| Objective registry rows | 78 | 78 | PASS |

The strict catalog validator reports zero duplicate, missing, remote, fixture,
unresolved, unlocalized, unowned, unillustrated, unhandled, unavailable, or
uncovered production rows. The test-only coverage ledger has 13 closed non-Joker
families plus 11 bounded Joker ranges; every row has exactly one owner, every owner
test exists, and broad `1..150` Joker catch-all rules are rejected by negative
tests.

## 4. Interaction and Deterministic Replay

| Evidence | Result |
|---|---|
| Effect operation ownership | all 74 operation types covered exactly once |
| Effect windows | all 26 windows covered exactly once |
| Named risky groups | 8/8: copy/retrigger/debuff, listed chance, destruction/clone snapshot, sale/boss payout, tag/voucher/pack/capacity, modifier/score/destroy, challenge/frozen pools, terminal/progression/endless |
| V2 scenario runner | accepted commands validate with V2-V7 invariants; expected rejections retain the full transfer-safe preimage |
| Pure/persistence/transfer replay | campaign, seeded, challenge, tutorial, and endless all match across repeat, IndexedDB reopen, and export/import |
| Browser canonical replay | five run classes in Chromium and five in WebKit match the pure `commitRunCommand` profile/run pair after real UI action and refresh |
| Complete terminal additions | challenge success, challenge failure, and large endless/Infinity each pass in both engines |

The browser helper reads the real IndexedDB profile/run pair. It does not reproduce
score, progression, RNG, or persistence logic. Late-game fixtures only establish a
checkpoint; every asserted transition travels through a visible page control,
Redux thunk, repository transaction, and rendered committed state.

## 5. Persistence, Migration, and Profile Isolation

| Suite | Final result | Contract proven |
|---|---:|---|
| `integration-fault-matrix.test.ts` | 42 tests | every meaningful named write stage rolls back all five stores and clean retry commits |
| `store-failure-matrix.test.ts` | 5 tests | Redux preserves the committed view, emits Chinese error, reveals no presentation, and retries |
| `profile-isolation-matrix.test.ts` | 1 table-driven test | all three slots isolate profile/run/progression while sharing only device settings |
| Existing repository/migration/transfer suites | included in 644/644 | V1-V7 migration, exact recovery preimage, future/invalid rejection, checksum, 2 MB UTF-8 limit, slot remap, Infinity wire, and non-mutation |

The production default remains `new IndexedDbGameRepository()` with physical DB
version 1 and the same five stores. The optional constructor-only `faultHook`
accepts one of 11 named stages, aborts the current transaction synchronously, and
throws `测试故障：<stage>`. It is absent from `GameRepository`, UI, schema, records,
exports, and ordinary callers.

## 6. Browser, Presentation, Performance, and Assets

### Automated engine matrix

All 64 Playwright cases passed at zero retries. The suite covers campaign win,
campaign loss, post-win endless, seeded play, challenge success/loss, tutorial
completion/skip/replay, profile recovery/isolation, collection, achievements,
statistics, help, canonical reload, audio failure, local resources, catalog image
decode, and presentation persistence.

- 1280x720 visual baselines cover profiles, blind selection, table, reward, shop,
  and loss.
- 1920x1080 profiles and table exactly match viewport width/height, with no outer
  scroll and both play/discard controls in view.
- Motion assertions stay within the approved 50 ms frame-gap/Long Task contract.
- Initial navigation requests no audio; catalog browsing does not eagerly decode
  all 150 Joker rasters.
- Audio fetch/decode failure leaves profile creation and navigation usable.
- Full and brisk presentation consume only committed evidence; skip does not issue
  another gameplay command or change IndexedDB.

### Installed browser matrix

Chrome and Edge were launched through their installed named channels. Each browser
ran the same mouse-first flow at both target viewports: create profile, skip the
prompt, toggle both presentation speeds, start a campaign, mute/restore, enter the
table, verify play/discard visibility, return to the catalog, and inspect decoded
images.

| Browser | Viewport | Geometry / controls | Images | Console | Remote requests | Result |
|---|---|---|---|---:|---:|---|
| Chrome 150.0.7871.129 | 1280x720 | exact stage; play + discard visible | 231 nodes; 11 lazy-decoded; 0 broken | 0 | 0 | PASS |
| Chrome 150.0.7871.129 | 1920x1080 | exact stage; play + discard visible | 231 nodes; 16 lazy-decoded; 0 broken | 0 | 0 | PASS |
| Edge 150.0.4078.83 | 1280x720 | exact stage; play + discard visible | 231 nodes; 11 lazy-decoded; 0 broken | 0 | 0 | PASS |
| Edge 150.0.4078.83 | 1920x1080 | exact stage; play + discard visible | 231 nodes; 16 lazy-decoded; 0 broken | 0 | 0 | PASS |
| Safari 26.4 | visible desktop smoke | create -> campaign -> blind -> table -> select card; controls and audio indicator present | visible scenes/cards loaded | no visible failure | local origin only | PASS WITH APPROVED WEBDRIVER EXCEPTION |

The Safari WebDriver probe returned HTTP 500 with the exact message:
`You must enable 'Allow remote automation' in the Developer section of Safari Settings`.
No Safari setting was changed. This is the already-approved Safari automation
exception; the real Safari mouse-first smoke passed, while bundled WebKit 26.5
supplies the complete 1280x720 and 1920x1080 automated matrix.

Visible desktop review additionally confirmed Chrome profile/menu/campaign/audio,
Edge recovery into an existing night-market checkpoint with mute restoration, and
Safari profile/campaign/table selection. The Chrome sound drawer exposed independent
master/music/SFX sliders and both performance speeds; browser audio indicators
became active after trusted interaction.

### Final resource totals

| Asset/build group | Count | Bytes | Maximum file | Result |
|---|---:|---:|---:|---|
| Joker WebP | 150 | 26,456,070 | 322,076 | PASS; 150/150 decode audit |
| Catalog emblem SVG | 230 | 327,649 | 1,601 | PASS (<1.5 MiB total, <8 KiB each) |
| Presentation scene WebP | 15 | 2,381,320 | 205,048 | PASS (<5 MiB total, <350 KiB each) |
| Audio WAV | 29 | 19,643,516 | 6,144,044 | PASS; 3 stems + 22 SFX + 4 stingers |
| Initial JS+CSS graph | 4 files | 288,276 gzip | 238,624 gzip main entry | PASS (<358,400) |

## 7. Archived Child Reconciliation

| Child | Implementation | Archive | Current integration status |
|---|---|---|---|
| Playable Foundation Slice | `0e2152c` | `a11d23a` | PASS under 644-unit / 64-browser matrix |
| Complete Run and Economy | `4b6a1c8` | `aedc406` | PASS under terminal, interaction, replay, and fault gates |
| Non-Joker Content Catalogs | `cdec433` | `37a3708` | PASS under 230-row strict audit and browser catalog audit |
| Joker Catalog 001-050 | `19b0171` | `6c3525f` | PASS under 150-row closed ledger and current gameplay regression |
| Joker Catalog 051-100 | `f79279b` | `f901752` | PASS under 150-row closed ledger and current gameplay regression |
| Joker Catalog 101-150 | `6237908` | `f3ff199` | PASS under 150-row closed ledger and current gameplay regression |
| Progression Tutorial and Modes | `fe8fbd3` | `a0200dc` | PASS under mode, profile, tutorial, and progression E2E |
| Midnight Variety Presentation | `962c1aa` | `a06db49` | PASS under asset, audio, motion, viewport, and real-browser gates |

Historical unchecked boxes inside archived child PRDs remain historical records;
they are not current failures and were not rewritten.

The final stale-copy grep found no obsolete V4/50-Joker/280-row claim in README or
current release-facing copy. Remaining matches are intentional migration/runtime
compatibility identifiers, historical task baselines, current 150-Joker evidence,
or the `07-17-joker-catalog-101-150` task name.

## 8. Parent Acceptance Matrix

| Parent criterion | Status | Current evidence |
|---|---|---|
| AC-01 Local launch | PASS | clean `npm ci`; local Vite build/preview; visible Chrome/Edge/Safari; no backend/account |
| AC-02 Complete modes | PASS | campaign win/loss/endless, seeded, challenge success/loss, tutorial in full E2E/replay matrix |
| AC-03 Catalog completeness | PASS | exact live counts, strict validator, closed 380-row coverage ledger, local asset/browser audits |
| AC-04 Rule correctness | PASS | 74 operations, 26 windows, 8 risky groups, existing positive/boundary/debuffed owners, 644 total tests |
| AC-05 Determinism | PASS | five-class pure/reopen/transfer replay plus 10 canonical browser cases |
| AC-06 Atomic recovery | PASS | 42 repository fault cases + 5 app rollback cases + existing migration/import suite |
| AC-07 Profile isolation | PASS | all three slots, run/progression/transfer/reset/restore/delete, shared settings only |
| AC-08 Tutorial and reference | PASS | completion, skip, replay, reload, hand/help routes in Chromium and WebKit |
| AC-09 Progression | PASS | objectives, achievements, discovery, statistics, stickers, challenge isolation and persistence |
| AC-10 Original Chinese presentation | PASS | Chinese copy, ownership/provenance, 150 Joker + 230 emblem + 15 scene + 29 audio audits |
| AC-11 Desktop experience | PASS WITH APPROVED SAFARI WEBDRIVER EXCEPTION | both target viewports in Chromium/WebKit and real Chrome/Edge; real Safari mouse-first smoke passed |
| AC-12 Audio and animation | PASS | independent mix, mute/restore, full/brisk, local media, failure isolation, performance assertions |
| AC-13 Parent integration | PASS AT CHILD HANDOFF | all eight archived children reconciled; ninth child passes and is handed to `trellis-finish-work` |

The parent remains unarchived. Finishing and archiving this ninth child does not
authorize parent archival; the user must separately approve the parent AC review
and archive action.

## 9. Verified Defects, Differences, and Exceptions

| Finding | Final disposition |
|---|---|
| README advertised V4 / 50 Jokers / 280 rows | FIXED; release regression now asserts V7 / 150 / 380 |
| Named Chrome emitted two local favicon 404 console errors | FIXED with explicit local SVG favicon and regression test; all four named-browser runs now have zero console errors |
| Existing table component test used presentation copy as a readiness signal | FIXED to await real playing-card nodes; focused and full 644-test reruns pass |
| Existing 80-shop rarity matrix inherited a 5-second timeout under coverage instrumentation | FIXED with a local 15-second allowance; sample count and global timeout unchanged; focused coverage and full coverage pass |
| Historical unchecked boxes in archived child PRDs | VERIFIED DOCUMENTATION HISTORY; current regression dossier is authoritative |
| Chrome unavailable in earlier child environment | RESOLVED ENVIRONMENT CHANGE; real Chrome ran both viewports |
| Safari remote automation disabled | APPROVED EXCEPTION RETAINED; exact WebDriver failure recorded, setting unchanged, real Safari smoke + full WebKit matrix pass |
| Vite uncompressed chunk warning | VERIFIED NON-BLOCKING; exact approved initial gzip budget passes |
| npm `allow-scripts` review notice | VERIFIED TOOL NOTICE; clean install, zero vulnerabilities, and every runtime/quality gate pass |

No verified critical or warning product defect remains.
