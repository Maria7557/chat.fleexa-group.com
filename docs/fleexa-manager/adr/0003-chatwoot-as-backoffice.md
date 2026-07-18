# ADR 0003: Chatwoot As Backoffice

Date: 2026-07-18
Status: Accepted

## Context

This repository is a wrapper around Chatwoot customization work. Chatwoot
currently provides inboxes, conversations, contacts, message history, account
context, and patched CRM surfaces. It is operationally valuable, but broad
customization creates upgrade and maintenance risk.

Fleexa Manager needs a product surface that can evolve independently from
Chatwoot/Vue UI constraints.

## Decision

Chatwoot remains the backoffice, admin, and legacy shell.

It continues to own current Chatwoot operations and can be a source of
conversation, message, contact, and CRM data. New Manager product behavior
should be exposed through Manager APIs and built in Expo.

All Chatwoot changes must remain patch-only through `chatwoot-patches/`.

## Consequences

- Chatwoot/Vue is not the target Manager frontend.
- Existing Vue CRM pages may remain for backoffice and migration safety.
- New daily-manager workflows should not be added directly to Vue unless they
  are explicitly temporary.
- Manager API serializers must avoid raw Chatwoot payloads.
- Patch changes should be additive and compact, especially when adding Manager
  API routes inside Rails.
- Upgrade conflicts are reduced by keeping product contracts outside upstream
  controller and serializer behavior.

## Allowed Chatwoot Responsibilities

- inbox operation
- conversation and message history
- contact backoffice
- admin/settings workflows
- current legacy CRM visibility
- patched runtime integration and branding required by deployment

## Manager Responsibilities

- daily operator and manager workspace
- conversation-first workflow
- deal card and pipeline workflow
- booking display
- source display and clarification
- manager counters
- web/iPhone product UX

## Non-Goals

- This ADR does not remove Chatwoot from the system.
- This ADR does not require a separate BFF/API immediately.
- This ADR does not permit direct upstream source edits outside the patch
  workflow.
