// lib/checklist/save.ts
export type ChecklistEntry = {
  role: string;
  category?: string;   // = section
  section?: string;
  itemTitle?: string;  // = item
  item?: string;
  comment?: string;
  status?: boolean | string; // = value
  value?: boolean | string;
  photoUrl?: string;
  photoBase64?: string;
  performedBy?: string;
};

export function formatDateDDMMYYYY(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1, ).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}.${mm}.${yy}`;
}

/** Что возвращает /api/checklist?action=get */
export type ChecklistStateHit = {
  itemTitle?: string;
  done?: boolean;
  comment?: string;
  photoUrl?: string;
  performedBy?: string;
  /** Иногда приходит это поле; делаем опциональным */
  timeStr?: string;
  /** На всякий — поддержим альтернативные названия времени */
  timestamp?: string;
  updatedAt?: string;
};

/** Предзагрузка статуса чек-листа */
export async function fetchChecklistState(params: {
  cafe: string;
  date: string;
  role: string;
  category: string;
}) {
  const q = new URLSearchParams({
    action: "get",
    cafe: params.cafe,
    date: params.date,
    role: params.role,
    category: params.category,
  });
  const res = await fetch(`/api/checklist?${q.toString()}`, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) throw new Error(data?.error || "Get failed");
  return data as { ok: true; entries: ChecklistStateHit[] };
}

/** Сохранение/апдейт чек-листа */
export async function sendChecklist(params: {
  cafe: string;         // "Ашан"
  date: string;         // "dd.MM.yyyy"
  user?: string;        // в колонку "Выполнил"
  entries: ChecklistEntry[];
}) {
  const payload = {
    action: "save",
    cafe: params.cafe,
    date: params.date,
    user: params.user ?? "",
    entries: params.entries.map(e => ({
      role: e.role,
      category: e.category ?? e.section ?? "",
      itemTitle: e.itemTitle ?? e.item ?? "",
      comment: e.comment ?? "",
      status: e.status ?? e.value ?? "",
      photoUrl: e.photoUrl,
      photoBase64: e.photoBase64,
      performedBy: e.performedBy,
    })),
  };

  const res = await fetch(`/api/checklist`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) throw new Error(data?.error || "Save failed");

  // нормализуем ответ
  return {
    ok: true as const,
    cafe: data.cafe ?? params.cafe,
    sheet: data.sheet ?? params.date,
    appended: data.appended ?? 0,
    updated: data.updated ?? 0,
    total: data.total ?? (payload.entries?.length || 0),
  };
}

/** 👇 Алиас для старого кода: layout.tsx импортирует postChecklist */
export const postChecklist = sendChecklist;
