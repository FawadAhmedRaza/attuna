# @attuna/db

Drizzle schema, SQL migrations, and repositories. The single source of truth for everything that touches Postgres.

## Quickstart

```bash
# from the repo root, one-time:
docker compose up -d                          # boots Postgres 16 + creates attuna_dev and attuna_test

# from packages/db:
pnpm migrate                                  # apply migrations to attuna_dev
DATABASE_URL=postgres://attuna:attuna@localhost:5432/attuna_test pnpm migrate
pnpm test                                     # runs against attuna_test
```

## Layout

```
packages/db/
├── src/
│   ├── client.ts                # postgres.js + Drizzle factory (singleton + per-test)
│   ├── context.ts               # WorkspaceContext + withWorkspaceContext()
│   ├── migrate.ts               # CLI: applies migrations
│   ├── test-setup.ts            # vitest: defaults DATABASE_URL to test DB
│   ├── schema/                  # one table per file
│   ├── repositories/            # workspace, member, invite
│   └── lib/invite-token.ts      # pure crypto helpers (no DB)
└── migrations/
    ├── 0000_init.sql
    └── meta/_journal.json
```

## The `WorkspaceContext` pattern

Every PHI-bearing query is scoped by `workspace_id`. Application-layer enforcement: repos take a `WorkspaceContext` and wrap the work in `withWorkspaceContext`, which opens a transaction and sets two Postgres session variables:

```sql
SELECT set_config('app.current_workspace_id', $1, true);
SELECT set_config('app.current_user_id',      $2, true);
```

The `true` argument scopes the setting to the current transaction.

In M1 these settings are written but no policy reads them yet — none of the M1 tables hold PHI. The pattern is in place so that flipping a table to RLS-enforced in M2 is a single migration, no repo changes needed:

```sql
ALTER TABLE client ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON client
  USING (workspace_id = current_setting('app.current_workspace_id')::uuid);
```

## Exceptions to the `WorkspaceContext` rule

Two repo methods take no context because the caller doesn't have one yet:

- `workspaceRepo.create()` — the workspace doesn't exist
- `memberRepo.acceptInvite()` — caller is signing in for the first time; gated only by a valid invite token

Both are explicitly documented and reviewed any time they change.

## Migrations

We hand-wrote `0000_init.sql` for M1 since the four tables are simple. From M2 onward, run `pnpm drizzle-kit generate` to diff the TS schema against the previous migration and append a new SQL file. The journal in `migrations/meta/_journal.json` tracks order.

## Why these choices

- **postgres.js over node-postgres**: lighter, ESM-native, works fine on Lambda. Drizzle supports both equally.
- **citext for email + slug**: case-insensitive uniqueness without lower() on every comparison. Standard Postgres extension; supported by RDS.
- **Token storage**: invite tokens never live unhashed at rest. `lib/invite-token.ts` generates a 32-byte CSPRNG token, returns it once, persists only the SHA-256 hex.
- **Soft-removed members**: `status = 'removed'` instead of DELETE, so audit trails in M2 can reference former members.

## Test isolation

The integration tests truncate the M1 tables between each test rather than using transaction rollback. Simple, slow enough (~100ms per test) for a tiny suite, and avoids the gotchas of nested transactions when the code under test opens its own transaction.
