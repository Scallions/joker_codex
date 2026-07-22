# GitHub CI/CD and Pages Static Deployment

## Goal

Publish Baixi Qipai as a publicly accessible GitHub Pages static site and establish a reliable GitHub Actions CI/CD path. Every change must pass the repository's existing quality gate, and only an accepted build from `main` may reach the production site.

## Confirmed Context

- The product is a React 19 and Vite 8 browser-only application. It has no server API and persists profiles, runs, and device settings in IndexedDB.
- Application navigation uses hash state, so GitHub Pages does not need a single-page-application rewrite fallback.
- `package.json` requires Node.js `>=22.12.0`; `npm run build` emits `dist/`, and `npm run check` is the existing non-browser quality gate.
- The current build contains about 625 files and 52 MB. The largest file is about 6.1 MB, and the Git history contains 54 commits with no object larger than 6.1 MB.
- A filename-only scan of all existing commits found no common private-key, GitHub-token, AWS-key, Google-key, or Slack-token signatures.
- The current branch is `main`. No Git remote or `.github/` workflow exists.
- GitHub CLI is authenticated as `Scallions`, and `Scallions/joker_codex` does not currently exist.
- `vite.config.ts` has no deployment `base`. `index.html:7`, `src/content/manifests/assets.ts:13`, and `src/presentation/assets/presentationAssets.ts:25` demonstrate root-absolute `/assets/...` paths that would fail under the `/joker_codex/` project-site prefix unless presentation URLs become base-aware.
- The user selected a public repository named `joker_codex`, no new open-source license, full existing Git history, layered browser testing, protected `main`, and end-to-end remote configuration by this session.
- The user accepts that the preserved public Git history exposes the existing author email `844120806@qq.com`.

## Requirements

### R1 — Repository and Production Entry Point

- GitHub is the only source-hosting and CI/CD platform in scope.
- Create `Scallions/joker_codex` as a public repository without initializing a README, `.gitignore`, or license remotely.
- Preserve the complete local commit graph and make `main` the default branch. Do not rewrite, filter, squash, or rebase existing history.
- Publish production at `https://scallions.github.io/joker_codex/`.
- Do not add a `LICENSE` or claim that the project is open source.

### R2 — Required Continuous Integration

- Pull requests targeting `main`, pushes to `main`, and manual runs must use a lockfile install on Node.js `22.12.0` with npm caching.
- The required job must be named `quality` and execute `npm run check` with the Pages production base `/joker_codex/`.
- A failing format, lint, type, unit/integration test, build, or build-budget check must block deployment.
- Pull requests may validate but must not receive Pages write or deployment permissions and must never publish production.
- The build uploaded for Pages must be the `dist/` produced by the successful `quality` job; a deploy job must not rebuild it.

### R3 — Layered Browser Tests

- The full Playwright suite is not a blocking pull-request or `main` check in this task.
- Provide a separate manually triggered browser workflow that installs Chromium and WebKit and runs `npm run test:e2e`.
- The browser workflow must retain available Playwright HTML reports and test-result diagnostics after failure.
- Existing visual baselines are Darwin-specific. Do not turn them into a Linux blocking gate without a separately reviewed Linux baseline and stability record.

### R4 — GitHub Pages Deployment

- Only a successful non-PR run on `refs/heads/main` may package and deploy Pages.
- Use GitHub's official Pages Actions, least-privilege job permissions, the `github-pages` environment, and deployment concurrency control.
- Support `workflow_dispatch`; a manual run from a non-`main` ref may validate but must skip Pages packaging and deployment.
- Configure the repository's Pages build type as `workflow`, wait for the first deployment, and verify the returned production URL and status from GitHub.

### R5 — Base-Aware Static Assets

- CI builds must use the Vite base `/joker_codex/`; default local development, local tests, and ordinary local builds must continue to use `/`.
- Keep catalog and presentation registries expressed as canonical logical `/assets/...` paths so content validation, file ownership, and provenance contracts remain environment-independent.
- Resolve logical paths through `import.meta.env.BASE_URL` only at browser presentation and fetch boundaries.
- Cover favicon, Joker art, non-Joker catalog emblems, stage scenes, and presentation audio. Provenance and reference metadata remain canonical logical paths until a browser consumer resolves them.
- Update the build-budget audit so it strips and validates the configured Vite base before mapping initial HTML references into `dist/`.
- A malformed configured base or an initial build reference outside that base must fail rather than silently point at another site path.

### R6 — Protected Main Branch

- Bootstrap the repository and first successful deployment before applying protection because the required `quality` check does not exist until it has run successfully in the repository.
- Protect `main` after the first successful check: require pull requests, require the exact observed `quality` check in strict mode, enforce the rule for administrators, and disallow force pushes and branch deletion.
- A solo maintainer must still be able to merge a passing pull request without an external approval; therefore do not require an approving review in this task.

### R7 — Operations and Documentation

- Extend the existing README with the production URL and concise instructions for normal releases, manual CI/Playwright runs, diagnosing failures, and reverting a release.
- State that IndexedDB data is scoped to scheme, host, and port, not URL path. Localhost and a future custom domain use separate stores, while a renamed project path on the same `scallions.github.io` origin continues to address the same origin data.
- Commit no token, credential, account secret, or generated dependency directory.
- Remote mutations are authorized only for the new `Scallions/joker_codex` repository: create it, set local `origin`, push full history, enable Pages, observe the deployment, and configure/read back `main` protection.

## Acceptance Criteria

- [ ] AC1: On Node.js 22.12.0 with a clean lockfile install, `npm run check` passes with the default local base `/`.
- [ ] AC2: With `VITE_BASE_PATH=/joker_codex/`, `npm run check` passes and the production HTML, module, style, favicon, runtime image, scene, and audio URLs resolve under `/joker_codex/` rather than the GitHub hostname root.
- [ ] AC3: The base resolver has focused tests for root, project-subpath, query/hash preservation, non-local input, and malformed base handling.
- [ ] AC4: Existing root-path component and browser expectations remain valid during default local development and tests.
- [ ] AC5: Pull requests run the `quality` job with read-only contents permission and cannot execute Pages packaging or deployment.
- [ ] AC6: A successful `main` or `workflow_dispatch` run on `main` uploads the exact `dist/` from `quality`; the dependent deploy job uses official Pages Actions, the `github-pages` environment, and least-privilege Pages/OIDC permissions.
- [ ] AC7: A manual run from any non-`main` ref skips Pages packaging and deployment.
- [ ] AC8: The independent manual Playwright workflow installs Chromium and WebKit, runs the complete suite, and uploads available diagnostic artifacts even after failure; it does not block normal CI or Pages.
- [ ] AC9: `Scallions/joker_codex` exists publicly, uses `main` by default, contains the complete local history, and has no newly added license.
- [ ] AC10: GitHub reports the Pages source as a custom workflow, the deployment succeeds, and `https://scallions.github.io/joker_codex/` plus representative JS, favicon, Joker, scene, and audio assets return successfully.
- [ ] AC11: A browser smoke of the production URL reaches the game without root-level asset 404s or uncaught startup errors.
- [ ] AC12: `main` protection is read back from GitHub and shows strict required `quality`, pull-request enforcement, administrator enforcement, force-push denial, and deletion denial.
- [ ] AC13: README operations cover the live URL, regular and manual release paths, E2E diagnostics, rollback, and IndexedDB origin isolation.
- [ ] AC14: Trellis validation, `git diff --check`, and a final clean-worktree check pass after the task commit and remote setup.

## Out of Scope

- Cloudflare Pages or any non-GitHub hosting platform.
- A custom domain or DNS configuration.
- A backend, online accounts, cloud saves, or multiplayer synchronization.
- Dependabot, CodeQL, release tags, package publication, or automated dependency-update pull requests.
- Gameplay, UI, content, or art changes except the URL resolution needed to load existing assets.
- A new or changed open-source license.
