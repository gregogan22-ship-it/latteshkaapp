'use client';
import { Users, Coffee, TrendingUp, Store, ClipboardList, ClipboardCheck } from 'lucide-react';
import Link from "next/link";
import { useEffect, useState } from "react";

const SUMMARY_GAS_URL = "https://script.google.com/macros/s/AKfycbzPfDDHmJ_CCFqQ0h4iY5zfk1l9lR6VUu9CZ2KLcma2VYdBGD48Xclb7ccCDOsEgsRU9g/exec";

export default function Dashboard() {
  const [auth, setAuth] = useState<{
    login: string;
    role: string;
    cafe?: string;
    fullName?: string;
    position?: string
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState<string[][]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);

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

  // Загрузка сводки только для владельца
  useEffect(() => {
    if (auth?.role !== "owner" && auth?.role !== "Владелец") return;

    const fetchSummary = async () => {
      setSummaryLoading(true);
      try {
        const res = await fetch(SUMMARY_GAS_URL);
        if (!res.ok) throw new Error("Ошибка загрузки сводки");
        const data = await res.json();
        setSummaryData(data);
      } catch (e) {
        console.error("Ошибка сводки:", e);
      } finally {
        setSummaryLoading(false);
      }
    };
    fetchSummary();
  }, [auth]);

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

  const isOwner = auth.role === "owner" || auth.role === "Владелец";
  const isManager = [
    "manager",
    "Менеджер",
    "старший менеджер",
    "Старший менеджер",
    "помощник менеджера",
    "Помощник менеджера"
  ].includes(auth.role?.toLowerCase?.() || "");

  const isManagerOrOwner = isOwner || isManager;

  // Обработка данных сводки (только таблица, без ИТОГО)
  const title = summaryData[0]?.[0] || 'Сводка';
  const rows = summaryData.slice(1);

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

        {/* Блок Сводка — только для владельца */}
        {isOwner && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-12 border border-amber-200">
            <h2 className="text-3xl font-bold text-amber-800 mb-8 text-center">
              {title}
            </h2>

            {summaryLoading ? (
              <p className="text-center text-gray-600 text-lg">Загрузка сводки...</p>
            ) : rows.length === 0 ? (
              <p className="text-center text-gray-500 text-lg">Нет данных в сводке</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <tbody>
                    {rows.map((row, i) => {
                      const label = row[0] && typeof row[0] === 'string' ? row[0] : '';
                      let valueRaw = row[1] || '';

                      // Форматируем числа в проценты
                      let valueDisplay = valueRaw;
                      if (valueRaw && (typeof valueRaw === 'number' || !isNaN(parseFloat(valueRaw)))) {
                        const num = parseFloat(valueRaw);
                        valueDisplay = `${(num * 100).toFixed(2)}%`;
                      }

                      return (
                        <tr key={i} className="border-b last:border-b-0">
                          <td className="py-4 pr-8 font-medium text-gray-800 text-xl">
                            {label}
                          </td>
                          <td className="py-4 text-right text-3xl font-bold text-gray-900">
                            {valueDisplay}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Плитки */}
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

          {/* Контроль — для менеджеров, старших менеджеров, помощников и владельца */}
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

          {/* Остальные плитки — только для владельца */}
          {isOwner && (
            <>
              {/* Чек-лист менеджера */}
              <Link
                href="/roznica/checklist-manager"
                className="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-2xl transition transform hover:-translate-y-2"
              >
                <div className="text-6xl mb-4">📝</div>
                <h2 className="text-2xl font-bold text-gray-800">Чек-лист менеджера</h2>
                <p className="text-gray-600 mt-2">Ежедневная проверка от менеджера</p>
              </Link>

              {/* Создать сотрудника */}
              <Link
                href="/roznica/users/create"
                className="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-2xl transition transform hover:-translate-y-2"
              >
                <div className="text-6xl mb-4">👤</div>
                <h2 className="text-2xl font-bold text-gray-800">Создать сотрудника</h2>
                <p className="text-gray-600 mt-2">Добавление нового пользователя для задач</p>
              </Link>

              {/* Проверка менеджера */}
              <Link
                href="/roznica/owner/manager-check"
                className="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-2xl transition transform hover:-translate-y-2"
              >
                <div className="text-6xl mb-4">🔍</div>
                <h2 className="text-2xl font-bold text-gray-800">Проверка менеджера</h2>
                <p className="text-gray-600 mt-2">Просмотр выполненных чек-листов за любую дату</p>
              </Link>

              {/* Отчёты */}
              <Link
                href="/otchety"
                className="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-2xl transition transform hover:-translate-y-2"
              >
                <div className="text-6xl mb-4">📈</div>
                <h2 className="text-2xl font-bold text-gray-800">Отчёты</h2>
                <p className="text-gray-600 mt-2">Кассы, ежедневные, еженедельные и ежемесячные отчёты</p>
              </Link>

              {/* Заявка */}
              <Link
                href="/production"
                className="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-2xl transition transform hover:-translate-y-2"
              >
                <div className="text-6xl mb-4">📦</div>
                <h2 className="text-2xl font-bold text-gray-800">Заявка</h2>
                <p className="text-gray-600 mt-2">Производство, заявки на товары</p>
              </Link>

              {/* Система лояльности */}
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
              ? "Это главная панель владельца. Здесь все модули приложения."
              : isManager
              ? "Панель менеджера: доступ к задачам, чек-листам и контролю"
              : "Панель сотрудника: задачи и чек-листы"}
          </p>
        </div>
      </div>
    </div>
  );
}