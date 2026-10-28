export type FieldType =
  | "short_text"
  | "long_text"
  | "email"
  | "phone"
  | "number"
  | "date"
  | "time"
  | "dropdown"
  | "radio"
  | "checkbox"
  | "scale"
  | "rating"
  | "matrix"
  | "file"
  | "statement";

export interface Field {
  id: string;
  type: FieldType;
  label: string;
  description?: string;
  required?: boolean;
  placeholder?: string;
  /** Stable analytics key that the dashboard KPIs and filters look for (e.g. "facilitator", "nps"). */
  key?: string;
  options?: string[];
  allowOther?: boolean;
  display?: "list" | "cards";
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
  rows?: string[];
  columns?: string[];
  /** Matrix columns that count as a positive ("agree") answer. */
  positive?: string[];
  /** Matrix columns left out of percentages (e.g. N/A). */
  excluded?: string[];
  accept?: string;
  maxSizeMB?: number;
  maxFiles?: number;
}

export interface Section {
  id: string;
  title: string;
  description?: string;
  fields: Field[];
}

export interface FormSchema {
  sections: Section[];
}

export interface FormSettings {
  coverUrl?: string;
  accentColor?: string;
  submitLabel?: string;
  successTitle?: string;
  successMessage?: string;
  paginate?: boolean;
  estimatedMinutes?: number;
}

export type FormStatus = "draft" | "published" | "closed";

export interface Form {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  status: FormStatus;
  settings: FormSettings;
  schema: FormSchema;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
  response_count?: number;
  last_response_at?: string | null;
}

export interface PublicFormCard {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  settings: FormSettings;
  questionCount: number;
  sectionCount: number;
  updated_at: string;
}

export type Answers = Record<string, unknown>;

export interface ResponseRow {
  id: string;
  form_id: string;
  answers: Answers;
  created_at: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
}

export const OTHER_PREFIX = "Other: ";
