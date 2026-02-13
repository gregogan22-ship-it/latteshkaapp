"use client";

import { useState, useEffect } from "react";
import { Calendar, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbxmfkxBTy0WA0w2hhFplk9hBEwEmaL8dNhdd47tUYgcwPD6-HtAaQUfpJ2Z1XmwTduD/exec";

const CAFE_NAMES = [
  "Ашан",
  "Эссе",
  "Кофеин",
  "Адидас",
  "Тренева",
  "Аптека",
  "КМ",
  "ЦУМ",
  "Ленина",
  "Кипарис 1",
  "Кипарис 2",
];

export default function PerformancePage() {
  // Роли внутри компонента
  const ROLES = ["Кассир", "Бариста", "Феи Чистоты", "Разогрев/зал", "Окошко"];

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedCafe, setSelectedCafe] = useState<string>("all");
  const [allCafeStats, setAllCafeStats] = useState<Record<string, Record<string, { done: number; total: number; percent: number; categories?: Record<string, { done: number; total: number; percent: number }> }>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllStats();
  }, [selectedDate]);

  async function fetchAllStats() {
    setLoading(true);
    try {
      const [yyyy, mm, dd] = selectedDate.split("-");
      const gasDate = `${dd}.${mm}.${yyyy}`;
      console.log("Отправляем дату в GAS:", gasDate);

      const statsMap: Record<string, any> = {};

      const promises = CAFE_NAMES.map(async (cafe) => {
        const url = new URL(GAS_ENDPOINT);
        url.searchParams.set("action", "stats");
        url.searchParams.set("date", gasDate);
        url.searchParams.set("cafe", cafe);

        console.log("Запрос к GAS для", cafe, ":", url.toString());

        try {
          const res = await fetch(url.toString());
          const data = await res.json();
          console.log(`Ответ от GAS для ${cafe}:`, data);

          if (data.ok && data.stats && typeof data.stats === "object") {
            statsMap[cafe] = data.stats;
          } else {
            statsMap[cafe] = {};
            console.warn(`Нет данных или ошибка для ${cafe}`);
          }
        } catch (e) {
          console.error(`Ошибка для ${cafe}:`, e);
          statsMap[cafe] = {};
        }
      });

      await Promise.all(promises);
      setAllCafeStats(statsMap);
    } catch (e) {
      console.error("Ошибка загрузки статистики:", e);
      toast.error("Ошибка связи с таблицей");
      setAllCafeStats({});
    } finally {
      setLoading(false);
    }
  }

  const displayCafes = selectedCafe === "all" ? CAFE_NAMES : [selectedCafe];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
            <h1 className="text-3xl font-bold text-amber-700">Выполнение чек-листов</h1>
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-gray-600" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-3 border rounded-xl text-lg"
              />
              <button
                onClick={fetchAllStats}
                disabled={loading}
                className="px-4 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Обновить
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Кофейня</label>
            <select
              value={selectedCafe}
              onChange={(e) => setSelectedCafe(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl text-lg"
            >
              <option value="all">Все кофейни</option>
              {CAFE_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="text-center text-gray-600 py-10 text-xl">Загрузка статистики...</p>
          ) : (
            <div className="space-y-12">
              {displayCafes.map((cafe) => {
                const cafeStats = allCafeStats[cafe] || {};
                console.log(`Статистика для ${cafe}:`, cafeStats);

                // Определяем роли для этой кофейни
                const isSpecialCafe = ["Кипарис 1", "Кипарис 2", "Ленина"].includes(cafe);
                const rolesToShow = isSpecialCafe
                  ? ["Окошко"]
                  : ROLES.filter(role => role !== "Окошко");

                let totalDone = 0;
                let totalItems = 0;

                rolesToShow.forEach((role) => {
                  const roleData = cafeStats[role] || { done: 0, total: 0, percent: 0, categories: {} };
                  totalDone += roleData.done;
                  totalItems += roleData.total;
                });

                const overallPercent = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0;

                return (
                  <div key={cafe} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-8 border shadow-lg">
                    <div className="flex justify-between items-center mb-8">
                      <h2 className="text-3xl font-bold">{cafe}</h2>
                      <div className="text-right">
                        <p className={`text-5xl font-bold ${overallPercent >= 90 ? "text-green-600" : overallPercent >= 70 ? "text-amber-600" : "text-red-600"}`}>
                          {overallPercent}%
                        </p>
                        <p className="text-lg text-gray-600">Общий процент выполнения</p>
                      </div>
                    </div>

                    <div className="space-y-8">
                      {rolesToShow.map((role) => {
                        const roleData = cafeStats[role] || { done: 0, total: 0, percent: 0, categories: {} };

                        if (roleData.total === 0) {
                          return (
                            <div key={role} className="bg-white rounded-xl p-6 shadow">
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-2xl font-bold">{role}</h3>
                                <p className="text-3xl font-bold text-gray-500">Нет данных</p>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={role} className="bg-white rounded-xl p-6 shadow">
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="text-2xl font-bold">{role}</h3>
                              <p className={`text-3xl font-bold ${roleData.percent >= 90 ? "text-green-600" : roleData.percent >= 70 ? "text-amber-600" : "text-red-600"}`}>
                                {roleData.percent}%
                              </p>
                            </div>

                            <div className="text-sm text-gray-500 mb-4">
                              Выполнено: {roleData.done} из {roleData.total}
                            </div>

                            {/* Отображение категорий, если они есть */}
                            {roleData.categories && Object.keys(roleData.categories).length > 0 && (
                              <div className="pl-4 space-y-2 border-t pt-4 mt-4">
                                <p className="text-sm font-medium text-gray-700">По категориям:</p>
                                {Object.entries(roleData.categories).map(([catName, catData]: [string, any]) => (
                                  <div key={catName} className="flex justify-between items-center">
                                    <p className="text-base">{catName}</p>
                                    <p className={`text-xl font-bold ${catData.percent >= 90 ? "text-green-600" : catData.percent >= 70 ? "text-amber-600" : "text-red-600"}`}>
                                      {catData.percent}%
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}