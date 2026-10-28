# ESOL Premier Campus — Feedback

Public feedback forms for students, plus an admin area with an evaluation dashboard and a Google Forms-style form builder.

- `/` lists published forms as cards (search, category filter, sort)
- `/f/:slug` is a form; responses are anonymous (no name, email, IP or sign-in is stored)
- `/admin` is the dashboard (KPIs, Academic, Operations, Facilitators & programmes, Compare facilitators, Student voice)
- `/admin/forms` lists forms and handles CRUD: create, edit, duplicate, publish/draft/close, delete
- `/admin/forms/:id/edit` is the builder: sections, 15 question types (text, paragraph, email, phone, number, multiple choice, checkboxes, dropdown, linear scale, star rating, grid, date, time, file upload, text block), an "Other" option, required, reordering, a live preview, covers and colours, and one-section-per-page mode
- `/admin/forms/:id/responses` gives a per-question summary, single responses, file downloads and CSV export
- `/admin/settings` manages admin accounts and passwords

## Stack

React + Vite + Tailwind for the frontend. Express + `pg` for the API. The same Node process serves the built frontend.

## Database

The app shares the Supabase Postgres database with the main ESOL Premier Campus project, but **everything lives in its own schema, `epc_feedback`** (`admins`, `forms`, `responses`, `files`). It never reads or writes `public`, `auth` or `storage`. RLS is enabled on every table, and the `anon` and `authenticated` roles have no access to the schema, so nothing is exposed through Supabase's REST API. Uploaded files are stored in `epc_feedback.files`, so no storage bucket or service-role key is needed.

The direct host `db.<ref>.supabase.co` is IPv6-only. The server connects through the IPv4 session pooler set in `DATABASE_POOLER_URL`.

## Running locally

```bash
npm install
npm run db:setup      # creates the schema, the first admin from ADMIN_EMAIL/ADMIN_PASSWORD, and the two starter forms
npm run dev:all       # Vite on :5180, API on :4100
```

`npm run db:seed` does the same and also adds **fake** sample responses for trying the dashboard. Don't run it against live data.

## Dashboard keys

The dashboard finds questions by their "Dashboard use" key, which is set per question in the builder: `program`, `facilitator`, `facilitator_rating`, `nps`, `mood`, `choose_again`, `help_sorted`, `teaching`, `course`, `service`, `facilities`, `skills`, `blockers`, `upgrade`, and so on. A new form only feeds a KPI card or chart once its questions have keys. For grid questions, the builder also sets which columns count as "agree" and which (such as N/A) are left out.

## Deploying to Vercel

The repo is ready for Vercel. `vercel.json` builds the Vite frontend into `dist` and serves it from Vercel's CDN. The whole Express API runs as one serverless function (`api/index.js`), and every `/api/*` request is routed to it. Any other path falls back to `index.html`, so links like `/f/evaluation-form` and `/admin` work.

1. Push the project to GitHub and import it in Vercel. No framework or build settings need changing, because `vercel.json` sets them.
2. In **Project → Settings → Environment Variables**, add:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_POOLER_URL` | The **transaction** pooler URL, port **6543**: `postgresql://postgres.<ref>:<url-encoded-password>@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres` |
   | `DB_SCHEMA` | `epc_feedback` |
   | `JWT_SECRET` | A long random string (it can be the same as in `.env`) |

   Don't set `PORT` or `API_PORT`. `ADMIN_EMAIL` and `ADMIN_PASSWORD` are only used by `npm run db:setup`, which you run locally.
3. Deploy. The schema and admin account already exist in the database, so nothing else needs to run.

Things that are different on Vercel:
- **Uploads are capped at 4 MB.** Vercel rejects request bodies over 4.5 MB. Forms automatically show students the lower limit. You can override it with `UPLOAD_LIMIT_MB`, but not above about 4.
- **Use the transaction pooler (6543), not the session pooler (5432).** Serverless functions open many short-lived connections, and session mode runs out of slots.
- **Login and submission throttling is per function instance**, so it's looser than on a single server.

## Deploying to a Node host (e.g. Hostinger)

```bash
npm run build
npm start
```

Set the same variables as `.env` in the host, but leave `API_PORT` unset so the host's `PORT` is used. Also set `NODE_ENV=production` so the admin cookie is marked secure.
