import { Router } from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import { query } from "../db.js";
import { clearSession, requireAdmin, setSession } from "../auth.js";
import { allFields } from "../validate.js";
import { UPLOAD_LIMIT_MB } from "./public.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: Math.min(8, UPLOAD_LIMIT_MB) * 1024 * 1024 } });

const failed = new Map();
router.post("/login", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const key = `${req.ip}|${email}`;
  const f = failed.get(key);
  if (f && f.count >= 8 && Date.now() - f.at < 10 * 60_000) {
    return res.status(429).json({ error: "Too many attempts. Try again in 10 minutes." });
  }
  const { rows } = await query(`select id, email, name, password_hash from admins where email = $1`, [email]);
  const admin = rows[0];
  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
    failed.set(key, { count: (f?.count || 0) + 1, at: Date.now() });
    return res.status(401).json({ error: "Incorrect email or password" });
  }
  failed.delete(key);
  setSession(res, admin);
  res.json({ id: admin.id, email: admin.email, name: admin.name });
});

router.post("/logout", (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

router.use(requireAdmin);

router.get("/me", async (req, res) => {
  const { rows } = await query(`select id, email, name from admins where id = $1`, [req.admin.sub]);
  if (!rows[0]) {
    clearSession(res);
    return res.status(401).json({ error: "Not signed in" });
  }
  res.json(rows[0]);
});

// ---------- Forms ----------

router.get("/forms", async (_req, res) => {
  const { rows } = await query(`
    select f.id, f.slug, f.title, f.description, f.category, f.status, f.settings, f.schema, f.sort_order,
           f.created_at, f.updated_at,
           count(r.id)::int as response_count, max(r.created_at) as last_response_at
      from forms f left join responses r on r.form_id = f.id
     group by f.id order by f.sort_order, f.created_at`);
  res.json(rows);
});

const slugify = (s) =>
  String(s || "form").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "form";

async function uniqueSlug(base, exceptId = null) {
  let slug = slugify(base);
  for (let i = 2; ; i++) {
    const { rows } = await query(`select 1 from forms where slug = $1 and ($2::uuid is null or id <> $2)`, [slug, exceptId]);
    if (!rows.length) return slug;
    slug = `${slugify(base)}-${i}`;
  }
}

router.post("/forms", async (req, res) => {
  const { duplicateOf, title } = req.body || {};
  let base = {
    title: title || "Untitled form",
    description: "",
    category: "",
    settings: { submitLabel: "Submit", successTitle: "Thank you!", successMessage: "Your response has been recorded.", accentColor: "#1c2599" },
    schema: {
      sections: [
        { id: "s_" + Math.random().toString(36).slice(2, 8), title: "", description: "", fields: [] },
      ],
    },
  };
  if (duplicateOf) {
    const { rows } = await query(`select * from forms where id = $1`, [duplicateOf]);
    if (!rows[0]) return res.status(404).json({ error: "Form not found" });
    base = { ...rows[0], title: `${rows[0].title} (copy)` };
  }
  const slug = await uniqueSlug(base.title);
  const { rows } = await query(
    `insert into forms (slug, title, description, category, status, settings, schema, sort_order)
     values ($1, $2, $3, $4, 'draft', $5, $6, coalesce((select max(sort_order) + 1 from forms), 0)) returning *`,
    [slug, base.title, base.description, base.category, base.settings, base.schema],
  );
  res.status(201).json(rows[0]);
});

router.get("/forms/:id", async (req, res) => {
  const { rows } = await query(`select * from forms where id = $1`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: "Form not found" });
  res.json(rows[0]);
});

router.put("/forms/:id", async (req, res) => {
  const { title, description, category, status, settings, schema, slug, sort_order } = req.body || {};
  if (status && !["draft", "published", "closed"].includes(status)) return res.status(400).json({ error: "Invalid status" });
  if (schema && !Array.isArray(schema.sections)) return res.status(400).json({ error: "Invalid form structure" });
  if (schema) {
    const ids = allFields(schema).map((f) => f.id);
    if (new Set(ids).size !== ids.length) return res.status(400).json({ error: "Two questions share the same ID" });
  }
  const newSlug = slug !== undefined ? await uniqueSlug(slug, req.params.id) : undefined;
  const { rows } = await query(
    `update forms set
       title = coalesce($2, title), description = coalesce($3, description), category = coalesce($4, category),
       status = coalesce($5, status), settings = coalesce($6, settings), schema = coalesce($7, schema),
       slug = coalesce($8, slug), sort_order = coalesce($9, sort_order), updated_at = now()
     where id = $1 returning *`,
    [req.params.id, title ?? null, description ?? null, category ?? null, status ?? null, settings ?? null, schema ?? null, newSlug ?? null, sort_order ?? null],
  );
  if (!rows[0]) return res.status(404).json({ error: "Form not found" });
  res.json(rows[0]);
});

router.delete("/forms/:id", async (req, res) => {
  const { rowCount } = await query(`delete from forms where id = $1`, [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: "Form not found" });
  res.json({ ok: true });
});

// ---------- Responses ----------

// All responses (optionally for one form) for the dashboard; analytics are computed in the browser.
router.get("/responses", async (req, res) => {
  const formId = req.query.formId || null;
  const { rows } = await query(
    `select id, form_id, answers, created_at from responses where ($1::uuid is null or form_id = $1) order by created_at desc`,
    [formId],
  );
  res.json(rows);
});

router.delete("/responses/:id", async (req, res) => {
  await query(`delete from responses where id = $1`, [req.params.id]);
  res.json({ ok: true });
});

router.delete("/forms/:id/responses", async (req, res) => {
  const { rowCount } = await query(`delete from responses where form_id = $1`, [req.params.id]);
  res.json({ ok: true, deleted: rowCount });
});

const csvCell = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

router.get("/forms/:id/export.csv", async (req, res) => {
  const { rows: fr } = await query(`select * from forms where id = $1`, [req.params.id]);
  const form = fr[0];
  if (!form) return res.status(404).end();
  const { rows } = await query(`select answers, created_at from responses where form_id = $1 order by created_at`, [form.id]);
  const cols = [];
  for (const f of allFields(form.schema)) {
    if (f.type === "statement") continue;
    if (f.type === "matrix") for (const r of f.rows || []) cols.push({ head: `${f.label} [${r}]`, get: (a) => a[f.id]?.[r] });
    else cols.push({ head: f.label, get: (a) => {
      const v = a[f.id];
      if (Array.isArray(v)) return v.map((x) => (typeof x === "object" ? x.name : x)).join("; ");
      return v;
    } });
  }
  const lines = [["Submitted at", ...cols.map((c) => c.head)].map(csvCell).join(",")];
  for (const r of rows) lines.push([new Date(r.created_at).toISOString(), ...cols.map((c) => c.get(r.answers))].map(csvCell).join(","));
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${form.slug}-responses.csv"`);
  res.send("﻿" + lines.join("\r\n"));
});

// ---------- Files ----------

router.get("/files/:id", async (req, res) => {
  const { rows } = await query(`select filename, mime, data from files where id = $1`, [req.params.id]);
  if (!rows[0]) return res.status(404).end();
  res.setHeader("Content-Type", rows[0].mime);
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(rows[0].filename)}"`);
  res.send(rows[0].data);
});

// Cover / header images for forms.
router.post("/images", upload.single("file"), async (req, res) => {
  const file = req.file;
  if (!file || !file.mimetype.startsWith("image/")) return res.status(400).json({ error: "Please choose an image" });
  const { rows } = await query(
    `insert into files (form_id, filename, mime, size, data, is_public) values ($1, $2, $3, $4, $5, true) returning id`,
    [req.body.formId || null, file.originalname.slice(0, 200), file.mimetype, file.size, file.buffer],
  );
  res.json({ url: `/api/files/${rows[0].id}` });
});

// ---------- Admin accounts ----------

router.get("/admins", async (_req, res) => {
  const { rows } = await query(`select id, email, name, created_at from admins order by created_at`);
  res.json(rows);
});

router.post("/admins", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Enter a valid email" });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  const { rows } = await query(
    `insert into admins (email, name, password_hash) values ($1, $2, $3) on conflict (email) do nothing returning id, email, name, created_at`,
    [email, String(req.body?.name || ""), await bcrypt.hash(password, 10)],
  );
  if (!rows[0]) return res.status(409).json({ error: "An admin with that email already exists" });
  res.status(201).json(rows[0]);
});

router.delete("/admins/:id", async (req, res) => {
  if (req.params.id === req.admin.sub) return res.status(400).json({ error: "You cannot remove your own account" });
  await query(`delete from admins where id = $1`, [req.params.id]);
  res.json({ ok: true });
});

router.put("/password", async (req, res) => {
  const { current, next } = req.body || {};
  if (String(next || "").length < 8) return res.status(400).json({ error: "New password must be at least 8 characters" });
  const { rows } = await query(`select password_hash from admins where id = $1`, [req.admin.sub]);
  if (!rows[0] || !(await bcrypt.compare(String(current || ""), rows[0].password_hash))) {
    return res.status(400).json({ error: "Current password is incorrect" });
  }
  await query(`update admins set password_hash = $2 where id = $1`, [req.admin.sub, await bcrypt.hash(next, 10)]);
  res.json({ ok: true });
});

export default router;
