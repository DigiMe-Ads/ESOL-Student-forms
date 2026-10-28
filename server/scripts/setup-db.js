// Creates this app's schema and tables (idempotent), the first admin, and the two starter forms.
//   npm run db:setup          -> schema + admin + starter forms (only if no forms exist yet)
//   npm run db:seed           -> same, plus sample responses for trying the dashboard
import "dotenv/config";
import bcrypt from "bcryptjs";
import { pool, SCHEMA } from "../db.js";
import { seedForms } from "./seed-forms.js";

const ddl = `
create schema if not exists ${SCHEMA};

create table if not exists ${SCHEMA}.admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null default '',
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists ${SCHEMA}.forms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  category text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  settings jsonb not null default '{}'::jsonb,
  schema jsonb not null default '{"sections": []}'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ${SCHEMA}.responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references ${SCHEMA}.forms(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists responses_form_created_idx on ${SCHEMA}.responses (form_id, created_at desc);

-- Uploaded files (answers to file-upload questions and form cover images) are stored in the
-- database so this app needs no storage bucket of its own in the shared Supabase project.
create table if not exists ${SCHEMA}.files (
  id uuid primary key default gen_random_uuid(),
  form_id uuid references ${SCHEMA}.forms(id) on delete cascade,
  response_id uuid references ${SCHEMA}.responses(id) on delete cascade,
  field_id text,
  is_public boolean not null default false,
  filename text not null,
  mime text not null,
  size int not null,
  data bytea not null,
  created_at timestamptz not null default now()
);
create index if not exists files_response_idx on ${SCHEMA}.files (response_id);

-- Nothing in this schema is reachable through Supabase's REST API with the anon key.
alter table ${SCHEMA}.admins enable row level security;
alter table ${SCHEMA}.forms enable row level security;
alter table ${SCHEMA}.responses enable row level security;
alter table ${SCHEMA}.files enable row level security;
revoke all on schema ${SCHEMA} from anon, authenticated;
`;

function pick(arr, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

function sampleAnswers(form) {
  const answers = {};
  const skew = Math.random() * 0.6 + 0.4; // per-respondent positivity
  for (const section of form.schema.sections) {
    for (const f of section.fields) {
      if (f.type === "dropdown" || f.type === "radio") {
        const w = f.options.map((_, i) => (f.key === "facilitator" || f.key === "program" ? 1 : Math.max(0.2, (f.options.length - i) * skew)));
        answers[f.id] = pick(f.options.slice(0, f.key === "program" ? 6 : undefined), w.slice(0, f.key === "program" ? 6 : undefined));
      } else if (f.type === "checkbox") {
        answers[f.id] = f.options.filter(() => Math.random() < 0.35);
        if (!answers[f.id].length) answers[f.id] = [f.options[0]];
      } else if (f.type === "scale") {
        const span = f.max - f.min;
        answers[f.id] = Math.min(f.max, Math.max(f.min, Math.round(f.min + span * (skew + (Math.random() - 0.3) * 0.4))));
      } else if (f.type === "matrix") {
        const v = {};
        for (const row of f.rows) {
          const cols = f.columns.filter((c) => !f.excluded?.includes(c));
          const idx = f.positive?.includes(cols[0])
            ? Math.min(cols.length - 1, Math.floor((1 - skew) * cols.length * Math.random() * 1.6))
            : Math.min(cols.length - 1, Math.max(0, Math.round(cols.length * skew - Math.random() * 1.8)));
          v[row] = Math.random() < 0.05 && f.excluded?.length ? f.excluded[0] : cols[idx];
        }
        answers[f.id] = v;
      } else if (f.type === "short_text" && Math.random() < 0.6) {
        answers[f.id] = pick(["inspiring", "friendly", "helpful", "rushed", "supportive", "challenging"], [3, 3, 2, 1, 2, 1]);
      } else if (f.type === "long_text" && Math.random() < 0.35) {
        answers[f.id] = pick(
          [
            "More speaking practice sessions would help a lot.",
            "The AC in room 2 is too cold, otherwise great.",
            "My facilitator is amazing, very patient with questions.",
            "Please share the timetable earlier each month.",
            "Wi-Fi drops often in the afternoon.",
          ],
          [1, 1, 1, 1, 1],
        );
      }
    }
  }
  return answers;
}

async function main() {
  const seedSamples = process.argv.includes("--seed");
  const client = await pool.connect();
  try {
    await client.query(ddl);
    console.log(`Schema "${SCHEMA}" ready`);

    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (email && password) {
      const hash = await bcrypt.hash(password, 10);
      const r = await client.query(
        `insert into ${SCHEMA}.admins (email, name, password_hash) values ($1, 'Administrator', $2) on conflict (email) do nothing`,
        [email.toLowerCase(), hash],
      );
      console.log(r.rowCount ? `Admin ${email} created` : `Admin ${email} already exists`);
    }

    const { rows } = await client.query(`select count(*)::int as n from ${SCHEMA}.forms`);
    if (rows[0].n === 0) {
      for (const f of seedForms) {
        await client.query(
          `insert into ${SCHEMA}.forms (slug, title, description, category, status, settings, schema, sort_order)
           values ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [f.slug, f.title, f.description, f.category, f.status, f.settings, f.schema, f.sort_order],
        );
      }
      console.log(`Created ${seedForms.length} starter forms`);
    }

    if (seedSamples) {
      for (const f of seedForms) {
        const { rows: fr } = await client.query(`select id from ${SCHEMA}.forms where slug = $1`, [f.slug]);
        if (!fr.length) continue;
        const n = f.slug === "evaluation-form" ? 60 : 90;
        for (let i = 0; i < n; i++) {
          const daysAgo = Math.floor(Math.random() * 56);
          await client.query(
            `insert into ${SCHEMA}.responses (form_id, answers, created_at) values ($1, $2, now() - ($3 || ' days')::interval - (random() * interval '10 hours'))`,
            [fr[0].id, sampleAnswers(f), String(daysAgo)],
          );
        }
        console.log(`Added ${n} sample responses to ${f.slug}`);
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
