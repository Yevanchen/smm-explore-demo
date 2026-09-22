# Two-stage support exploration
User-approved correction: submission automatically starts Explore with browser context, screenshot requests and incident-scoped request evidence. Only a separate developer-initiated review may read source. Remove the five-case quota; retain idempotency, server-only credentials and the existing provider balance with no top-up.

Use two scoped case records: the visible submitted incident owns Explore; a private child record owns source review. Existing incidents retain their historical scope. Tool capabilities bind to the individual record and scope. User APIs never expose the private child. Developer inbox displays both results separately.

An MCP screenshot request records a pending request and waits briefly for the active browser. The component polls incident events; a user gesture grants native tab capture, immediately returns the approved screenshot, and ends sharing. The panel is hidden during capture. Denial or timeout is an explicit missing-evidence outcome, never a fabricated image. Full Cloudflare log ingestion remains a separate missing integration.

Rollout: additive nullable columns and scoped index; backend compatibility first, then component. Verify user source rejection, child isolation, automatic submission idempotency, screenshot request/response, and result separation. No destructive database changes. Roll back Worker code while retaining additive columns and historical records.
