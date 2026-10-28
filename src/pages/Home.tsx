import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, ListChecks, Lock, Search } from "lucide-react";
import { api } from "../lib/api";
import type { PublicFormCard } from "../lib/types";
import { Logo } from "../components/Brand";

type Sort = "recommended" | "az" | "quickest";

export default function Home() {
  const [forms, setForms] = useState<PublicFormCard[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState<Sort>("recommended");

  useEffect(() => {
    document.title = "Student feedback · ESOL Premier Campus";
    api.get<PublicFormCard[]>("/api/forms").then(setForms).catch((e) => setError(e.message));
  }, []);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set((forms ?? []).map((f) => f.category).filter(Boolean)))],
    [forms],
  );

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = (forms ?? []).filter(
      (f) =>
        (category === "All" || f.category === category) &&
        (!term || `${f.title} ${f.description} ${f.category}`.toLowerCase().includes(term)),
    );
    if (sort === "az") list.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "quickest") list.sort((a, b) => minutes(a) - minutes(b));
    return list;
  }, [forms, q, category, sort]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="relative overflow-hidden bg-brand-900 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-500/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-accent-500/30 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-5 pb-14 pt-6">
          <div className="flex items-center justify-between">
            <span className="rounded-xl bg-white px-3 py-2 shadow-sm">
              <Logo className="h-8" />
            </span>
          </div>
          <p className="mt-12 text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Student feedback</p>
          <h1 className="mt-2 max-w-2xl font-display text-3xl font-bold leading-tight sm:text-5xl">Help shape your campus</h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-200">
            Pick a form below. Every form is anonymous — we never ask for your name, email or phone number, and results are only
            read as group totals.
          </p>
        </div>
      </header>

      <main className="mx-auto -mt-7 max-w-6xl px-5 pb-20">
        <div className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex sm:items-center sm:gap-3">
          <label className="relative block flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search forms"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-[15px] focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-100"
            />
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-0">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  category === c ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {c}
              </button>
            ))}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              aria-label="Sort forms"
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-4 focus:ring-brand-100"
            >
              <option value="recommended">Recommended</option>
              <option value="quickest">Quickest first</option>
              <option value="az">A–Z</option>
            </select>
          </div>
        </div>

        {error && <p className="mt-10 text-center text-rose-600">Couldn’t load forms: {error}</p>}

        {!forms && !error && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-80 animate-pulse rounded-2xl bg-slate-200/70" />
            ))}
          </div>
        )}

        {forms && shown.length === 0 && (
          <p className="mt-16 text-center text-slate-500">{forms.length ? "No forms match your search." : "No forms are open right now."}</p>
        )}

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((f) => (
            <Link
              key={f.id}
              to={`/f/${f.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
            >
              <div className="relative h-32 bg-brand-800">
                {f.settings.coverUrl && <img src={f.settings.coverUrl} alt="" className="h-full w-full object-cover" />}
                {f.category && (
                  <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-brand-700 shadow-sm">
                    {f.category}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h2 className="font-display text-lg font-semibold leading-snug text-slate-900">{f.title}</h2>
                <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600">{f.description}</p>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> ~{minutes(f)} min
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ListChecks className="h-3.5 w-3.5" /> {f.questionCount} questions
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5" /> Anonymous
                  </span>
                </div>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600">
                  Start form <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} ESOL Premier Campus ·{" "}
        <Link to="/admin" className="hover:text-slate-700 hover:underline">
          Staff sign in
        </Link>
      </footer>
    </div>
  );
}

const minutes = (f: PublicFormCard) => f.settings.estimatedMinutes ?? Math.max(1, Math.round(f.questionCount * 0.4));
