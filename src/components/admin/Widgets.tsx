import type { ReactNode } from "react";
import { type BarRow, fmtPct, tone, TONE_COLOR } from "../../lib/analytics";

export function Card({ title, subtitle, children, className = "", action }: { title: string; subtitle?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={`panel flex flex-col p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-[15px] font-semibold text-white">{title}</h3>
          {subtitle && <p className="muted mt-1 text-[13px] leading-snug">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4 flex-1">{children}</div>
    </section>
  );
}

export function Kpi({ label, value, suffix, hint, accent }: { label: string; value: string; suffix?: string; hint: ReactNode; accent?: string }) {
  return (
    <div className="panel p-4 sm:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">{label}</p>
      <p className="mt-2 font-display text-[28px] font-bold leading-none" style={{ color: accent ?? "white" }}>
        {value}
        {suffix && <span className="ml-1 text-base font-medium text-slate-400">{suffix}</span>}
      </p>
      <p className="muted mt-2 text-[12.5px] leading-snug">{hint}</p>
    </div>
  );
}

export function Empty({ children = "No answers yet for this selection." }: { children?: ReactNode }) {
  return <p className="muted py-6 text-center text-sm">{children}</p>;
}

/** Horizontal % bars, coloured by the 80/60 thresholds unless `neutral`. */
export function Bars({ rows, neutral, showCount }: { rows: BarRow[]; neutral?: boolean; showCount?: boolean }) {
  if (!rows.length || rows.every((r) => !r.n)) return <Empty />;
  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const color = neutral ? "#5865f2" : TONE_COLOR[tone(r.pct)];
        return (
          <li key={r.label}>
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="text-slate-200">{r.label}</span>
              <span className="shrink-0 tabular-nums text-slate-400">
                {showCount && r.count != null && <span className="mr-2 text-slate-500">{r.count}</span>}
                <span className="font-semibold text-white">{fmtPct(r.pct)}</span>
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${r.pct ?? 0}%`, background: color }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-slate-400">
      {[
        ["var(--good)", "80% or more agree"],
        ["var(--mid)", "60–79%"],
        ["var(--bad)", "Below 60%: act on this"],
      ].map(([c, l]) => (
        <span key={l} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} /> {l}
        </span>
      ))}
    </div>
  );
}

/** Simple column chart for counts over time or score distributions. */
export function Columns({ data, height = 120, format }: { data: { label: string; value: number | null; sub?: string }[]; height?: number; format?: (v: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value ?? 0));
  if (!data.length) return <Empty />;
  return (
    <div className="flex items-end gap-1.5" style={{ height: height + 34 }}>
      {data.map((d, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1" title={d.sub}>
          <span className="text-[11px] tabular-nums text-slate-300">{d.value == null ? "" : format ? format(d.value) : d.value}</span>
          <div className="w-full max-w-[38px] rounded-t-md bg-[#5865f2]" style={{ height: `${((d.value ?? 0) / max) * height}px`, minHeight: d.value ? 3 : 0 }} />
          <span className="w-full truncate text-center text-[10.5px] text-slate-500">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
