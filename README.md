# SAUTI-AI-KE

## Database setup

Incident reports are stored in Supabase Postgres. Copy `.env.example` to `.env.local` and set:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

Choose one of these migration methods.

**Supabase CLI in the project terminal:**

```bash
npx supabase init
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

**Supabase SQL Editor:** open `supabase/migrations/20260904000000_create_incidents.sql`, copy only the SQL statements into the SQL Editor, and click Run. Do not paste `npx supabase db push` into the SQL Editor; that command belongs in the project terminal.

The server uses the service-role key only in route handlers; do not expose it as a `NEXT_PUBLIC_*` variable.

The schema includes `incidents`, `incident_status_history`, and `incident_updates`, with indexes for reference lookups, reporting time, status/category filtering, location similarity, and text search. Status changes are recorded automatically by a database trigger.