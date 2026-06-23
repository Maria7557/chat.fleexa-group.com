# WAHA POC - First Personal WhatsApp

## Current Chatwoot target

- Chatwoot URL: `https://chat.fleexa-group.com`
- Chatwoot account id: `2`
- Chatwoot API inbox id: `4`
- Chatwoot API inbox name: `WAHA - Personal - POC - Paddock`
- Chatwoot API inbox identifier: `96PH4XJqEApi6PfAMbkx5ANF`
- Chatwoot routing: `Lock to single conversation = Enabled`
- Assigned agents: `Elena`, `Sofia`
- WAHA public URL: `https://waha.fleexa-group.com`
- WAHA session: `default`
- WAHA app id: `chatwoot_paddock_poc_default`
- WAHA webhook URL: `https://waha.fleexa-group.com/webhooks/chatwoot/default/chatwoot_paddock_poc_default`
- Linked WhatsApp account: `971545265555@c.us`

## What is still pending

1. Send an incoming WhatsApp message from another phone to the linked number.
2. Confirm the customer conversation appears in Chatwoot.
3. Reply from Chatwoot.
4. Confirm the reply arrives in WhatsApp.
5. Record text-only result before testing media.

## Minimal local commands after deploy host is ready

```bash
cd /Users/Caro/Documents/Chat/waha-poc
cp .env.example .env
# edit .env with real WAHA public URL and secrets
docker compose up -d
```

## Update deployed WAHA image

Docker does not refresh `devlikeapro/waha:latest` automatically. Pull the image
before recreating WAHA, especially when media support depends on a newer release.

```bash
cd /opt/fleetly/waha
docker compose pull waha
docker compose up -d waha
```

## QR flow

Official WAHA docs support two practical QR paths:

1. WAHA Dashboard: open `https://waha.fleexa-group.com/dashboard`, create/start the session, and scan QR.
2. Chatwoot integration conversation: after the WAHA Chatwoot app is configured, send `start` in the `WhatsApp Integration (WAHA)` conversation and scan the QR shown in Chatwoot.

For this POC, QR linking is complete and WAHA reports session `default` as `WORKING`.

## Core media and sessions

Since WAHA `2026.6.1`, the old WAHA Plus feature set is included in WAHA Core.
Media messages on the GOWS engine require the deployed Core image to be
`2026.6.1` or newer.

On `2026-06-22`, the server was updated from WAHA `2026.5.1` to `2026.6.1`
because image sending from Chatwoot failed with a Plus-only `422` response. After
the update, session `default` was restarted and returned to `WORKING`.

The POC still uses one personal number per WAHA session and one Chatwoot API
inbox. For multiple personal numbers, create a separate WAHA session and API
inbox for each number, then verify the routing behavior in Chatwoot.
