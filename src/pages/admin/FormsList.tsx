import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BarChart3, Copy, ExternalLink, Link2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../../lib/api";
import type { Form, FormStatus } from "../../lib/types";

export const STATUS_STYLE: Record<FormStatus, string> = {
  published: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  draft: "bg-slate-500/15 text-slate-300 ring-slate-500/30",
  closed: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
};

export default function FormsList() {
  const [forms, setForms] = useState<Form[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = () => api.get<Form[]>("/api/admin/forms").then(setForms).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const create = async (duplicateOf?: string) => {
    setBusy(duplicateOf ?? "new");
    try {
      const f = await api.post<Form>("/api/admin/forms", duplicateOf ? { duplicateOf } : {});
      navigate(`/admin/forms/${f.id}/edit`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  };

  const setStatus = async (f: Form, status: FormStatus) => {
    await api.put(`/api/admin/forms/${f.id}`, { status });
    load();
  };

  const remove = async (f: Form) => {
    const n = f.response_count ?? 0;
    if (!confirm(`Delete “${f.title}”${n ? ` and its ${n} response${n === 1 ? "" : "s"}` : ""}? This cannot be undone.`)) return;
    await api.del(`/api/admin/forms/${f.id}`);
    load();
  };

  const copyLink = (f: Form) => {
    navigator.clipboard.writeText(`${location.origin}/f/${f.slug}`);
    setCopied(f.id);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <main className="mx-auto max-w-[1200px] px-4 pb-16 pt-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Forms</h1>
          <p className="muted mt-1 text-sm">Published forms appear as cards on the public page. Drafts and closed forms are hidden.</p>
        </div>
        <button className="a-btn-primary" onClick={() => create()} disabled={busy === "new"}>
          {busy === "new" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} New form
        </button>
      </div>
      {error && <p className="mt-4 text-sm text-rose-400">{error}</p>}
      {!forms ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : forms.length === 0 ? (
        <div className="panel mt-6 p-10 text-center">
          <p className="text-slate-300">No forms yet.</p>
          <button className="a-btn-primary mt-4" onClick={() => create()}>
            <Plus className="h-4 w-4" /> Create your first form
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {forms.map((f) => {
            const questions = f.schema.sections.reduce((n, s) => n + s.fields.filter((x) => x.type !== "statement").length, 0);
            return (
              <div key={f.id} className="panel flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-[#0a1063]">
                    {f.settings.coverUrl && <img src={f.settings.coverUrl} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/admin/forms/${f.id}/edit`} className="truncate font-display font-semibold text-white hover:underline">
                        {f.title}
                      </Link>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ring-1 ${STATUS_STYLE[f.status]}`}>{f.status}</span>
                      {f.category && <span className="muted text-xs">{f.category}</span>}
                    </div>
                    <p className="muted mt-1 text-[13px]">
                      {questions} questions · {f.response_count ?? 0} responses
                      {f.last_response_at ? ` · last ${new Date(f.last_response_at).toLocaleDateString()}` : ""} · /f/{f.slug}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select className="a-input w-auto py-1.5" value={f.status} onChange={(e) => setStatus(f, e.target.value as FormStatus)} aria-label="Status">
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="closed">Closed</option>
                  </select>
                  <Link to={`/admin/forms/${f.id}/edit`} className="a-btn">
                    <Pencil className="h-4 w-4" /> Edit
                  </Link>
                  <Link to={`/admin/forms/${f.id}/responses`} className="a-btn">
                    <BarChart3 className="h-4 w-4" /> Responses
                  </Link>
                  <a href={`/f/${f.slug}`} target="_blank" rel="noreferrer" className="a-btn" title="Open form">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button className="a-btn" onClick={() => copyLink(f)} title="Copy public link">
                    <Link2 className="h-4 w-4" /> {copied === f.id ? "Copied" : ""}
                  </button>
                  <button className="a-btn" onClick={() => create(f.id)} title="Duplicate" disabled={busy === f.id}>
                    {busy === f.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <button className="a-btn-danger" onClick={() => remove(f)} title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
