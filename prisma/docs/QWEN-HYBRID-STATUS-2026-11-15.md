# Qwen hybrid — checkpoint 2026-11-15

## Intended hybrid architecture

1. Prisma Core resolves the request and identifies candidates from the existing tool catalog.
2. Qwen Core interprets intent and ranks existing tool IDs. It does not execute tools or receive file bytes.
3. The existing Core/provider planner constructs the complete plan; validators check tools, parameters, dependencies, exclusions and required operations.
4. Browser/local engines execute the approved DAG; independent verifiers inspect the produced artifacts.
5. If Qwen is unavailable, Core falls back without automatically replaying uncertain requests.

The isolated/staging implementation supports eight candidate tools and up to eight tool IDs (128 output tokens, 26-second server budget). The older known-good production deployment contains the earlier interpreter version, capped at three IDs.

## Confirmed staging evidence

- PR #149 merged only into `feature/prisma-neural-genixnode-qwen35-pilot`, the production branch of the separate `prisma-queen-staging` Pages project. It did not merge to `main`.
- Staging deployment: `0d467fde`, source `cb51b6f23081e5f8835e883c09ffd701f8597db4`, URL `https://0d467fde.prisma-queen-staging.pages.dev`.
- Staging environment is isolated: `QUEEN_STAGE=staging`, `QWEN_CORE_STAGING_ENABLED=1`, and both D1 bindings point to `6a3256b2-c016-4650-9759-79aca3b4446f`. It has its own Qwen credentials and does not use production D1.
- One real Qwen interpreter request succeeded: **18,744 ms, one inference**, intent `tools`, ordered IDs `pdf-extract → pdf-to-word`, no coverage repair needed. Evidence: Actions run `43657380597`, step “Run exactly one real Qwen interpretation, with no retry”. Only synthetic file metadata was sent.
- A separate direct full-plan request to `/api/core/plan` returned `503 QUEEN_TIMEOUT` at its bounded 55-second limit. It was not retried; token consumption is unknown. This is not the normal Core hybrid path and must not be used as the general planner. Keep it restricted to the existing specialized scanned-CSV and repair flows.

## Production incident found after PR #148

- PR #148 merged to `main` as `a522320f067d9bb67450deb6b6b8a01f0553ccbe`; Pages deployment `57b15b65` completed successfully.
- Production Pages project configuration still lists 55 existing variables (48 secret bindings and 7 plain-text settings). The inventory count alone does **not** prove secret values are available to a newly created deployment. No secret values were read, copied, rotated, recreated or overwritten.
- The new deployment's Qwen interpreter route returned `503 QUEEN_AUTH_NOT_CONFIGURED` in production smoke run `43657947202`. This request failed before inference; it did not prove the credentials were invalid in the known-good deployment.
- The immutable known-good backend `17a6c338` (source `b8a4b6ea02f2d9941cada6b6c1a5e734d4fad887`) remains the credential-preserving backend. Its source contains `/api/core/qwen-interpret`, but that older route is gated by `QWEN_CORE_INTERPRETER_ENABLED=1`; the current production project does not yet define that flag.
- Therefore the exact-path middleware bypass introduced by PR #148 must be reverted. All production `/api/*` traffic, including Qwen interpretation, must stay on the known-good backend until its interpreter can be enabled safely. PR #150 carries this bridge restoration and changes the current-deployment route to require an explicit opt-in flag.
- Production bindings remain: `QUEEN_CONTROL_DB` → `980bad8f-0356-48b9-87bc-56bcf363f69a`; `PRISMA_RATE_DB` → `e02104b5-0861-475a-a60f-7658439d4fe0`. No D1 schema or primary D1 change was made.

## Code and validation

- PR #147: merged to `main`; resilient local fallback and bounded 30-second client cooldown are deployed.
- PR #148: merged to `main`; staging-proven interpreter implementation is present, but its production route bypass was found unsafe because the new Pages runtime returned `QUEEN_AUTH_NOT_CONFIGURED`.
- PR #149: merged only to the isolated staging branch; live Qwen interpreter validation passed.
- PR #150: restores the immutable stable API bridge for the Qwen route and requires an explicit production feature flag. It is not yet merged at this checkpoint.
- Core CI for the PR #148 implementation passed. PR #150 adds regression coverage that the Qwen route stays on the stable backend and that production activation is opt-in.
- No provider pools, GenixNode settings, credentials, D1 schemas or secret values were modified.

## Safe next steps

1. Finish PR #150 CI and merge it, restoring all production API traffic to the known-good backend.
2. Add only the non-secret plain-text setting `QWEN_CORE_INTERPRETER_ENABLED=1` to the existing production environment, using a key-level Pages project patch. Preserve all 55 existing variables; never submit their redacted secret values.
3. Verify the flag reaches the existing stable deployment with an informational Qwen request that returns `inferences:0`. This checks `queenConfig` and routing without invoking the model.
4. Only if that no-inference check succeeds, run one real production Qwen interpreter request. Do not retry a timeout or unknown outcome.
5. If the flag does not reach the immutable stable deployment, stop. Do not redeploy or recreate the 55 secrets. The remaining issue is Cloudflare's runtime secret-binding recovery, not Qwen prompt logic.
6. Once production Qwen is active, validate a real user-facing composite task through Qwen hint → existing provider planner → local/browser execution → artifact verification. A plan response alone is not proof of execution.
