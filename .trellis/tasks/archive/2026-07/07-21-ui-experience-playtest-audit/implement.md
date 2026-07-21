# UI and Player Experience Playtest Audit Plan

## 1. Execution contract

- This task produces research artifacts only. Do not modify product code, tests,
  generated assets, dependencies, schemas, or existing specifications.
- Use real browser controls for qualitative evidence. Repository tests and fixtures
  may help reach or verify a state but may not replace the actual rendered flow.
- Preserve the two approved desktop baselines exactly: 1280x720 and 1920x1080.
- Keep gameplay and balance observations out of the report even when they arise
  naturally during play.
- Work inline in the current session. Do not dispatch implementation/check agents.

## 2. Phase A — Freeze baseline and create the ledger

1. Record the commit, clean status, preview URL/status, browser versions, and local
   date in `research/ui-ux-audit.md`.
2. Create the coverage ledger from the ten surface families in `design.md`.
3. Create `research/evidence/` and establish the screenshot naming convention.
4. Open an isolated named browser session; confirm no existing user profile is
   visible inside that context before creating disposable audit data.
5. Record the evaluation lenses and severity rubric at the top of the report so
   later prioritization cannot silently drift.

Gate: task/research files are the only dirty paths; local preview returns HTTP 200.

## 3. Phase B — First-time playtest at 1280x720

1. Start from loading/profile selection and create a disposable Chinese profile.
2. Observe the first-tutorial prompt and main-menu relationship before starting.
3. Complete all eight tutorial steps through real controls:
   - blind selection and guidance;
   - hand selection, first play, discard, automatic sorting, and repeated play;
   - score/performance feedback and reward receipt;
   - Joker purchase, item/pack tab transition, pack choice, target confirmation;
   - shop exit and tutorial completion/result.
4. During the flow, exercise tutorial detail, skip affordance without confirming
   destructive exit, sound drawer, mute, volume, and presentation-speed controls.
5. Capture clean screenshots at every phase boundary and annotated evidence for
   any provisional P0/P1.
6. Log first-time comprehension, pointer travel, waits, feedback clarity, motion,
   and audio observations immediately rather than reconstructing them later.

Gate: tutorial reaches its completion screen; every tutorial ledger row has an
evidence file or an explicit no-finding note.

## 4. Phase C — Returning-player playtest at 1920x1080

1. Return to the main menu and review campaign, seeded, and challenge setup without
   changing gameplay scope.
2. Start one ordinary campaign path and exercise:
   - blind selection;
   - repeated select/play/discard/sort interactions;
   - table Joker inspection and route chrome;
   - reward, shop item/pack tabs, inventory, vouchers, pack/target choices;
   - one accepted and one safely reproducible rejected UI action when available.
3. Review collection, achievements, statistics, help, notices, and maintenance via
   their real menu navigation and return paths.
4. Reach loss/win/finished result surfaces through a normal or existing public
   fixture/import entry if ordinary play would make the audit disproportionately
   long. Exercise the final rendered controls manually.
5. Record repeated-action cost separately from first-time comprehension.

Gate: ordinary-path and reference/progression ledger rows are complete; all
provisional findings identify audience and recurrence.

## 5. Phase D — WebKit and cross-state parity

1. Reproduce each provisional P0/P1 at 1280x720 in WebKit.
2. Reproduce each P0/P1 and representative dense screens at 1920x1080 in WebKit.
3. Mark findings as shared, Chromium-only, WebKit-only, or unconfirmed.
4. Use existing deterministic UI entry paths where helpful, but capture the final
   rendered state and interaction as fresh evidence.
5. Downgrade or discard observations that were transient animation frames, browser
   tooling artifacts, or unsupported-state assumptions.

Gate: no P0/P1 remains browser-ambiguous; every parity row has evidence/status.

## 6. Phase E — Synthesis and prioritization

1. Consolidate raw notes into stable `UX-NNN` findings.
2. Merge duplicate symptoms under shared causes while preserving route evidence.
3. Apply severity, recurrence, audience, size, and risk fields consistently.
4. Separate findings into:
   - blockers;
   - major/recurring friction;
   - polish;
   - optional experiments.
5. Rank the five highest-value changes by player benefit, recurrence, confidence,
   and implementation cost/risk.
6. Identify quick wins and structural changes; do not create implementation tasks.

Gate: every finding is reproducible or clearly labeled subjective; no gameplay or
balance recommendation remains.

## 7. Phase F — Annotated evidence and wireframes

1. Ensure every P0/P1 has a clean and annotated screenshot.
2. Select only the top three to five recommendations for before/after wireframes.
3. Keep wireframes structural and map every changed zone to finding IDs.
4. Verify that after-states preserve the midnight-theater identity and introduce no
   gameplay changes.
5. Add captions describing expected benefit and trade-off.

Gate: all image links resolve; wireframes are legible at normal document zoom and
do not imply high-fidelity approval.

## 8. Phase G — Audit quality check

1. Re-read `prd.md`, `design.md`, and the final report top to bottom.
2. Verify the coverage ledger has no unexplained blank state.
3. Verify all P0/P1 evidence, reproduction paths, and browser/viewport labels.
4. Verify each recommendation includes player benefit and trade-off.
5. Confirm the report explicitly excludes gameplay/balance conclusions.
6. Confirm product/test/spec directories are unchanged relative to the baseline;
   only current task research artifacts may be dirty.
7. Validate the Trellis task and run `git diff --check`.
8. Close the isolated browser session and confirm the local preview still responds.

Validation commands:

```sh
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4173
python3 ./.trellis/scripts/task.py validate 07-21-ui-experience-playtest-audit
git status --short
git diff --check
```

## 9. Review gate and next work

- Present the final audit, top five, evidence index, and suggested implementation
  task split to the user.
- Do not edit the product or create follow-on tasks until the user explicitly
  chooses which recommendations to implement.
- Commit and archive this audit task only after the user approves the report and
  the research-only diff.
