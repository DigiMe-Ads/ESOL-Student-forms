import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, FileDown, Loader2, Pencil, Trash2 } from "lucide-react";
import { api } from "../../lib/api";
import type { Field, Form, ResponseRow, UploadedFile } from "../../lib/types";
import { allFields, answersFor, avg, choiceRows, fmtNum, matrixRows, scaleDistribution } from "../../lib/analytics";
import { Bars, Card, Columns, Empty } from "../../components/admin/Widgets";
import { typeMeta } from "../../lib/fieldTypes";

export default function FormResponses() {
  const { id = "" } = useParams();
  const [form, setForm] = useState<Form | null>(null);
  const [responses, setResponses] = useState<ResponseRow[] | null>(null);
  const [tab, setTab] = useState<"summary" | "individual">("summary");
  const [idx, setIdx] = useState(0);
  const [error, setError] = useState("");

  const load = () =>
    Promise.all([api.get<Form>(`/api/admin/forms/${id}`), api.get<ResponseRow[]>(`/api/admin/responses?formId=${id}`)])
      .then(([f, r]) => {
        setForm(f);
        setResponses(r);
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fields = useMemo(() => (form ? allFields(form).filter((f) => f.type !== "statement") : []), [form]);

  if (error) return <p className="py-20 text-center text-rose-400">{error}</p>;
  if (!form || !responses) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  const removeOne = async (r: ResponseRow) => {
    if (!confirm("Delete this response? This cannot be undone.")) return;
    await api.del(`/api/admin/responses/${r.id}`);
    setIdx((i) => Math.max(0, Math.min(i, responses.length - 2)));
    load();
  };
  const removeAll = async () => {
    if (!confirm(`Delete all ${responses.length} responses to “${form.title}”? This cannot be undone.`)) return;
    await api.del(`/api/admin/forms/${form.id}/responses`);
    load();
  };

  const current = responses[idx];

  return (
    <main className="mx-auto max-w-[1100px] px-4 pb-20 pt-6 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/admin/forms" className="a-btn" title="Back to forms">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-xl font-bold text-white">{form.title}</h1>
          <p className="muted text-sm">{responses.length} responses</p>
        </div>
        <Link to={`/admin/forms/${form.id}/edit`} className="a-btn">
          <Pencil className="h-4 w-4" /> Edit form
        </Link>
        <a href={`/api/admin/forms/${form.id}/export.csv`} className="a-btn">
          <FileDown className="h-4 w-4" /> Export CSV
        </a>
        {responses.length > 0 && (
          <button className="a-btn-danger" onClick={removeAll}>
            <Trash2 className="h-4 w-4" /> Delete all
          </button>
        )}
      </div>

      <div className="mt-5 flex gap-1 border-b border-[var(--line)]">
        {(["summary", "individual"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3.5 py-2.5 text-[15px] capitalize ${tab === t ? "border-sky-400 font-semibold text-white" : "border-transparent text-slate-400 hover:text-white"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {responses.length === 0 ? (
        <div className="panel mt-6 p-10 text-center">
          <p className="text-slate-300">No responses yet.</p>
          <a href={`/f/${form.slug}`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-sky-400 hover:underline">
            Open the form →
          </a>
        </div>
      ) : tab === "summary" ? (
        <div className="mt-6 space-y-4">
          {fields.map((f) => (
            <Card key={f.id} title={f.label} subtitle={`${typeMeta(f.type).label} · ${answersFor([{ form, field: f }], responses).length} answers`}>
              <FieldSummary form={form} field={f} responses={responses} />
            </Card>
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-2">
            <button className="a-btn" disabled={idx === 0} onClick={() => setIdx((i) => i - 1)} aria-label="Newer">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-slate-300">
              Response <b className="text-white">{idx + 1}</b> of {responses.length}
            </span>
            <button className="a-btn" disabled={idx >= responses.length - 1} onClick={() => setIdx((i) => i + 1)} aria-label="Older">
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="muted ml-2 text-sm">Submitted {new Date(current.created_at).toLocaleString()}</span>
            <button className="a-btn-danger ml-auto" onClick={() => removeOne(current)}>
              <Trash2 className="h-4 w-4" /> Delete response
            </button>
          </div>
          <div className="panel mt-4 divide-y divide-[var(--line)]">
            {fields.map((f) => (
              <div key={f.id} className="grid gap-1 px-5 py-3.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-6">
                <p className="text-sm text-slate-400">{f.label}</p>
                <div className="text-[15px] text-white">
                  <AnswerView field={f} value={current.answers[f.id]} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function AnswerView({ field, value }: { field: Field; value: unknown }) {
  if (value === undefined || value === null || value === "") return <span className="text-slate-600">—</span>;
  if (field.type === "matrix") {
    return (
      <ul className="space-y-0.5 text-sm">
        {Object.entries(value as Record<string, string>).map(([r, c]) => (
          <li key={r}>
            <span className="text-slate-400">{r}:</span> {c}
          </li>
        ))}
      </ul>
    );
  }
  if (field.type === "file") {
    return (
      <ul className="space-y-1">
        {(value as UploadedFile[]).map((f) => (
          <li key={f.id}>
            <a className="inline-flex items-center gap-1.5 text-sky-400 hover:underline" href={`/api/admin/files/${f.id}`}>
              <Download className="h-4 w-4" /> {f.name}
            </a>
          </li>
        ))}
      </ul>
    );
  }
  if (Array.isArray(value)) return <>{value.join(", ")}</>;
  return <span className="whitespace-pre-line">{String(value)}</span>;
}

function FieldSummary({ form, field, responses }: { form: Form; field: Field; responses: ResponseRow[] }) {
  const pairs = [{ form, field }];
  const answers = answersFor(pairs, responses);
  const [showAll, setShowAll] = useState(false);
  if (!answers.length) return <Empty />;

  switch (field.type) {
    case "radio":
    case "dropdown":
    case "checkbox":
      return <Bars neutral showCount rows={choiceRows(pairs, responses)} />;
    case "scale":
    case "rating": {
      const vals = answers.map((a) => Number(a.value));
      return (
        <div className="grid items-end gap-6 sm:grid-cols-[140px_1fr]">
          <div>
            <p className="font-display text-4xl font-bold text-white">{fmtNum(avg(vals))}</p>
            <p className="muted text-sm">average of {field.type === "rating" ? field.max ?? 5 : `${field.min ?? 1}–${field.max ?? 5}`}</p>
          </div>
          <Columns data={scaleDistribution(field, vals).map((d) => ({ label: d.label, value: d.count }))} height={100} />
        </div>
      );
    }
    case "matrix": {
      const cols = field.columns ?? [];
      return (
        <div className="space-y-5">
          <Bars rows={matrixRows(pairs, responses)} />
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-y border-[var(--line)]">
                  <th className="px-5 py-2 text-left font-normal text-slate-400">Row</th>
                  {cols.map((c) => (
                    <th key={c} className="px-2 py-2 text-center text-xs font-semibold text-slate-400">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(field.rows ?? []).map((r) => {
                  const counts = cols.map((c) => answers.filter((a) => (a.value as Record<string, string>)[r] === c).length);
                  const total = counts.reduce((a, b) => a + b, 0) || 1;
                  return (
                    <tr key={r} className="border-b border-[var(--line)] last:border-0">
                      <td className="px-5 py-2 text-slate-200">{r}</td>
                      {counts.map((n, i) => (
                        <td key={i} className="px-2 py-2 text-center tabular-nums" style={{ background: `rgba(88,101,242,${(n / total) * 0.55})` }}>
                          {n}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    case "number": {
      const vals = answers.map((a) => Number(a.value));
      return (
        <p className="text-sm text-slate-300">
          Average <b className="text-white">{fmtNum(avg(vals), 2)}</b> · min {Math.min(...vals)} · max {Math.max(...vals)}
        </p>
      );
    }
    default: {
      const list = showAll ? answers : answers.slice(0, 8);
      return (
        <div>
          <ul className="space-y-2">
            {list.map((a, i) => (
              <li key={i} className="rounded-lg bg-[var(--panel-2)] px-3.5 py-2.5 text-[14px] text-slate-100">
                <AnswerView field={field} value={a.value} />
              </li>
            ))}
          </ul>
          {answers.length > 8 && (
            <button className="mt-3 text-sm text-sky-400 hover:underline" onClick={() => setShowAll((s) => !s)}>
              {showAll ? "Show fewer" : `Show all ${answers.length}`}
            </button>
          )}
        </div>
      );
    }
  }
}
