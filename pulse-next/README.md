# EzeeTik — Next.js (App Router) + Supabase

Same app, same Supabase backend, same UI — converted from a single HTML file to Next.js.

## Run it

```bash
npm install
cp .env.local.example .env.local   # then put your own Supabase URL + anon key in it
npm run dev                        # http://localhost:3000
```

Production: `npm run build && npm start` (or deploy to Vercel — add the two `NEXT_PUBLIC_*` env vars in project settings).

## Routes (hash routes → real URLs)

| Old                | New                 |
|--------------------|---------------------|
| `#/`               | `/`                 |
| `#/discover`       | `/discover`         |
| `#/create`         | `/create`           |
| `#/dashboard`      | `/dashboard`        |
| `#/builder/:id`    | `/builder/[id]`     |
| `#/s/:slug`        | `/s/[slug]`         |
| `#/peek/:slug`     | `/peek/[slug]`      |
| `#/results/:id`    | `/results/[id]`     |
| `#/profile/:name`  | `/profile/[name]`   |

Old shared links like `https://yoursite/#/s/abc123` are redirected automatically to `/s/abc123`.

## Structure

```
app/            pages (all client components, like the original SPA)
components/     Providers (auth/theme/modal/toast context), Nav, Footer, modals, cards
lib/            supabase client, constants, data layer, hooks, helpers
```

## Notes

- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon/publishable key only — never `service_role`).
- QR codes now use the `qrcode` npm package instead of the CDN script.
- Supabase Auth: add your site URL (and `http://localhost:3000`) under Authentication → URL Configuration so email-confirmation links return to the app.
