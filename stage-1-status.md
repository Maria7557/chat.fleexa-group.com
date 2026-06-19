# Stage 1 Status

## Done

- Created multi-company channel register: `channel-register.csv`
- Created hardened kickoff plan: `implementation-stage-1.md`
- Created command runbook: `stage-1-commands.md`
- Checked Chatwoot domain availability:
  - `https://chat.fleexa-group.com`
  - Result: HTTP 200
- Created Chatwoot API inbox for WAHA POC:
  - Account ID: `2`
  - Inbox ID: `4`
  - Inbox name: `WAHA - Personal - POC - Paddock`
  - Inbox identifier: `96PH4XJqEApi6PfAMbkx5ANF`
  - Assigned agents: `Elena`, `Sofia`
  - Routing: `Lock to single conversation = Enabled`
- Added WAHA POC compose scaffold:
  - `waha-poc/docker-compose.yml`
  - `waha-poc/.env.example`
- Deployed WAHA POC:
  - WAHA URL: `https://waha.fleexa-group.com`
  - WAHA session: `default`
  - WAHA app id: `chatwoot_paddock_poc_default`
  - Webhook URL: `https://waha.fleexa-group.com/webhooks/chatwoot/default/chatwoot_paddock_poc_default`
  - Status: `WORKING`
  - Linked WhatsApp account: `79153057966@c.us`

## Current State

Stage 1 WAHA POC channel is linked. Work can continue in two tracks:

- No-secret track: channel inventory, naming, tenant/company metadata, ownership, routing, and POC decisions.
- Credentialed track: Chatwoot API inventory, Official Meta inbox verification, WAHA deployment/session/app creation.

The first WAHA Chatwoot inbox is linked and ready for basic incoming/outgoing testing:

- WAHA public URL is reachable over HTTPS.
- Chatwoot API inbox has WAHA webhook URL configured.
- WAHA session `default` is `WORKING`.
- The integration conversation is available in Chatwoot as display id `4`.

## Needed Values

### Chatwoot

- `CHATWOOT_API_ACCESS_TOKEN`
- Confirmed target Chatwoot account/workspace for Paddock: `2`
- Admin or equivalent permission for inbox operations: available for UI setup
- `CHATWOOT_API_INBOX_ID`: `4`
- `CHATWOOT_API_INBOX_IDENTIFIER`: `96PH4XJqEApi6PfAMbkx5ANF`
- Chatwoot account token for WAHA app: configured server-side; do not store in this repo

### Chatwoot Email

- SMTP configuration for agent invites and password recovery: not configured yet
- New operators will need an email invite flow before they can set or reset a password

### Official Meta

WhatsApp Cloud:
- `WHATSAPP_APP_ID`
- `WHATSAPP_CONFIGURATION_ID`
- `WHATSAPP_APP_SECRET`
- Business phone number list
- WhatsApp Business Account / WABA identifier if available
- Phone Number ID if available

Facebook:
- `FB_VERIFY_TOKEN`
- `FB_APP_SECRET`
- `FB_APP_ID`
- Facebook page list
- Page IDs if available

Instagram:
- Instagram app id/secret or configured Chatwoot app config
- Instagram professional account list
- Instagram Business Account IDs if available

### WAHA POC

- `WAHA_API_URL`: `https://waha.fleexa-group.com`
- `WAHA_API_KEY`: configured server-side; do not store in this repo
- `WAHA_API_KEY_PLAIN`: configured server-side; do not store in this repo
- `REDIS_URL`: configured server-side with generated Redis password; do not store in this repo
- Personal WhatsApp number for first POC: `+79153057966`
- Owner/department/routing team for the POC inbox: owner pending, department `Paddock`, team `sales`
- DNS/HTTPS route for WAHA public URL: done

## Can Continue Without Tokens

1. Replace placeholder rows in `channel-register.csv` with real Paddock channel names.
2. Choose first WAHA POC personal number.
3. Decide owner/department/routing team for each planned inbox.
4. Create credential records by name only:
   - `chatwoot_admin_api_access_token`
   - `meta_whatsapp_cloud_paddock`
   - `meta_facebook_paddock`
   - `meta_instagram_paddock`
   - `waha_paddock_poc`
5. Confirm whether Paddock has one Chatwoot account or multiple future tenant accounts.

## Next Actions After Chatwoot Token

1. Run `/api/v1/profile`.
2. Record `account_id`.
3. Use `profile.access_token` only as an approved Chatwoot token for WAHA if that user/token is intended for integration use.
4. Run `/api/v1/accounts/<account_id>/inboxes`.
5. Fill existing inboxes into `channel-register.csv`.
6. Identify missing Official inboxes.
7. Create or verify one API inbox for WAHA POC.

## Next Actions After WAHA Linking

1. Send an incoming WhatsApp message to `+79153057966` from another phone.
2. Confirm a new customer conversation is created in `WAHA - Personal - POC - Paddock`.
3. Reply from Chatwoot.
4. Confirm the reply arrives in WhatsApp.
5. Record media behavior separately after text messages pass.

## Known Risks

- `risk`: Meta production usage may require App Review or advanced permissions.
- `risk`: WAHA personal-number integration is not the official WhatsApp Business API path.
- `risk`: WAHA Chatwoot app needs Redis/background jobs.
- `risk`: Chatwoot agent onboarding and password recovery depend on SMTP; until mail is configured, new operators will not receive invite or reset emails.
- `risk`: using a human admin token as long-lived integration credential is operationally fragile; prefer a dedicated integration user/token where possible.
- `risk`: WAHA Core supports only the `default` session. For multiple personal WhatsApp numbers, use WAHA Plus or separate WAHA instances.

## Known Uncertainties

- `uncertain`: Exact WAHA-generated Chatwoot webhook URL is copied from WAHA Dashboard/App, not hardcoded.
- `uncertain`: Chatwoot API inbox creation by API should be verified against the live 4.14.2 instance before automation. UI creation was used for the first POC.
