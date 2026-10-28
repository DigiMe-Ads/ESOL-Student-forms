import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, Loader2 } from "lucide-react";
import { api, ApiError } from "../lib/api";
import type { Answers, Form } from "../lib/types";
import { validateFields } from "../lib/validate";
import { FieldInput } from "../components/FieldInput";
import { Logo } from "../components/Brand";

export default function FormPage() {
  const { slug = "" } = useParams();
  const [form, setForm] = useState<Form | null>(null);
  const [loadError, setLoadError] = useState("");
  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get<Form>(`/api/forms/${slug}`)
      .then((f) => {
        setForm(f);
        document.title = `${f.title} · ESOL Premier Campus`;
      })
      .catch((e: ApiError) => setLoadError(e.status === 404 ? "This form doesn’t exist or isn’t open right now." : e.message));
  }, [slug]);

  const sections = useMemo(() => (form?.schema.sections ?? []).filter((s) => s.fields.length || s.title), [form]);
  const paginate = !!form?.settings.paginate && sections.length > 1;
  const visible = paginate ? [sections[page]] : sections;
  const isLast = !paginate || page === sections.length - 1;

  const setAnswer = (id: string, v: unknown) => {
    setAnswers((a) => ({ ...a, [id]: v }));
    if (errors[id]) setErrors(({ [id]: _, ...rest }) => rest);
  };

  const focusFirstError = (errs: Record<string, string>) => {
    const id = Object.keys(errs)[0];
    document.querySelector(`[data-field="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const next = () => {
    const errs = validateFields(visible.flatMap((s) => s.fields), answers);
    setErrors(errs);
    if (Object.keys(errs).length) return focusFirstError(errs);
    setPage((p) => p + 1);
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!isLast) return next();
    const errs = validateFields(sections.flatMap((s) => s.fields), answers);
    setErrors(errs);
    if (Object.keys(errs).length) {
      if (paginate) setPage(sections.findIndex((s) => s.fields.some((f) => errs[f.id])));
      setTimeout(() => focusFirstError(errs), 50);
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      await api.post(`/api/forms/${slug}/responses`, { answers });
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const ae = err as ApiError;
      if (ae.fields) {
        setErrors(ae.fields);
        focusFirstError(ae.fields);
      }
      setSubmitError(ae.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <Shell>
        <div className="py-24 text-center">
          <h1 className="font-display text-2xl font-semibold text-slate-900">Form unavailable</h1>
          <p className="mt-2 text-slate-600">{loadError}</p>
          <Link to="/" className="mt-6 inline-flex items-center gap-2 font-medium text-brand-600 hover:underline">
            <ArrowLeft className="h-4 w-4" /> All forms
          </Link>
        </div>
      </Shell>
    );
  }
  if (!form) {
    return (
      <Shell>
        <div className="grid place-items-center py-32">
          <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
        </div>
      </Shell>
    );
  }

  const accent = form.settings.accentColor || "#1c2599";
  const cover = form.settings.coverUrl;

  return (
    <div className="form-theme min-h-screen bg-white" style={{ ["--accent" as string]: accent }}>
      {form.status !== "published" && (
        <div className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900">
          <Eye className="h-4 w-4" /> Admin preview — this form is {form.status} and not visible to students.
        </div>
      )}
      <div ref={topRef} className="relative">
        {cover ? (
          <img src={cover} alt="" className="h-36 w-full object-cover sm:h-48" />
        ) : (
          <div className="h-28 w-full sm:h-36" style={{ background: `linear-gradient(120deg, ${accent}, #050a4a)` }} />
        )}
        <div className="mx-auto max-w-2xl px-5">
          <div className="relative z-10 -mt-11 grid h-[88px] w-[88px] place-items-center overflow-hidden rounded-full border-4 border-white bg-white shadow-md">
            <Logo className="h-auto w-[72px]" />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-5 pb-20">
        {done ? (
          <div className="py-16 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
            <h1 className="mt-4 font-display text-3xl font-bold text-slate-900">{form.settings.successTitle || "Thank you!"}</h1>
            <p className="mx-auto mt-3 max-w-md text-slate-600">{form.settings.successMessage || "Your response has been recorded."}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setAnswers({});
                  setPage(0);
                  setDone(false);
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Submit another response
              </button>
              <Link to="/" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                Back to all forms
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <header className="pb-2 pt-8">
              <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-[40px]">{form.title}</h1>
              {form.description && (
                <div className="mt-5 space-y-3 text-[15px] leading-relaxed text-slate-700">
                  {form.description.split(/\n{2,}/).map((p, i) => (
                    <p key={i} className="whitespace-pre-line">
                      {p}
                    </p>
                  ))}
                </div>
              )}
            </header>

            {paginate && (
              <div className="mt-6">
                <div className="flex justify-between text-xs font-medium text-slate-500">
                  <span>
                    Step {page + 1} of {sections.length}
                  </span>
                  <span>{Math.round(((page + 1) / sections.length) * 100)}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${((page + 1) / sections.length) * 100}%` }} />
                </div>
              </div>
            )}

            {visible.map((s) => (
              <section key={s.id} className="mt-10">
                {(s.title || s.description) && (
                  <div className="mb-6">
                    {s.title && <h2 className="font-display text-2xl font-bold text-slate-900">{s.title}</h2>}
                    {s.description && <p className="mt-2 whitespace-pre-line text-[15px] text-slate-600">{s.description}</p>}
                  </div>
                )}
                <div className="space-y-9">
                  {s.fields.map((f) => (
                    <FieldInput
                      key={f.id}
                      field={f}
                      value={answers[f.id]}
                      onChange={(v) => setAnswer(f.id, v)}
                      error={errors[f.id]}
                      formSlug={slug}
                    />
                  ))}
                </div>
              </section>
            ))}

            {submitError && (
              <p className="mt-8 rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{submitError}</p>
            )}

            <div className="mt-10 flex items-center gap-3">
              {paginate && page > 0 && (
                <button
                  type="button"
                  onClick={() => setPage((p) => p - 1)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-[15px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 font-display text-[15px] font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLast ? form.settings.submitLabel || "Submit" : "Next"}
                {!submitting && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-5">{children}</div>
    </div>
  );
}
