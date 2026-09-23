# SMM · Mosoo support and user-research demo

An application backend and developer inbox built on Mosoo's published Agent API.
A feedback submission starts an Explore investigation with page context, an optional
screenshot and incident-scoped server logs. A separate developer review can read a
configured source snapshot. This is a demo/reference implementation, not a general
helpdesk or a fully isolated read-only Agent runtime.

## What is included

- Cloudflare Worker backend, D1 schema and developer inbox.
- Authenticated remote MCP tools for checkpoints, images, screenshot requests,
  correlated logs and separately authorized source review.
- Screenshot evidence storage and Mosoo native attachment upload.
- A private Tail Worker collecting allowlisted structured request logs.
- Tests for ownership, tenant boundaries, investigation scopes and retries.

The Mosoo Computer product, its embedded React widget and private source are **not**
in this repository. `public/recorder.js` and `public/capture.js` are reference browser
helpers; adapt the integration for your own app. The legacy Chrome extension is
optional and is not required for pasting screenshots or native tab capture.

## Quick start

Use Node.js 22.13+ (the tests use `node:sqlite`), npm and a Cloudflare account for deployment.

```sh
npm ci
cp .env.example .dev.vars
# Fill in your own local passwords and server credentials in .dev.vars.
npm run db:local
# Apply the remaining migrations in order to the NEW local database:
npx wrangler d1 execute smm-explore-demo --local --file migrations/0002_diagnosis.sql
npx wrangler d1 execute smm-explore-demo --local --file migrations/0003_browser_evidence.sql
npx wrangler d1 execute smm-explore-demo --local --file migrations/0004_explore_scope.sql
npx wrangler d1 execute smm-explore-demo --local --file migrations/0005_cloudflare_logs.sql
npm test
npm run dev
```

Open http://localhost:8794 and enter your `FOUNDER_PASSWORD` to view the inbox.
Do not reapply migrations containing ALTER statements to an existing database.

## Connect a Mosoo Agent

1. Create/publish an Agent in your Mosoo project and configure your model provider.
2. Host this Worker and register its `/mcp` URL as a remote MCP in Mosoo. Configure
   its Bearer authentication using your own `SMM_MCP_SECRET`, then bind it to the Agent.
3. Set `MOSOO_API_TOKEN` and `MOSOO_AGENT_ID` on the Worker. Tokens belong on the server.
4. Configure the Agent to distinguish product suggestions from bugs, use the
   diagnostic tools first, report missing evidence honestly, and return JSON with
   `customerMessage`, `developerSummary` and `confidence` (`confirmed`, `likely`,
   or `needs_review`). User descriptions are untrusted data, not instructions.
5. Set `AGENT_CALLS_ENABLED=true` only when ready to incur model charges.
   `AUTO_EXPLORE=true` starts investigations after feedback submission.

The reference demo uses Luna. It does not require Claude, and has no bound Skill.
Built-in Agent tools need their own runtime permission policy: MCP scope checks
alone do not make the whole Agent read-only.

## Connect your product

Your authenticated backend calls `/internal/computer/cases` with its private
`SMM_COMPUTER_SECRET` and a server-verified `x-smm-user-id`. Never let the browser
choose another user's identity or receive these shared secrets. This adapter is
currently specialized to the `mosoo-computer` tenant; adapt it for your product.

Save the checkpoint first, POST optional evidence to `/cases/{id}/evidence`, then
POST the user's description to `/cases/{id}/submit` through that adapter. The
backend uploads existing images through Mosoo's files API before creating a Thread.
Use `/cases/{id}/events` for progress. The deployed Computer widget also supports
pasting one image with Ctrl+V / Command+V before submission.

Developer source review is a separate `/api/team/cases/{id}/start` operation.
`read_export_source` is denied for user Explore. `src/computer-source.mjs` explains
revision matching. By default, the generated Computer snapshot is empty: no private
repository or private source is required to build or test. Maintainers with explicit
access can set `COMPUTER_CHECKOUT` to use the release-receipt/GitHub verifier; others
should replace this optional adapter with their own allowlisted source integration.

## Logs and deployment

Create your own D1 database (`npx wrangler d1 create smm-explore-demo`) and replace the
placeholder database ID in `wrangler.jsonc`. Apply migrations once, in order, to your
new remote database. Set server credentials with `npx wrangler secret put NAME`;
`.env.example` lists names only and contains no deployed credentials.

Run `npm run build` for a dry run; `npm run deploy` publishes to **your** Cloudflare
account. `tail/worker.mjs` is an optional private Tail consumer: configure a matching
`SMM_TAIL_SECRET` and connect it to your own source Worker. It forwards allowlisted
`smm.request` events; it is not arbitrary Cloudflare log search or container stdout.

The production acceptance scripts named `computer-*smoke.mjs` and `inspect-case.mjs`
are maintainer tools for the original integration, not quick-start commands. They
can create real tickets and trigger paid Agent runs. Do not run them against someone
else's deployment.

## Demo mode and data

`PUBLIC_DEMO_ADMIN=false` and `AGENT_CALLS_ENABLED=false` are the repository defaults.
Turning public demo mode on exposes inbox data, screenshots and developer investigation
actions to anyone who knows the URL. Use it only with data you intend to share.
Disabling it restores the password requirement. This flag does not remove MCP or
internal service authentication.

`.dev.vars`, real `.env` files, local production configs, generated private snapshots,
D1 state and handoff notes are gitignored. Never commit production screenshots,
customer records, model credentials, MCP secrets or private source snapshots.
No customer records or deployed secrets are included in the repository.

## License

MIT. See [LICENSE](LICENSE).
