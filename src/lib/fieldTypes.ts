import {
  AlignLeft,
  Calendar,
  CheckSquare,
  CircleDot,
  Clock,
  Gauge,
  Grid3x3,
  Hash,
  Heading,
  ListChecks,
  Mail,
  Phone,
  Star,
  TextCursorInput,
  Upload,
  type LucideIcon,
} from "lucide-react";
import type { Field, FieldType } from "./types";

export const FIELD_TYPES: { type: FieldType; label: string; icon: LucideIcon; group: string }[] = [
  { type: "short_text", label: "Short answer", icon: TextCursorInput, group: "Text" },
  { type: "long_text", label: "Paragraph", icon: AlignLeft, group: "Text" },
  { type: "email", label: "Email", icon: Mail, group: "Text" },
  { type: "phone", label: "Phone", icon: Phone, group: "Text" },
  { type: "number", label: "Number", icon: Hash, group: "Text" },
  { type: "radio", label: "Multiple choice", icon: CircleDot, group: "Choice" },
  { type: "checkbox", label: "Checkboxes", icon: CheckSquare, group: "Choice" },
  { type: "dropdown", label: "Dropdown", icon: ListChecks, group: "Choice" },
  { type: "scale", label: "Linear scale", icon: Gauge, group: "Rating" },
  { type: "rating", label: "Star rating", icon: Star, group: "Rating" },
  { type: "matrix", label: "Grid (matrix)", icon: Grid3x3, group: "Rating" },
  { type: "date", label: "Date", icon: Calendar, group: "Other" },
  { type: "time", label: "Time", icon: Clock, group: "Other" },
  { type: "file", label: "File upload", icon: Upload, group: "Other" },
  { type: "statement", label: "Text / heading", icon: Heading, group: "Other" },
];

export const typeMeta = (t: FieldType) => FIELD_TYPES.find((x) => x.type === t) ?? FIELD_TYPES[0];

export const newId = (prefix = "q") => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

export function newField(type: FieldType): Field {
  const base: Field = { id: newId(), type, label: "", required: false };
  switch (type) {
    case "radio":
    case "checkbox":
    case "dropdown":
      return { ...base, label: "Untitled question", options: ["Option 1", "Option 2"], display: type === "radio" ? "list" : undefined };
    case "scale":
      return { ...base, label: "Untitled question", min: 1, max: 5, minLabel: "", maxLabel: "" };
    case "rating":
      return { ...base, label: "Untitled question", max: 5 };
    case "matrix":
      return {
        ...base,
        label: "Untitled grid",
        rows: ["Statement 1", "Statement 2"],
        columns: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
        positive: ["Agree", "Strongly agree"],
        excluded: [],
      };
    case "file":
      return { ...base, label: "Upload a file", maxSizeMB: 10, maxFiles: 1, accept: "" };
    case "statement":
      return { ...base, label: "Heading", description: "" };
    default:
      return { ...base, label: "Untitled question" };
  }
}

/** Convert a question to another type, keeping whatever settings still make sense. */
export function changeType(f: Field, type: FieldType): Field {
  const fresh = newField(type);
  const choice = ["radio", "checkbox", "dropdown"];
  return {
    ...fresh,
    id: f.id,
    label: f.label || fresh.label,
    description: f.description,
    required: type === "statement" ? false : f.required,
    key: undefined,
    options: choice.includes(type) && f.options?.length ? f.options : fresh.options,
    allowOther: choice.includes(type) ? f.allowOther : undefined,
  };
}
