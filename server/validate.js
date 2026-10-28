// Server-side checks for a submitted response. Keeps only answers to fields that exist on the
// form, in the expected shape, so the stored JSON always matches the form definition.

const OTHER_PREFIX = "Other: ";

export function allFields(schema) {
  return (schema?.sections || []).flatMap((s) => s.fields || []);
}

const isEmpty = (v) =>
  v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0) ||
  (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0);

function clean(field, value) {
  switch (field.type) {
    case "short_text":
    case "long_text":
    case "email":
    case "phone":
    case "date":
    case "time":
      return typeof value === "string" ? value.trim().slice(0, field.type === "long_text" ? 5000 : 500) : undefined;
    case "number": {
      const n = typeof value === "number" ? value : Number(value);
      return value === "" || value == null || Number.isNaN(n) ? undefined : n;
    }
    case "dropdown":
    case "radio": {
      if (typeof value !== "string") return undefined;
      if (field.options?.includes(value)) return value;
      if (field.allowOther && value.startsWith(OTHER_PREFIX)) return value.slice(0, 300);
      return undefined;
    }
    case "checkbox": {
      if (!Array.isArray(value)) return undefined;
      return value.filter(
        (v) => typeof v === "string" && (field.options?.includes(v) || (field.allowOther && v.startsWith(OTHER_PREFIX))),
      );
    }
    case "scale":
    case "rating": {
      const n = Number(value);
      const min = field.type === "rating" ? 1 : field.min ?? 1;
      const max = field.max ?? 5;
      return Number.isInteger(n) && n >= min && n <= max ? n : undefined;
    }
    case "matrix": {
      if (!value || typeof value !== "object") return undefined;
      const out = {};
      for (const row of field.rows || []) {
        if (field.columns?.includes(value[row])) out[row] = value[row];
      }
      return out;
    }
    case "file":
      return Array.isArray(value)
        ? value.filter((f) => f && typeof f.id === "string").map((f) => ({ id: f.id, name: String(f.name || ""), size: Number(f.size) || 0 }))
        : undefined;
    default:
      return undefined;
  }
}

export function validateAnswers(schema, raw) {
  const answers = {};
  const errors = {};
  for (const field of allFields(schema)) {
    if (field.type === "statement") continue;
    const v = clean(field, raw?.[field.id]);
    if (field.required) {
      const incomplete =
        isEmpty(v) || (field.type === "matrix" && Object.keys(v).length < (field.rows || []).length);
      if (incomplete) errors[field.id] = "This question is required";
    }
    if (field.type === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors[field.id] = "Enter a valid email";
    if (!isEmpty(v)) answers[field.id] = v;
  }
  return { answers, errors };
}
