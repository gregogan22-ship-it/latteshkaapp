export type Status = boolean | string;

export type ChecklistItem = {
  /** Стабильный ключ пункта внутри раздела (лучше itemId). */
  key: string;
  role: string;
  section?: string;   // = category
  category?: string;  // alias
  title?: string;     // = itemTitle
  item?: string;      // alias
  comment?: string;
  value?: Status;     // = status
  photoUrl?: string;
  photoDataUrl?: string; // base64
  performedBy?: string;  // кто выполнил именно этот пункт
};

export type SaveEntry = {
  role: string;
  category: string;
  itemTitle: string;
  comment: string;
  status: Status;
  photoUrl?: string;
  photoBase64?: string;
  performedBy?: string;
};

export type SavePayload = {
  action: "save";
  cafe: string;
  date: string;   // "dd.MM.yyyy"
  user?: string;  // общий fallback ("Выполнил"), если не указан в пункте
  entries: SaveEntry[];
};

export function formatDateDDMMYYYY(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

/** true/false → русские статусы, строки — как есть. */
export function normalizeStatus(val: Status | undefined): string {
  if (typeof val === "boolean") return val ? "Выполнено" : "Не выполнено";
  if (typeof val === "number")  return val ? "Выполнено" : "Не выполнено";
  if (typeof val === "string")  return val;
  return "";
}

export function toEntries(items: ChecklistItem[]): SaveEntry[] {
  return items.map((x) => ({
    role: x.role,
    category: (x.category ?? x.section ?? "").trim(),
    itemTitle: (x.title ?? x.item ?? "").trim(),
    comment: x.comment?.trim() ?? "",
    status: normalizeStatus(x.value),
    photoUrl: x.photoUrl || undefined,
    photoBase64: x.photoDataUrl || undefined,
    performedBy: x.performedBy || undefined,
  }));
}

/** Композитный ключ на случай если нет своего itemId. */
export function makeCompositeKey(x: ChecklistItem): string {
  const a = x.role?.trim() ?? "";
  const b = (x.section ?? x.category ?? "").trim();
  const c = (x.item ?? x.title ?? "").trim();
  return `${a}::${b}::${c}`;
}
