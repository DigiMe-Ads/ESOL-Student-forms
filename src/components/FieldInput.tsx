import { useRef, useState } from "react";
import { Check, ChevronDown, FileUp, Loader2, Star, X } from "lucide-react";
import { api } from "../lib/api";
import { type Field, OTHER_PREFIX, type UploadedFile } from "../lib/types";

interface Props {
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
  formSlug: string;
}

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 placeholder:text-slate-400 " +
  "shadow-sm transition focus:border-[var(--accent)] focus:outline-none focus:ring-4 focus:ring-[var(--accent-ring)]";

export function FieldInput({ field, value, onChange, error, formSlug }: Props) {
  const labelId = `${field.id}-label`;
  if (field.type === "statement") {
    return (
      <div className="space-y-1">
        {field.label && <h3 className="font-display text-lg font-semibold text-slate-900">{field.label}</h3>}
        {field.description && <p className="whitespace-pre-line text-[15px] leading-relaxed text-slate-600">{field.description}</p>}
      </div>
    );
  }
  return (
    <fieldset className="min-w-0" aria-labelledby={labelId} data-field={field.id}>
      <legend id={labelId} className="mb-1 block w-full font-display text-[17px] font-semibold leading-snug text-slate-900">
        {field.label}
        {/* word joiner + no-break space keep the asterisk on the same line as the last word */}
        {field.required && (
          <span className="text-rose-500" aria-label="required">
            {"⁠ *"}
          </span>
        )}
      </legend>
      {field.description && (
        <p className="mb-3 whitespace-pre-line text-sm leading-relaxed text-slate-500">{field.description}</p>
      )}
      <div className={field.description ? "" : "mt-3"}>
        <Control field={field} value={value} onChange={onChange} formSlug={formSlug} hasError={!!error} />
      </div>
      {error && <p className="mt-2 text-sm font-medium text-rose-600">{error}</p>}
    </fieldset>
  );
}

function Control({ field, value, onChange, formSlug, hasError }: Omit<Props, "error"> & { hasError: boolean }) {
  const errCls = hasError ? " border-rose-400" : "";
  switch (field.type) {
    case "short_text":
    case "email":
    case "phone":
    case "number":
    case "date":
    case "time":
      return (
        <input
          className={`${inputCls}${errCls} ${field.type === "short_text" || field.type === "email" ? "sm:max-w-md" : "sm:max-w-xs"}`}
          type={{ short_text: "text", email: "email", phone: "tel", number: "number", date: "date", time: "time" }[field.type]}
          value={(value as string | number | undefined) ?? ""}
          placeholder={field.placeholder}
          min={field.type === "number" ? field.min : undefined}
          max={field.type === "number" ? field.max : undefined}
          onChange={(e) => onChange(field.type === "number" ? (e.target.value === "" ? undefined : Number(e.target.value)) : e.target.value)}
        />
      );
    case "long_text":
      return (
        <textarea
          className={`${inputCls}${errCls} min-h-[120px] resize-y`}
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "dropdown":
      return <Dropdown field={field} value={value as string | undefined} onChange={onChange} hasError={hasError} />;
    case "radio":
      return <RadioGroup field={field} value={value as string | undefined} onChange={onChange} />;
    case "checkbox":
      return <CheckboxGroup field={field} value={(value as string[]) ?? []} onChange={onChange} />;
    case "scale":
      return <Scale field={field} value={value as number | undefined} onChange={onChange} />;
    case "rating":
      return <Rating field={field} value={value as number | undefined} onChange={onChange} />;
    case "matrix":
      return <Matrix field={field} value={(value as Record<string, string>) ?? {}} onChange={onChange} />;
    case "file":
      return <FileField field={field} value={(value as UploadedFile[]) ?? []} onChange={onChange} formSlug={formSlug} />;
    default:
      return null;
  }
}

const isOther = (v?: string) => typeof v === "string" && v.startsWith(OTHER_PREFIX);

function OtherInput({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  return (
    <input
      autoFocus
      className={`${inputCls} mt-2 sm:max-w-md`}
      placeholder="Please specify"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function Dropdown({ field, value, onChange, hasError }: { field: Field; value?: string; onChange: (v: unknown) => void; hasError: boolean }) {
  const other = isOther(value);
  return (
    <div className="sm:max-w-md">
      <div className="relative">
        <select
          className={`${inputCls} appearance-none pr-10 ${value ? "" : "text-slate-400"}${hasError ? " border-rose-400" : ""}`}
          value={other ? "__other__" : (value ?? "")}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "__other__" ? OTHER_PREFIX : v || undefined);
          }}
        >
          <option value="">{field.placeholder || "Select an option"}</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o} className="text-slate-900">
              {o}
            </option>
          ))}
          {field.allowOther && (
            <option value="__other__" className="text-slate-900">
              Other
            </option>
          )}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      </div>
      {other && <OtherInput value={value!.slice(OTHER_PREFIX.length)} onChange={(t) => onChange(OTHER_PREFIX + t)} />}
    </div>
  );
}

const letter = (i: number) => String.fromCharCode(65 + (i % 26));

function RadioGroup({ field, value, onChange }: { field: Field; value?: string; onChange: (v: unknown) => void }) {
  const opts = [...(field.options ?? []), ...(field.allowOther ? ["__other__"] : [])];
  const other = isOther(value);
  const cards = field.display === "cards";
  return (
    <div>
      <div role="radiogroup" className={cards ? "grid gap-2 sm:max-w-md" : "grid gap-1"}>
        {opts.map((o, i) => {
          const label = o === "__other__" ? "Other" : o;
          const selected = o === "__other__" ? other : value === o;
          const select = () => onChange(o === "__other__" ? (other ? value : OTHER_PREFIX) : o);
          return cards ? (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={select}
              className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-[15px] transition ${
                selected
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-slate-900 ring-1 ring-[var(--accent)]"
                  : "border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
              }`}
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded text-xs font-bold ${
                  selected ? "bg-[var(--accent)] text-white" : "border border-slate-300 bg-slate-50 text-slate-600"
                }`}
              >
                {letter(i)}
              </span>
              <span className="flex-1">{label}</span>
              {selected && <Check className="h-4 w-4 shrink-0 text-[var(--accent)]" />}
            </button>
          ) : (
            <label key={o} className="flex cursor-pointer items-center gap-3 rounded-md py-1.5 text-[15px] text-slate-800">
              <input type="radio" className="peer sr-only" checked={selected} onChange={select} name={field.id} />
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-slate-400 bg-white peer-checked:border-[var(--accent)] peer-focus-visible:ring-4 peer-focus-visible:ring-[var(--accent-ring)]">
                {selected && <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />}
              </span>
              {label}
            </label>
          );
        })}
      </div>
      {other && <OtherInput value={value!.slice(OTHER_PREFIX.length)} onChange={(t) => onChange(OTHER_PREFIX + t)} />}
    </div>
  );
}

function CheckboxGroup({ field, value, onChange }: { field: Field; value: string[]; onChange: (v: unknown) => void }) {
  const otherVal = value.find(isOther);
  const toggle = (o: string) => {
    if (o === "__other__") return onChange(otherVal !== undefined ? value.filter((v) => !isOther(v)) : [...value, OTHER_PREFIX]);
    onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);
  };
  const opts = [...(field.options ?? []), ...(field.allowOther ? ["__other__"] : [])];
  return (
    <div className="grid gap-1">
      {opts.map((o) => {
        const checked = o === "__other__" ? otherVal !== undefined : value.includes(o);
        return (
          <label key={o} className="flex cursor-pointer items-center gap-3 rounded-md py-1.5 text-[15px] text-slate-800">
            <input type="checkbox" className="peer sr-only" checked={checked} onChange={() => toggle(o)} />
            <span
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-[5px] border transition peer-focus-visible:ring-4 peer-focus-visible:ring-[var(--accent-ring)] ${
                checked ? "border-[var(--accent)] bg-[var(--accent)]" : "border-slate-400 bg-white"
              }`}
            >
              {checked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
            </span>
            <span>{o === "__other__" ? "Other" : o}</span>
          </label>
        );
      })}
      {otherVal !== undefined && (
        <div className="pl-8">
          <OtherInput
            value={otherVal.slice(OTHER_PREFIX.length)}
            onChange={(t) => onChange(value.map((v) => (isOther(v) ? OTHER_PREFIX + t : v)))}
          />
        </div>
      )}
    </div>
  );
}

function Scale({ field, value, onChange }: { field: Field; value?: number; onChange: (v: unknown) => void }) {
  const min = field.min ?? 1;
  const max = field.max ?? 5;
  const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  // The label row shares the button row's exact width so "low" sits under the first button
  // and "high" under the last one, at any number of steps and on narrow screens.
  return (
    <div className="w-full" style={{ maxWidth: nums.length * 52 }}>
      <div role="radiogroup" className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${nums.length}, minmax(0, 1fr))` }}>
        {nums.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(value === n ? undefined : n)}
            className={`h-11 rounded-lg border text-[15px] font-medium transition ${
              value === n
                ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow"
                : "border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      {(field.minLabel || field.maxLabel) && (
        <div className="mt-2 flex justify-between gap-4 text-xs font-semibold text-slate-500">
          <span>{field.minLabel}</span>
          <span className="text-right">{field.maxLabel}</span>
        </div>
      )}
    </div>
  );
}

function Rating({ field, value, onChange }: { field: Field; value?: number; onChange: (v: unknown) => void }) {
  const [hover, setHover] = useState(0);
  const max = field.max ?? 5;
  return (
    <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button key={n} type="button" aria-label={`${n} star${n > 1 ? "s" : ""}`} onMouseEnter={() => setHover(n)} onClick={() => onChange(n)}>
          <Star
            className={`h-8 w-8 transition ${(hover || value || 0) >= n ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
          />
        </button>
      ))}
    </div>
  );
}

function Matrix({ field, value, onChange }: { field: Field; value: Record<string, string>; onChange: (v: unknown) => void }) {
  const cols = field.columns ?? [];
  const rows = field.rows ?? [];
  const grid = { gridTemplateColumns: `minmax(0, 2.2fr) repeat(${cols.length}, minmax(0, 1fr))` };
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="hidden border-b border-slate-200 bg-slate-50 sm:grid" style={grid}>
        <div />
        {cols.map((c) => (
          <div key={c} className="px-1 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
            {c}
          </div>
        ))}
      </div>
      {rows.map((r, ri) => (
        <div
          key={r}
          role="radiogroup"
          aria-label={r}
          className={`px-4 py-3 sm:grid sm:items-center sm:px-0 sm:py-0 ${ri % 2 ? "bg-slate-50/60" : ""} ${
            ri ? "border-t border-slate-100" : ""
          }`}
          style={grid}
        >
          <div className="pb-2 text-[15px] leading-snug text-slate-800 sm:px-4 sm:py-3 sm:pb-3">{r}</div>
          <div className="grid gap-1.5 sm:contents" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))` }}>
            {cols.map((c) => {
              const checked = value[r] === c;
              return (
                <label key={c} className="flex cursor-pointer flex-col items-center gap-1 py-1 sm:py-3">
                  <input
                    type="radio"
                    className="peer sr-only"
                    name={`${field.id}-${ri}`}
                    checked={checked}
                    onChange={() => onChange({ ...value, [r]: c })}
                  />
                  <span
                    className={`grid h-5 w-5 place-items-center rounded-full border transition peer-focus-visible:ring-4 peer-focus-visible:ring-[var(--accent-ring)] ${
                      checked ? "border-[var(--accent)]" : "border-slate-400 bg-white hover:border-slate-500"
                    }`}
                  >
                    {checked && <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 sm:hidden">{c}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

const fmtSize = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`);

function FileField({ field, value, onChange, formSlug }: { field: Field; value: UploadedFile[]; onChange: (v: unknown) => void; formSlug: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const maxFiles = field.maxFiles ?? 1;
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setErr("");
    setBusy(true);
    let next = [...value];
    try {
      for (const f of Array.from(files).slice(0, maxFiles - value.length)) {
        if (f.size > (field.maxSizeMB ?? 10) * 1024 * 1024) throw new Error(`${f.name} is larger than ${field.maxSizeMB ?? 10} MB`);
        const fd = new FormData();
        fd.append("fieldId", field.id);
        fd.append("file", f);
        next = [...next, await api.post<UploadedFile>(`/api/forms/${formSlug}/files`, fd)];
        onChange(next);
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };
  return (
    <div className="space-y-2">
      {value.length < maxFiles && (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            upload(e.dataTransfer.files);
          }}
          className="flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600 transition hover:border-[var(--accent)] hover:bg-white"
        >
          {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileUp className="h-6 w-6 text-slate-500" />}
          <span className="font-medium text-slate-800">{busy ? "Uploading…" : "Click to choose a file or drag it here"}</span>
          <span className="text-xs text-slate-500">
            {field.accept ? `${field.accept} · ` : ""}up to {field.maxSizeMB ?? 10} MB{maxFiles > 1 ? ` · max ${maxFiles} files` : ""}
          </span>
        </button>
      )}
      <input ref={ref} type="file" hidden multiple={maxFiles > 1} accept={field.accept} onChange={(e) => upload(e.target.files)} />
      {value.map((f) => (
        <div key={f.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <FileUp className="h-4 w-4 text-slate-500" />
          <span className="flex-1 truncate text-slate-800">{f.name}</span>
          <span className="text-xs text-slate-500">{fmtSize(f.size)}</span>
          <button type="button" aria-label="Remove file" onClick={() => onChange(value.filter((x) => x.id !== f.id))}>
            <X className="h-4 w-4 text-slate-500 hover:text-rose-600" />
          </button>
        </div>
      ))}
      {err && <p className="text-sm text-rose-600">{err}</p>}
    </div>
  );
}
