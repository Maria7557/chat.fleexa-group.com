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
  - WAHA image: `devlikeapro/waha:latest`
  - WAHA version: `2026.6.1` after refresh on `2026-06-22`
  - WAHA session: `default`
  - WAHA app id: `chatwoot_paddock_poc_default`
  - Webhook URL: `https://waha.fleexa-group.com/webhooks/chatwoot/default/chatwoot_paddock_poc_default`
  - Status: `WORKING`
  - Linked WhatsApp account: `971545265555@c.us`
- Configured Chatwoot system email delivery:
  - SMTP provider: Brevo
  - Sender: `Fleexa <noreply@fleexa-group.com>`
  - SMTP relay: `smtp-relay.brevo.com`
  - SMTP port: `2525`
  - Verification: direct Chatwoot mailer test sent successfully
- Fixed Chatwoot reverse-proxy routing after container recreation:
  - `chatwoot-rails-1` is attached to `server_external`
  - `server_external` alias: `chatwoot-rails`
  - Chatwoot agents page returned HTTP 200 after nginx restart
- Enabled Chatwoot Human Agent window for Instagram:
  - Config key: `ENABLE_INSTAGRAM_CHANNEL_HUMAN_AGENT=true`
  - Instagram inbox: `paddockrentacar`
  - Instagram inbox id: `7`
  - Instagram business account id: `17841403273948675`
  - Verification: conversation display id `59` changed from `can_reply=false` to `can_reply=true` on `2026-06-22`
  - Runtime patch: Instagram Human Agent window now uses the latest Instagram conversation activity, not only the latest incoming customer message
  - Patch artifact: `chatwoot-patches/instagram-human-agent-activity-window.patch`
  - Verification: conversation display id `61` changed to `can_reply=true` even though it has no incoming message in Chatwoot
  - Caveat: the runtime patch is inside `chatwoot-rails-1` and `chatwoot-sidekiq-1`; make it durable in the Chatwoot image/compose before a full container recreate or image pull

## Current State

Stage 1 WAHA POC channel is linked. Work can continue in two tracks:

- No-secret track: channel inventory, naming, tenant/company metadata, ownership, routing, and POC decisions.
- Credentialed track: Chatwoot API inventory, Official Meta inbox verification, WAHA deployment/session/app creation.

The first WAHA Chatwoot inbox is linked and ready for basic incoming/outgoing testing:

- WAHA public URL is reachable over HTTPS.
- WAHA version is `2026.6.1`, which includes the old WAHA Plus media features in Core.
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

- SMTP configuration for agent invites and password recovery: configured via Brevo
- `MAILER_SENDER_EMAIL`: `Fleexa <noreply@fleexa-group.com>`
- `SMTP_ADDRESS`: `smtp-relay.brevo.com`
- `SMTP_PORT`: `2525`
- `SMTP_USERNAME`: configured server-side; do not store in this repo
- `SMTP_PASSWORD`: configured server-side; do not store in this repo
- `FRONTEND_URL`: `https://chat.fleexa-group.com`
- New operators should use the Chatwoot invitation/password reset link to set their own password

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
- Human Agent is enabled in Chatwoot installation config, but delivery after 24 hours still depends on Meta approving the `human_agent` permission for the connected app.
- Chatwoot was patched to let Instagram operators attempt replies within 7 days from the latest conversation activity; Meta may still reject specific conversations at send time.

### WAHA POC

- `WAHA_API_URL`: `https://waha.fleexa-group.com`
- `WAHA_API_KEY`: configured server-side; do not store in this repo
- `WAHA_API_KEY_PLAIN`: configured server-side; do not store in this repo
- `REDIS_URL`: configured server-side with generated Redis password; do not store in this repo
- Personal WhatsApp number for first POC: `+971545265555`
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

1. Send an incoming WhatsApp message to `+971545265555` from another phone.
2. Confirm a new customer conversation is created in `WAHA - Personal - POC - Paddock`.
3. Reply from Chatwoot.
4. Confirm the reply arrives in WhatsApp.
5. Record media behavior separately after text messages pass.

## Known Risks

- `risk`: Meta production usage may require App Review or advanced permissions.
- `risk`: WAHA personal-number integration is not the official WhatsApp Business API path.
- `risk`: WAHA Chatwoot app needs Redis/background jobs.
- `risk`: Chatwoot agent onboarding and password recovery depend on Brevo SMTP; rotate exposed SMTP/API keys and update server-side secrets if keys were shared outside the server.
- `risk`: Chatwoot nginx routing depends on `chatwoot-rails` being reachable from `server_external`; keep the compose network alias in place for future container recreation.
- `risk`: using a human admin token as long-lived integration credential is operationally fragile; prefer a dedicated integration user/token where possible.
- `risk`: Docker will keep running a stale `devlikeapro/waha:latest` image until `docker compose pull waha` and recreate are run.
- `risk`: each personal WhatsApp number should still have its own WAHA session and Chatwoot API inbox, even though WAHA Plus features are now included in Core.

## Known Uncertainties

- `uncertain`: Exact WAHA-generated Chatwoot webhook URL is copied from WAHA Dashboard/App, not hardcoded.
- `uncertain`: Chatwoot API inbox creation by API should be verified against the live 4.14.2 instance before automation. UI creation was used for the first POC.
