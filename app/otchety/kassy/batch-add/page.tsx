"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import toast, { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";
import { Calendar, Save, Trash2, Wallet, Loader2 } from "lucide-react";
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

export default function BatchAddKassyPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  // Инициализация пустой формы при изменении даты
  useEffect(() => {
    const emptyForm = {};
    CAFE_NAMES.forEach((cafe) => {
      emptyForm[cafe] = {};
      TIME_SLOTS.forEach((time) => {
        emptyForm[cafe][time] = {
          turnover: "",
          cash: "",
          checks: "",
          cards: "",
        };
      });
    });
    setFormData(emptyForm);
  }, [selectedDate]);

  const handleInputChange = (cafe: string, time: string, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [cafe]: {
        ...prev[cafe],
        [time]: {
          ...prev[cafe][time],
          [field]: value,
        },
      },
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const entries = [];

      // Находим или создаём смены за дату
      const { data: existingShifts } = await supabase
        .from("shifts")
        .select("cafe_id, id")
        .eq("opened_at::date", selectedDate)
        .is("closed_at", null);

      const existingShiftMap = Object.fromEntries(
        existingShifts?.map((s) => [s.cafe_id, s.id]) || []
      );

      for (const cafe of CAFE_NAMES) {
        const cafeId = CAFE_NAME_TO_ID[cafe]; // твои UUID
        if (!cafeId) continue;

        let shiftId = existingShiftMap[cafeId];

        if (!shiftId) {
          const { data: newShift, error } = await supabase
            .from("shifts")
            .insert({ cafe_id: cafeId })
            .select("id")
            .single();

          if (error) throw error;
          shiftId = newShift.id;
        }

        // Добавляем записи по времени
        for (const time of TIME_SLOTS) {
          const slot = formData[cafe]?.[time] || {};
          const turnover = Number(slot.turnover) || 0;
          const cash = Number(slot.cash) || 0;
          const checks = Number(slot.checks) || 0;
          const cards = Number(slot.cards) || 0;

          if (turnover === 0 && cash === 0 && checks === 0 && cards === 0) continue; // пропускаем пустые

          entries.push({
            shift_id: shiftId,
            log_time: time,
            turnover,
            cash_amount: cash,
            checks_count: checks,
            loyalty_cards_issued: cards,
          });
        }
      }

      if (entries.length === 0) {
        toast.error("Нет данных для сохранения");
        return;
      }

      const { error } = await supabase.from("cash_logs").insert(entries);

      if (error) throw error;

      toast.success(`Сохранено ${entries.length} записей!`);
      // Сброс формы
      setFormData({});
    } catch (err: any) {
      toast.error("Ошибка сохранения: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="max-w-7xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-soft p-8"
        >
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Внесение старых данных по кассам</h1>
            <Link href="/otchety/kassy/view">
              <button className="bg-gray-600 text-white px-6 py-3 rounded-xl hover:bg-gray-700 transition">
                ← К просмотру
              </button>
            </Link>
          </div>

          <div className="space-y-6">
            <div>
              <label className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5" /> Дата
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl text-lg focus:ring-2 focus:ring-amber-500"
                required
              />
              <p className="text-sm text-gray-500 mt-1">Заполните данные за выбранную дату</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-3 text-center font-bold">Кофейня / Время</th>
                    {TIME_SLOTS.map((time) => (
                      <th key={time} className="px-4 py-3 text-center font-bold rotate-45 origin-center transform -mt-8">
                        {time}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CAFE_NAMES.map((cafeName) => (
                    <tr key={cafeName} className="border-b">
                      <th className="px-4 py-3 text-left font-semibold bg-gray-50">{cafeName}</th>
                      {TIME_SLOTS.map((time) => (
                        <td key={time} className="p-2 border">
                          <div className="space-y-1 text-center">
                            <input
                              type="number"
                              placeholder="Оборот"
                              value={formData[cafeName]?.[time]?.turnover || ""}
                              onChange={(e) => handleInputChange(cafeName, time, "turnover", e.target.value)}
                              className="w-full px-2 py-1 text-xs border rounded text-center"
                            />
                            <input
                              type="number"
                              placeholder="Касса"
                              value={formData[cafeName]?.[time]?.cash || ""}
                              onChange={(e) => handleInputChange(cafeName, time, "cash", e.target.value)}
                              className="w-full px-2 py-1 text-xs border rounded text-center"
                            />
                            <input
                              type="number"
                              placeholder="Чеков"
                              value={formData[cafeName]?.[time]?.checks || ""}
                              onChange={(e) => handleInputChange(cafeName, time, "checks", e.target.value)}
                              className="w-full px-2 py-1 text-xs border rounded text-center"
                            />
                            <input
                              type="number"
                              placeholder="Карты"
                              value={formData[cafeName]?.[time]?.cards || ""}
                              onChange={(e) => handleInputChange(cafeName, time, "cards", e.target.value)}
                              className="w-full px-2 py-1 text-xs border rounded text-center"
                            />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSaveAll}
              disabled={saving}
              className="w-full bg-gradient-to-r from-gray-900 to-black text-white py-5 rounded-xl font-bold text-xl flex items-center justify-center gap-3 disabled:opacity-60 shadow-lg"
            >
              {saving ? <Loader2 className="animate-spin w-6 h-6" /> : "Сохранить все данные"}
            </motion.button>
          </div>
        </motion.div>
      </div>
      <Toaster position="top-right" toastOptions={{ duration: 5000, style: { background: '#1f2937', color: '#fff', padding: '16px', borderRadius: '12px' } }} />
    </>
  );
}