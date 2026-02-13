"use client";

import React, { useEffect, useState } from "react";
import { Users, Coffee, TrendingUp, Store, ClipboardCheck } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const [auth, setAuth] = useState<{ login: string; role: string; cafe?: string; fullName?: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("auth");
    if (stored) {
      setAuth(JSON.parse(stored));
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50">
      <div className="pt-12 px-6 pb-24">
        {/* Заголовок */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
            LatteshkaAPP
          </h1>
          <p className="text-xl text-gray-600 mt-4">Управление сетью кофеен</p>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
          <div className="bg-white/90 backdrop-blur rounded-3xl shadow-2xl p-8 text-center">
            <Users className="w-16 h-16 text-purple-600 mx-auto mb-4" />
            <p className="text-5xl font-bold text-purple-600">2 750+</p>
            <p className="text-gray-600 mt-2 text-lg">Всего карт выдано</p>
          </div>
          <div className="bg-white/90 backdrop-blur rounded-3xl shadow-2xl p-8 text-center">
            <Coffee className="w-16 h-16 text-amber-600 mx-auto mb-4" />
            <p className="text-5xl font-bold text-amber-600">127</p>
            <p className="text-gray-600 mt-2 text-lg">Карт за сегодня</p>
          </div>
          <div className="bg-white/90 backdrop-blur rounded-3xl shadow-2xl p-8 text-center">
            <TrendingUp className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <p className="text-5xl font-bold text-green-600">Ашан</p>
            <p className="text-gray-600 mt-2 text-lg">Лидер по выдаче</p>
          </div>
        </div>

        {/* Новое меню для владельца */}
        {auth?.role === "owner" && (
          <div className="max-w-5xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
              Дополнительные инструменты владельца
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Link
                href="/roznica/owner/manager-check"
                className="bg-white/90 backdrop-blur rounded-3xl shadow-2xl p-8 text-center hover:shadow-3xl transition-all duration-300 group"
              >
                <ClipboardCheck className="w-16 h-16 text-indigo-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Проверка менеджера</h3>
                <p className="text-gray-600">Просмотр выполненных чек-листов за любую дату</p>
              </Link>

              {/* Можно добавить другие пункты меню позже */}
              {/* <div className="bg-white/90 backdrop-blur rounded-3xl shadow-2xl p-8 text-center">
                <Store className="w-16 h-16 text-pink-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Аналитика кофеен</h3>
                <p className="text-gray-600">Скоро...</p>
              </div> */}
            </div>
          </div>
        )}

        <div className="text-center">
          <p className="text-2xl text-gray-700">Выберите раздел внизу ↓</p>
        </div>
      </div>
    </div>
  );
}