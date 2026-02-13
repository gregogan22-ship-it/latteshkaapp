"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import toast, { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";
import { Calendar, Wallet, ChevronRight, ChevronLeft } from "lucide-react";
import Link from "next/link";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

const TIME_SLOTS = ["11:00", "15:00", "19:00", "Закрытие"];

function formatRussianDate(dateString: string) {
  const date = new Date(dateString + "T00:00:00");
  const options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "long",
    year: "numeric",
  };
  return date.toLocaleDateString("ru-RU", options);
}

function getDateNDaysAgo(dateStr: string, days: number) {
  const date = new Date(dateStr + "T00:00:00");
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
}

// Период месяца по умолчанию (11 текущего — 10 следующего)
function getDefaultMonthPeriod(todayStr: string) {
  const today = new Date(todayStr + "T00:00:00");
  const day = today.getDate();
  let start, end;

  if (day >= 11) {
    start = new Date(today.getFullYear(), today.getMonth(), 11);
    end = new Date(today.getFullYear(), today.getMonth() + 1, 10);
  } else {
    start = new Date(today.getFullYear(), today.getMonth() - 1, 11);
    end = new Date(today.getFullYear(), today.getMonth(), 10);
  }

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

export default function KassyViewPage() {
  const today = new Date().toISOString().split("T")[0];
  const defaultPeriod = getDefaultMonthPeriod(today);

  const [selectedDate, setSelectedDate] = useState(today);
  const [periodStart, setPeriodStart] = useState(defaultPeriod.start);
  const [periodEnd, setPeriodEnd] = useState(defaultPeriod.end);

  const [currentLogs, setCurrentLogs] = useState<any[]>([]);
  const [lastWeekLogs, setLastWeekLogs] = useState<any[]>([]);
  const [yesterdayLogs, setYesterdayLogs] = useState<any[]>([]);
  const [lastYearLogs, setLastYearLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCafe, setSelectedCafe] = useState<string>("all");

  const [showComparison, setShowComparison] = useState(false);
  const [manualOverrides, setManualOverrides] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchAllPeriods();
    fetchManualOverrides();
  }, [selectedDate, periodStart, periodEnd]);

  async function fetchAllPeriods() {
    setLoading(true);
    try {
      const periods = [
        { date: selectedDate, setData: setCurrentLogs },
        { date: getDateNDaysAgo(selectedDate, 1), setData: setYesterdayLogs },
        { date: getDateNDaysAgo(selectedDate, 7), setData: setLastWeekLogs },
        { date: getDateNDaysAgo(selectedDate, 365), setData: setLastYearLogs },
      ];

      for (const period of periods) {
        const start = `${period.date}T00:00:00`;
        const end = `${period.date}T23:59:59.999`;

        const { data, error } = await supabase
          .from("cash_logs")
          .select(`
            id,
            log_time,
            cash_amount,
            turnover,
            checks_count,
            shift:shifts (cafe_id)
          `)
          .gte("created_at", start)
          .lt("created_at", end);

        if (error) throw error;

        const cafeIds = [...new Set(data?.map((l) => l.shift?.cafe_id).filter(Boolean))];

        const { data: cafes } = await supabase
          .from("coffee_shops")
          .select("id, name")
          .in("id", cafeIds);

        const cafeMap = Object.fromEntries(cafes?.map((c) => [c.id, c.name]) || []);

        const formatted = data?.map((log) => ({
          ...log,
          cafe_name: cafeMap[log.shift?.cafe_id] || "Неизвестно",
        })) || [];

        period.setData(formatted);
      }
    } catch (err: any) {
      toast.error("Ошибка загрузки: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchManualOverrides() {
    try {
      const { data } = await supabase.from("kassy_manual_overrides").select("metric, value");
      const overrides = Object.fromEntries(data?.map((o) => [o.metric, o.value]) || []);
      setManualOverrides(overrides);
    } catch (e) {
      console.error("Ошибка загрузки ручных правок:", e);
    }
  }

  async function saveManualOverride(metric: string, value: number) {
    try {
      const { error } = await supabase
        .from("kassy_manual_overrides")
        .upsert({ metric, value }, { onConflict: "metric" });

      if (error) throw error;

      setManualOverrides((prev) => ({ ...prev, [metric]: value }));
      toast.success("Значение сохранено");
    } catch (e) {
      toast.error("Ошибка сохранения");
    }
  }

  // Группировка по кофейням и времени
  const groupByCafeAndTime = (logs: any[]) => {
    return logs.reduce((acc, log) => {
      const cafe = log.cafe_name;
      const time = log.log_time || "Неизвестно";

      if (!acc[cafe]) acc[cafe] = {};
      if (!acc[cafe][time]) acc[cafe][time] = { turnover: 0, cash: 0, checks: 0 };

      acc[cafe][time].turnover += log.turnover || 0;
      acc[cafe][time].cash += log.cash_amount || 0;
      acc[cafe][time].checks += log.checks_count || 0;

      return acc;
    }, {} as Record<string, Record<string, { turnover: number; cash: number; checks: number }>>);
  };

  const currentByCafeAndTime = groupByCafeAndTime(currentLogs);
  const lastWeekByCafeAndTime = groupByCafeAndTime(lastWeekLogs);
  const yesterdayByCafeAndTime = groupByCafeAndTime(yesterdayLogs);
  const lastYearByCafeAndTime = groupByCafeAndTime(lastYearLogs);

  const displayedCafes = selectedCafe === "all" ? CAFE_NAMES : [selectedCafe];

  const getBgColor = (current: number, previous: number) => {
    if (current > previous) return "bg-green-100";
    if (current < previous) return "bg-red-100";
    return "bg-gray-50";
  };

  // Дополнительные показатели
  const currentDayTurnover = currentLogs.reduce((s, l) => s + (l.turnover || 0), 0);
  const currentDayCash = currentLogs.reduce((s, l) => s + (l.cash_amount || 0), 0);
  const currentDayChecks = currentLogs.reduce((s, l) => s + (l.checks_count || 0), 0);

  const lastYearDayTurnover = lastYearLogs.reduce((s, l) => s + (l.turnover || 0), 0);
  const lastYearDayChecks = lastYearLogs.reduce((s, l) => s + (l.checks_count || 0), 0);

  const lastWeekChecks = lastWeekLogs.reduce((s, l) => s + (l.checks_count || 0), 0);

  // Средняя касса текущего месяца
  const monthClosingCash = currentLogs
    .filter((l) => l.log_time === "Закрытие")
    .reduce((s, l) => s + (l.cash_amount || 0), 0);

  const daysInPeriod = new Date(periodEnd).getDate() - new Date(periodStart).getDate() + 1;
  const avgCashCurrentMonth = daysInPeriod > 0 ? Math.round(monthClosingCash / daysInPeriod) : 0;

  // Средняя касса прошлого года
  const lastYearMonthClosingCash = lastYearLogs
    .filter((l) => l.log_time === "Закрытие")
    .reduce((s, l) => s + (l.cash_amount || 0), 0);

  const avgCashLastYear = daysInPeriod > 0 ? Math.round(lastYearMonthClosingCash / daysInPeriod) : 0;

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="max-w-full mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
              <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
                <div>
                  <h1 className="text-3xl font-bold flex items-center gap-4">
                    <Wallet className="w-10 h-10" />
                    Итоги по кассам
                  </h1>
                  <p className="text-xl mt-2">{formatRussianDate(selectedDate)}</p>
                </div>
                <div className="flex gap-4">
                  <Link href="/otchety/kassy/add">
                    <button className="bg-white text-blue-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-100 transition">
                      + Внести кассу
                    </button>
                  </Link>
                  <Link href="/otchety/kassy/edit">
                    <button className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-700 transition">
                      ✏️ Редактировать кассу
                    </button>
                  </Link>
                  <Link href="/otchety/kassy/batch-add">
                    <button className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-700 transition">
                      📊 Внести старые данные
                    </button>
                  </Link>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow flex-1">
                  <Calendar className="w-6 h-6 text-gray-600" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="outline-none font-medium w-full"
                  />
                </div>

                <select
                  value={selectedCafe}
                  onChange={(e) => setSelectedCafe(e.target.value)}
                  className="px-6 py-3 rounded-xl border bg-white outline-none font-medium flex-1"
                >
                  <option value="all">Все кофейни</option>
                  {CAFE_NAMES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setShowComparison(!showComparison)}
                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition flex items-center gap-2"
              >
                {showComparison ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                {showComparison ? "Скрыть сравнение" : "Показать сравнение"}
              </button>
            </div>

            <div className="p-4 space-y-12">
              {/* Общий итог по сети */}
              {selectedCafe === "all" && (
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl p-6 border-2 border-indigo-200">
                  <h2 className="text-2xl font-bold text-indigo-900 mb-6 text-center">Общий итог по сети</h2>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-left border-collapse">
                      <thead>
                        <tr className="bg-indigo-100">
                          <th className="sticky left-0 bg-indigo-100 px-4 py-3 text-center text-xs md:text-sm">Время</th>
                          {showComparison && (
                            <>
                              <th className="px-4 py-3 text-center text-xs md:text-sm">Оборот прошлой недели</th>
                              <th className="px-4 py-3 text-center text-xs md:text-sm">Касса прошлой недели</th>
                              <th className="px-4 py-3 text-center text-xs md:text-sm">Оборот прошлого дня</th>
                            </>
                          )}
                          <th className="px-4 py-3 text-center text-xs md:text-sm font-bold">Оборот текущего дня</th>
                          <th className="px-4 py-3 text-center text-xs md:text-sm font-bold">Касса текущего дня</th>
                          <th className="px-4 py-3 text-center text-xs md:text-sm">Количество чеков</th>
                          <th className="px-4 py-3 text-center text-xs md:text-sm">Средний чек</th>
                        </tr>
                      </thead>
                      <tbody>
                        {TIME_SLOTS.map((time) => {
                          const currentTurnover = CAFE_NAMES.reduce((s, cafe) => s + (currentByCafeAndTime[cafe]?.[time]?.turnover || 0), 0);
                          const currentCash = CAFE_NAMES.reduce((s, cafe) => s + (currentByCafeAndTime[cafe]?.[time]?.cash || 0), 0);
                          const currentChecks = CAFE_NAMES.reduce((s, cafe) => s + (currentByCafeAndTime[cafe]?.[time]?.checks || 0), 0);

                          const lastWeekTurnover = CAFE_NAMES.reduce((s, cafe) => s + (lastWeekByCafeAndTime[cafe]?.[time]?.turnover || 0), 0);
                          const lastWeekCash = CAFE_NAMES.reduce((s, cafe) => s + (lastWeekByCafeAndTime[cafe]?.[time]?.cash || 0), 0);

                          const yesterdayTurnover = CAFE_NAMES.reduce((s, cafe) => s + (yesterdayByCafeAndTime[cafe]?.[time]?.turnover || 0), 0);

                          const turnoverBg = getBgColor(currentTurnover, lastWeekTurnover);
                          const cashBg = getBgColor(currentCash, lastWeekCash);

                          const avgCheck = currentChecks > 0 ? Math.round(currentTurnover / currentChecks) : 0;

                          return (
                            <tr key={time} className="border-b hover:bg-indigo-50">
                              <td className="sticky left-0 bg-white px-4 py-3 text-center font-medium text-sm md:text-base">{time}</td>
                              {showComparison && (
                                <>
                                  <td className="px-4 py-3 text-center text-gray-600 text-sm md:text-base">{lastWeekTurnover.toLocaleString()} ₽</td>
                                  <td className="px-4 py-3 text-center text-gray-600 text-sm md:text-base">{lastWeekCash.toLocaleString()} ₽</td>
                                  <td className="px-4 py-3 text-center text-gray-600 text-sm md:text-base">{yesterdayTurnover.toLocaleString()} ₽</td>
                                </>
                              )}
                              <td className={`px-4 py-3 text-center font-bold text-base md:text-xl ${turnoverBg}`}>{currentTurnover.toLocaleString()} ₽</td>
                              <td className={`px-4 py-3 text-center font-bold text-base md:text-xl ${cashBg}`}>{currentCash.toLocaleString()} ₽</td>
                              <td className="px-4 py-3 text-center text-sm md:text-base">{currentChecks}</td>
                              <td className="px-4 py-3 text-center text-sm md:text-base">{avgCheck.toLocaleString()} ₽</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Дополнительные показатели */}
              {selectedCafe === "all" && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-8 border-2 border-purple-200">
                  <h2 className="text-2xl font-bold text-purple-900 mb-6 text-center">Дополнительные показатели</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow">
                      <p className="text-sm text-gray-600">Средняя касса текущего месяца</p>
                      <input
                        type="number"
                        value={manualOverrides["avg_cash_current_month"] ?? avgCashCurrentMonth}
                        onChange={(e) => saveManualOverride("avg_cash_current_month", Number(e.target.value))}
                        className="text-3xl font-bold text-purple-700 w-full mt-2 px-3 py-2 border rounded-lg"
                      />
                      <p className="text-xs text-gray-500 mt-1">({periodStart} — {periodEnd})</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow">
                      <p className="text-sm text-gray-600">Общий оборот прошлого года в этот день</p>
                      <input
                        type="number"
                        value={manualOverrides["turnover_last_year_day"] ?? lastYearDayTurnover}
                        onChange={(e) => saveManualOverride("turnover_last_year_day", Number(e.target.value))}
                        className="text-3xl font-bold text-purple-700 w-full mt-2 px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow">
                      <p className="text-sm text-gray-600">Средняя касса прошлого года</p>
                      <input
                        type="number"
                        value={manualOverrides["avg_cash_last_year"] ?? avgCashLastYear}
                        onChange={(e) => saveManualOverride("avg_cash_last_year", Number(e.target.value))}
                        className="text-3xl font-bold text-purple-700 w-full mt-2 px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow">
                      <p className="text-sm text-gray-600">Количество чеков прошлой недели</p>
                      <input
                        type="number"
                        value={manualOverrides["checks_last_week"] ?? lastWeekChecks}
                        onChange={(e) => saveManualOverride("checks_last_week", Number(e.target.value))}
                        className="text-3xl font-bold text-purple-700 w-full mt-2 px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow">
                      <p className="text-sm text-gray-600">Количество чеков текущего дня</p>
                      <input
                        type="number"
                        value={manualOverrides["checks_today"] ?? currentDayChecks}
                        onChange={(e) => saveManualOverride("checks_today", Number(e.target.value))}
                        className="text-3xl font-bold text-purple-700 w-full mt-2 px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow">
                      <p className="text-sm text-gray-600">Количество чеков в этот день год назад</p>
                      <input
                        type="number"
                        value={manualOverrides["checks_last_year_day"] ?? lastYearDayChecks}
                        onChange={(e) => saveManualOverride("checks_last_year_day", Number(e.target.value))}
                        className="text-3xl font-bold text-purple-700 w-full mt-2 px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Период для средней кассы:</label>
                      <input
                        type="date"
                        value={periodStart}
                        onChange={(e) => setPeriodStart(e.target.value)}
                        className="px-4 py-2 border rounded-lg"
                      />
                      <span className="text-gray-600">—</span>
                      <input
                        type="date"
                        value={periodEnd}
                        onChange={(e) => setPeriodEnd(e.target.value)}
                        className="px-4 py-2 border rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Блоки по кофейням */}
              {displayedCafes.map((cafeName) => {
                const cafeData = currentByCafeAndTime[cafeName] || {};
                const lastWeekData = lastWeekByCafeAndTime[cafeName] || {};
                const yesterdayData = yesterdayByCafeAndTime[cafeName] || {};

                return (
                  <div key={cafeName} className="bg-white rounded-2xl shadow-lg p-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">{cafeName}</h2>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[900px] text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="sticky left-0 bg-gray-100 px-4 py-3 text-center text-xs md:text-sm">Время</th>
                            {showComparison && (
                              <>
                                <th className="px-4 py-3 text-center text-xs md:text-sm">Оборот прошлой недели</th>
                                <th className="px-4 py-3 text-center text-xs md:text-sm">Касса прошлой недели</th>
                                <th className="px-4 py-3 text-center text-xs md:text-sm">Оборот прошлого дня</th>
                              </>
                            )}
                            <th className="px-4 py-3 text-center text-xs md:text-sm font-bold">Оборот текущего дня</th>
                            <th className="px-4 py-3 text-center text-xs md:text-sm font-bold">Касса текущего дня</th>
                            <th className="px-4 py-3 text-center text-xs md:text-sm">Количество чеков</th>
                            <th className="px-4 py-3 text-center text-xs md:text-sm">Средний чек</th>
                          </tr>
                        </thead>
                        <tbody>
                          {TIME_SLOTS.map((time) => {
                            const currentSlot = cafeData[time] || { turnover: 0, cash: 0, checks: 0 };
                            const lastWeekSlot = lastWeekData[time] || { turnover: 0, cash: 0 };
                            const yesterdaySlot = yesterdayData[time] || { turnover: 0 };

                            const turnoverBg = getBgColor(currentSlot.turnover, lastWeekSlot.turnover);
                            const cashBg = getBgColor(currentSlot.cash, lastWeekSlot.cash);

                            const avgCheck = currentSlot.checks > 0 ? Math.round(currentSlot.turnover / currentSlot.checks) : 0;

                            return (
                              <tr key={time} className="border-b hover:bg-gray-50">
                                <td className="sticky left-0 bg-white px-4 py-3 text-center font-medium text-sm md:text-base">{time}</td>
                                {showComparison && (
                                  <>
                                    <td className="px-4 py-3 text-center text-gray-600 text-sm md:text-base">{lastWeekSlot.turnover.toLocaleString()} ₽</td>
                                    <td className="px-4 py-3 text-center text-gray-600 text-sm md:text-base">{lastWeekSlot.cash.toLocaleString()} ₽</td>
                                    <td className="px-4 py-3 text-center text-gray-600 text-sm md:text-base">{yesterdaySlot.turnover.toLocaleString()} ₽</td>
                                  </>
                                )}
                                <td className={`px-4 py-3 text-center font-bold text-base md:text-xl ${turnoverBg}`}>{currentSlot.turnover.toLocaleString()} ₽</td>
                                <td className={`px-4 py-3 text-center font-bold text-base md:text-xl ${cashBg}`}>{currentSlot.cash.toLocaleString()} ₽</td>
                                <td className="px-4 py-3 text-center text-sm md:text-base">{currentSlot.checks}</td>
                                <td className="px-4 py-3 text-center text-sm md:text-base">{avgCheck.toLocaleString()} ₽</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
      <Toaster position="top-right" />
    </>
  );
}