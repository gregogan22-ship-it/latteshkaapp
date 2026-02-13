"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";                 // ⬅️ добавили
import { CAFES } from "@/components/cafes";

type Props = { className?: string };

const asRoute = (s: string) => s as unknown as Route; // ⬅️ добавили

export default function CafePicker({ className }: Props) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const cafeFromUrl = sp.get("cafe") || "";
  const date = sp.get("date") || "";
  const user = sp.get("user") || "";

  // дефолт из cookie/localStorage (когда параметра в URL нет)
  useEffect(() => {
    if (!cafeFromUrl) {
      const saved =
        typeof window !== "undefined"
          ? (localStorage.getItem("cafe") || readCookie("cafe") || "")
          : "";
      if (saved) {
        const q = new URLSearchParams(sp.toString());
        q.set("cafe", saved);
        router.replace(asRoute(`${pathname}?${q.toString()}`)); // ⬅️ было router.replace(...строка)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(() => cafeFromUrl || "", [cafeFromUrl]);

  function onChangeCafe(nextCafe: string) {
    const q = new URLSearchParams(sp.toString());
    if (nextCafe) q.set("cafe", nextCafe);
    else q.delete("cafe");
    router.push(asRoute(`${pathname}?${q.toString()}`)); // ⬅️ было router.push(...строка)
    // запоминаем локально — пригодится, когда будет привязка к пользователю
    if (typeof window !== "undefined") {
      localStorage.setItem("cafe", nextCafe);
      document.cookie = `cafe=${encodeURIComponent(nextCafe)}; path=/; max-age=31536000`;
    }
  }

  return (
    <div className={className}>
      <label className="block text-sm mb-1">Кофейня</label>
      <select
        value={value}
        onChange={(e) => onChangeCafe(e.target.value)}
        className="w-full border rounded p-2"
      >
        <option value="">— выберите кофейню —</option>
        {CAFES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>
      {/* Подсказка: покажем активные параметры (полезно для дебага) */}
      <div className="text-xs text-gray-500 mt-1">
        {value ? `Выбрано: ${value}` : "Не выбрано"}
        {date && ` · Дата: ${date}`}
        {user && ` · Пользователь: ${user}`}
      </div>
    </div>
  );
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}
