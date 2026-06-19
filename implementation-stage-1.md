# Chatwoot Mixed Channels - Stage 1 Kickoff

Chatwoot domain: https://chat.fleexa-group.com

## Stage 1 Goal

Prepare the first production-minded implementation slice for Paddock while keeping the structure reusable for future companies.

Stage 1 covers only:
- Baseline Official Meta channels inventory/setup
- One WAHA POC for one personal WhatsApp number

Out of scope:
- WhatsApp groups
- More than one WAHA number per Chatwoot API inbox
- Multiple conversations mode for WAHA
- WAHA media/templates/commands tuning
- Custom CRM automation beyond channel registry and routing metadata

## Architecture Rules

- Official Meta channels and WAHA channels are separate contours.
- WAHA rule: 1 personal number = 1 WAHA session = 1 Chatwoot API inbox.
- Start WAHA with `Lock to single conversation = Enabled` in Chatwoot.
- Keep WAHA conversation behavior in sync with Chatwoot single-conversation mode.
- Store credentials outside `channel-register.csv`; the register only stores `credential_ref`.

## Naming Convention

- Official WhatsApp: `Official - WA Cloud - +971XXXX - Brand/Department`
- WAHA personal: `WAHA - Personal - +971XXXX - Owner/Department`
- Instagram: `Instagram - BrandName`
- Facebook: `Facebook - BrandName`
- WAHA session: `personal_<e164_without_plus>_<owner_or_department>`
- WAHA app id: `chatwoot_<tenant_slug>_<e164_without_plus>`

## What Can Be Done Now

1. Fill `channel-register.csv` with known tenant/company/channel rows.
2. Confirm naming for Paddock inboxes before creating them.
3. Decide the first personal WhatsApp number for WAHA POC.
4. Decide the owner/department and routing team for each inbox.
5. Prepare credential records:
   - `chatwoot_admin_api_access_token`
   - `meta_whatsapp_cloud_paddock`
   - `meta_facebook_paddock`
   - `meta_instagram_paddock`
   - `waha_paddock_poc`

## What Needs Credentials Or Access

### Chatwoot

Required:
- A Chatwoot user API token, sent as the `api_access_token` header.
- A user with permissions to read/create/update inboxes.

Token terminology:
- `api_access_token`: Chatwoot API header name.
- `profile.access_token`: token returned by `GET /api/v1/profile`.
- `WAHA config.accountToken`: the Chatwoot token WAHA uses when calling Chatwoot.

Avoid calling it only `Account Token`; that name is ambiguous.

Official APIs to run:

```bash
curl -X GET 'https://chat.fleexa-group.com/api/v1/profile' \
  -H 'api_access_token: <CHATWOOT_API_ACCESS_TOKEN>'
```

```bash
curl -X GET 'https://chat.fleexa-group.com/api/v1/accounts/<ACCOUNT_ID>/inboxes' \
  -H 'api_access_token: <CHATWOOT_API_ACCESS_TOKEN>'
```

### Official Meta Channels

WhatsApp Cloud:
- Facebook account
- WhatsApp Business Account
- Business phone number
- Super Admin app config:
  - `WHATSAPP_APP_ID`
  - `WHATSAPP_CONFIGURATION_ID`
  - `WHATSAPP_APP_SECRET`

Facebook Messenger:
- Facebook app
- Facebook page
- Chatwoot env/config:
  - `FB_VERIFY_TOKEN`
  - `FB_APP_SECRET`
  - `FB_APP_ID`
- Meta callback URL:
  - `https://chat.fleexa-group.com/bot`

Instagram:
- Instagram professional account
- Facebook app with Instagram product
- Instagram app id/secret in Chatwoot app config
- Meta webhook URL:
  - `https://chat.fleexa-group.com/webhooks/instagram`
- Redirect URL:
  - `https://chat.fleexa-group.com/instagram/callback`

### WAHA POC

Minimum infra:
- WAHA service
- Redis for WAHA Chatwoot app/background jobs
- HTTPS/reverse proxy for WAHA
- One Chatwoot API inbox

Required values:
- `WAHA_API_URL`
- `WAHA_API_KEY`
- `WAHA_API_KEY_PLAIN`
- `REDIS_URL`
- POC personal phone number
- `waha_session_name`
- `waha_app_id`
- `chatwoot_account_id`
- `chatwoot_api_inbox_id`
- `chatwoot_api_inbox_identifier`

## Execution Order

1. Update `channel-register.csv` with Paddock real planned channels.
2. Run Chatwoot profile API and record `chatwoot_account_id`.
3. List existing inboxes and map them into the register.
4. Verify or create Official Meta inboxes in Chatwoot UI.
5. Create one Chatwoot API inbox for WAHA POC.
6. Confirm the API inbox has `lock_to_single_conversation = true`.
7. Start WAHA with Chatwoot app enabled and Redis configured.
8. Create one WAHA session.
9. Link the personal WhatsApp number via QR / linked device.
10. Create one WAHA Chatwoot app and bind it to the API inbox.
11. Copy the WAHA-generated webhook URL into the Chatwoot API inbox callback field.
12. Test incoming, outgoing, conversation creation, and restart behavior.

## WAHA POC Success Criteria

- Incoming WhatsApp message appears in the dedicated Chatwoot API inbox.
- Chatwoot creates a contact and conversation.
- Reply from Chatwoot is delivered back to the same WhatsApp chat.
- WAHA session reaches `WORKING`.
- WAHA session returns to `WORKING` after restart.
- `channel-register.csv` contains real values for:
  - `chatwoot_account_id`
  - `chatwoot_inbox_id`
  - `inbox_identifier`
  - `callback_webhook_url`
  - `waha_session_name`
  - `waha_app_id`
  - `waha_status`

## Risks

- `risk`: Meta production usage may require App Review or advanced permissions.
- `risk`: WAHA personal-number integration is not the official WhatsApp Business API path.
- `risk`: WAHA Chatwoot app needs Redis/background jobs.
- `risk`: storing tokens in docs/registers would make future multi-company operations unsafe.

## Uncertain

- `uncertain`: Official Chatwoot docs expose API inbox creation, but the docs page shown by Mintlify emphasizes the web widget cURL example. For the first POC, prefer Chatwoot UI for API inbox creation unless verified against the live instance.
- `uncertain`: The WAHA-generated Chatwoot webhook URL should be copied from WAHA Dashboard/App. Do not hardcode it.
- `uncertain`: `1 personal number = 1 WAHA session = 1 API inbox` is our operational rule, not a WAHA/Chatwoot documentation requirement.
