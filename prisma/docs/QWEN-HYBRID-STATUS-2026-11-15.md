# Qwen hybrid — checkpoint 2026-11-15

## Current implementation

The production app's ordinary Core path is a hybrid, not a single-model DAG generator:

1. Prisma Core resolves the request and identifies a bounded candidate set from the existing tool catalog.
2. For unresolved composite file work, Qwen Core interprets the intent and ranks only existing tool IDs. It receives request text and file metadata, never file bytes, credentials or executable instructions.
3. The existing Core/provider planner constructs the full plan. Existing validators check tool IDs, parameters, dependencies, exclusions and required operations.
4. Browser/local engines execute the approved DAG and the independent verifiers check the resulting artifacts.
5. If Qwen is unavailable, Core keeps the ordinary planner/local fallback. The client uses a 30-second bounded cooldown and never automatically replays an uncertain request.

Qwen Core's bounded interpreter currently allows eight catalog candidates and up to eight tool IDs, with 128 output tokens and a 26-second server budget. It cannot execute tools.

## Production credential and routing invariants

- Production Pages project: `prismaspace`, deployed source `38af1adc2f2220c6ff3c24528804a60149e59a25` at checkpoint time.
- Production configuration inventory: 55 existing variables (48 secret bindings and 7 plain-text settings). No values were read, copied, rotated, recreated or overwritten.
- Existing production settings already have `QUEEN_ENABLED=1`, `QUEEN_STAGE=production`, and the Qwen model/base URL.
- Production control DB binding: `QUEEN_CONTROL_DB` → `980bad8f-0356-48b9-87bc-56bcf363f69a`. Existing provider/rate DB binding `PRISMA_RATE_DB` remains `e02104b5-0861-475a-a60f-7658439d4fe0`.
- The new middleware exception is exact-path only: `/api/core/qwen-interpret` runs on the current Pages deployment. Every other production `/api/*` request remains bridged to the immutable known-good backend `17a6c338` (source `b8a4b6ea02f2d9941cada6b6c1a5e734d4fad887`).
- The production interpreter is enabled only for `prismaspace.space` and `prismaspace.pages.dev`, with existing `QUEEN_ENABLED=1` and `QUEEN_STAGE=production`. `QWEN_CORE_INTERPRETER_ENABLED=0` remains an explicit kill switch; no new variable is required.
- No GenixNode changes, provider-pool changes, secret changes, D1 schema changes or primary D1 writes were made by this work.

## Isolated staging deployment and live evidence

- PR #149 merged only into `feature/prisma-neural-genixnode-qwen35-pilot`, the production branch of the separate `prisma-queen-staging` Pages project. It did not merge to `main`.
- Staging deployment: `0d467fde`, source `cb51b6f23081e5f8835e883c09ffd701f8597db4`, URL `https://0d467fde.prisma-queen-staging.pages.dev`.
- Staging environment is isolated: `QUEEN_STAGE=staging`, `QWEN_CORE_STAGING_ENABLED=1`, and both staging D1 bindings point to `6a3256b2-c016-4650-9759-79aca3b4446f`. It has its own Qwen credentials and does not use production D1.
- One real Qwen Core interpreter request succeeded on that deployment: 18,744 ms, exactly one inference, intent `tools`, ordered IDs `pdf-extract → pdf-to-word`, no coverage repair needed. Evidence is GitHub Actions run `43657380597`, step “Run exactly one real Qwen interpretation, with no retry”. The request contained only synthetic file metadata, not document bytes.
- A separate direct full-plan request to `/api/core/plan` returned `503 QUEEN_TIMEOUT` at its bounded 55-second limit. It was not retried. Token consumption for that timed-out completion is unknown. This is **not** the normal Core hybrid path: ordinary composite planning uses Qwen's small interpreter result plus the existing Core/provider planner. The full `planWithQueen` endpoint remains limited to the specialized scanned-CSV path and repair flow; do not route all ordinary tasks through it or repeat the uncertain request.
- The live smoke workflow was changed to manual-only after collecting this evidence. It must not be run repeatedly just to refresh a green badge.

## Code and validation

- PR #147: merged to `main`; resilient neural-to-local fallback and bounded 30-second cooldown are already deployed.
- PR #148: contains the production routing/activation changes and is still separate from `main` at this checkpoint.
- PR #149: merged to the isolated staging branch for live Qwen validation.
- The full Prisma Core CI suite passed for the Qwen routing changes (run `43657156046`). Earlier failures were test harness issues (staging hostname fixture and ESM `require` in the smoke workflow), corrected without relaxing runtime validation.
- Regression coverage verifies production host gating, staging isolation, same-origin enforcement, stable-backend preservation for all other API paths, eight-tool limit, bounded cooldown and no automatic replay.

## Remaining completion sequence

1. Review and merge PR #148 after the successful staging interpreter evidence and green Core CI.
2. Confirm Cloudflare production deploy is successful and the 55-variable inventory is unchanged.
3. Run one production Qwen interpreter smoke request only after the deployment is live and the upstream Qwen slot is idle; do not repeat any timeout/unknown-outcome request.
4. Verify a real user-facing composite task uses Qwen's tool ranking and the existing provider planner, then verify local/browser execution and artifact content. Do not infer execution success from a plan response.
5. Keep the full-plan endpoint timeout recorded as a limitation of that specialized path; do not “fix” it by increasing timeouts, relaxing validators or forcing full-DAG generation on the 2B interpreter.
