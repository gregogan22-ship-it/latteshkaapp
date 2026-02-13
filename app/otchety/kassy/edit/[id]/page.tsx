"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const TIME_SLOTS = ["11:00", "15:00", "19:00", "Закрытие"];

export default function KassyEditSinglePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    log_time: "11:00",
    cash_amount: 0,
    turnover: 0,
    checks_count: 0,
    loyalty_cards_issued: 0,
  });

  useEffect(() => {
    if (!id) return;

    async function fetchEntry() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("cash_logs")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;

        if (data) {
          setFormData({
            log_time: data.log_time || "11:00",
            cash_amount: data.cash_amount || 0,
            turnover: data.turnover || 0,
            checks_count: data.checks_count || 0,
            loyalty_cards_issued: data.loyalty_cards_issued || 0,
          });
        }
      } catch (err: any) {
        toast.error("Ошибка загрузки записи: " + err.message);
        router.push("/otchety/kassy/edit");
      } finally {
        setLoading(false);
      }
    }

    fetchEntry();
  }, [id, router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("cash_logs")
        .update({
          log_time: formData.log_time,
          cash_amount: formData.cash_amount,
          turnover: formData.turnover,
          checks_count: formData.checks_count,
          loyalty_cards_issued: formData.loyalty_cards_issued,
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Запись успешно обновлена");
      router.push("/otchety/kassy/edit");
    } catch (err: any) {
      toast.error("Ошибка сохранения: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-xl">Загрузка записи...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-amber-700">Редактирование записи кассы</h1>
            <Link href="/otchety/kassy/edit">
              <button className="bg-gray-600 text-white px-6 py-3 rounded-xl hover:bg-gray-700 transition">
                ← Назад к списку
              </button>
            </Link>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Время смены</label>
              <select
                value={formData.log_time}
                onChange={(e) => setFormData({ ...formData, log_time: e.target.value })}
                className="w-full px-4 py-3 border rounded-xl bg-white"
              >
                {TIME_SLOTS.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Оборот</label>
              <input
                type="number"
                value={formData.turnover}
                onChange={(e) => setFormData({ ...formData, turnover: Number(e.target.value) })}
                className="w-full px-4 py-3 border rounded-xl"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Касса (наличные)</label>
              <input
                type="number"
                value={formData.cash_amount}
                onChange={(e) => setFormData({ ...formData, cash_amount: Number(e.target.value) })}
                className="w-full px-4 py-3 border rounded-xl"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Количество чеков</label>
              <input
                type="number"
                value={formData.checks_count}
                onChange={(e) => setFormData({ ...formData, checks_count: Number(e.target.value) })}
                className="w-full px-4 py-3 border rounded-xl"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Выдано карт лояльности</label>
              <input
                type="number"
                value={formData.loyalty_cards_issued}
                onChange={(e) => setFormData({ ...formData, loyalty_cards_issued: Number(e.target.value) })}
                className="w-full px-4 py-3 border rounded-xl"
                placeholder="0"
              />
            </div>
          </div>

          <div className="mt-10 flex justify-end gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-green-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-green-700 disabled:opacity-70 transition"
            >
              {saving ? "Сохранение..." : "Сохранить изменения"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}