"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import toast from "react-hot-toast";
import Link from "next/link";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function KassyEditPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEntries();
  }, [selectedDate]);

  async function fetchEntries() {
    setLoading(true);
    try {
      const start = `${selectedDate}T00:00:00`;
      const end = `${selectedDate}T23:59:59.999`;

      const { data, error } = await supabase
        .from("cash_logs")
        .select(`
          id,
          log_time,
          cash_amount,
          turnover,
          checks_count,
          loyalty_cards_issued,
          created_at,
          shift:shifts (cafe_id)
        `)
        .gte("created_at", start)
        .lt("created_at", end)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const cafeIds = [...new Set(data?.map((l) => l.shift?.cafe_id).filter(Boolean))];

      const { data: cafes } = await supabase
        .from("coffee_shops")
        .select("id, name")
        .in("id", cafeIds);

      const cafeMap = Object.fromEntries(cafes?.map((c) => [c.id, c.name]) || []);

      const formatted = data?.map((entry) => ({
        ...entry,
        cafe_name: cafeMap[entry.shift?.cafe_id] || "Неизвестно",
      })) || [];

      setEntries(formatted);
    } catch (err: any) {
      toast.error("Ошибка загрузки: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteEntry(id: number) {
    if (!confirm("Удалить эту запись?")) return;

    const { error } = await supabase.from("cash_logs").delete().eq("id", id);
    if (error) {
      toast.error("Ошибка удаления");
    } else {
      toast.success("Запись удалена");
      fetchEntries();
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-amber-700">Редактирование касс</h1>
            <Link href="/otchety/kassy/view">
              <button className="bg-gray-600 text-white px-6 py-3 rounded-xl hover:bg-gray-700 transition">
                ← Назад к просмотру
              </button>
            </Link>
          </div>

          <div className="mb-6 flex items-center gap-4">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-3 border rounded-xl"
            />
          </div>

          {loading ? (
            <p className="text-center text-gray-600">Загрузка...</p>
          ) : entries.length === 0 ? (
            <p className="text-center text-gray-600 text-lg">Нет записей за эту дату</p>
          ) : (
            <div className="space-y-6">
              {entries.map((entry) => (
                <div key={entry.id} className="bg-gray-50 rounded-xl p-6 border">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Кофейня</p>
                      <p className="font-bold">{entry.cafe_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Время</p>
                      <p className="font-bold">{entry.log_time}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Оборот</p>
                      <p className="font-bold">{entry.turnover?.toLocaleString() || 0} ₽</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Касса</p>
                      <p className="font-bold text-green-700">{entry.cash_amount?.toLocaleString() || 0} ₽</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Чеков</p>
                      <p className="font-bold">{entry.checks_count || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Карты лояльности</p>
                      <p className="font-bold text-purple-700">{entry.loyalty_cards_issued || 0}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-4 justify-end">
                    <Link href={`/otchety/kassy/edit/${entry.id}`}>
                      <button className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition">
                        Редактировать
                      </button>
                    </Link>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700 transition"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}