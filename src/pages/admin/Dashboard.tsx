import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, RefreshCw } from "lucide-react";
import { api } from "../../lib/api";
import type { Form, ResponseRow } from "../../lib/types";
import {
  allFields,
  answersFor,
  AREA_LABEL,
  chooseAgain,
  choiceRows,
  fieldsWithKey,
  fmtNum,
  fmtPct,
  groupBy,
  helpSorted,
  keyedValue,
  matrixOverall,
  matrixRows,
  npsScore,
  scaleAvg,
  tone,
  TONE_COLOR,
} from "../../lib/analytics";
import { Bars, Card, Columns, Empty, Kpi, Legend } from "../../components/admin/Widgets";
import { LogoChip } from "../../components/Brand";

const TABS = ["Academic", "Operations", "Facilitators & programmes", "Compare facilitators", "Student voice"] as const;
type Tab = (typeof TABS)[number];
const PERIODS = [
  { id: "all", label: "All time", days: 0 },
  { id: "7", label: "Last 7 days", days: 7 },
  { id: "30", label: "Last 30 days", days: 30 },
  { id: "90", label: "Last 90 days", days: 90 },
];

export default function Dashboard() {
  const [forms, setForms] = useState<Form[] | null>(null);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [formId, setFormId] = useState("all");
  const [facilitator, setFacilitator] = useState("all");
  const [program, setProgram] = useState("all");
  const [period, setPeriod] = useState("all");
  const [tab, setTab] = useState<Tab>("Academic");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [f, r] = await Promise.all([api.get<Form[]>("/api/admin/forms"), api.get<ResponseRow[]>("/api/admin/responses")]);
      setForms(f);
      setResponses(r);
      setLoadedAt(new Date());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const formsById = useMemo(() => new Map((forms ?? []).map((f) => [f.id, f])), [forms]);
  const selForms = useMemo(() => (forms ?? []).filter((f) => formId === "all" || f.id === formId), [forms, formId]);

  const base = useMemo(() => {
    const days = PERIODS.find((p) => p.id === period)?.days ?? 0;
    const since = days ? Date.now() - days * 864e5 : 0;
    return responses.filter((r) => (formId === "all" || r.form_id === formId) && new Date(r.created_at).getTime() >= since);
  }, [responses, formId, period]);

  const options = (key: string) =>
    [...new Set(base.map((r) => keyedValue(formsById, r, key)).filter(Boolean) as string[])].sort();
  const facilitatorOpts = useMemo(() => options("facilitator"), [base, formsById]); // eslint-disable-line react-hooks/exhaustive-deps
  const programOpts = useMemo(() => options("program"), [base, formsById]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(
    () =>
      base.filter(
        (r) =>
          (facilitator === "all" || keyedValue(formsById, r, "facilitator") === facilitator) &&
          (program === "all" || keyedValue(formsById, r, "program") === program),
      ),
    [base, facilitator, program, formsById],
  );

  const rating = scaleAvg(selForms, filtered, "facilitator_rating");
  const nps = npsScore(selForms, filtered);
  const mood = scaleAvg(selForms, filtered, "mood");
  const again = chooseAgain(selForms, filtered);
  const help = helpSorted(selForms, filtered);
  const k = (key: string) => fieldsWithKey(selForms, key);

  return (
    <main className="mx-auto max-w-[1500px] px-4 pb-16 pt-5 sm:px-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#000a6b] via-[#030c7a] to-[#06105e] p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-[#2a47c9]/40 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-5">
          <LogoChip />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">Student feedback</p>
            <h1 className="font-display text-2xl font-bold text-white sm:text-[26px]">Evaluation dashboard</h1>
          </div>
        </div>
        {error && <p className="relative mt-4 text-sm text-rose-300">The feedback data did not load: {error}</p>}
        <div className="relative mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 text-sm text-slate-200">
          <Filter label="Form" value={formId} onChange={(v) => { setFormId(v); setFacilitator("all"); setProgram("all"); }}>
            <option value="all">All forms</option>
            {(forms ?? []).map((f) => (
              <option key={f.id} value={f.id}>
                {f.title}
              </option>
            ))}
          </Filter>
          <Filter label="Facilitator" value={facilitator} onChange={setFacilitator}>
            <option value="all">All facilitators</option>
            {facilitatorOpts.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </Filter>
          <Filter label="Course" value={program} onChange={setProgram}>
            <option value="all">All courses</option>
            {programOpts.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </Filter>
          <Filter label="Period" value={period} onChange={setPeriod}>
            {PERIODS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Filter>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/40 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh data
          </button>
          <span className="text-[13px] text-slate-300">
            {loading ? "Loading latest responses…" : loadedAt ? `Updated ${loadedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6 xl:gap-4">
        <Kpi label="Responses" value={forms ? String(filtered.length) : "—"} hint="Completed evaluation forms" />
        <Kpi label="Facilitator rating" value={fmtNum(rating.avg)} suffix="/ 10" hint={`Average of “Overall, how would you rate your facilitator?”`} />
        <Kpi
          label="Recommend score"
          value={nps.score == null ? "—" : `${nps.score > 0 ? "+" : ""}${nps.score}`}
          accent={nps.score == null ? undefined : nps.score >= 30 ? "#6ea8ff" : nps.score >= 0 ? "#f2c14e" : "#f87171"}
          hint="% scoring 9–10 minus % scoring 0–6 (−100 to +100)"
        />
        <Kpi label="Study mood" value={fmtNum(mood.avg)} suffix="/ 5" hint={`“How do you feel about your studies?” 1 😩 to 5 🤩`} />
        <Kpi label="Would choose us again" value={fmtPct(again.pct)} accent={TONE_COLOR[tone(again.pct)]} hint="Answered Definitely or Probably" />
        <Kpi label="Help sorted first time" value={fmtPct(help.pct)} accent={TONE_COLOR[tone(help.pct)]} hint="“Sorted immediately”, of students who needed help" />
      </div>

      <div className="mt-6">
        <Legend />
      </div>

      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-[var(--line)]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 border-b-2 px-3.5 py-2.5 text-[15px] transition ${
              tab === t ? "border-sky-400 font-semibold text-white" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {!forms ? (
        <div className="grid place-items-center py-24">{loading ? <Loader2 className="h-6 w-6 animate-spin text-slate-500" /> : <Empty>Failed to load</Empty>}</div>
      ) : (
        <div className="mt-6">
          {tab === "Academic" && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card title="Satisfaction by area" subtitle="Share of answers that were Agree or Strongly agree (or Yes), across every statement in the area. Not applicable is left out.">
                <Bars
                  rows={Object.keys(AREA_LABEL)
                    .filter((a) => k(a).length)
                    .map((a) => ({ ...matrixOverall(k(a), filtered), label: AREA_LABEL[a] }))}
                />
              </Card>
              <Card title="Teaching quality" subtitle={`“My facilitator…” statements, % agree, weakest first.`}>
                <Bars rows={matrixRows(k("teaching"), filtered)} />
              </Card>
              <Card title="Course & learning" subtitle="Course statements, % agree, weakest first.">
                <Bars rows={matrixRows(k("course"), filtered)} />
              </Card>
              <Card title="Skills students say improved" subtitle="Share of students who ticked each skill (they could pick several).">
                <Bars neutral rows={choiceRows(k("skills"), filtered).sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))} />
              </Card>
              <WeeklyPulse forms={selForms} responses={filtered} />
              <Card title="Responses per week" subtitle="All selected forms, last 10 weeks." className="md:col-span-2">
                <Columns data={perWeek(filtered, 10).map((w) => ({ label: w.label, value: w.items.length }))} />
              </Card>
            </div>
          )}

          {tab === "Operations" && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Card title="Service & staff" subtitle="Staff and office statements, % agree, weakest first.">
                <Bars rows={matrixRows(k("service"), filtered)} />
              </Card>
              <Card title="Campus & facilities" subtitle="Facilities statements, % agree, weakest first.">
                <Bars rows={matrixRows(k("facilities"), filtered)} />
              </Card>
              <Card title="Last time students needed help" subtitle="How their most recent request went.">
                <Bars neutral showCount rows={choiceRows(k("help_sorted"), filtered)} />
              </Card>
              <Card title="If we could upgrade ONE thing" subtitle="Students' single top vote for next term.">
                <Bars neutral showCount rows={choiceRows(k("upgrade"), filtered).sort((a, b) => (b.count ?? 0) - (a.count ?? 0))} />
              </Card>
              <Card title="What got in the way this week" subtitle="Weekly check-in, share of students ticking each (several allowed).">
                <Bars neutral showCount rows={choiceRows(k("blockers"), filtered).sort((a, b) => (b.count ?? 0) - (a.count ?? 0))} />
              </Card>
              <Card title="How students attend" subtitle="Main way of attending classes.">
                <Bars neutral showCount rows={choiceRows(k("attendance"), filtered)} />
              </Card>
            </div>
          )}

          {tab === "Facilitators & programmes" && <People forms={selForms} responses={filtered} formsById={formsById} />}
          {tab === "Compare facilitators" && <Compare forms={selForms} responses={base.filter((r) => program === "all" || keyedValue(formsById, r, "program") === program)} formsById={formsById} options={facilitatorOpts} />}
          {tab === "Student voice" && <Voice forms={selForms} responses={filtered} formsById={formsById} />}
        </div>
      )}
      <p className="muted mt-10 text-center text-xs">
        Cards read questions by their analytics key. Set keys for new forms in the <Link className="underline hover:text-white" to="/admin/forms">form builder</Link>.
      </p>
    </main>
  );
}

function Filter({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="inline-flex items-center gap-2">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-[220px] rounded-lg border-0 bg-white px-3 py-1.5 text-[15px] text-slate-900 focus:outline-none focus:ring-4 focus:ring-white/30"
      >
        {children}
      </select>
    </label>
  );
}

function perWeek(responses: ResponseRow[], weeks: number) {
  const monday = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  };
  const start = monday(new Date());
  return Array.from({ length: weeks }, (_, i) => {
    const from = new Date(start);
    from.setDate(from.getDate() - 7 * (weeks - 1 - i));
    const to = new Date(from);
    to.setDate(to.getDate() + 7);
    return {
      label: from.toLocaleDateString([], { day: "numeric", month: "short" }),
      items: responses.filter((r) => {
        const t = new Date(r.created_at);
        return t >= from && t < to;
      }),
    };
  });
}

function WeeklyPulse({ forms, responses }: { forms: Form[]; responses: ResponseRow[] }) {
  const has = fieldsWithKey(forms, "week_overall").length || fieldsWithKey(forms, "mood").length;
  const weeks = perWeek(responses, 8);
  const key = fieldsWithKey(forms, "week_overall").length ? "week_overall" : "mood";
  return (
    <Card title="Weekly pulse" subtitle={key === "week_overall" ? "Average “How was this week's learning overall?” (1–5) per week." : "Average study mood (1–5) per week."} className="md:col-span-2">
      {has ? (
        <Columns
          format={(v) => v.toFixed(1)}
          data={weeks.map((w) => ({ label: w.label, value: scaleAvg(forms, w.items, key).avg }))}
        />
      ) : (
        <Empty>No weekly questions in the selected forms.</Empty>
      )}
    </Card>
  );
}

interface PeopleProps {
  forms: Form[];
  responses: ResponseRow[];
  formsById: Map<string, Form>;
}

function statsFor(forms: Form[], rs: ResponseRow[]) {
  return {
    n: rs.length,
    rating: scaleAvg(forms, rs, "facilitator_rating").avg,
    teaching: matrixOverall(fieldsWithKey(forms, "teaching"), rs).pct,
    weekly: scaleAvg(forms, rs, "week_overall").avg,
    mood: scaleAvg(forms, rs, "mood").avg,
    nps: npsScore(forms, rs).score,
    again: chooseAgain(forms, rs).pct,
  };
}

function Pct({ v }: { v: number | null }) {
  return <span style={{ color: TONE_COLOR[tone(v)] }} className="font-semibold">{fmtPct(v)}</span>;
}

function People({ forms, responses, formsById }: PeopleProps) {
  const byFac = [...groupBy(responses, (r) => keyedValue(formsById, r, "facilitator")).entries()]
    .map(([name, rs]) => ({ name, ...statsFor(forms, rs) }))
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const byProg = [...groupBy(responses, (r) => keyedValue(formsById, r, "program")).entries()]
    .map(([name, rs]) => ({ name, ...statsFor(forms, rs) }))
    .sort((a, b) => b.n - a.n);
  const th = "px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap";
  const td = "px-3 py-2.5 tabular-nums whitespace-nowrap";
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="Facilitators" subtitle="Sorted by overall rating. Teaching % = agree across all “my facilitator…” statements.">
        {byFac.length ? (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--line)]">
                <tr>
                  <th className={`${th} pl-5`}>Facilitator</th>
                  <th className={th}>Responses</th>
                  <th className={th}>Rating /10</th>
                  <th className={th}>Teaching</th>
                  <th className={`${th} pr-5`}>Weekly /5</th>
                </tr>
              </thead>
              <tbody>
                {byFac.map((f) => (
                  <tr key={f.name} className="border-b border-[var(--line)] last:border-0">
                    <td className={`${td} pl-5 text-white`}>{f.name}</td>
                    <td className={td}>{f.n}</td>
                    <td className={td}>{fmtNum(f.rating)}</td>
                    <td className={td}><Pct v={f.teaching} /></td>
                    <td className={`${td} pr-5`}>{fmtNum(f.weekly)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
      </Card>
      <Card title="Programmes" subtitle="Sorted by number of responses.">
        {byProg.length ? (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--line)]">
                <tr>
                  <th className={`${th} pl-5`}>Programme</th>
                  <th className={th}>Responses</th>
                  <th className={th}>Mood /5</th>
                  <th className={th}>NPS</th>
                  <th className={`${th} pr-5`}>Choose again</th>
                </tr>
              </thead>
              <tbody>
                {byProg.map((p) => (
                  <tr key={p.name} className="border-b border-[var(--line)] last:border-0">
                    <td className="max-w-[280px] px-3 py-2.5 pl-5 text-white">{p.name}</td>
                    <td className={td}>{p.n}</td>
                    <td className={td}>{fmtNum(p.mood)}</td>
                    <td className={td}>{p.nps == null ? "—" : p.nps}</td>
                    <td className={`${td} pr-5`}><Pct v={p.again} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
      </Card>
    </div>
  );
}

function Compare({ forms, responses, formsById, options }: PeopleProps & { options: string[] }) {
  const [picked, setPicked] = useState<string[]>([]);
  useEffect(() => {
    setPicked((p) => (p.length ? p.filter((x) => options.includes(x)) : options.slice(0, 2)));
  }, [options]);
  const groups = picked.map((name) => ({ name, rs: responses.filter((r) => keyedValue(formsById, r, "facilitator") === name) }));
  const statements = [...new Set(fieldsWithKey(forms, "teaching").flatMap((p) => p.field.rows ?? []))];
  const rowsByGroup = groups.map((g) => new Map(matrixRows(fieldsWithKey(forms, "teaching"), g.rs).map((r) => [r.label, r.pct])));
  return (
    <div className="space-y-4">
      <div className="panel flex flex-wrap items-center gap-2 p-4">
        <span className="muted mr-2 text-sm">Pick up to 4 facilitators:</span>
        {options.map((o) => {
          const on = picked.includes(o);
          return (
            <button
              key={o}
              onClick={() => setPicked((p) => (on ? p.filter((x) => x !== o) : p.length < 4 ? [...p, o] : p))}
              className={`rounded-full border px-3 py-1 text-sm transition ${on ? "border-sky-400 bg-sky-400/15 text-white" : "border-[var(--line)] text-slate-400 hover:text-white"}`}
            >
              {o}
            </button>
          );
        })}
        {!options.length && <span className="muted text-sm">No facilitator answers in this selection.</span>}
      </div>
      {groups.length > 0 && (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-[var(--line)]">
              <tr>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Measure</th>
                {groups.map((g) => (
                  <th key={g.name} className="px-3 py-3 text-left font-display text-[13px] font-semibold text-white">
                    {g.name}
                    <span className="muted block text-[11px] font-normal">{g.rs.length} responses</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Overall rating /10", (rs: ResponseRow[]) => fmtNum(scaleAvg(forms, rs, "facilitator_rating").avg)],
                ["Weekly learning /5", (rs: ResponseRow[]) => fmtNum(scaleAvg(forms, rs, "week_overall").avg)],
                ["Weekly confidence /5", (rs: ResponseRow[]) => fmtNum(scaleAvg(forms, rs, "week_confidence").avg)],
              ].map(([label, fn]) => (
                <tr key={label as string} className="border-b border-[var(--line)]">
                  <td className="px-5 py-2.5 text-slate-300">{label as string}</td>
                  {groups.map((g) => (
                    <td key={g.name} className="px-3 py-2.5 font-semibold tabular-nums text-white">
                      {(fn as (rs: ResponseRow[]) => string)(g.rs)}
                    </td>
                  ))}
                </tr>
              ))}
              {statements.map((s) => {
                const vals = rowsByGroup.map((m) => m.get(s) ?? null);
                const best = Math.max(...vals.map((v) => v ?? -1));
                return (
                  <tr key={s} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-5 py-2.5 text-slate-300">{s}</td>
                    {vals.map((v, i) => (
                      <td key={i} className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 overflow-hidden rounded-full bg-white/5">
                            <div className="h-full rounded-full" style={{ width: `${v ?? 0}%`, background: TONE_COLOR[tone(v)] }} />
                          </div>
                          <span className={`tabular-nums ${v != null && v === best && groups.length > 1 ? "font-bold text-white" : "text-slate-300"}`}>{fmtPct(v)}</span>
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Voice({ forms, responses, formsById }: PeopleProps) {
  const [q, setQ] = useState("");
  const textFields = forms.flatMap((form) => allFields(form).filter((f) => f.type === "long_text" || (f.type === "short_text" && f.key !== "one_word")).map((field) => ({ form, field })));
  const [fieldSel, setFieldSel] = useState("all");
  const comments = answersFor(fieldSel === "all" ? textFields : textFields.filter((p) => `${p.form.id}:${p.field.id}` === fieldSel), responses)
    .filter((a) => typeof a.value === "string" && a.value.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.r.created_at.localeCompare(a.r.created_at));
  const words = [...groupBy(answersFor(fieldsWithKey(forms, "one_word"), responses), (a) => String(a.value).trim().toLowerCase().split(/\s+/)[0] || undefined).entries()]
    .map(([w, list]) => ({ w, n: list.length }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 40);
  const maxN = Math.max(1, ...words.map((w) => w.n));
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card title="Experience in one word" subtitle="Most common words students used.">
        {words.length ? (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
            {words.map((w) => (
              <span key={w.w} className="font-display font-semibold text-sky-300" style={{ fontSize: 13 + (w.n / maxN) * 16, opacity: 0.55 + (w.n / maxN) * 0.45 }} title={`${w.n}`}>
                {w.w}
              </span>
            ))}
          </div>
        ) : (
          <Empty />
        )}
      </Card>
      <Card
        title={`Comments (${comments.length})`}
        subtitle="Open answers, newest first. Responses are anonymous."
        className="xl:col-span-2"
        action={
          <div className="flex gap-2">
            <select className="a-input max-w-[200px] py-1.5" value={fieldSel} onChange={(e) => setFieldSel(e.target.value)}>
              <option value="all">All questions</option>
              {textFields.map((p) => (
                <option key={`${p.form.id}:${p.field.id}`} value={`${p.form.id}:${p.field.id}`}>
                  {p.field.label}
                </option>
              ))}
            </select>
            <input className="a-input max-w-[160px] py-1.5" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        }
      >
        {comments.length ? (
          <ul className="max-h-[560px] space-y-2.5 overflow-y-auto pr-1">
            {comments.map((c, i) => (
              <li key={i} className="rounded-lg border border-[var(--line)] bg-[var(--panel-2)] p-3.5">
                <p className="whitespace-pre-line text-[14px] leading-relaxed text-slate-100">{c.value as string}</p>
                <p className="muted mt-2 text-xs">
                  {c.field.label} · {keyedValue(formsById, c.r, "facilitator") ?? "—"} · {new Date(c.r.created_at).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No comments for this selection.</Empty>
        )}
      </Card>
    </div>
  );
}
