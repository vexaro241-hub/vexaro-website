# VEXARO Free-Tier Backup & Recovery

The VEXARO Supabase organisation remains on the Free plan. Supabase managed daily backups and PITR are paid features, so VEXARO uses an application-level logical recovery layer instead.

## Current protection

- Private Storage bucket: `vexaro-backups`
- Edge Function: `vexaro-backup`
- Daily backup: 02:00 UTC
- Daily restore test: 02:30 UTC
- Secrets are stored in Supabase Vault.
- Backup includes all current public application tables plus Supabase Auth user records.
- Restore testing validates the backup format, every application-table payload, row totals, and Auth-user payload without modifying production data.

## Verified initial run

The first production backup completed successfully at 2026-10-07T12:41:26Z:
- 123,102 bytes
- 44 application tables
- 600 application rows
- 3 Auth users

The first restore test passed against that snapshot.

This is not equivalent to Supabase-managed physical backups/PITR. It is the free-tier recovery mechanism for the VEXARO application and should be reviewed if the project later moves to a paid production plan.
