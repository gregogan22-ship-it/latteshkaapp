"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  Coffee,
  Wallet,
  FileText,
  Hash,
  Clock,
  Gift,
  Camera,
  Loader2,
  Calendar,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";
import Link from "next/link";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ← ТВОИ РЕАЛЬНЫЕ UUID из таблицы coffee_shops
const CAFE_NAME_TO_ID: Record<string, string> = {
  'Ашан': '157cb3d0-acb9-4714-98da-ab416445bbeb',
  'Эссе': '6e2c2133-7489-4e6f-a0ec-39c2262cad5a',
  'Кофеин': '22f2caae-45af-45c2-89a4-1108c151b829',
  'Адидас': '618f9ff6-e0ed-4936-8754-8b95fdc1c322',
  'Тренева': '7c06abf5-63d7-4d03-9fcb-27540a09160e',
  'Аптека': '7d7523e3-ab71-49c9-8efa-cd269a673d22',
  'КМ': '1bd8aa14-263b-4a32-8aee-a92a253e02ae',
  'ЦУМ': '2d2e295a-576b-4602-948a-c252de34281c',
  'Ленина': '28a8ce60-5721-429f-8377-65177c1f04c6',
  'Кипарис 1': '5d626e3a-6a51-4ac3-b939-3ffa8a116d5f',
  'Кипарис 2': 'efd516f4-71cb-45f6-bcfa-395dc699ca5e',
};

const cafes = Object.keys(CAFE_NAME_TO_ID);
const timeSlots = ['11:00', '15:00', '19:00', 'Закрытие'];

export default function AddKassyPage() {
  // По умолчанию — сегодня
  const today = new Date().toISOString().split("T")[0];

  const [selectedDate, setSelectedDate] = useState(today);

  const [form, setForm] = useState({
    cafe: '',
    time: '11:00', // можно оставить предложенное время или сбросить
    cash: '',
    bonus: '',
    turnover: '',
    checks: '',
    loyaltyCards: '',
  });

  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [manualTurnover, setManualTurnover] = useState(false);

  // Автосумма оборота = касса + бонусы (если не ручной ввод)
  useEffect(() => {
    if (!manualTurnover && (form.cash || form.bonus)) {
      const sum = (Number(form.cash) || 0) + (Number(form.bonus) || 0);
      setForm(prev => ({ ...prev, turnover: sum.toString() }));
    }
  }, [form.cash, form.bonus, manualTurnover]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cafe) return toast.error("Выберите кофейню");

    const cafeId = CAFE_NAME_TO_ID[form.cafe];
    if (!cafeId) return toast.error("Кофейня не найдена");

    setLoading(true);
    try {
      // Ищем или создаём смену за выбранную дату
      const dateStart = `${selectedDate}T00:00:00`;
      const dateEnd = `${selectedDate}T23:59:59.999`;

      const { data: existingShift } = await supabase
        .from("shifts")
        .select("id")
        .eq("cafe_id", cafeId)
        .gte("opened_at", dateStart)
        .lte("opened_at", dateEnd)
        .is("closed_at", null)
        .maybeSingle();

      let shiftId: string;
      if (existingShift?.id) {
        shiftId = existingShift.id;
      } else {
        const { data: newShift, error } = await supabase
          .from("shifts")
          .insert({ cafe_id: cafeId })
          .select("id")
          .single();

        if (error) throw error;
        shiftId = newShift.id;
      }

      // Фото (если есть)
      let photoUrl: string | null = null;
      if (photo) {
        const fileExt = photo.name.split(".").pop() || "jpg";
        const fileName = `${shiftId}_${form.time.replace(":", "-")}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("cash-photos")
          .upload(fileName, photo, { upsert: true });

        if (uploadError && uploadError.message !== "The resource already exists") {
          throw uploadError;
        }

        const { data: urlData } = supabase.storage.from("cash-photos").getPublicUrl(fileName);
        photoUrl = urlData.publicUrl;
      }

      // Внесение в cash_logs
      const { error: logError } = await supabase.from("cash_logs").insert({
        shift_id: shiftId,
        log_time: form.time,
        cash_amount: Number(form.cash) || 0,
        bonus_amount: Number(form.bonus) || 0,
        turnover: Number(form.turnover) || 0,
        checks_count: Number(form.checks) || 0,
        loyalty_cards_issued: Number(form.loyaltyCards) || 0,
        photo_url: photoUrl,
      });

      if (logError) throw logError;

      toast.success("Касса успешно внесена!");
      // Сброс формы
      setForm({
        cafe: form.cafe,
        time: form.time,
        cash: "",
        bonus: "",
        turnover: "",
        checks: "",
        loyaltyCards: "",
      });
      setPhoto(null);
      setPreview("");
      setManualTurnover(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Ошибка сохранения");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="max-w-4xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-soft p-8"
        >
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Внесение касс</h1>
            <Link href="/otchety/kassy/view">
              <button className="bg-gray-600 text-white px-6 py-3 rounded-xl hover:bg-gray-700 transition">
                ← К просмотру
              </button>
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Выбор даты */}
            <div>
              <label className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5" /> Дата
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-gray-900 outline-none"
                required
              />
              <p className="text-sm text-gray-500 mt-1">По умолчанию — сегодня</p>
            </div>

            {/* Кофейня */}
            <div>
              <label className="flex items-center gap-2 mb-2">
                <Coffee className="w-5 h-5" /> Кофейня
              </label>
              <select
                required
                value={form.cafe}
                onChange={(e) => setForm(prev => ({ ...prev, cafe: e.target.value }))}
                className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-gray-900 outline-none"
              >
                <option value="">Выберите кофейню</option>
                {cafes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Время */}
            <div>
              <label className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5" /> Время отчёта
              </label>
              <select
                required
                value={form.time}
                onChange={(e) => setForm(prev => ({ ...prev, time: e.target.value }))}
                className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-gray-900 outline-none"
              >
                {timeSlots.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Фото */}
            <div>
              <label className="flex items-center gap-2 mb-2">
                <Camera className="w-5 h-5" /> Фото кассы (по желанию)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-gray-900 file:text-white hover:file:bg-gray-800"
              />
              {preview && (
                <motion.img
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  src={preview}
                  alt="Превью"
                  className="mt-4 max-h-80 rounded-xl mx-auto shadow-lg"
                />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <Gift className="w-5 h-5" /> Бонусы (₽)
                </label>
                <input
                  type="number"
                  value={form.bonus}
                  onChange={(e) => setForm(prev => ({ ...prev, bonus: e.target.value }))}
                  className="w-full border rounded-xl px-4 py-3"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5" /> Касса наличными (₽)
                </label>
                <input
                  required
                  type="number"
                  value={form.cash}
                  onChange={(e) => setForm(prev => ({ ...prev, cash: e.target.value }))}
                  className="w-full border rounded-xl px-4 py-3"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2">
                  <Wallet className="w-5 h-5" /> Оборот (₽)
                </label>
                <input
                  required
                  type="number"
                  value={form.turnover}
                  onChange={(e) => {
                    setManualTurnover(true);
                    setForm(prev => ({ ...prev, turnover: e.target.value }));
                  }}
                  className="w-full border rounded-xl px-4 py-3 font-semibold bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Автосумма: {(Number(form.cash) || 0) + (Number(form.bonus) || 0)} ₽
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2">
                  <Hash className="w-5 h-5" /> Количество чеков
                </label>
                <input
                  required
                  type="number"
                  value={form.checks}
                  onChange={(e) => setForm(prev => ({ ...prev, checks: e.target.value }))}
                  className="w-full border rounded-xl px-4 py-3"
                  placeholder="0"
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-2 mb-2 text-green-600 font-bold text-lg">
                  Выдано карт лояльности
                </label>
                <input
                  type="number"
                  value={form.loyaltyCards}
                  onChange={(e) => setForm(prev => ({ ...prev, loyaltyCards: e.target.value }))}
                  className="w-full border-2 border-green-500 rounded-xl px-4 py-4 text-green-700 font-bold text-2xl text-center"
                  placeholder="0"
                />
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading || !form.cafe}
              className="w-full bg-gradient-to-r from-gray-900 to-black text-white py-5 rounded-xl font-bold text-xl flex items-center justify-center gap-3 disabled:opacity-60 shadow-lg"
            >
              {loading ? <Loader2 className="animate-spin w-6 h-6" /> : "Отправить кассу"}
            </motion.button>
          </form>
        </motion.div>
      </div>
      <Toaster position="top-right" toastOptions={{ duration: 5000 }} />
    </>
  );
}