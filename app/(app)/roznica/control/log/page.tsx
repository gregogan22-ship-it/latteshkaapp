"use client";

import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import toast from "react-hot-toast";

const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbz2ph8qKyKh7xiwORDebIzb1tJ23Rf5L1M-lyf-43FkhzVpgfoLNQ--fwNO4tcq_Idz/exec";

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

const ROLES = ["Кассир", "Бариста", "Феи Чистоты", "Разогрев/зал","Менеджер"];

export default function PerformancePage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedCafe, setSelectedCafe] = useState<string>("all");
  const [allCafeStats, setAllCafeStats] = useState<Record<string, Record<string, Record<string, { done: number; total: number }>>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllStats();
  }, [selectedDate]);

  async function fetchAllStats() {
    setLoading(true);
    try {
      const [yyyy, mm, dd] = selectedDate.split("-");
      const gasDate = `${dd}.${mm}.${yyyy}`;

      const statsMap: Record<string, Record<string, Record<string, { done: number; total: number }>>> = {};

      const promises = CAFE_NAMES.map(async (cafe) => {
        const url = new URL(GAS_ENDPOINT);
        url.searchParams.set("action", "stats");
        url.searchParams.set("date", gasDate);
        url.searchParams.set("cafe", cafe);

        try {
          const res = await fetch(url.toString());
          const data = await res.json();

          if (data.ok && data.stats && typeof data.stats === "object") {
            statsMap[cafe] = data.stats;
          } else {
            statsMap[cafe] = {};
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

                // Общий процент по кофейне — среднее от процентов ролей
                const roleAverages = ROLES.map((role) => {
                  const categories = cafeStats[role] || {};
                  const categoryPercents = Object.values(categories).map((cat) => 
                    cat.total > 0 ? Math.round((cat.done / cat.total) * 100) : 0
                  );
                  return categoryPercents.length > 0 
                    ? Math.round(categoryPercents.reduce((a, b) => a + b, 0) / categoryPercents.length)
                    : 0;
                });

                const totalPercent = roleAverages.length > 0 
                  ? Math.round(roleAverages.reduce((a, b) => a + b, 0) / roleAverages.length)
                  : 0;

                return (
                  <div key={cafe} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-8 border shadow-lg">
                    <div className="flex justify-between items-center mb-8">
                      <h2 className="text-3xl font-bold">{cafe}</h2>
                      <div className="text-right">
                        <p className={`text-5xl font-bold ${totalPercent >= 90 ? "text-green-600" : totalPercent >= 70 ? "text-amber-600" : "text-red-600"}`}>
                          {totalPercent}%
                        </p>
                        <p className="text-lg text-gray-600">Общий процент выполнения</p>
                      </div>
                    </div>

                    <div className="space-y-8">
                      {ROLES.map((role) => {
                        const roleCategories = cafeStats[role] || {};

                        // Список всех категорий (даже если 0%)
                        const categoryList = Object.entries(roleCategories).map(([catName, st]) => ({
                          name: catName,
                          percent: st.total > 0 ? Math.round((st.done / st.total) * 100) : 0,
                          done: st.done,
                          total: st.total,
                        }));

                        // Если категорий нет — показываем "Нет данных"
                        if (categoryList.length === 0) {
                          return (
                            <div key={role} className="bg-white rounded-xl p-6 shadow">
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-2xl font-bold">{role}</h3>
                                <p className="text-3xl font-bold text-red-600">0%</p>
                              </div>
                              <p className="text-gray-600">Нет данных</p>
                            </div>
                          );
                        }

                        const rolePercent = Math.round(categoryList.reduce((s, c) => s + c.percent, 0) / categoryList.length);

                        return (
                          <div key={role} className="bg-white rounded-xl p-6 shadow">
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="text-2xl font-bold">{role}</h3>
                              <p className={`text-3xl font-bold ${rolePercent >= 90 ? "text-green-600" : rolePercent >= 70 ? "text-amber-600" : "text-red-600"}`}>
                                {rolePercent}%
                              </p>
                            </div>

                            <div className="space-y-3">
                              {categoryList.map((cat) => (
                                <div key={cat.name} className="flex justify-between items-center py-2 border-b">
                                  <p className="text-lg">{cat.name}</p>
                                  <div className="text-right">
                                    <p className={`text-2xl font-bold ${cat.percent >= 90 ? "text-green-600" : cat.percent >= 70 ? "text-amber-600" : "text-red-600"}`}>
                                      {cat.percent}%
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      {cat.done} / {cat.total}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
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