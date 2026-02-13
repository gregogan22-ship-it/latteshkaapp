// lib/checklist/keys.ts
export const STATUS_TRUE  = "Выполнено";
export const STATUS_FALSE = "Не выполнено";

const norm = (s: any) => String(s ?? "").trim().toLowerCase();

export function makeKey(role: string, category: string, itemTitle: string) {
  return `${norm(role)}::${norm(category)}::${norm(itemTitle)}`;
}

export function normalizeStatus(v: any) {
  const t = typeof v;
  if (t === "boolean" || t === "number") return v ? STATUS_TRUE : STATUS_FALSE;
  if (t === "string") {
    const s = v.trim().toLowerCase();
    if (["true","yes","да","ok","ок","выполнено","1","✔","✅"].includes(s)) return STATUS_TRUE;
    if (["false","no","нет","не выполнено","0","✖","❌"].includes(s))       return STATUS_FALSE;
    return v;
  }
  return String(v ?? "");
}

export function isDone(status: any) {
  const s = normalizeStatus(status);
  return String(s).trim().toLowerCase() === STATUS_TRUE.toLowerCase()
      || ["ok","✔","✅"].includes(String(status).trim().toLowerCase());
}
