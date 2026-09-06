# KisanSetu Supabase backend

## Free setup

1. Create a project at https://supabase.com/dashboard.
2. Open **SQL Editor**, paste `supabase/schema.sql`, and run it.
3. Install the Supabase CLI: `npm install -g supabase`.
4. Sign in: `supabase login`.
5. Link this project: `supabase link --project-ref YOUR_PROJECT_REF`.
6. Deploy both functions:

```bash
supabase functions deploy book-slot
supabase functions deploy queue-status
```

7. Copy `.env.example` to `.env.local` and fill in the project URL and anon key from **Project Settings > API**.
8. Start the frontend with `npm run dev`.

The frontend intentionally remains usable in demo mode when Supabase environment variables are missing. Never put the service-role key in `.env.local` or browser code. The anon key is safe for browser use when the RLS policies in `schema.sql` are enabled.

## API functions

- `book-slot`: authenticated farmer booking with centre capacity, crop, and queue validation.
- `queue-status`: returns token position, farmers ahead, centre, and estimated wait.

## Production notes

Add a profile-creation trigger after enabling Auth, replace permissive CORS with the deployed frontend origin, and move payment processing to a verified server-side provider before handling real money.
