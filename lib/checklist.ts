// lib/checklist.ts

export type Role = { role: string; icon?: string };
export type Section = { role: string; section: string; period: string };
export type Point = { role: string; section: string; item: string; requiresPhoto?: boolean };

export type Meta = {
  roles: Role[];
  sections: Section[];             // может прийти пустым — мы подстрахуемся фолбэком
  points: Point[];
  cafes: string[];
  completed: Record<string, string[]>;
  updatedAt?: string;
  nonce?: number;
};

function normStr(v: unknown): string {
  return String(v ?? "").trim();
}

// Локальная функция: если sections пуст — строим из points с period="ежедневно"
function buildSectionsFallback(points: Point[]): Section[] {
  const uniq = new Set<string>();
  const out: Section[] = [];
  for (const p of points) {
    const role = normStr(p.role);
    const section = normStr(p.section);
    if (!role || !section) continue;
    const key = `${role}||${section}`;
    if (uniq.has(key)) continue;
    uniq.add(key);
    out.push({ role, section, period: "ежедневно" });
  }
  return out;
}

/**
 * Тянем метаданные.
 * Параметр noCompleted=true позволит не сканировать отчёты по всем кофейням (ускоряет и не падает на правах).
 */
export async function fetchMeta(opts?: { noCompleted?: boolean }): Promise<Meta> {
  const qs = new URLSearchParams();
  qs.set("nocache", String(Date.now()));
  if (opts?.noCompleted) qs.set("noCompleted", "1");

  const res = await fetch(`/api/checklist/meta?${qs.toString()}`, { cache: "no-store" });
  const data = await res.json();

  if (!res.ok || data.success === false) {
    // Пробрасываем диагностическое поле details, если есть
    throw new Error(data.details || data.error || `HTTP ${res.status}`);
  }

  // Нормализация входящих структур
  const roles: Role[] = Array.isArray(data.roles) ? data.roles.map((r: any) => ({
    role: normStr(r.role),
    icon: normStr(r.icon),
  })).filter((r: Role) => r.role) : [];

  const points: Point[] = Array.isArray(data.points) ? data.points.map((p: any) => ({
    role: normStr(p.role),
    section: normStr(p.section),
    item: normStr(p.item),
    requiresPhoto: Boolean(p.requiresPhoto),
  })).filter((p: Point) => p.role && p.section && p.item) : [];

  // Если sections пришёл пустым — строим из points
  let sections: Section[] = Array.isArray(data.sections) ? data.sections.map((s: any) => ({
    role: normStr(s.role),
    section: normStr(s.section),
    period: normStr(s.period) || "ежедневно",
  })).filter((s: Section) => s.role && s.section) : [];

  if (sections.length === 0 && points.length > 0) {
    sections = buildSectionsFallback(points);
  }

  const cafes: string[] = Array.isArray(data.cafes)
    ? data.cafes.map((c: any) => normStr(c)).filter(Boolean)
    : [];

  const completed: Record<string, string[]> = data.completed && typeof data.completed === "object"
    ? data.completed
    : {};

  return {
    roles,
    sections,
    points,
    cafes,
    completed,
    updatedAt: data.updatedAt,
    nonce: data.nonce,
  };
}

export async function submitEntries(payload: {
  cafe: string;
  date?: string; // "DD.MM.YYYY"
  entries: { role: string; category: string; item: string; status: "✅" | "❌" | "⏭️"; user?: string; comment?: string }[];
}) {
  if (!payload?.cafe) throw new Error("Не выбрана кофейня");
  if (!Array.isArray(payload.entries) || payload.entries.length === 0) throw new Error("Нет пунктов для сохранения");

  const res = await fetch(`/api/checklist/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.details || data.error || `HTTP ${res.status}`);
  }
  return data as { success: true; saved: number; sheet: string };
}

export async function fetchReport(cafe: string, date: string) {
  if (!cafe) throw new Error("Не выбрана кофейня");
  if (!date) throw new Error("Не указана дата (ДД.ММ.ГГГГ)");

  const url = `/api/checklist/report?cafe=${encodeURIComponent(cafe)}&date=${encodeURIComponent(date)}&nocache=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();

  if (!res.ok || data.success === false) {
    throw new Error(data.details || data.error || `HTTP ${res.status}`);
  }

  return data as {
    success: true;
    date: string;
    report: {
      cafe: string;
      percent: number;
      roles: { role: string; sections: { section: string; done: number; total: number; percent: number }[] }[];
    }[];
  };
}

/**
 * Удобный хелпер: получить категории для выбранной роли
 * (использует уже «подлатанные» sections, так что на фронте лишняя логика не нужна).
 */
export function categoriesForRole(meta: Meta, role: string): string[] {
  if (!meta || !role) return [];
  const set = new Set(meta.sections.filter(s => s.role === role).map(s => s.section));
  return Array.from(set);
}
