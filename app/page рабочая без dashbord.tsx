'use client';
import { Users, Coffee, TrendingUp, Store, ClipboardList, ClipboardCheck } from 'lucide-react';
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const [auth, setAuth] = useState<{
    login: string;
    role: string;
    cafe?: string;
    fullName?: string;
    position?: string
  } | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authStr = localStorage.getItem("auth");
    if (!authStr) {
      router.push("/auth/login");
      return;
    }
    const parsed = JSON.parse(authStr);
    setAuth(parsed);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-xl text-gray-600">Загрузка...</p>
      </div>
    );
  }

  if (!auth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-xl text-gray-600">Перенаправление на вход...</p>
      </div>
    );
  }

  const isOwner = auth.role === "owner";
  const isManager = auth.role === "manager";
  const isManagerOrOwner = isOwner || isManager;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Приветствие */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-amber-700">
            Добро пожаловать, {auth.fullName || auth.login}!
          </h1>
          <p className="text-2xl text-gray-700 mt-4">
            {auth.position || auth.role}
            {auth.cafe && ` · ${auth.cafe}`}
          </p>
        </div>
        <p className="text-center text-xl text-gray-700 mb-16">
          Панель управления Latteshka
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Задачи — для всех */}
          <Link
            href="/roznica/tasks"
            className="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-2xl transition transform hover:-translate-y-2"
          >
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-800">Задачи</h2>
            <p className="text-gray-600 mt-2">Свои задачи и задачи от менеджера</p>
          </Link>

          {/* Чек-листы — для всех */}
          <Link
            href="/roznica/checklist"
            className="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-2xl transition transform hover:-translate-y-2"
          >
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-bold text-gray-800">Чек-листы кофеен</h2>
            <p className="text-gray-600 mt-2">Заполнение и просмотр ежедневных проверок</p>
          </Link>

          {/* Контроль — для менеджеров и владельца */}
          {isManagerOrOwner && (
            <Link
              href="/roznica/control/performance"
              className="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-2xl transition transform hover:-translate-y-2"
            >
              <div className="text-6xl mb-4">📊</div>
              <h2 className="text-2xl font-bold text-gray-800">Контроль</h2>
              <p className="text-gray-600 mt-2">Выполнение чек-листов по кофейням и ролям</p>
            </Link>
          )}

          {/* Чек-лист менеджера — для менеджеров и владельца */}
          {isManagerOrOwner && (
            <Link
              href="/roznica/checklist-manager"
              className="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-2xl transition transform hover:-translate-y-2"
            >
              <div className="text-6xl mb-4">📝</div>
              <h2 className="text-2xl font-bold text-gray-800">Чек-лист менеджера</h2>
              <p className="text-gray-600 mt-2">Ежедневная проверка от менеджера</p>
            </Link>
          )}

          {/* Проверка менеджера — только для владельца */}
          {isOwner && (
            <Link
              href="/roznica/owner/manager-check"
              className="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-2xl transition transform hover:-translate-y-2"
            >
              <div className="text-6xl mb-4">🔍</div>
              <h2 className="text-2xl font-bold text-gray-800">Проверка менеджера</h2>
              <p className="text-gray-600 mt-2">Просмотр выполненных чек-листов за любую дату</p>
            </Link>
          )}

          {/* Остальные плитки — только для владельца */}
          {isOwner && (
            <>
              <Link
                href="/otchety"
                className="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-2xl transition transform hover:-translate-y-2"
              >
                <div className="text-6xl mb-4">📈</div>
                <h2 className="text-2xl font-bold text-gray-800">Отчёты</h2>
                <p className="text-gray-600 mt-2">Кассы, ежедневные, еженедельные и ежемесячные отчёты</p>
              </Link>

              <Link
                href="/production"
                className="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-2xl transition transform hover:-translate-y-2"
              >
                <div className="text-6xl mb-4">📦</div>
                <h2 className="text-2xl font-bold text-gray-800">Заявка</h2>
                <p className="text-gray-600 mt-2">Производство, заявки на товары</p>
              </Link>

              <Link
                href="/loyalty"
                className="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-2xl transition transform hover:-translate-y-2"
              >
                <div className="text-6xl mb-4">🎁</div>
                <h2 className="text-2xl font-bold text-gray-800">Система лояльности</h2>
                <p className="text-gray-600 mt-2">Анкета на регистрацию и список гостей</p>
              </Link>

              {/* Заглушки */}
              <div className="bg-gray-100 rounded-2xl p-8 text-center opacity-60 cursor-not-allowed">
                <div className="text-6xl mb-4">📊</div>
                <h2 className="text-2xl font-bold text-gray-500">Аналитика</h2>
                <p className="text-gray-500 mt-2">Скоро...</p>
              </div>

              <div className="bg-gray-100 rounded-2xl p-8 text-center opacity-60 cursor-not-allowed">
                <div className="text-6xl mb-4">👥</div>
                <h2 className="text-2xl font-bold text-gray-500">Сотрудники</h2>
                <p className="text-gray-500 mt-2">Скоро...</p>
              </div>

              <div className="bg-gray-100 rounded-2xl p-8 text-center opacity-60 cursor-not-allowed">
                <div className="text-6xl mb-4">⚙️</div>
                <h2 className="text-2xl font-bold text-gray-500">Настройки</h2>
                <p className="text-gray-500 mt-2">Скоро...</p>
              </div>

              <div className="bg-gray-100 rounded-2xl p-8 text-center opacity-60 cursor-not-allowed">
                <div className="text-6xl mb-4">🛒</div>
                <h2 className="text-2xl font-bold text-gray-500">Заказы</h2>
                <p className="text-gray-500 mt-2">Скоро...</p>
              </div>
            </>
          )}
        </div>

        <div className="text-center mt-16">
          <p className="text-gray-500 text-lg">
            {isOwner
              ? "Это главная панель владельца. Здесь будут все модули приложения."
              : isManager
              ? "Панель менеджера: доступ к задачам, чек-листам и контролю"
              : "Панель сотрудника: задачи и чек-листы"}
          </p>
        </div>
      </div>
    </div>
  );
}