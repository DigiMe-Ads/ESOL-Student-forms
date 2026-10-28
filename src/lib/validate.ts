import { type Answers, type Field, OTHER_PREFIX } from "./types";

export function fieldError(field: Field, value: unknown): string | undefined {
  if (field.type === "statement") return;
  const empty =
    value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
  if (field.required) {
    if (empty) return "This question is required";
    if (field.type === "matrix") {
      const done = Object.keys((value as Record<string, string>) ?? {}).length;
      if (done < (field.rows?.length ?? 0)) return "Please answer every row";
    }
  }
  if (typeof value === "string" && value === OTHER_PREFIX) return "Please tell us what “Other” means";
  if (Array.isArray(value) && value.includes(OTHER_PREFIX)) return "Please tell us what “Other” means";
  if (field.type === "email" && typeof value === "string" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return "Enter a valid email address";
  }
}

export function validateFields(fields: Field[], answers: Answers) {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const e = fieldError(f, answers[f.id]);
    if (e) errors[f.id] = e;
  }
  return errors;
}
