import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { ANALYTICS_KEYS } from "../../lib/analytics";
import { changeType, FIELD_TYPES } from "../../lib/fieldTypes";
import type { Field, FieldType } from "../../lib/types";

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer select-none items-center gap-2 text-sm text-slate-300">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-[#3b49df]" : "bg-white/15"}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
      {label}
    </label>
  );
}

export function Labeled({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      {children}
      {hint && <span className="muted mt-1 block text-xs">{hint}</span>}
    </label>
  );
}

/** Editable list of strings (choice options, grid rows/columns) with reorder, delete and bulk paste. */
export function ListEditor({ items, onChange, noun, prefix }: { items: string[]; onChange: (v: string[]) => void; noun: string; prefix?: (i: number) => React.ReactNode }) {
  const [bulk, setBulk] = useState<string | null>(null);
  const set = (i: number, v: string) => onChange(items.map((x, j) => (j === i ? v : x)));
  const move = (i: number, d: number) => {
    const n = [...items];
    [n[i], n[i + d]] = [n[i + d], n[i]];
    onChange(n);
  };
  if (bulk !== null) {
    return (
      <div>
        <textarea className="a-input min-h-[160px] font-mono text-[13px]" value={bulk} onChange={(e) => setBulk(e.target.value)} />
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="a-btn-primary"
            onClick={() => {
              onChange([...new Set(bulk.split("\n").map((s) => s.trim()).filter(Boolean))]);
              setBulk(null);
            }}
          >
            Apply
          </button>
          <button type="button" className="a-btn" onClick={() => setBulk(null)}>
            Cancel
          </button>
        </div>
        <p className="muted mt-1 text-xs">One {noun} per line.</p>
      </div>
    );
  }
  const dupes = items.filter((x, i) => items.indexOf(x) !== i);
  return (
    <div className="space-y-1.5">
      {items.map((it, i) => (
        <div key={i} className="group flex items-center gap-1.5">
          {prefix && <span className="w-6 shrink-0 text-center text-xs text-slate-500">{prefix(i)}</span>}
          <input
            className={`a-input py-1.5 ${dupes.includes(it) ? "border-rose-500" : ""}`}
            value={it}
            onChange={(e) => set(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const n = [...items];
                n.splice(i + 1, 0, "");
                onChange(n);
                setTimeout(() => (document.activeElement?.parentElement?.nextElementSibling?.querySelector("input") as HTMLInputElement | null)?.focus());
              }
            }}
          />
          <button type="button" className="rounded p-1 text-slate-500 hover:text-white disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button type="button" className="rounded p-1 text-slate-500 hover:text-white disabled:opacity-30" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button type="button" className="rounded p-1 text-slate-500 hover:text-rose-400" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      {dupes.length > 0 && <p className="text-xs text-rose-400">Each {noun} must be unique.</p>}
      <div className="flex gap-3 pt-1 text-sm">
        <button type="button" className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300" onClick={() => onChange([...items, `${noun[0].toUpperCase()}${noun.slice(1)} ${items.length + 1}`])}>
          <Plus className="h-4 w-4" /> Add {noun}
        </button>
        <button type="button" className="text-slate-400 hover:text-white" onClick={() => setBulk(items.join("\n"))}>
          Bulk edit
        </button>
      </div>
    </div>
  );
}

function Chips({ all, selected, onChange }: { all: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {all.map((c) => {
        const on = selected.includes(c);
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(on ? selected.filter((x) => x !== c) : [...selected, c])}
            className={`rounded-full border px-2.5 py-1 text-xs transition ${on ? "border-sky-400 bg-sky-400/15 text-white" : "border-[var(--line)] text-slate-400 hover:text-white"}`}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}

const ACCEPT_PRESETS = [
  { v: "", l: "Any file" },
  { v: "image/*", l: "Images" },
  { v: ".pdf", l: "PDF" },
  { v: ".pdf,.doc,.docx", l: "Documents (PDF, Word)" },
  { v: "image/*,.pdf", l: "Images or PDF" },
  { v: "audio/*,video/*", l: "Audio / video" },
];

export default function FieldEditor({ field, onChange }: { field: Field; onChange: (f: Field) => void }) {
  const set = <K extends keyof Field>(k: K, v: Field[K]) => onChange({ ...field, [k]: v });
  const keyOptions = ANALYTICS_KEYS.filter((k) => k.types.includes(field.type));
  const isChoice = field.type === "radio" || field.type === "checkbox" || field.type === "dropdown";

  return (
    <div className="space-y-5">
      <div className="grid gap-4">
        <Labeled label={field.type === "statement" ? "Heading" : "Question"}>
          <textarea
            rows={2}
            className="a-input resize-y text-[15px] font-medium"
            value={field.label}
            placeholder="Question"
            onChange={(e) => set("label", e.target.value)}
          />
        </Labeled>
        <Labeled label="Type">
          <select className="a-input" value={field.type} onChange={(e) => onChange(changeType(field, e.target.value as FieldType))}>
            {FIELD_TYPES.map((t) => (
              <option key={t.type} value={t.type}>
                {t.label}
              </option>
            ))}
          </select>
        </Labeled>
      </div>

      <Labeled label={field.type === "statement" ? "Text" : "Description (optional)"}>
        <textarea rows={2} className="a-input resize-y" value={field.description ?? ""} onChange={(e) => set("description", e.target.value || undefined)} />
      </Labeled>

      {["short_text", "long_text", "email", "phone", "number", "dropdown"].includes(field.type) && (
        <Labeled label="Placeholder">
          <input className="a-input" value={field.placeholder ?? ""} onChange={(e) => set("placeholder", e.target.value || undefined)} />
        </Labeled>
      )}

      {field.type === "number" && (
        <div className="grid grid-cols-2 gap-4">
          <Labeled label="Minimum">
            <input type="number" className="a-input" value={field.min ?? ""} onChange={(e) => set("min", e.target.value === "" ? undefined : Number(e.target.value))} />
          </Labeled>
          <Labeled label="Maximum">
            <input type="number" className="a-input" value={field.max ?? ""} onChange={(e) => set("max", e.target.value === "" ? undefined : Number(e.target.value))} />
          </Labeled>
        </div>
      )}

      {isChoice && (
        <div className="space-y-3">
          <Labeled label="Options">
            <ListEditor
              items={field.options ?? []}
              onChange={(v) => set("options", v)}
              noun="option"
              prefix={field.display === "cards" ? (i) => String.fromCharCode(65 + (i % 26)) : undefined}
            />
          </Labeled>
          <div className="flex flex-wrap gap-5">
            <Toggle checked={!!field.allowOther} onChange={(v) => set("allowOther", v || undefined)} label="Add “Other” with a text box" />
            {field.type === "radio" && (
              <Toggle checked={field.display === "cards"} onChange={(v) => set("display", v ? "cards" : "list")} label="Show as lettered cards" />
            )}
          </div>
        </div>
      )}

      {field.type === "scale" && (
        <div className="grid grid-cols-2 gap-4">
          <Labeled label="From">
            <select className="a-input" value={field.min ?? 1} onChange={(e) => set("min", Number(e.target.value))}>
              <option value={0}>0</option>
              <option value={1}>1</option>
            </select>
          </Labeled>
          <Labeled label="To">
            <select className="a-input" value={field.max ?? 5} onChange={(e) => set("max", Number(e.target.value))}>
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </Labeled>
          <Labeled label="Low label">
            <input className="a-input" value={field.minLabel ?? ""} placeholder="e.g. Not good" onChange={(e) => set("minLabel", e.target.value)} />
          </Labeled>
          <Labeled label="High label">
            <input className="a-input" value={field.maxLabel ?? ""} placeholder="e.g. Excellent" onChange={(e) => set("maxLabel", e.target.value)} />
          </Labeled>
        </div>
      )}

      {field.type === "rating" && (
        <Labeled label="Number of stars">
          <select className="a-input w-32" value={field.max ?? 5} onChange={(e) => set("max", Number(e.target.value))}>
            {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </Labeled>
      )}

      {field.type === "matrix" && (
        <div className="space-y-4">
          <div className="grid gap-5 lg:grid-cols-2">
            <Labeled label="Rows (statements)">
              <ListEditor items={field.rows ?? []} onChange={(v) => set("rows", v)} noun="row" />
            </Labeled>
            <Labeled label="Columns (answers)">
              <ListEditor
                items={field.columns ?? []}
                onChange={(v) => onChange({ ...field, columns: v, positive: field.positive?.filter((c) => v.includes(c)), excluded: field.excluded?.filter((c) => v.includes(c)) })}
                noun="column"
              />
            </Labeled>
          </div>
          <Labeled label="Counts as positive in reports">
            <Chips all={field.columns ?? []} selected={field.positive ?? []} onChange={(v) => set("positive", v)} />
          </Labeled>
          <Labeled label="Left out of percentages (e.g. N/A)">
            <Chips all={field.columns ?? []} selected={field.excluded ?? []} onChange={(v) => set("excluded", v)} />
          </Labeled>
        </div>
      )}

      {field.type === "file" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Labeled label="Allowed files">
            <select className="a-input" value={ACCEPT_PRESETS.some((p) => p.v === (field.accept ?? "")) ? field.accept ?? "" : "custom"} onChange={(e) => set("accept", e.target.value === "custom" ? field.accept || ".zip" : e.target.value)}>
              {ACCEPT_PRESETS.map((p) => (
                <option key={p.v} value={p.v}>
                  {p.l}
                </option>
              ))}
              <option value="custom">Custom…</option>
            </select>
            {!ACCEPT_PRESETS.some((p) => p.v === (field.accept ?? "")) && (
              <input className="a-input mt-2" value={field.accept ?? ""} placeholder=".zip,.png" onChange={(e) => set("accept", e.target.value)} />
            )}
          </Labeled>
          <Labeled label="Max size (MB)">
            <input type="number" min={1} max={25} className="a-input" value={field.maxSizeMB ?? 10} onChange={(e) => set("maxSizeMB", Math.max(1, Math.min(25, Number(e.target.value) || 10)))} />
          </Labeled>
          <Labeled label="Max files">
            <input type="number" min={1} max={10} className="a-input" value={field.maxFiles ?? 1} onChange={(e) => set("maxFiles", Math.max(1, Math.min(10, Number(e.target.value) || 1)))} />
          </Labeled>
        </div>
      )}

      {field.type !== "statement" && keyOptions.length > 0 && (
        <Labeled label="Dashboard use" hint={ANALYTICS_KEYS.find((k) => k.key === field.key)?.help ?? "Link this question to a dashboard KPI, chart or filter."}>
          <select className="a-input" value={field.key ?? ""} onChange={(e) => set("key", e.target.value || undefined)}>
            <option value="">Not used on the dashboard</option>
            {keyOptions.map((k) => (
              <option key={k.key} value={k.key}>
                {k.label}
              </option>
            ))}
          </select>
        </Labeled>
      )}
    </div>
  );
}
