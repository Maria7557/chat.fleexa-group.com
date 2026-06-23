# Stage 1 Commands

Use this runbook after real credential values exist. Do not store token values in this file.

## 0. Local Variables

```bash
export CHATWOOT_URL='https://chat.fleexa-group.com'
export CHATWOOT_API_ACCESS_TOKEN='<paste-chatwoot-user-api-token>'
export CHATWOOT_ACCOUNT_ID='2'
export CHATWOOT_API_INBOX_ID='4'
export CHATWOOT_API_INBOX_NAME='WAHA - Personal - POC - Paddock'
export CHATWOOT_API_INBOX_IDENTIFIER='96PH4XJqEApi6PfAMbkx5ANF'
export TENANT_SLUG='paddock'
export WAHA_API_URL='https://waha.fleexa-group.com'
export WAHA_API_KEY='<paste-waha-api-key>'
export WAHA_SESSION_NAME='default'
export WAHA_APP_ID='chatwoot_paddock_poc_default'
```

## 1. Get Chatwoot Profile

Confirmed by official Chatwoot docs.

```bash
curl -sS -X GET "$CHATWOOT_URL/api/v1/profile" \
  -H "api_access_token: $CHATWOOT_API_ACCESS_TOKEN"
```

Record:
- `account_id` as `CHATWOOT_ACCOUNT_ID`
- `access_token` as the Chatwoot token WAHA will use in `config.accountToken`

## 2. List Existing Inboxes

Confirmed by official Chatwoot docs.

```bash
export CHATWOOT_ACCOUNT_ID='<account-id-from-profile>'

curl -sS -X GET "$CHATWOOT_URL/api/v1/accounts/$CHATWOOT_ACCOUNT_ID/inboxes" \
  -H "api_access_token: $CHATWOOT_API_ACCESS_TOKEN"
```

Record:
- `id` -> `chatwoot_inbox_id`
- `channel_id`
- `name`
- `channel_type`
- `callback_webhook_url`
- `lock_to_single_conversation`
- `phone_number`
- `provider`

## 3. Create Chatwoot API Inbox For WAHA POC

Done for first POC via UI:

`Chatwoot -> Settings -> Inboxes -> Add Inbox -> API`

Name:

`WAHA - Personal - POC - Paddock`

Set:

`Lock to single conversation = Enabled`

Assigned agents:

`Elena`, `Sofia`

`uncertain`: Chatwoot official API docs expose `POST /api/v1/accounts/{account_id}/inboxes` and list `API channel`, but the visible cURL example is for `web_widget`. Use UI first unless the API body is verified against this 4.14.2 instance.

## 4. Get Or Verify API Inbox Details

Confirmed by official Chatwoot docs.

```bash
curl -sS -X GET "$CHATWOOT_URL/api/v1/accounts/$CHATWOOT_ACCOUNT_ID/inboxes/<CHATWOOT_API_INBOX_ID>" \
  -H "api_access_token: $CHATWOOT_API_ACCESS_TOKEN"
```

Record:
- `id`
- `channel_id`
- `callback_webhook_url`
- `lock_to_single_conversation`
- `inbox_identifier` from the Chatwoot API inbox configuration screen if not present in the API response

Current known values:

- `CHATWOOT_ACCOUNT_ID=2`
- `CHATWOOT_API_INBOX_ID=4`
- `CHATWOOT_API_INBOX_NAME='WAHA - Personal - POC - Paddock'`
- `CHATWOOT_API_INBOX_IDENTIFIER='96PH4XJqEApi6PfAMbkx5ANF'`

Do not record Chatwoot webhook secret in this file.

## 4.1 Deploy WAHA POC Stack

Confirmed by official WAHA docs:
- Docker image: `devlikeapro/waha`
- Chatwoot app requires `WAHA_APPS_ENABLED`, `REDIS_URL`, and `WAHA_API_KEY_PLAIN`.
- Apps flow uses Redis/background jobs.

```bash
cd /Users/Caro/Documents/Chat/waha-poc
cp .env.example .env
# edit .env: set WAHA_PUBLIC_URL, WAHA_API_KEY, WAHA_API_KEY_PLAIN, dashboard password
docker compose pull waha
docker compose up -d
```

Health check:

```bash
curl -sS "$WAHA_API_URL/api/version" \
  -H "X-Api-Key: $WAHA_API_KEY"

curl -sS "$WAHA_API_URL/api/sessions" \
  -H "X-Api-Key: $WAHA_API_KEY"
```

For media on the GOWS engine, confirm WAHA is `2026.6.1` or newer. Docker does
not automatically refresh an existing `devlikeapro/waha:latest` image.

## 5. Create WAHA POC Session

Confirmed by official WAHA Sessions docs.

```bash
curl -sS -X POST "$WAHA_API_URL/api/sessions" \
  -H "X-Api-Key: $WAHA_API_KEY" \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"$WAHA_SESSION_NAME\"}"
```

## 6. Start WAHA Session

Confirmed by official WAHA Sessions docs.

```bash
curl -sS -X POST "$WAHA_API_URL/api/sessions/$WAHA_SESSION_NAME/start" \
  -H "X-Api-Key: $WAHA_API_KEY"
```

## 7. Get WAHA QR

Use WAHA Dashboard when available:

`$WAHA_API_URL/dashboard`

WAHA QR docs show `GET /api/{session}/auth/qr`.

```bash
curl -sS -X GET "$WAHA_API_URL/api/$WAHA_SESSION_NAME/auth/qr?format=image" \
  -H "X-Api-Key: $WAHA_API_KEY" \
  -H 'Accept: image/png' \
  --output waha-qr.png
```

Then open WhatsApp on the phone:

`Settings -> Linked devices -> Link a device`

Alternative after WAHA Chatwoot app is configured:

- Open Chatwoot conversation `WhatsApp Integration (WAHA)`.
- Send `start`.
- Scan the QR displayed in Chatwoot.

## 8. Create WAHA Chatwoot App

Confirmed by official WAHA Chatwoot docs: `POST /api/apps`.

```bash
export CHATWOOT_ACCESS_TOKEN_FOR_WAHA='<profile-access-token-or-approved-service-token>'
export CHATWOOT_API_INBOX_ID='<api-inbox-id>'
export CHATWOOT_API_INBOX_IDENTIFIER='<api-inbox-identifier>'

curl -sS -X POST "$WAHA_API_URL/api/apps" \
  -H "X-Api-Key: $WAHA_API_KEY" \
  -H 'Content-Type: application/json' \
  -d "{
    \"id\": \"$WAHA_APP_ID\",
    \"session\": \"$WAHA_SESSION_NAME\",
    \"app\": \"chatwoot\",
    \"config\": {
      \"url\": \"https://chat.fleexa-group.com\",
      \"accountId\": $CHATWOOT_ACCOUNT_ID,
      \"accountToken\": \"$CHATWOOT_ACCESS_TOKEN_FOR_WAHA\",
      \"inboxId\": $CHATWOOT_API_INBOX_ID,
      \"inboxIdentifier\": \"$CHATWOOT_API_INBOX_IDENTIFIER\",
      \"linkPreview\": \"OFF\",
      \"locale\": \"en-US\",
      \"templates\": {},
      \"commands\": {
        \"server\": true,
        \"queue\": true
      },
      \"conversations\": {
        \"sort\": \"created_newest\",
        \"status\": [\"open\", \"pending\", \"snoozed\"]
      }
    },
    \"enabled\": true
  }"
```

## 9. Set Chatwoot API Inbox Callback URL

Copy the WAHA-generated Chatwoot webhook URL from WAHA Dashboard/App and paste it into the Chatwoot API inbox callback field.

Current POC webhook URL:

`https://waha.fleexa-group.com/webhooks/chatwoot/default/chatwoot_paddock_poc_default`

`uncertain`: The exact WAHA-generated webhook URL is intentionally copied from WAHA runtime/app output. For this POC, the route is confirmed by WAHA logs and Chatwoot inbox configuration.

## 10. Test

Incoming:
- Send a WhatsApp message to the POC personal number.
- Confirm it appears in `WAHA - Personal - POC - Paddock`.
- Confirm conversation is created.

Outgoing:
- Reply from Chatwoot.
- Confirm the reply arrives in WhatsApp.

Restart:
- Restart the WAHA session.
- Confirm session returns to `WORKING`.
