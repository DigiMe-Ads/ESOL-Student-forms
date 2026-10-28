import { type Field, type Form, OTHER_PREFIX, type ResponseRow } from "./types";

export const allFields = (form: Form) => form.schema.sections.flatMap((s) => s.fields);

/** Analytics keys the dashboard understands; set per question in the form builder. */
export const ANALYTICS_KEYS: { key: string; label: string; types: Field["type"][]; help: string }[] = [
  { key: "program", label: "Programme (filter)", types: ["dropdown", "radio"], help: "Used for the Course filter and programme table" },
  { key: "facilitator", label: "Facilitator (filter)", types: ["dropdown", "radio"], help: "Used for the Facilitator filter and comparisons" },
  { key: "facilitator_rating", label: "Facilitator rating KPI", types: ["scale", "rating"], help: "Averaged into the Facilitator rating card" },
  { key: "nps", label: "Recommend score (NPS)", types: ["scale"], help: "0–10 scale; % 9–10 minus % 0–6" },
  { key: "mood", label: "Study mood KPI", types: ["scale", "rating"], help: "Averaged into the Study mood card" },
  { key: "choose_again", label: "Would choose us again", types: ["radio", "dropdown"], help: "First two options count as yes" },
  { key: "help_sorted", label: "Help sorted first time", types: ["radio", "dropdown"], help: "First option = sorted; last option excluded" },
  { key: "teaching", label: "Teaching quality", types: ["matrix"], help: "Academic tab: Teaching quality" },
  { key: "course", label: "Course & learning", types: ["matrix"], help: "Academic tab: Course & learning" },
  { key: "service", label: "Service & staff", types: ["matrix"], help: "Operations tab: Service & staff" },
  { key: "facilities", label: "Campus & facilities", types: ["matrix"], help: "Operations tab: Campus & facilities" },
  { key: "skills", label: "Skills improved", types: ["checkbox"], help: "Academic tab: Skills students say improved" },
  { key: "week_overall", label: "Weekly learning score", types: ["scale", "rating"], help: "Weekly pulse trend" },
  { key: "week_confidence", label: "Weekly confidence score", types: ["scale", "rating"], help: "Weekly pulse trend" },
  { key: "blockers", label: "Learning blockers", types: ["checkbox"], help: "Operations tab: What got in the way" },
  { key: "attendance", label: "Attendance mode", types: ["radio", "dropdown"], help: "Operations tab" },
  { key: "upgrade", label: "Upgrade vote", types: ["radio", "dropdown", "checkbox"], help: "Operations tab" },
  { key: "one_word", label: "One-word experience", types: ["short_text"], help: "Student voice: word frequency" },
  { key: "comments", label: "Open comments", types: ["long_text", "short_text"], help: "Student voice" },
];

export const AREA_LABEL: Record<string, string> = {
  teaching: "Teaching",
  course: "Course & learning",
  service: "Service & staff",
  facilities: "Campus & facilities",
};

export type Tone = "good" | "mid" | "bad" | "none";
export const tone = (pct: number | null): Tone => (pct == null ? "none" : pct >= 80 ? "good" : pct >= 60 ? "mid" : "bad");
export const TONE_COLOR: Record<Tone, string> = { good: "var(--good)", mid: "var(--mid)", bad: "var(--bad)", none: "#555" };

export const displayChoice = (v: string) => (v.startsWith(OTHER_PREFIX) ? "Other" : v);

export interface Pair {
  form: Form;
  field: Field;
}

/** Every (form, field) pair with a given analytics key across the selected forms. */
export function fieldsWithKey(forms: Form[], key: string): Pair[] {
  return forms.flatMap((form) => allFields(form).filter((f) => f.key === key).map((field) => ({ form, field })));
}

export function answersFor(pairs: Pair[], responses: ResponseRow[]) {
  const out: { value: unknown; field: Field; r: ResponseRow }[] = [];
  for (const { form, field } of pairs) {
    for (const r of responses) {
      if (r.form_id !== form.id) continue;
      const v = r.answers[field.id];
      if (v !== undefined && v !== null && v !== "") out.push({ value: v, field, r });
    }
  }
  return out;
}

export const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null);

export function scaleAvg(forms: Form[], responses: ResponseRow[], key: string) {
  const vals = answersFor(fieldsWithKey(forms, key), responses).map((a) => Number(a.value)).filter((n) => !Number.isNaN(n));
  return { avg: avg(vals), n: vals.length };
}

export function npsScore(forms: Form[], responses: ResponseRow[]) {
  const vals = answersFor(fieldsWithKey(forms, "nps"), responses).map((a) => Number(a.value));
  if (!vals.length) return { score: null as number | null, n: 0, promoters: 0, detractors: 0 };
  const promoters = vals.filter((v) => v >= 9).length / vals.length;
  const detractors = vals.filter((v) => v <= 6).length / vals.length;
  return { score: Math.round((promoters - detractors) * 100), n: vals.length, promoters, detractors };
}

export function chooseAgain(forms: Form[], responses: ResponseRow[]) {
  const a = answersFor(fieldsWithKey(forms, "choose_again"), responses);
  if (!a.length) return { pct: null as number | null, n: 0 };
  const yes = a.filter(({ value, field }) => (field.options ?? []).slice(0, 2).includes(value as string)).length;
  return { pct: (yes / a.length) * 100, n: a.length };
}

export function helpSorted(forms: Form[], responses: ResponseRow[]) {
  const a = answersFor(fieldsWithKey(forms, "help_sorted"), responses).filter(({ value, field }) => {
    const opts = field.options ?? [];
    return opts.length < 2 || value !== opts[opts.length - 1];
  });
  if (!a.length) return { pct: null as number | null, n: 0 };
  const first = a.filter(({ value, field }) => value === field.options?.[0]).length;
  return { pct: (first / a.length) * 100, n: a.length };
}

export interface BarRow {
  label: string;
  pct: number | null;
  n: number;
  count?: number;
}

const positiveCols = (f: Field) => {
  if (f.positive?.length) return f.positive;
  const cols = (f.columns ?? []).filter((c) => !f.excluded?.includes(c));
  return cols.length >= 4 ? cols.slice(-2) : cols.slice(0, 1);
};

/** % positive per matrix row, merged by row label across forms, weakest first. */
export function matrixRows(pairs: Pair[], responses: ResponseRow[]): BarRow[] {
  const acc = new Map<string, { pos: number; n: number }>();
  for (const { value, field } of answersFor(pairs, responses)) {
    const pos = positiveCols(field);
    for (const [row, col] of Object.entries(value as Record<string, string>)) {
      if (!(field.rows ?? []).includes(row) || field.excluded?.includes(col)) continue;
      const cur = acc.get(row) ?? { pos: 0, n: 0 };
      cur.n++;
      if (pos.includes(col)) cur.pos++;
      acc.set(row, cur);
    }
  }
  // keep rows with no answers so the card still lists every statement
  for (const { field } of pairs) for (const row of field.rows ?? []) if (!acc.has(row)) acc.set(row, { pos: 0, n: 0 });
  return [...acc.entries()]
    .map(([label, { pos, n }]) => ({ label, pct: n ? (pos / n) * 100 : null, n }))
    .sort((a, b) => (a.pct ?? 101) - (b.pct ?? 101));
}

export function matrixOverall(pairs: Pair[], responses: ResponseRow[]): BarRow {
  let pos = 0;
  let n = 0;
  for (const r of matrixRows(pairs, responses)) {
    if (r.pct == null) continue;
    pos += (r.pct / 100) * r.n;
    n += r.n;
  }
  return { label: "", pct: n ? (pos / n) * 100 : null, n };
}

/** Share of answers per option (radio/dropdown) or share of respondents ticking it (checkbox). */
export function choiceRows(pairs: Pair[], responses: ResponseRow[]): BarRow[] {
  const answers = answersFor(pairs, responses);
  const counts = new Map<string, number>();
  for (const { field } of pairs) for (const o of field.options ?? []) counts.set(o, 0);
  for (const { value } of answers) {
    for (const v of Array.isArray(value) ? value : [value]) {
      if (typeof v !== "string") continue;
      const k = displayChoice(v);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  const total = answers.length;
  return [...counts.entries()].map(([label, count]) => ({ label, count, n: total, pct: total ? (count / total) * 100 : null }));
}

export function scaleDistribution(field: Field, values: number[]) {
  const min = field.type === "rating" ? 1 : field.min ?? 1;
  const max = field.max ?? 5;
  return Array.from({ length: max - min + 1 }, (_, i) => {
    const v = min + i;
    const count = values.filter((x) => x === v).length;
    return { label: String(v), count, n: values.length, pct: values.length ? (count / values.length) * 100 : null };
  });
}

export function groupBy<T>(items: T[], key: (t: T) => string | undefined) {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    if (!k) continue;
    m.set(k, [...(m.get(k) ?? []), it]);
  }
  return m;
}

/** The value a response gave for the field with this key (e.g. its facilitator). */
export function keyedValue(formsById: Map<string, Form>, r: ResponseRow, key: string): string | undefined {
  const form = formsById.get(r.form_id);
  if (!form) return;
  const f = allFields(form).find((x) => x.key === key);
  const v = f ? r.answers[f.id] : undefined;
  return typeof v === "string" ? displayChoice(v) === "Other" ? v.slice(OTHER_PREFIX.length) || "Other" : v : undefined;
}

export const fmtPct = (p: number | null) => (p == null ? "—" : `${Math.round(p)}%`);
export const fmtNum = (n: number | null, d = 1) => (n == null ? "—" : n.toFixed(d));
