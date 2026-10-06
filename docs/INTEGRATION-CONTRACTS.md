# VEXARO integration contracts
For every external integration, record:
- production callback/redirect URL
- Preview callback/redirect URL
- required environment variables
- secret names
- scopes/permissions
- timeout/retry behavior
- failure/kill-switch behavior
- test account
- rollback behavior
Never reuse production OAuth secrets or callback assumptions in Preview.
