# VEXARO release freeze policy

Use a temporary production freeze when a change could make recovery harder.

## Freeze triggers
- Authentication outage
- Database migration incident
- Payment/subscription change
- OAuth callback change
- Major Worker/runtime change
- DNS/custom-domain migration
- Large community launch
- Active security incident

## During a freeze
- No unrelated production changes.
- Keep the last known-good release identified.
- Fixes are limited to incident mitigation and verified rollback.
- Preview and isolated testing continue where possible.

## Exit
Resume normal releases only after health checks pass, the incident is documented, and rollback remains available.
