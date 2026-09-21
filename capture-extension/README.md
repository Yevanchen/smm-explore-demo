# SMM incident capture (unpacked demo extension)

This extension has NOT yet been installed or tested in Chrome. Its policy and backend validation have unit tests. Do not claim native capture has been verified until the real extension path runs.

## Scope and consent

Chrome's debugger permission is intrinsically powerful. The implementation restricts attachment to a user-clicked tab on exactly https://smm-explore-demo.evanchen.workers.dev or http://localhost:8794. It does not attach automatically, use all_urls, read cookies/storage, capture request/response bodies, or expose arbitrary CDP commands to a webpage.

Clicking the extension action arms this tab for five minutes. Clicking it again cancels. It collects only the /api/reports/export response status, protocol and timestamps; queries, headers and bodies are discarded. Clicking the site's support component then captures ONE current-viewport JPEG, returns it to that same page, and detaches. The authenticated SMM backend stores the screenshot with that incident and can supply it to the authorized diagnostic Agent. Visible page content is included: never arm it on a page showing sensitive material you do not want to include in feedback.

This is a demo setup cost and not a claim that any website embed can silently use DevTools. A general production integration needs an explicit extension or controlled-browser capture channel. Browser observations remain client-supplied and untrusted. Server identity/log correlation is independently verified.

## Installation after user approval

Open chrome://extensions, enable Developer mode if allowed, choose Load unpacked, select this directory. Approve debugger access only after reviewing the scope above. Reload SMM so the content bridge is installed. Pin the extension if useful.

## Verification

1. Log into SMM. Click the extension action (ON badge).
2. Click Export to generate the actual error, then Help me inspect.
3. Open evidence details; verify the JPEG actually depicts this incident.
4. Verify backend response rejects another user's request, repeated attachment and arbitrary payloads.
5. Verify Agent's real tool call returns this image and scoped status data, not a synthetic image.
6. Confirm debugger detaches after capture or five-minute expiry.

Revoke access by removing the extension in chrome://extensions. Removal does not delete evidence already submitted to SMM.
