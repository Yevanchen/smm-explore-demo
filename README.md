# SMM Explore demo

Controlled SMM product demonstrating a Mosoo-powered support channel. Actual server sessions, an intentional report-export timestamp contract error, scoped incident logs, immutable checkpoints, feedback receipts and developer evidence view.

Agent: GPT-5.6 Luna via Mosoo. All built-in runtime tools disabled; only incident-scoped diagnostic MCP tools attached. Model calls remain disabled until a permitted free quota is verified. No inference result has yet been validated.

The Chrome capture extension is opt-in and not yet browser-tested. See capture-extension/README.md. Synthetic fixtures are tests, never demo evidence.

## Local setup

npm ci; configure ignored .dev.vars with DEMO_PASSWORD, FOUNDER_PASSWORD and SMM_MCP_SECRET. MOSOO_API_TOKEN and MOSOO_AGENT_ID belong only in server secrets. Apply migration SQL files in order to a NEW local D1; 0002 has non-repeatable ALTER statements. Run npm run dev. Tests: npm test, node scripts/smoke.mjs, node scripts/capture-smoke.mjs (local-only synthetic attachment).

Builds generate a read-only report endpoint snapshot pinned to a committed file and hash. It is not a live GitHub browsing credential. Do not include secrets or the actual Mosoo Computer private source in this demo repository.
