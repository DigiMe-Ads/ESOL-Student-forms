import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useBlocker, useParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BarChart3,
  Copy,
  ExternalLink,
  ImagePlus,
  Loader2,
  Plus,
  Rows3,
  Save,
  Trash2,
} from "lucide-react";
import { api } from "../../lib/api";
import type { Field, FieldType, Form, FormStatus, Section } from "../../lib/types";
import { FIELD_TYPES, newField, newId, typeMeta } from "../../lib/fieldTypes";
import FieldEditor, { Labeled, Toggle } from "../../components/admin/FieldEditor";
import { FieldInput } from "../../components/FieldInput";
import { STATUS_STYLE } from "./FormsList";

type Loc = { s: number; f: number };

export default function FormBuilder() {
  const { id } = useParams();
  const [form, setForm] = useState<Form | null>(null);
  const [saved, setSaved] = useState<string>("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"questions" | "settings">("questions");
  const [active, setActive] = useState<string | null>(null);
  const [adding, setAdding] = useState<number | null>(null);
  const [responseCount, setResponseCount] = useState(0);

  useEffect(() => {
    api
      .get<Form>(`/api/admin/forms/${id}`)
      .then((f) => {
        setForm(f);
        setSaved(JSON.stringify(f));
      })
      .catch((e) => setError(e.message));
    api.get<Form[]>("/api/admin/forms").then((all) => setResponseCount(all.find((f) => f.id === id)?.response_count ?? 0));
  }, [id]);

  const dirty = !!form && JSON.stringify(form) !== saved;
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (blocker.state === "blocked") {
      if (confirm("You have unsaved changes. Leave without saving?")) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker]);
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const save = useCallback(async () => {
    if (!form) return;
    const fields = form.schema.sections.flatMap((s) => s.fields);
    const bad = fields.find(
      (f) =>
        (f.type !== "statement" && !f.label.trim()) ||
        ((f.type === "radio" || f.type === "checkbox" || f.type === "dropdown") && !(f.options ?? []).filter(Boolean).length) ||
        (f.type === "matrix" && (!(f.rows ?? []).length || !(f.columns ?? []).length)),
    );
    if (bad) {
      setError(`“${bad.label || "Untitled"}” needs a question and at least one option/row/column.`);
      setActive(bad.id);
      setTab("questions");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const clean = {
        ...form,
        schema: {
          sections: form.schema.sections.map((s) => ({
            ...s,
            fields: s.fields.map((f) => ({
              ...f,
              options: f.options?.map((o) => o.trim()).filter(Boolean),
              rows: f.rows?.map((o) => o.trim()).filter(Boolean),
              columns: f.columns?.map((o) => o.trim()).filter(Boolean),
            })),
          })),
        },
      };
      const out = await api.put<Form>(`/api/admin/forms/${form.id}`, clean);
      setForm(out);
      setSaved(JSON.stringify(out));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [form]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [save]);

  if (!form) {
    return <div className="grid place-items-center py-24">{error ? <p className="text-rose-400">{error}</p> : <Loader2 className="h-6 w-6 animate-spin text-slate-500" />}</div>;
  }

  const sections = form.schema.sections;
  const setSections = (fn: (s: Section[]) => Section[]) => setForm((f) => (f ? { ...f, schema: { sections: fn(f.schema.sections) } } : f));
  const patch = (p: Partial<Form>) => setForm((f) => (f ? { ...f, ...p } : f));
  const patchSettings = (p: Partial<Form["settings"]>) => setForm((f) => (f ? { ...f, settings: { ...f.settings, ...p } } : f));

  const updateField = (loc: Loc, field: Field) =>
    setSections((ss) => ss.map((s, i) => (i === loc.s ? { ...s, fields: s.fields.map((f, j) => (j === loc.f ? field : f)) } : s)));

  const addField = (si: number, type: FieldType) => {
    const f = newField(type);
    setSections((ss) => ss.map((s, i) => (i === si ? { ...s, fields: [...s.fields, f] } : s)));
    setActive(f.id);
    setAdding(null);
    setTimeout(() => document.getElementById(`field-${f.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  const removeField = (loc: Loc) => setSections((ss) => ss.map((s, i) => (i === loc.s ? { ...s, fields: s.fields.filter((_, j) => j !== loc.f) } : s)));

  const duplicateField = (loc: Loc) => {
    const src = sections[loc.s].fields[loc.f];
    const copy = { ...structuredClone(src), id: newId(), key: undefined, label: `${src.label} (copy)` };
    setSections((ss) => ss.map((s, i) => (i === loc.s ? { ...s, fields: [...s.fields.slice(0, loc.f + 1), copy, ...s.fields.slice(loc.f + 1)] } : s)));
    setActive(copy.id);
  };

  // Moves within a section, or across into the neighbouring section at its edge.
  const moveField = (loc: Loc, dir: -1 | 1) =>
    setSections((ss) => {
      const n = ss.map((s) => ({ ...s, fields: [...s.fields] }));
      const list = n[loc.s].fields;
      const target = loc.f + dir;
      if (target >= 0 && target < list.length) {
        [list[loc.f], list[target]] = [list[target], list[loc.f]];
      } else if (n[loc.s + dir]) {
        const [f] = list.splice(loc.f, 1);
        if (dir === -1) n[loc.s - 1].fields.push(f);
        else n[loc.s + 1].fields.unshift(f);
      }
      return n;
    });

  const addSection = (after: number) => {
    const s: Section = { id: newId("s"), title: "New section", description: "", fields: [] };
    setSections((ss) => [...ss.slice(0, after + 1), s, ...ss.slice(after + 1)]);
  };
  const moveSection = (i: number, d: number) =>
    setSections((ss) => {
      const n = [...ss];
      [n[i], n[i + d]] = [n[i + d], n[i]];
      return n;
    });
  const removeSection = (i: number) => {
    const s = sections[i];
    if (s.fields.length && !confirm(`Delete section “${s.title || "Untitled"}” and its ${s.fields.length} question(s)?`)) return;
    setSections((ss) => (ss.length > 1 ? ss.filter((_, j) => j !== i) : [{ ...ss[0], title: "", fields: [] }]));
  };

  const uploadCover = async (file?: File) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("formId", form.id);
    fd.append("file", file);
    try {
      const { url } = await api.post<{ url: string }>("/api/admin/images", fd);
      patchSettings({ coverUrl: url });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const questionNo = new Map<string, number>();
  let qn = 0;
  for (const s of sections) for (const f of s.fields) if (f.type !== "statement") questionNo.set(f.id, ++qn);

  return (
    <div>
      <div className="sticky top-[53px] z-20 border-b border-[var(--line)] bg-[#0d0d10]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center gap-2 px-4 py-2.5 sm:px-6">
          <Link to="/admin/forms" className="a-btn" title="Back to forms">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display font-semibold text-white">{form.title || "Untitled form"}</p>
            <p className="muted text-xs">{dirty ? "Unsaved changes" : "All changes saved"}</p>
          </div>
          <select
            className={`a-input w-auto py-1.5 font-semibold capitalize ring-1 ${STATUS_STYLE[form.status]}`}
            value={form.status}
            onChange={(e) => patch({ status: e.target.value as FormStatus })}
            aria-label="Status"
          >
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="closed">Closed</option>
          </select>
          <Link to={`/admin/forms/${form.id}/responses`} className="a-btn" title="Responses">
            <BarChart3 className="h-4 w-4" />
          </Link>
          <a href={`/f/${form.slug}`} target="_blank" rel="noreferrer" className="a-btn" title={dirty ? "Save first to preview your latest changes" : "Preview"}>
            <ExternalLink className="h-4 w-4" /> <span className="hidden sm:inline">Preview</span>
          </a>
          <button className="a-btn-primary" onClick={save} disabled={saving || !dirty}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </button>
        </div>
        <div className="mx-auto flex max-w-[1100px] gap-1 px-4 sm:px-6">
          {(["questions", "settings"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`border-b-2 px-3 py-2 text-sm capitalize ${tab === t ? "border-sky-400 font-semibold text-white" : "border-transparent text-slate-400 hover:text-white"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-[1100px] px-4 pb-24 pt-6 sm:px-6">
        {error && <p className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{error}</p>}
        {responseCount > 0 && tab === "questions" && (
          <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
            This form already has {responseCount} responses. Renaming options or rows, or deleting questions, changes how existing answers show up in reports.
          </p>
        )}

        {tab === "settings" ? (
          <SettingsPanel form={form} patch={patch} patchSettings={patchSettings} uploadCover={uploadCover} />
        ) : (
          <div className="space-y-6">
            <div className="panel overflow-hidden">
              <div className="h-2" style={{ background: form.settings.accentColor || "#3b49df" }} />
              <div className="space-y-3 p-5">
                <input
                  className="w-full bg-transparent font-display text-2xl font-bold text-white outline-none placeholder:text-slate-600"
                  value={form.title}
                  placeholder="Form title"
                  onChange={(e) => patch({ title: e.target.value })}
                />
                <textarea
                  rows={3}
                  className="a-input resize-y"
                  value={form.description}
                  placeholder="Form description"
                  onChange={(e) => patch({ description: e.target.value })}
                />
              </div>
            </div>

            {sections.map((s, si) => (
              <div key={s.id} className="space-y-3">
                <div className="panel border-l-4 p-4" style={{ borderLeftColor: "#5865f2" }}>
                  <div className="flex items-center gap-2">
                    <Rows3 className="h-4 w-4 text-slate-500" />
                    <span className="muted text-xs font-semibold uppercase tracking-wide">
                      Section {si + 1} of {sections.length}
                    </span>
                    <div className="ml-auto flex gap-1">
                      <IconBtn label="Move section up" disabled={si === 0} onClick={() => moveSection(si, -1)}>
                        <ArrowUp className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn label="Move section down" disabled={si === sections.length - 1} onClick={() => moveSection(si, 1)}>
                        <ArrowDown className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn label="Delete section" danger onClick={() => removeSection(si)}>
                        <Trash2 className="h-4 w-4" />
                      </IconBtn>
                    </div>
                  </div>
                  <input
                    className="mt-2 w-full bg-transparent font-display text-lg font-semibold text-white outline-none placeholder:text-slate-600"
                    value={s.title}
                    placeholder="Section title (optional)"
                    onChange={(e) => setSections((ss) => ss.map((x, i) => (i === si ? { ...x, title: e.target.value } : x)))}
                  />
                  <input
                    className="mt-1 w-full bg-transparent text-sm text-slate-300 outline-none placeholder:text-slate-600"
                    value={s.description ?? ""}
                    placeholder="Section description (optional)"
                    onChange={(e) => setSections((ss) => ss.map((x, i) => (i === si ? { ...x, description: e.target.value } : x)))}
                  />
                </div>

                {s.fields.map((f, fi) => {
                  const loc = { s: si, f: fi };
                  const meta = typeMeta(f.type);
                  const open = active === f.id;
                  return (
                    <div
                      key={f.id}
                      id={`field-${f.id}`}
                      className={`panel transition ${open ? "ring-2 ring-[#5865f2]" : "hover:border-slate-600"}`}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setActive(open ? null : f.id)}
                        onKeyDown={(e) => e.key === "Enter" && e.target === e.currentTarget && setActive(open ? null : f.id)}
                        className="flex cursor-pointer items-center gap-3 px-4 py-3"
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-slate-300">
                          <meta.icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-medium text-white">
                            {questionNo.get(f.id) ? <span className="mr-1.5 text-slate-500">{questionNo.get(f.id)}.</span> : null}
                            {f.label || <span className="text-slate-500">Untitled</span>}
                            {f.required && <span className="ml-1 text-rose-400">*</span>}
                          </p>
                          <p className="muted text-xs">
                            {meta.label}
                            {f.key ? ` · dashboard: ${f.key}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-0.5" onClick={(e) => e.stopPropagation()}>
                          <IconBtn label="Move up" disabled={si === 0 && fi === 0} onClick={() => moveField(loc, -1)}>
                            <ArrowUp className="h-4 w-4" />
                          </IconBtn>
                          <IconBtn label="Move down" disabled={si === sections.length - 1 && fi === s.fields.length - 1} onClick={() => moveField(loc, 1)}>
                            <ArrowDown className="h-4 w-4" />
                          </IconBtn>
                          <IconBtn label="Duplicate" onClick={() => duplicateField(loc)}>
                            <Copy className="h-4 w-4" />
                          </IconBtn>
                          <IconBtn label="Delete question" danger onClick={() => removeField(loc)}>
                            <Trash2 className="h-4 w-4" />
                          </IconBtn>
                        </div>
                      </div>
                      {open && (
                        <div className="grid gap-6 border-t border-[var(--line)] p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                          <div>
                            <FieldEditor field={f} onChange={(nf) => updateField(loc, nf)} />
                            {f.type !== "statement" && (
                              <div className="mt-5 border-t border-[var(--line)] pt-4">
                                <Toggle checked={!!f.required} onChange={(v) => updateField(loc, { ...f, required: v })} label="Required" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Preview</p>
                            <div className="form-theme rounded-xl bg-white p-5 text-slate-900" style={{ ["--accent" as string]: form.settings.accentColor || "#1c2599" }}>
                              <PreviewField field={f} slug={form.slug} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="flex flex-wrap gap-2">
                  <button className="a-btn border-dashed" onClick={() => setAdding(adding === si ? null : si)}>
                    <Plus className="h-4 w-4" /> Add question
                  </button>
                  <button className="a-btn border-dashed" onClick={() => addSection(si)}>
                    <Rows3 className="h-4 w-4" /> Add section below
                  </button>
                </div>
                {adding === si && (
                  <div className="panel grid grid-cols-2 gap-1.5 p-3 sm:grid-cols-3 lg:grid-cols-5">
                    {FIELD_TYPES.map((t) => (
                      <button key={t.type} onClick={() => addField(si, t.type)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-slate-200 transition hover:bg-white/5">
                        <t.icon className="h-4 w-4 text-sky-400" /> {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function PreviewField({ field, slug }: { field: Field; slug: string }) {
  const [v, setV] = useState<unknown>(undefined);
  const prevType = useRef(field.type);
  useEffect(() => {
    if (prevType.current !== field.type) setV(undefined);
    prevType.current = field.type;
  }, [field.type]);
  return <FieldInput field={field} value={v} onChange={setV} formSlug={slug} />;
}

function IconBtn({ children, label, onClick, disabled, danger }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md p-1.5 transition disabled:opacity-25 ${danger ? "text-slate-400 hover:bg-rose-500/10 hover:text-rose-400" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
    >
      {children}
    </button>
  );
}

const PRESET_COVERS = ["/covers/evaluation.jpg", "/covers/weekly.jpg"];

function SettingsPanel({
  form,
  patch,
  patchSettings,
  uploadCover,
}: {
  form: Form;
  patch: (p: Partial<Form>) => void;
  patchSettings: (p: Partial<Form["settings"]>) => void;
  uploadCover: (f?: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const s = form.settings;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="panel space-y-4 p-5">
        <h2 className="font-display font-semibold text-white">General</h2>
        <Labeled label="Title">
          <input className="a-input" value={form.title} onChange={(e) => patch({ title: e.target.value })} />
        </Labeled>
        <Labeled label="Description">
          <textarea rows={4} className="a-input" value={form.description} onChange={(e) => patch({ description: e.target.value })} />
        </Labeled>
        <div className="grid gap-4 sm:grid-cols-2">
          <Labeled label="Category" hint="Shown as a filter on the public page">
            <input className="a-input" value={form.category} list="categories" onChange={(e) => patch({ category: e.target.value })} />
            <datalist id="categories">
              <option value="Evaluation" />
              <option value="Weekly check-in" />
              <option value="Survey" />
              <option value="Application" />
            </datalist>
          </Labeled>
          <Labeled label="Link" hint={`${location.origin}/f/${form.slug}`}>
            <input className="a-input" value={form.slug} onChange={(e) => patch({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} />
          </Labeled>
          <Labeled label="Minutes to complete">
            <input type="number" min={1} className="a-input" value={s.estimatedMinutes ?? ""} onChange={(e) => patchSettings({ estimatedMinutes: e.target.value ? Number(e.target.value) : undefined })} />
          </Labeled>
          <Labeled label="Order on public page" hint="Lower numbers show first">
            <input type="number" className="a-input" value={form.sort_order ?? 0} onChange={(e) => patch({ sort_order: Number(e.target.value) || 0 })} />
          </Labeled>
        </div>
        <Toggle checked={!!s.paginate} onChange={(v) => patchSettings({ paginate: v })} label="Show each section on its own page (with Next / Back and a progress bar)" />
      </section>

      <section className="panel space-y-4 p-5">
        <h2 className="font-display font-semibold text-white">Look</h2>
        <Labeled label="Cover image">
          <div className="overflow-hidden rounded-lg border border-[var(--line)]">
            {s.coverUrl ? <img src={s.coverUrl} alt="" className="h-24 w-full object-cover" /> : <div className="grid h-24 place-items-center text-sm text-slate-500">No cover</div>}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="a-btn" onClick={() => fileRef.current?.click()}>
              <ImagePlus className="h-4 w-4" /> Upload
            </button>
            {PRESET_COVERS.map((c) => (
              <button key={c} type="button" onClick={() => patchSettings({ coverUrl: c })} className={`h-9 w-16 overflow-hidden rounded-md ring-2 ${s.coverUrl === c ? "ring-sky-400" : "ring-transparent"}`}>
                <img src={c} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
            {s.coverUrl && (
              <button type="button" className="a-btn" onClick={() => patchSettings({ coverUrl: undefined })}>
                Remove
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" hidden accept="image/*" onChange={(e) => uploadCover(e.target.files?.[0])} />
        </Labeled>
        <Labeled label="Accent colour" hint="Buttons, selected answers and progress bar">
          <div className="flex items-center gap-2">
            <input type="color" className="h-9 w-12 cursor-pointer rounded border border-[var(--line)] bg-transparent" value={s.accentColor || "#1c2599"} onChange={(e) => patchSettings({ accentColor: e.target.value })} />
            {["#1c2599", "#6a4bc4", "#111111", "#0f766e", "#be123c"].map((c) => (
              <button key={c} type="button" aria-label={c} onClick={() => patchSettings({ accentColor: c })} className="h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-[#17171b]" style={{ background: c, ["--tw-ring-color" as string]: s.accentColor === c ? "#38bdf8" : "transparent" }} />
            ))}
          </div>
        </Labeled>
        <Labeled label="Submit button text">
          <input className="a-input" value={s.submitLabel ?? ""} placeholder="Submit" onChange={(e) => patchSettings({ submitLabel: e.target.value })} />
        </Labeled>
        <Labeled label="Thank-you heading">
          <input className="a-input" value={s.successTitle ?? ""} placeholder="Thank you!" onChange={(e) => patchSettings({ successTitle: e.target.value })} />
        </Labeled>
        <Labeled label="Thank-you message">
          <textarea rows={2} className="a-input" value={s.successMessage ?? ""} onChange={(e) => patchSettings({ successMessage: e.target.value })} />
        </Labeled>
      </section>
    </div>
  );
}
