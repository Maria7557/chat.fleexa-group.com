# Chatwoot patches

This directory stores operational patches applied to the live Chatwoot
containers before they are made durable in a custom image or compose override.

## Instagram Human Agent activity window

Patch:

`instagram-human-agent-activity-window.patch`

Purpose:

- Keep Chatwoot's standard `ENABLE_INSTAGRAM_CHANNEL_HUMAN_AGENT=true` behavior.
- Let Instagram conversations use the latest conversation activity for the
  7-day Human Agent window, not only the latest incoming customer message.
- Allow operators to attempt a reply; Meta can still reject the send if the
  connected app lacks the required `human_agent` permission or the conversation
  is not eligible.

Live status on `2026-06-22`:

- Applied inside `chatwoot-rails-1`.
- Applied inside `chatwoot-sidekiq-1`.
- Verified conversation display id `59`: `can_reply=true`.
- Verified conversation display id `61`: `can_reply=true`.

Durability note:

The live runtime patch survives `docker restart`, but it can be lost on full
container recreate or image pull. Make this patch part of a custom Chatwoot image
or bind-mount override before rebuilding the Chatwoot stack.
