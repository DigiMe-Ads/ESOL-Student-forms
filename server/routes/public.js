import { Router } from "express";
import multer from "multer";
import { query } from "../db.js";
import { readSession } from "../auth.js";
import { allFields, validateAnswers } from "../validate.js";

const router = Router();
// Vercel rejects request bodies over 4.5 MB, so uploads are capped lower there.
export const UPLOAD_LIMIT_MB = Number(process.env.UPLOAD_LIMIT_MB) || (process.env.VERCEL ? 4 : 25);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: UPLOAD_LIMIT_MB * 1024 * 1024 } });

// Light per-IP throttle on submissions; IPs are only held in memory, never stored with responses.
const hits = new Map();
function throttle(req, res, next) {
  const now = Date.now();
  const key = req.ip;
  const list = (hits.get(key) || []).filter((t) => now - t < 60_000);
  if (list.length >= 20) return res.status(429).json({ error: "Too many submissions, please wait a minute" });
  list.push(now);
  hits.set(key, list);
  next();
}

const publicForm = (f) => ({
  id: f.id,
  slug: f.slug,
  title: f.title,
  description: f.description,
  category: f.category,
  status: f.status,
  settings: f.settings,
  // Show students the real limit when a question allows more than this host accepts.
  schema: {
    ...f.schema,
    sections: (f.schema.sections || []).map((s) => ({
      ...s,
      fields: (s.fields || []).map((x) =>
        x.type === "file" ? { ...x, maxSizeMB: Math.min(Number(x.maxSizeMB) || 10, UPLOAD_LIMIT_MB) } : x,
      ),
    })),
  },
  updated_at: f.updated_at,
});

router.get("/forms", async (_req, res) => {
  const { rows } = await query(
    `select id, slug, title, description, category, settings, schema, updated_at
       from forms where status = 'published' order by sort_order, created_at`,
  );
  res.json(
    rows.map((f) => ({
      id: f.id,
      slug: f.slug,
      title: f.title,
      description: f.description,
      category: f.category,
      settings: f.settings,
      questionCount: allFields(f.schema).filter((x) => x.type !== "statement").length,
      sectionCount: (f.schema.sections || []).filter((s) => s.title).length,
      updated_at: f.updated_at,
    })),
  );
});

async function loadForm(req) {
  const { rows } = await query(`select * from forms where slug = $1`, [req.params.slug]);
  const form = rows[0];
  if (!form) return null;
  // Admins can open drafts/closed forms to preview them.
  if (form.status !== "published" && !readSession(req)) return null;
  return form;
}

router.get("/forms/:slug", async (req, res) => {
  const form = await loadForm(req);
  if (!form) return res.status(404).json({ error: "Form not found" });
  res.json(publicForm(form));
});

router.post("/forms/:slug/files", throttle, upload.single("file"), async (req, res) => {
  const form = await loadForm(req);
  if (!form) return res.status(404).json({ error: "Form not found" });
  const field = allFields(form.schema).find((f) => f.id === req.body.fieldId && f.type === "file");
  if (!field) return res.status(400).json({ error: "Unknown upload question" });
  const file = req.file;
  if (!file) return res.status(400).json({ error: "No file received" });
  const maxMB = Math.min(Number(field.maxSizeMB) || 10, UPLOAD_LIMIT_MB);
  if (file.size > maxMB * 1024 * 1024) return res.status(400).json({ error: `File is larger than ${maxMB} MB` });
  if (field.accept && !acceptOk(field.accept, file)) return res.status(400).json({ error: "This file type is not allowed" });
  const { rows } = await query(
    `insert into files (form_id, field_id, filename, mime, size, data) values ($1, $2, $3, $4, $5, $6) returning id`,
    [form.id, field.id, file.originalname.slice(0, 200), file.mimetype || "application/octet-stream", file.size, file.buffer],
  );
  res.json({ id: rows[0].id, name: file.originalname, size: file.size });
});

function acceptOk(accept, file) {
  const name = file.originalname.toLowerCase();
  return accept.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean).some((rule) => {
    if (rule.startsWith(".")) return name.endsWith(rule);
    if (rule.endsWith("/*")) return file.mimetype.startsWith(rule.slice(0, -1));
    return file.mimetype === rule;
  });
}

router.post("/forms/:slug/responses", throttle, async (req, res) => {
  const form = await loadForm(req);
  if (!form) return res.status(404).json({ error: "Form not found" });
  if (form.status !== "published") return res.status(403).json({ error: "This form is not accepting responses" });
  const { answers, errors } = validateAnswers(form.schema, req.body?.answers);
  if (Object.keys(errors).length) return res.status(400).json({ error: "Some answers need attention", fields: errors });
  const { rows } = await query(`insert into responses (form_id, answers) values ($1, $2) returning id`, [form.id, answers]);
  const fileIds = allFields(form.schema)
    .filter((f) => f.type === "file")
    .flatMap((f) => (answers[f.id] || []).map((x) => x.id));
  if (fileIds.length) {
    await query(`update files set response_id = $1 where id = any($2::uuid[]) and form_id = $3 and response_id is null`, [
      rows[0].id,
      fileIds,
      form.id,
    ]);
  }
  res.status(201).json({ ok: true });
});

// Only files explicitly marked public (form cover images) are served without signing in.
router.get("/files/:id", async (req, res) => {
  const { rows } = await query(`select filename, mime, data from files where id = $1 and is_public`, [req.params.id]).catch(
    () => ({ rows: [] }),
  );
  if (!rows[0]) return res.status(404).end();
  res.setHeader("Content-Type", rows[0].mime);
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(rows[0].data);
});

export default router;
