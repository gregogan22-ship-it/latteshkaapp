"use client";

import { useCallback, useEffect, useState } from "react";

type Task = {
  type: "category" | "item";
  title: string;
  subtitle: string;
  due_time: string;
  status: "overdue" | "active" | "upcoming";
  href: string;
  done_count?: number;
  total?: number;
};

function resolveCafe(u: any): string {
  if (!u) return "";
  for (const c of [u.cafe, u.coffee_shop, u.coffeeShop, u.shop, u.location, u.cafe_name]) {
    const s = String(c || "").trim();
    if (s) return s;
  }
  const name = String(u.fullName || u.full_name || u.name || "").trim();
  if (/кассир/i.test(name)) {
    const rest = name.replace(/кассир/i, "").trim();
    if (rest.length >= 2) return rest;
  }
  return "";
}

function toMinutes(t: string): number | null {
  const m = String(t || "").trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function formatDue(t: string): string {
  const m = toMinutes(t);
  if (m == null) return String(t || "").trim();
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function nowMinutesMoscow(): number {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Moscow",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    return (
      Number(parts.find((p) => p.type === "hour")?.value || 0) * 60 +
      Number(parts.find((p) => p.type === "minute")?.value || 0)
    );
  } catch {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }
}

function ymdMoscow(): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Moscow",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const g = (t: string) => parts.find((p) => p.type === t)?.value || "00";
    return `${g("year")}-${g("month")}-${g("day")}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export default function DayTasksBoard({ auth }: { auth: any }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState("");
  const [metaLine, setMetaLine] = useState("");
  const cafe = resolveCafe(auth);

  const load = useCallback(async () => {
    setLoading(true);
    console.log("[DayTasksBoard] start", { cafe, role: auth?.role });
    if (!cafe) {
      setTasks([]);
      setInfo("У аккаунта не указана кофейня — задачи не к чему привязать.");
      setMetaLine("");
      setLoading(false);
      return;
    }
    try {
      // 1) основной API
      let tasksOut: Task[] = [];
      let used = "day-tasks";
      try {
        const res = await fetch(
          `/api/checklists/day-tasks?cafe=${encodeURIComponent(cafe)}&appearBeforeMin=1440`,
          { cache: "no-store" }
        );
        const json = await res.json();
        console.log("[DayTasksBoard] day-tasks response", json);
        if (Array.isArray(json?.tasks) && json.tasks.length) {
          tasksOut = json.tasks;
        }
        if (json?.meta) {
          setMetaLine(
            `шаблонов: ${json.meta.templatesTotal ?? "—"}, с временем: ${json.meta.withDueTime ?? "—"}, задач: ${json.meta.taskCount ?? tasksOut.length}`
          );
          if (!tasksOut.length && json.meta.hint) setInfo(json.meta.hint);
        }
      } catch (e) {
        console.warn("[DayTasksBoard] day-tasks failed", e);
        used = "fallback";
      }

      // 2) fallback: templates + performed на клиенте
      if (!tasksOut.length) {
        used = "templates-fallback";
        const tres = await fetch(
          `/api/checklists/templates?cafe=${encodeURIComponent(cafe)}`,
          { cache: "no-store" }
        );
        const tjson = await tres.json();
        const rows: any[] = Array.isArray(tjson?.data) ? tjson.data : Array.isArray(tjson) ? tjson : [];
        console.log("[DayTasksBoard] templates rows", rows.length);
        const withDue = rows.filter((r) => String(r.due_time || "").trim());
        setMetaLine(`fallback: всего ${rows.length}, с временем ${withDue.length}`);

        const date = ymdMoscow();
        const done = new Set<string>();
        try {
          // лёгкий запрос выполненных — если API нет, просто без done
          const pres = await fetch(
            `/api/checklists/performed?cafe=${encodeURIComponent(cafe)}&date=${date}`,
            { cache: "no-store" }
          );
          if (pres.ok) {
            const pjson = await pres.json();
            const pdata = Array.isArray(pjson?.data) ? pjson.data : [];
            for (const p of pdata) {
              if (p.done && p.item_id) done.add(String(p.item_id));
            }
          }
        } catch {}

        const nowMin = nowMinutesMoscow();
        const byKey = new Map<string, any[]>();
        for (const r of withDue) {
          const due = formatDue(String(r.due_time));
          const sec = r.section || "Без раздела";
          const key = `${r.role}||${sec}||${due}`;
          if (!byKey.has(key)) byKey.set(key, []);
          byKey.get(key)!.push(r);
        }
        for (const [key, items] of byKey) {
          const [role, section, due] = key.split("||");
          const dueMin = toMinutes(due);
          if (dueMin == null) continue;
          const undone = items.filter((it) => {
            const ids = [String(it.item_id || ""), String(it.id || "")];
            return !ids.some((id) => done.has(id));
          });
          if (!undone.length) continue;
          let status: Task["status"] = "upcoming";
          if (nowMin >= dueMin) status = "overdue";
          else if (nowMin >= dueMin - 180) status = "active";
          if (undone.length >= 3) {
            tasksOut.push({
              type: "category",
              title: `Чек-лист «${section}»`,
              subtitle: `${role} · ${cafe}`,
              due_time: due,
              status,
              done_count: items.length - undone.length,
              total: items.length,
              href: `/roznica/checklist/fill?cafe=${encodeURIComponent(cafe)}&role=${encodeURIComponent(role)}`,
            });
          } else {
            for (const it of undone) {
              tasksOut.push({
                type: "item",
                title: String(it.text || "Пункт"),
                subtitle: `${section} · ${role}`,
                due_time: due,
                status,
                href: `/roznica/checklist/fill?cafe=${encodeURIComponent(cafe)}&role=${encodeURIComponent(role)}`,
              });
            }
          }
        }
        if (!withDue.length) {
          setInfo(
            `Нет пунктов с временем (due_time) для «${cafe}». В редакторе чек-листа задайте ⏰ время категории или пункта.`
          );
        } else if (!tasksOut.length) {
          setInfo("Все пункты с временем на сегодня уже выполнены.");
        } else {
          setInfo("");
        }
      } else {
        setInfo("");
      }

      tasksOut.sort((a, b) => {
        if (a.status === "overdue" && b.status !== "overdue") return -1;
        if (b.status === "overdue" && a.status !== "overdue") return 1;
        return (toMinutes(a.due_time) || 0) - (toMinutes(b.due_time) || 0);
      });
      setTasks(tasksOut);
      console.log("[DayTasksBoard] done", { used, count: tasksOut.length });
    } catch (e: any) {
      console.error("[DayTasksBoard]", e);
      setTasks([]);
      setInfo(e?.message || "Ошибка загрузки задач");
    } finally {
      setLoading(false);
    }
  }, [auth, cafe]);

  useEffect(() => {
    void load();
  }, [load]);

  // ВАЖНО: блок никогда не размонтируем при auth
  return (
    <div className="px-4 pt-4" data-day-tasks-board="1">
      <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-amber-900">
            <span>⏰</span> Задачи на день
            {cafe ? <span className="font-normal text-amber-700">· {cafe}</span> : null}
          </h3>
          <button type="button" onClick={() => void load()} className="text-xs text-amber-800 underline">
            Обновить
          </button>
        </div>

        {loading && !tasks.length ? (
          <p className="text-sm text-amber-800">Загрузка…</p>
        ) : tasks.length === 0 ? (
          <div className="text-sm text-amber-950">
            <p>{info || "Нет задач на сейчас."}</p>
            {metaLine ? <p className="mt-1 text-[11px] text-amber-800/80">{metaLine}</p> : null}
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task, idx) => (
              <a
                key={idx}
                href={task.href}
                className={`block rounded-xl border bg-white px-3 py-2.5 hover:bg-amber-50/80 ${
                  task.status === "overdue"
                    ? "border-red-300"
                    : task.status === "upcoming"
                      ? "border-gray-200"
                      : "border-amber-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-gray-900">{task.title}</div>
                    <div className="truncate text-xs text-gray-500">{task.subtitle}</div>
                    {task.type === "category" && (
                      <div className="mt-0.5 text-xs text-gray-600">
                        выполнено {task.done_count}/{task.total}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div
                      className={`text-sm font-bold tabular-nums ${
                        task.status === "overdue" ? "text-red-600" : "text-amber-800"
                      }`}
                    >
                      {task.due_time}
                    </div>
                    <div
                      className={`text-[10px] font-semibold uppercase ${
                        task.status === "overdue"
                          ? "text-red-600"
                          : task.status === "upcoming"
                            ? "text-gray-500"
                            : "text-amber-700"
                      }`}
                    >
                      {task.status === "overdue"
                        ? "просрочено"
                        : task.status === "upcoming"
                          ? "ожидает"
                          : "к выполнению"}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
