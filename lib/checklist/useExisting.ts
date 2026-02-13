// lib/checklist/useExisting.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import { isDone, makeKey } from "./keys";

type Entry = {
  role?: string;
  category?: string;
  itemTitle?: string;
  status?: any;
  done?: any;
};

type Options = {
  cafe: string;
  date: string;
  role?: string;
  category?: string;
};

export function useExistingDone({ cafe, date, role, category }: Options) {
  const [map, setMap] = useState<Record<string, Entry>>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [bump, setBump] = useState(0); // дергаем, чтобы принудительно обновить данные

  // Собираем query-string для GET /api/checklist
  const query = useMemo(() => {
    const qp = new URLSearchParams({ cafe, date });
    if (role) qp.set("role", role);
    if (category) qp.set("category", category);
    return qp.toString();
  }, [cafe, date, role, category]);

  useEffect(() => {
    let dead = false;
    const ctrl = new AbortController();

    (async () => {
      if (!cafe || !date) { setMap({}); return; }

      setLoading(true);
      setErr(null);

      try {
        const res = await fetch(`/api/checklist?${query}`, {
          cache: "no-store",
          signal: ctrl.signal,
          headers: { Accept: "application/json" },
        });

        let json: any = {};
        try {
          json = await res.json();
        } catch {
          json = {};
        }

        if (!res.ok || json?.ok === false) {
          const msg = json?.error || `HTTP ${res.status}`;
          throw new Error(msg);
        }

        // Пытаемся вытащить entries из разных возможных форматов ответа
        const entries: Entry[] =
          Array.isArray(json?.entries) ? json.entries
          : Array.isArray(json?.data?.entries) ? json.data.entries
          : Array.isArray(json?.data) && json.data.every((x: any) => x && typeof x === "object" && ("itemTitle" in x || "items" in x))
              ? json.data // маловероятно, но оставим fallback
              : [];

        const next: Record<string, Entry> = {};
        for (const e of entries) {
          const r = (e.role || "").toString();
          const c = (e.category || "").toString();
          const t = (e.itemTitle || "").toString();
          const k = makeKey(r, c, t);
          next[k] = e;
        }

        if (!dead) setMap(next);
      } catch (e: any) {
        if (!dead) setErr(e?.message || "Ошибка загрузки");
      } finally {
        if (!dead) setLoading(false);
      }
    })();

    return () => {
      dead = true;
      ctrl.abort();
    };
  }, [query, cafe, date, bump]);

  const isItemDone = (r: string, c: string, title: string) => {
    const k = makeKey(r, c, title);
    const e = map[k];
    // Считаем выполненным, если либо статус, либо явное done приводится к true
    return !!e && (isDone(e.status) || isDone(e.done));
  };

  const refresh = () => setBump((x) => x + 1);

  return { loading, err, map, isItemDone, refresh };
}
