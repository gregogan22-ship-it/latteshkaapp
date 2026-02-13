// ОБНОВЛЕНО: Журнал действий доступен только для manager — 08.01.2026
"use client";

import Link from "next/link";
import { ClipboardList, Users, CheckCircle2, FileText } from "lucide-react";
import { useState, useEffect } from "react";

export default function RoznicaPage() {
  const [auth, setAuth] = useState<{ login: string; role: string; cafe?: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("auth");
    if (stored) {
      setAuth(JSON.parse(stored));
    }
  }, []);

  const isManager = auth?.role === "manager";

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 pb-20">
      <div className="pt-12 px-6">
        {/* Заголовок */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600">
            Розница
          </h1>
          <p className="text-xl text-gray-600 mt-4">Управление торговыми точками</p>
        </div>

        {/* Динамическая сетка плиток */}
        <div className={`max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-${isManager ? "4" : "3"} gap-8`}>
          {/* Чек-листы */}
          <Link
            href="/roznica/checklist"
            className="group block transform transition-all hover:scale-105"
          >
            <div className="bg-white/90 backdrop-blur rounded-3xl shadow-2xl p-10 text-center hover:shadow-3xl">
              <ClipboardList className="w-20 h-20 text-teal-600 mx-auto mb-6 group-hover:animate-bounce" />
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Чек-листы</h2>
              <p className="text-gray-600 text-lg">
                Ежедневные проверки, открытие/закрытие смены
              </p>
            </div>
          </Link>

          {/* Система лояльности */}
          <Link
            href="/guests"
            className="group block transform transition-all hover:scale-105"
          >
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl shadow-2xl p-10 text-center text-white hover:shadow-3xl">
              <Users className="w-20 h-20 mx-auto mb-6 group-hover:animate-pulse" />
              <h2 className="text-3xl font-bold mb-4">Система лояльности</h2>
              <p className="text-lg opacity-90">
                Регистрация карт · QR-коды · Статистика гостей
              </p>
            </div>
          </Link>

          {/* Контроль — статистика выполнения */}
          <Link
            href="/roznica/control/performance"
            className="group block transform transition-all hover:scale-105"
          >
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl shadow-2xl p-10 text-center text-white hover:shadow-3xl">
              <CheckCircle2 className="w-20 h-20 mx-auto mb-6 group-hover:animate-pulse" />
              <h2 className="text-3xl font-bold mb-4">Контроль</h2>
              <p className="text-lg opacity-90">
                Выполнение чек-листов по кофейням и ролям
              </p>
            </div>
          </Link>

          {/* Журнал действий — только для manager */}
          {isManager && (
            <Link
              href="/roznica/control/log"
              className="group block transform transition-all hover:scale-105"
            >
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-2xl p-10 text-center text-white hover:shadow-3xl">
                <FileText className="w-20 h-20 mx-auto mb-6 group-hover:animate-pulse" />
                <h2 className="text-3xl font-bold mb-4">Журнал действий</h2>
                <p className="text-lg opacity-90">
                  Лог всех операций пользователей
                </p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}