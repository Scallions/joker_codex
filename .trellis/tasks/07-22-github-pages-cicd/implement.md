# GitHub CI/CD and Pages Static Deployment Implementation Plan

## Preconditions

- [x] Re-read `prd.md` and `design.md` after user approval.
- [x] Run `trellis-before-dev` and load the frontend directory, type-safety, quality, and release-quality specifications.
- [x] Confirm `gh auth status` is still authenticated as `Scallions` and `Scallions/joker_codex` still does not exist.
- [x] Record the current base commit and confirm no unrelated worktree changes overlap the planned files.

## 1. Implement Base-Aware Asset URLs

- [x] Add `src/presentation/assets/publicAssetUrl.ts` with a pure base/path join contract and an `import.meta.env.BASE_URL` browser wrapper.
- [x] Add focused tests under `tests/presentation/` for root base, `/joker_codex/`, query/hash preservation, non-local passthrough, no double prefix, and invalid base rejection.
- [x] Resolve scene images in `StageShell.tsx`.
- [x] Resolve Joker thumbnail/modal images in `JokerArtworkInspector.tsx` and catalog Joker images in `CatalogCard.tsx`.
- [x] Resolve non-Joker SVGs in `CatalogEmblem.tsx`.
- [x] Resolve audio paths immediately before `audioEngine.ts` invokes its fetch boundary.
- [x] Keep content and presentation registries, provenance files, selectors, and validation contracts expressed as canonical `/assets/...` paths.

Validation checkpoint:

```bash
npm run test -- tests/presentation/public-asset-url.test.ts tests/presentation/stage-scene.test.tsx tests/presentation/audio-engine.test.ts tests/presentation/joker-artwork-inspector.test.tsx tests/presentation/catalog-emblem.test.tsx
```

Rollback point: these presentation-boundary changes can be reverted without touching content or durable data.

## 2. Make the Vite Build and Budget Audit Base-Aware

- [x] Set Vite `base` from validated `VITE_BASE_PATH`, defaulting to `/`.
- [x] Replace the favicon root literal with `%BASE_URL%assets/catalog-stage.svg` and update its release test.
- [x] Update `audit-build-budget.mjs` to validate/strip the configured base before resolving initial HTML references into `dist/`.
- [x] Add or extend focused tests for malformed bases and references outside the configured base if the contract can be isolated without weakening the production audit.
- [x] Build once with `/` and once with `/joker_codex/`; inspect `dist/index.html` and run the budget audit after each build.

Validation checkpoint:

```bash
npm run check
VITE_BASE_PATH=/joker_codex/ npm run check
```

Rollback point: restore `vite.config.ts`, `index.html`, the favicon expectation, and the audit together; never leave only half of the base contract applied.

## 3. Add GitHub Actions Workflows

- [x] Add `.github/workflows/quality-pages.yml` with PR, `main` push, and manual triggers.
- [x] Pin checkout/setup/Pages actions to the commits documented in `design.md`.
- [x] Run `npm ci` and `npm run check` in the required `quality` job with Node 22.12.0, npm cache, read-only contents permission, and `VITE_BASE_PATH=/joker_codex/`.
- [x] Conditionally upload `dist/` only for non-PR `main` runs.
- [x] Add the dependent least-privilege `deploy` job, `github-pages` environment, production predicate, Pages concurrency, configure-pages, and deploy-pages steps.
- [x] Add `.github/workflows/playwright.yml` with only manual dispatch, Chromium/WebKit installation, full E2E execution, bounded timeout, and always-run diagnostic artifact upload.
- [x] Parse both YAML files locally and inspect event predicates and permissions before any push.

Validation checkpoint:

```bash
npm run format:check
npm run lint
git diff --check
```

Rollback point: neither workflow has remote effect before the repository is created and pushed.

## 4. Update Operations Documentation

- [x] Add the planned production URL to README.
- [x] Document PR-to-`main` release flow, required `quality`, automatic Pages deployment, and manual workflow dispatch.
- [x] Document manual Playwright execution and downloadable failure artifacts.
- [x] Document rollback with a revert pull request.
- [x] Document IndexedDB origin isolation accurately: localhost and future custom domains are separate origins, while a renamed path under the same GitHub Pages host is not a new origin.
- [x] Do not add a license or describe the repository as open source.

## 5. Complete Local Verification

- [x] Run the focused Vitest matrix for asset boundaries and favicon behavior.
- [x] Run `npm run check` with the default root base.
- [x] Run `VITE_BASE_PATH=/joker_codex/ npm run check` and preserve the Pages-ready `dist/` for inspection.
- [x] Serve/preview the base-specific build and request the `/joker_codex/` page plus representative JS, favicon, Joker, scene, and audio files.
- [x] Run the targeted Chromium/WebKit presentation-performance and audio E2E specs required by the frontend quality specification.
- [x] Run `python3 ./.trellis/scripts/task.py validate 07-22-github-pages-cicd` and `git diff --check`.
- [x] Inspect `git status --short` and verify every changed file belongs to this task.

## 6. Trellis Review, Spec Decision, and Commit

- [x] Run `trellis-check` in inline mode and fix all in-scope findings.
- [x] Run `trellis-update-spec`; record whether the deployment/base-path contract adds durable guidance to the frontend specs.
- [x] Re-run the full local gates after any correction.
- [ ] Commit the complete implementation and Trellis artifacts as one task commit without rewriting existing history.
- [ ] Record the task commit and its parent for remote bootstrap.

## 7. Create and Bootstrap the Public Repository

- [ ] Reconfirm `Scallions/joker_codex` does not exist immediately before creation.
- [ ] Create the empty public repository from the local source, set `origin`, and verify remote visibility/default settings without generating remote files.
- [ ] Push the task commit's parent as remote `main` to initialize the branch while preserving all earlier commits.
- [ ] Enable GitHub Pages through the REST API with `build_type: workflow` and read back the Pages configuration.
- [ ] Fast-forward remote `main` to the task commit, triggering the new CI/CD workflow.

Rollback point: if repository creation or Pages enablement succeeds but a later step fails, keep the authorized repository and retry/report; do not delete it or rewrite history.

## 8. Verify CI, Deployment, and Production

- [ ] Watch the task commit's workflow until `quality` and deployment complete or a concrete failure is available.
- [ ] If CI fails, diagnose and fix locally, repeat Steps 5–6, commit normally, and push again; do not bypass the gate.
- [ ] Read back repository visibility, default branch, remote commit SHA, Actions run conclusions, deployment environment, Pages build type, and Pages URL.
- [ ] Request the production page and representative entry, favicon, Joker, scene, and audio assets.
- [ ] Run a browser smoke against `https://scallions.github.io/joker_codex/`; verify startup, visible game shell, no uncaught exception, and no root-level asset 404.

## 9. Protect `main` and Read It Back

- [ ] Read the successful check runs for the deployed commit and identify the exact `quality` context.
- [ ] Apply strict required-status and pull-request protection with administrator enforcement, zero mandatory approvals, force pushes disabled, and deletion disabled.
- [ ] Read the branch-protection API and compare all required fields with the design contract.
- [ ] Confirm a normal direct push is no longer the documented release path.

Rollback point: if the rule differs from the approved contract, correct it through the API and read it back; do not remove protection merely for convenience.

## 10. Final Evidence

- [ ] Confirm the local worktree is clean and the local/remote `main` task commit matches.
- [ ] Record the repository URL, Pages URL, workflow run URL/conclusion, production smoke result, and branch-protection readback in the task evidence/journal.
- [ ] Hand off completion through the Trellis finish workflow only after every acceptance criterion is evidenced or explicitly reported as blocked.
