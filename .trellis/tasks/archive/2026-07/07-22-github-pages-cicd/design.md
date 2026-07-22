# GitHub CI/CD and Pages Static Deployment Design

## Status

Approved and implemented locally; awaiting remote GitHub bootstrap and production verification.

## Design Summary

The application remains a static Vite bundle. Deployment adds one presentation-boundary URL resolver, a base-aware build audit, a required quality-and-Pages workflow, a manually triggered Playwright workflow, and an ordered GitHub bootstrap. No server, runtime environment configuration, or durable data migration is introduced.

```text
canonical content path (/assets/...)
              |
              v
presentation/fetch boundary -- import.meta.env.BASE_URL --> browser URL
              |                                        /assets/... locally
              |                         /joker_codex/assets/... on Pages
              v
        Vite dist/ build -- Pages artifact --> github-pages environment
```

## Evidence and External Contracts

- Vite project sites require `base: '/<REPO>/'`, while local/root sites use `/`: <https://vite.dev/guide/static-deploy.html>.
- GitHub's custom Pages workflow contract uses separate dependent build/deploy jobs, `pages: write`, `id-token: write`, the `github-pages` environment, and official configure/upload/deploy actions: <https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages>.
- GitHub Pages REST supports `build_type: workflow`: <https://docs.github.com/en/rest/pages/pages>.
- A required status check must have completed in the repository recently before it can be selected reliably: <https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks>.
- Public repositories support protected branches on GitHub Free: <https://docs.github.com/en/rest/branches/branch-protection>.

## 1. Base Configuration

`vite.config.ts` reads `process.env.VITE_BASE_PATH`, defaulting to `/`. The value must be an absolute pathname with both leading and trailing slashes. CI supplies `/joker_codex/` at the `quality` job level, so the existing `npm run check` validates and leaves behind the exact production build that will be uploaded. Local commands need no environment variable and retain the current root behavior.

No `.env` file is added. This keeps the deployment choice explicit in CI and avoids exposing a second source of truth for the repository name.

`index.html` uses Vite's `%BASE_URL%` replacement for the favicon. Vite already rewrites module and stylesheet references according to `base`.

## 2. Browser Asset Resolution Boundary

Catalog and presentation asset registries keep canonical `/assets/...` values. This preserves content validators, provenance text, filesystem audits, and deterministic selector output.

Add `src/presentation/assets/publicAssetUrl.ts` with two contracts:

- a pure join/validation function that accepts an explicit base and logical asset path for focused tests;
- a browser wrapper that passes `import.meta.env.BASE_URL`.

The resolver prefixes only canonical local `/assets/...` paths. It must not double-prefix an already resolved path or rewrite a non-local URL. It preserves query strings and fragments. Invalid deployment bases throw during configuration or focused validation rather than silently producing a hostname-root request.

Resolve URLs at the actual browser boundaries:

- `StageShell.tsx` for scene images;
- `JokerArtworkInspector.tsx` and `CatalogCard.tsx` for Joker images;
- `CatalogEmblem.tsx` for non-Joker SVGs;
- `audioEngine.ts` before the fetch callback receives an audio URL.

Default Vitest and local Vite use `/`, so existing component expectations remain stable. New pure-function tests cover `/joker_codex/` explicitly.

## 3. Base-Aware Build Audit

`scripts/audit-build-budget.mjs` currently removes only one leading slash. With a Pages build it would look for `dist/joker_codex/assets/...` and fail incorrectly.

The audit will normalize the configured base, require every root-absolute initial module/stylesheet reference to live below it, strip that prefix, and only then resolve the file inside `dist/`. Relative references remain relative to `dist/`. Existing traversal protection and gzip accounting stay unchanged. A reference outside the configured base is a release error.

The favicon release test changes from a literal root URL to the `%BASE_URL%assets/catalog-stage.svg` template. Runtime resource behavior is covered by resolver tests, existing component/audio tests at `/`, the base-specific build, and the live Pages smoke.

## 4. Required Quality and Pages Workflow

Create `.github/workflows/quality-pages.yml` with these triggers:

- `pull_request` targeting `main`;
- `push` to `main`;
- `workflow_dispatch`.

The `quality` job has `contents: read`, runs on `ubuntu-latest`, uses Node.js `22.12.0` with npm cache, sets `VITE_BASE_PATH=/joker_codex/`, executes `npm ci`, then `npm run check`.

Only when `github.ref == 'refs/heads/main'` and the event is not `pull_request` does the final quality step upload `dist/` as the Pages artifact. Therefore a PR never receives or uses Pages permissions, and a manual feature-branch run remains validation-only.

The dependent `deploy` job has `contents: read`, `pages: write`, and `id-token: write`; it uses the `github-pages` environment, runs only under the same production predicate, configures Pages, and deploys the artifact. Job-level `pages` concurrency serializes production deployments without coupling PR quality runs to deployment cancellation.

Official Actions are pinned to the current commits resolved on 2026-07-22, with major-version comments:

| Action | Pinned commit | Major |
| --- | --- | --- |
| `actions/checkout` | `3d3c42e5aac5ba805825da76410c181273ba90b1` | v7 |
| `actions/setup-node` | `249970729cb0ef3589644e2896645e5dc5ba9c38` | v6 |
| `actions/configure-pages` | `45bfe0192ca1faeb007ade9deae92b16b8254a0d` | v6 |
| `actions/upload-pages-artifact` | `fc324d3547104276b827a68afc52ff2a11cc49c9` | v5 |
| `actions/deploy-pages` | `cd2ce8fcbc39b97be8ca5fce6e763baed58fa128` | v5 |

## 5. Manual Playwright Workflow

Create `.github/workflows/playwright.yml` with only `workflow_dispatch`, `contents: read`, a bounded timeout, and a macOS runner so the artifact names and rendering platform remain compatible with the repository's Darwin baselines. It installs the locked dependencies, Chromium, and WebKit, then runs `npm run test:e2e`.

An `if: always()` upload step retains `playwright-report/` and `test-results/` when present. `actions/upload-artifact` is pinned to `330a01c490aca151604b8cf639adc76d48f6c5d4` (v5). This workflow is diagnostic and intentionally absent from branch protection.

## 6. Remote Bootstrap and Deployment Sequence

Remote configuration occurs only after local implementation, verification, Trellis review, and the task commit:

1. Record the task commit and its parent.
2. Create the empty public repository with `gh repo create Scallions/joker_codex --public --source=. --remote=origin` and no generated remote files.
3. Push the task commit's parent to remote `main`. This initializes the branch and preserves all earlier history without triggering the new workflow.
4. Create the Pages site through the REST API with `build_type: workflow`.
5. Fast-forward remote `main` to the task commit. This triggers the first real quality-and-deploy run.
6. Watch the workflow to completion and read back repository, workflow, deployment, and Pages API state.
7. Smoke the production HTML and representative static assets, then perform a browser startup/network-console smoke.
8. Read the exact successful check-run name from the deployed commit and only then apply `main` protection.

The first deployment push is an explicit bootstrap exception to the future pull-request rule. Protection is applied immediately after the successful deployment.

## 7. Branch Protection Contract

Use the protected-branches REST endpoint after `quality` exists:

- strict required status check using the exact observed `quality` context;
- administrator enforcement enabled;
- pull request required with zero mandatory approving reviews for the solo maintainer;
- no force pushes;
- no branch deletion;
- no user/team/app push restrictions beyond the rule itself.

Read the protection endpoint after the update and compare every required field. If the returned context differs from the observed check name, do not claim acceptance.

## 8. Documentation and Data Compatibility

Extend the existing Chinese README in its established language. Add the live URL, CI/CD behavior, manual Playwright instructions, where to download failure artifacts, normal release flow, and revert-via-PR rollback.

IndexedDB needs no schema migration. The README explicitly states that origin means scheme, host, and port; paths are not isolation boundaries. Localhost and a future custom domain have separate stores, while a renamed project path under the same `scallions.github.io` origin continues to address the same origin data.

## 9. Failure Handling and Rollback

- Local base regression: revert the resolver/config/audit changes before any remote creation.
- Repository creation succeeds but push or Pages setup fails: keep the authorized repository, report the exact remote state, and retry the failed idempotent step; do not delete the repository.
- Deployment fails: leave branch protection unapplied, inspect the Actions logs/artifacts, fix through the same task, and push only after local checks pass again.
- Production regression after deployment: create a revert commit through a pull request; the same required CI redeploys the known-good state.
- Protection is misconfigured: use the branch-protection API to restore the planned contract, then read it back. Do not weaken the quality requirement merely to merge a failing change.

## 10. Verification Strategy

Local gates:

```bash
npm ci
npm run check
VITE_BASE_PATH=/joker_codex/ npm run check
npx playwright test tests/e2e/presentation-performance.spec.ts tests/e2e/audio-settings.spec.ts --project=chromium --project=webkit
python3 ./.trellis/scripts/task.py validate 07-22-github-pages-cicd
git diff --check
```

Remote/live gates:

- repository visibility, URL, default branch, and commit graph via GitHub API;
- successful `quality` and deploy jobs for the task commit;
- Pages API reports workflow build type and the expected HTTPS URL;
- production HTML, entry module, favicon, one Joker image, one scene image, and one audio asset return successfully;
- browser startup has no uncaught exception or local asset 404;
- branch protection readback matches Section 7.
