'use client';

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ListChecks, Pencil, BookOpen } from "lucide-react";
import IconTile from "@/components/IconTile";
import CafePicker from "@/components/CafePicker"; // оставляем, но используем только если нет фиксированной
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

  const [auth, setAuth] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("auth");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setAuth(parsed);
        console.log("[DEBUG] Auth загружен:", parsed);
      } catch (e) {
        console.error("[DEBUG] Ошибка парсинга auth:", e);
      }
    }
    setLoadingAuth(false);
  }, []);

  const isOwner = auth?.role === "owner";
  const isManager = auth?.role === "manager";
  const isManagerOrOwner = isOwner || isManager;

  // Фиксированная кофейня из профиля пользователя (если есть)
  const fixedCafe = auth?.cafe || auth?.fixed_cafe; // поддерживаем оба варианта названия поля

  // Если кофейня фиксирована — используем её
  // Если нет — берём из URL или показываем выбор
  const cafeFromUrl = sp.get("cafe") || "";
  const currentCafe = fixedCafe || cafeFromUrl;

  // Дата (по умолчанию сегодняшняя)
  const date = sp.get("date") || formatDateDDMMYYYY(new Date());

  // Если пользователь не авторизован — показываем вход
  if (loadingAuth) {
    return <div className="p-8 text-center">Проверка авторизации...</div>;
  }

  if (!auth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
          <h1 className="text-3xl font-bold text-amber-700 mb-6 text-center">Вход в систему</h1>
          {/* Здесь твоя форма логина — вставь свою */}
          <form>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Логин</label>
              <input type="text" className="w-full p-3 border rounded-lg" placeholder="Логин" />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">Пароль</label>
              <input type="password" className="w-full p-3 border rounded-lg" placeholder="Пароль" />
            </div>
            <button type="submit" className="w-full py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition">
              Войти
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Авторизован — показываем чек-листы
  return (
    <div className="max-w-5xl mx-auto p-4 space-y-8">
      <h1 className="text-3xl font-bold text-center text-amber-700">Чек-листы</h1>

      {/* Блок с текущей кофейней */}
      <div className="bg-white border rounded-xl p-6 shadow-sm text-center">
        <p className="text-lg font-medium text-gray-800">
          Текущая кофейня: <span className="text-amber-600 font-bold">{currentCafe || "— не выбрана —"}</span>
        </p>
        {fixedCafe && (
          <p className="text-sm text-gray-500 mt-2">
            Кофейня зафиксирована по вашей роли
          </p>
        )}
        {!fixedCafe && !currentCafe && (
          <div className="mt-4">
            <CafePicker className="max-w-md mx-auto" /> {/* показываем выбор только если нет фиксированной */}
          </div>
        )}
      </div>

      {/* Основные кнопки */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <IconTile
          title="Заполнить чек-лист"
          icon={<Pencil className="w-10 h-10" />}
          tone="from-green-500 to-emerald-600"
          href={withParams("/roznica/checklist/fill", { cafe: currentCafe, date })}
          className="py-12 text-2xl"
        />
        <IconTile
          title="Просмотр чек-листов"
          icon={<ListChecks className="w-10 h-10" />}
          tone="from-blue-500 to-indigo-600"
          href={withParams("/roznica/checklist/view", { cafe: currentCafe, date })}
          className="py-12 text-2xl"
        />

        {/* Учебный материал — доступно менеджерам и владельцу */}
        {isManagerOrOwner && (
          <IconTile
            title="Учебный материал"
            icon={<BookOpen className="w-10 h-10" />}
            tone="from-teal-500 to-cyan-600"
            href="/roznica/training"
            className="py-12 text-2xl"
          />
        )}
      </div>

      {/* Кнопка редактора — только для владельца */}
      {isOwner && (
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
        Дата: <b>{date}</b>
        {auth?.login && (
          <>
            {" · Пользователь: "}
            <b>{auth.login}</b> (
            {auth.role === "owner"
              ? "Владелец"
              : auth.role === "manager"
              ? "Менеджер"
              : "Сотрудник"}
            )
          </>
        )}
      </div>
    </div>
  );
}