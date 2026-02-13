"use client";

import Link from "next/link";
import type { Route } from "next"; // ⬅️ добавлено
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { formatDateDDMMYYYY } from "@/lib/checklist/save";

const asRoute = (s: string) => s as unknown as Route; // ⬅️ добавлено

function withParams(href: string, params: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  const qs = q.toString();
  if (!qs) return href;
  const joiner = href.includes("?") ? "&" : "?";
  return `${href}${joiner}${qs}`;
}

type Item = { title: string; href: string };

export default function RoleLanding(props: {
  roleTitle: string;
  items: Item[];
}) {
  const { roleTitle, items } = props;
  const sp = useSearchParams();
  const cafe = sp.get("cafe") || "";
  const date = sp.get("date") || formatDateDDMMYYYY(new Date());
  const user = sp.get("user") || "";

  const baseParams = useMemo(() => ({ cafe, date, user }), [cafe, date, user]);

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-semibold">{roleTitle}</h1>

      <div className="text-sm text-gray-600">
        Кофейня: <b>{cafe || "— не выбрано —"}</b> · Дата: <b>{date}</b>
        {user ? <> · Пользователь: <b>{user}</b></> : null}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((s) => {
          const target = withParams(s.href, baseParams);
          return (
            <Link
              key={s.href}
              href={asRoute(target)} // ⬅️ фикс для typedRoutes
              className="block border rounded-xl p-4 hover:shadow transition bg-white"
            >
              <div className="font-medium">{s.title}</div>
              <div className="text-xs text-gray-500 mt-1">
                Откроется для: {cafe || "— нет кофейни —"}, {date}
              </div>
            </Link>
          );
        })}
      </div>

      {!cafe && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
          Выберите кофейню на предыдущей странице (меню чек-листов), чтобы подтянуть её сюда.
        </div>
      )}
    </div>
  );
}
