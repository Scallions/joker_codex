# UI and Player Experience Playtest Audit Design

## 1. Audit objective

Produce a reproducible, player-centered UI/experience audit of the current local
build. The audit is observational: it creates task research artifacts and browser
evidence, but changes no product code, content, assets, tests, schemas, or balance.

The first-principles question is: can a player see what matters, understand what
can be done, act with confidence, perceive the result, and repeat common actions
without avoidable friction? A technically valid control or passing snapshot is not
accepted as proof of a good experience.

## 2. Boundaries

### 2.1 Included

- Chinese desktop UI at 1280x720 and 1920x1080.
- Pointer-based first-time and returning-player flows.
- Layout, hierarchy, density, legibility, discoverability, feedback, motion,
  presentation audio, consistency, recovery copy, and repeated-action efficiency.
- The current midnight-theater visual identity and approved local artwork.

### 2.2 Excluded

- Gameplay mechanics, balance, difficulty, economy, rewards, unlock/content pacing,
  and catalog composition.
- Shorter desktop heights, mobile/touch, accessibility-only remediation, music or
  sound-design criticism, and non-Chinese localization.
- Product implementation or high-fidelity redesign.

## 3. Evidence architecture

### 3.1 Browser roles

| Browser / viewport | Role | Required coverage |
|---|---|---|
| Chromium 1280x720 | Primary first-time playtest | Fresh profile and complete eight-step tutorial |
| Chromium 1920x1080 | Primary returning-player playtest | Ordinary setup/table/reward/shop plus reference and progression routes |
| WebKit 1280x720 | Parity check | Every P0/P1 surface and interaction implicated by Chromium findings |
| WebKit 1920x1080 | Large-stage parity check | Every P0/P1 large-stage finding plus representative dense screens |

Chromium hands-on play supplies the main qualitative record. WebKit is not a
second independent taste review; it verifies whether high-impact observations are
browser-specific and provides evidence when geometry or rendering differs.

### 3.2 Surface ledger

The audit ledger records these route/state families:

1. loading and profile selection/creation;
2. first-tutorial prompt, main menu, campaign/seeded/challenge setup;
3. blind selection and tutorial guidance/detail;
4. table chrome, Joker rail, ledger, hand selection/sorting, action controls;
5. score/result performance, reward receipt, and transition pacing;
6. shop item/pack tabs, vouchers, owned inventory, purchase and error feedback;
7. pack options, target choices, and Joker artwork inspection;
8. sound drawer and presentation-speed controls;
9. collection, achievements, statistics, help, notices, and maintenance;
10. win/loss/finished results and return navigation.

Each row records browser, viewport, disposable profile/run, entry path, actions,
completion, screenshots, and notes. A state that cannot be reached naturally in a
reasonable audit session may use an existing public import/setup path, but the
final interaction is still exercised through the real rendered UI.

### 3.3 Evaluation lenses

| Lens | Review question |
|---|---|
| Focus and hierarchy | Is the next important fact/action visually dominant without hiding context? |
| Discoverability | Can a first-time player infer what is interactive and why? |
| Legibility and density | Can Chinese copy, values, art, and status be scanned at normal zoom? |
| Spatial consistency | Do controls and information keep stable ownership across phases? |
| Feedback | Does every accepted, rejected, pending, and committed action read clearly? |
| Motion and audio | Do cues clarify state and pacing without masking controls or causing needless waits? |
| Repeat efficiency | Do returning players incur avoidable clicks, waits, pointer travel, or context switches? |
| Recovery | Can players understand errors, cancellation, destructive actions, and the path back? |
| Visual coherence | Do hierarchy changes preserve the existing midnight-theater identity? |

## 4. Observation and severity contract

Every finding has one stable ID (`UX-001`, `UX-002`, ...), one owning surface, and
the following fields:

```text
ID / title
severity: P0 | P1 | P2 | P3
kind: objective defect | interaction friction | polish | experiment
audience: first-time | returning | both
recurrence: once | per run | per round | per action
browser / viewport / route-state
reproduction and evidence links
player impact
recommended direction and expected benefit
trade-off
estimated size: S | M | L
risk / dependencies
```

Severity means:

- `P0`: a supported-baseline path cannot be discovered or completed;
- `P1`: major misunderstanding or friction on a common/critical path;
- `P2`: recurring/local friction with a clear improvement benefit;
- `P3`: polish or optional experiment whose value is plausible but not required.

Severity is driven by impact and recurrence, then reduced when evidence is weak or
the observation is mainly taste. Duplicate symptoms across screens are merged
under their shared cause while preserving every evidence link.

## 5. Evidence capture

- Store evidence under `research/evidence/` using
  `<browser>-<viewport>-<surface>-<state>.png`.
- Capture a clean screenshot before annotating. High-priority findings also receive
  an annotated copy or numbered browser overlay tied to the report text.
- Record enough surrounding stage context to judge hierarchy; do not crop an issue
  so tightly that control ownership becomes ambiguous.
- Motion findings include a short timestamped observation sequence and, when
  useful, before/during/after frames rather than a single misleading still.
- Audio findings record scene/control state, action, expected feedback role, and
  perceived result. They do not judge composition quality.
- Geometry can support a finding, but `elementFromPoint`, bounding boxes, or test
  success cannot replace the hands-on observation.

## 6. Wireframe contract

Only the final three to five recommended changes receive before/after wireframes.
Wireframes are compact diagrams embedded in the report or stored alongside it.
They show zones, hierarchy, ownership, and interaction order; they deliberately
omit final colors, typography, art, and pixel-perfect measurements.

Each after-state must map directly to one or more finding IDs and state its
trade-off. A wireframe must not introduce a gameplay action, alter balance, or
claim implementation feasibility without repository evidence.

## 7. Data and workspace isolation

- Use a named, isolated browser session and disposable Chinese profile names.
- Do not reset, overwrite, export, or import the user's existing local profiles.
- Browser-only state created for the audit is disposable; close the session when
  evidence capture is complete.
- Product directories must remain byte-unchanged. Only the current task directory
  may gain the report and evidence files during execution.

## 8. Final synthesis

The report ends with:

1. a concise overall experience assessment;
2. the top five changes ranked by value rather than novelty;
3. quick wins (`S`, low risk) versus structural improvements (`M/L`);
4. optional experiments that need validation rather than immediate implementation;
5. a suggested split into later implementation tasks, without creating or starting
   those tasks automatically.

## 9. Risks and controls

| Risk | Control |
|---|---|
| Existing automation biases the reviewer | Begin with hands-on play; consult tests only for state reachability and corroboration |
| One random run dominates conclusions | Use deterministic tutorial plus one ordinary-run path and label state-specific findings |
| Animation frames create false layout findings | Wait for settled state and compare before/during/after evidence |
| Taste is reported as a defect | Label subjective experiments and state their expected benefit/trade-off |
| Audit drifts into gameplay | Reject recommendations that change rules, values, rewards, pools, or difficulty |
| Browser data contaminates user profiles | Use isolated disposable browser context and never touch existing profiles |
| Report becomes an unranked wish list | Enforce severity, recurrence, size/risk, and final top-five synthesis |

## 10. Completion and rollback

The audit is complete only when the ledger has no unexplained gaps, every P0/P1
has reproducible evidence, wireframes map to the top recommendations, links resolve,
and product paths remain unchanged. Rollback consists solely of removing the
current task's uncommitted research artifacts; no product rollback should exist.
