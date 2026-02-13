"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { Route } from "next";
import { CAFES } from "@/components/cafes";

type Props = { className?: string };

const asRoute = (s: string) => s as unknown as Route;

export default function CafePicker({ className }: Props) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const cafeFromUrl = sp.get("cafe") || "";
  const date = sp.get("date") || "";
  const user = sp.get("user") || "";

  const [userRole, setUserRole] = useState<string>("");
  const [mounted, setMounted] = useState(false);          // ← добавлено

  useEffect(() => {
    setMounted(true);                                     // ← добавлено первым

    const auth = localStorage.getItem("auth");
    if (auth) {
      try {
        const parsed = JSON.parse(auth);
        const role = parsed?.role || "";
        setUserRole(role.toLowerCase());
        console.log("Роль пользователя:", role);
      } catch (e) {
        console.error("Ошибка парсинга auth:", e);
      }
    } else {
      console.log("auth не найден в localStorage");
    }
  }, []);

  const allCafes = CAFES;

  const availableCafes = useMemo(() => {
    const roleLower = userRole.toLowerCase();
    console.log("Проверка роли для показа Менеджера:", roleLower);

    if (
      roleLower.includes("менеджер") ||
      roleLower.includes("manager") ||
      roleLower.includes("владелец") ||
      roleLower.includes("owner")
    ) {
      console.log("Показываем все кофейни, включая Менеджер");
      return allCafes;
    }

    console.log("Скрываем Менеджер для обычного сотрудника");
    return allCafes.filter((c) => c.title !== "Менеджер");
  }, [userRole, allCafes]);   // ← добавил allCafes в зависимости (на всякий случай, хотя CAFES статичный)

  // дефолт из cookie/localStorage
  useEffect(() => {
    if (!cafeFromUrl && mounted) {                        // ← добавил && mounted
      const saved =
        localStorage.getItem("cafe") || readCookie("cafe") || "";
      
      if (saved && availableCafes.some((c) => c.id === saved || c.title === saved)) {
        const q = new URLSearchParams(sp.toString());
        q.set("cafe", saved);
        router.replace(asRoute(`${pathname}?${q.toString()}`), { scroll: false });
      }
    }
  }, [cafeFromUrl, availableCafes, pathname, router, sp, mounted]);

  const value = useMemo(() => cafeFromUrl || "", [cafeFromUrl]);

  function onChangeCafe(nextCafe: string) {
    const q = new URLSearchParams(sp.toString());
    if (nextCafe) q.set("cafe", nextCafe);
    else q.delete("cafe");
    router.push(asRoute(`${pathname}?${q.toString()}`));
    
    localStorage.setItem("cafe", nextCafe);
    document.cookie = `cafe=${encodeURIComponent(nextCafe)}; path=/; max-age=31536000`;
  }

  return (
    <div className={className}>
      <label className="block text-sm mb-1">Кофейня</label>

      {mounted ? (
        <select
          value={value}
          onChange={(e) => onChangeCafe(e.target.value)}
          className="w-full border rounded p-2"
        >
          <option value="">— выберите кофейню —</option>
          {availableCafes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      ) : (
        <div className="w-full border rounded p-2 bg-gray-100 h-10 animate-pulse" />
        // ↑ placeholder, чтобы высота и ширина совпадали → нет скачков
      )}

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