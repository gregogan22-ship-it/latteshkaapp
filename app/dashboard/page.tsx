'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Coffee, CalendarDays, Clock } from 'lucide-react';

export default function DashboardPage() {
  const [time, setTime] = useState(new Date());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Обновление часов
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getCurrentSlot = () => {
    const hour = time.getHours();
    if (hour < 13) return '11:00';
    if (hour < 17) return '15:00';
    if (hour < 21) return '19:00';
    return 'Закрытие';
  };

  const fetchCurrentKassa = async () => {
    try {
      setLoading(true);
      const today = time.toLocaleDateString('ru-RU');
      const res = await fetch(`${process.env.NEXT_PUBLIC_GAS_KASSA_URL}?date=${today}`);
      const json = await res.json();
      if (json?.totals) setData(json.totals);
    } catch (err) {
      console.error('Ошибка при загрузке кассы:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentKassa();
  }, [time]);

  const slot = getCurrentSlot();
  const now = time.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const todayDate = time.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });

  const formatCurrency = (v: any) =>
    v ? `${Number(v).toLocaleString('ru-RU')} ₽` : '—';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 max-w-5xl mx-auto"
    >
      <div className="flex justify-between items-start flex-wrap gap-6">
        {/* === Левая колонка: касса сейчас === */}
        <div className="bg-white rounded-3xl shadow-lg p-6 flex-1 min-w-[320px]">
          <div className="flex items-center gap-2 mb-3">
            <Coffee className="text-gray-700" />
            <h2 className="text-xl font-semibold text-gray-800">
              Касса на {slot}
            </h2>
          </div>

          {loading && <p className="text-gray-500">Загрузка...</p>}

          {data ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-600">
                  <th className="text-left py-2">Показатель</th>
                  <th className="text-right py-2">Сумма</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2">Оборот прошлой недели</td>
                  <td className="py-2 text-right">{formatCurrency(data.turnover.find((r:any)=>r.time===slot)?.prevWeekTurn)}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Оборот вчера</td>
                  <td className="py-2 text-right">{formatCurrency(data.turnover.find((r:any)=>r.time===slot)?.ydayTurn)}</td>
                </tr>
                <tr>
                  <td className="py-2 font-semibold">Оборот сегодня</td>
                  <td className="py-2 text-right font-semibold text-green-600">
                    {formatCurrency(data.turnover.find((r:any)=>r.time===slot)?.todayTurn)}
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            !loading && <p className="text-gray-400">Нет данных</p>
          )}
        </div>

        {/* === Правая колонка: время и дата === */}
        <div className="flex flex-col items-end gap-4 text-right min-w-[180px]">
          <div className="bg-white rounded-3xl shadow p-4 w-40">
            <Clock className="mx-auto mb-2 text-gray-600" />
            <div className="text-2xl font-bold text-gray-800">{now}</div>
            <div className="text-sm text-gray-500">текущее время</div>
          </div>

          <div className="bg-white rounded-3xl shadow p-4 w-40">
            <CalendarDays className="mx-auto mb-2 text-gray-600" />
            <div className="text-base font-semibold text-gray-800">{todayDate}</div>
            <div className="text-sm text-gray-500">сегодня</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
