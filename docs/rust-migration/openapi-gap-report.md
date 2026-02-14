# OpenAPI Gap Report

- OpenAPI paths (`api/openapi.yaml`): **30**
- Live backend paths (router source): **77**
- Missing in OpenAPI: **48**
- Extra in OpenAPI: **1**

## Missing in OpenAPI

- `/agent/agents`
- `/agent/capabilities`
- `/agent/chat`
- `/agent/chats`
- `/agent/chats/{chat_id}`
- `/agent/chats/{chat_id}/archive`
- `/agent/chats/{chat_id}/messages`
- `/agent/chats/{chat_id}/restore`
- `/applications`
- `/applications/{application_id}`
- `/applications/{application_id}/convert-to-lease`
- `/applications/{application_id}/status`
- `/audit-logs`
- `/audit-logs/{log_id}`
- `/calendar/blocks/{block_id}`
- `/channels/{channel_id}`
- `/collections`
- `/collections/{collection_id}`
- `/collections/{collection_id}/mark-paid`
- `/demo/seed`
- `/expenses/{expense_id}`
- `/integration-events`
- `/integration-events/{event_id}`
- `/integrations/webhooks/{provider}`
- `/leases`
- `/leases/{lease_id}`
- `/listings/{listing_id}`
- `/marketplace/listings`
- `/marketplace/listings/{marketplace_listing_id}`
- `/marketplace/listings/{marketplace_listing_id}/publish`
- `/message-templates/{template_id}`
- `/organization-invites/accept`
- `/organizations/{org_id}/invites`
- `/organizations/{org_id}/invites/{invite_id}`
- `/organizations/{org_id}/members/{member_user_id}`
- `/pricing/templates`
- `/pricing/templates/{template_id}`
- `/public/ical/{token}.ics`
- `/public/marketplace/applications`
- `/public/marketplace/listings`
- `/public/marketplace/listings/{slug}`
- `/public/marketplace/listings/{slug}/apply-start`
- `/public/marketplace/listings/{slug}/contact-whatsapp`
- `/reports/operations-summary`
- `/reports/summary`
- `/reports/transparency-summary`
- `/tasks/{task_id}/items`
- `/tasks/{task_id}/items/{item_id}`

## Extra in OpenAPI

- `/webhooks/{provider}`
