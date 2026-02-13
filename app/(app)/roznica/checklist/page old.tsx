"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ListChecks, Pencil } from "lucide-react";
import IconTile from "@/components/IconTile";
import CafePicker from "@/components/CafePicker";
import { formatDateDDMMYYYY } from "@/lib/checklist/save";
import Link from "next/link";

function withParams(href: string, params: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  const joiner = href.includes("?") ? "&" : "?";
  return `${href}${joiner}${q.toString()}`;
}

export default function ChecklistHome() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const cafe = sp.get("cafe") || "";
  const date = sp.get("date") || formatDateDDMMYYYY(new Date());
  const user = sp.get("user") || "";

  const baseParams = useMemo(() => ({ cafe, date, user }), [cafe, date, user]);

  // Проверка роли из auth
  const auth = typeof window !== "undefined" ? localStorage.getItem("auth") : null;
  const parsedAuth = auth ? JSON.parse(auth) : null;
  const userRole = parsedAuth?.role || "";

  // Разрешён ли просмотр кофейни "Менеджер"
  const canSeeManagerCafe = userRole === "Менеджер" || userRole === "Владелец" || userRole === "owner";

  // Перенаправление на специальную страницу менеджера, если выбрана кофейня "Менеджер"
  useEffect(() => {
    if (cafe === "Менеджер" && canSeeManagerCafe) {
      router.replace("/roznica/checklist-manager"); // ← твоя страница для менеджера
    }
  }, [cafe, canSeeManagerCafe, router]);

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-8">
      <h1 className="text-3xl font-bold text-center text-amber-700">Чек-листы</h1>

      {/* Выбор кофейни */}
      <div className="flex justify-center">
        <CafePicker className="max-w-md" />
      </div>

      {/* Основные кнопки — обычные кофейни */}
      {cafe !== "Менеджер" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <IconTile
            title="Заполнить чек-лист"
            icon={<Pencil className="w-10 h-10" />}
            tone="from-green-500 to-emerald-600"
            href={withParams("/roznica/checklist/fill", baseParams)}
            className="py-12 text-2xl"
          />
          <IconTile
            title="Просмотр чек-листов"
            icon={<ListChecks className="w-10 h-10" />}
            tone="from-blue-500 to-indigo-600"
            href={withParams("/roznica/checklist/view", baseParams)}
            className="py-12 text-2xl"
          />
        </div>
      )}

      {/* Специальные кнопки для менеджера */}
      {cafe === "Менеджер" && canSeeManagerCafe && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <IconTile
            title="Заполнить чек-лист менеджера"
            icon={<Pencil className="w-10 h-10" />}
            tone="from-purple-500 to-violet-600"
            href={withParams("/roznica/checklist-manager/fill", baseParams)}
            className="py-12 text-2xl"
          />
          <IconTile
            title="Просмотр чек-листов менеджера"
            icon={<ListChecks className="w-10 h-10" />}
            tone="from-purple-500 to-violet-600"
            href={withParams("/roznica/checklist-manager/view", baseParams)}
            className="py-12 text-2xl"
          />
        </div>
      )}

      {/* Кнопка редактора — только для владельца */}
      {parsedAuth?.role === "owner" && (
        <div className="flex justify-center mt-8">
          <Link
            href="/roznica/checklist/editor"
            className="px-8 py-4 bg-purple-600 text-white font-bold text-xl rounded-xl shadow-lg hover:bg-purple-700 transition flex items-center gap-3"
          >
            ✏️ Редактор шаблона
          </Link>
        </div>
      )}

      {/* Информация */}
      <div className="text-center text-sm text-gray-600">
        Кофейня: <b>{cafe || "— не выбрано —"}</b> · Дата: <b>{date}</b>
        {parsedAuth?.login && (
          <>
            {" · Пользователь: "}
            <b>{parsedAuth.login}</b> ({parsedAuth.role === "owner" ? "Владелец" : parsedAuth.role === "Менеджер" ? "Менеджер" : "Сотрудник"})
          </>
        )}
      </div>
    </div>
  );
}