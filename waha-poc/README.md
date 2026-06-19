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
- Linked WhatsApp account: `79153057966@c.us`

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

## QR flow

Official WAHA docs support two practical QR paths:

1. WAHA Dashboard: open `https://waha.fleexa-group.com/dashboard`, create/start the session, and scan QR.
2. Chatwoot integration conversation: after the WAHA Chatwoot app is configured, send `start` in the `WhatsApp Integration (WAHA)` conversation and scan the QR shown in Chatwoot.

For this POC, QR linking is complete and WAHA reports session `default` as `WORKING`.

## Core limitation

The deployed image is WAHA Core. WAHA Core supports only the `default` session. For the future rule `1 personal number = 1 WAHA session`, use WAHA Plus or run separate WAHA instances per personal number.
