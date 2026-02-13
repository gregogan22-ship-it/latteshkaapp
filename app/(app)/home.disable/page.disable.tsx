'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useKassa } from '@/components/context/KassaContext';
import { Clock, CalendarDays } from 'lucide-react';

// ← ЭТО ОБЯЗАТЕЛЬНО ПОСЛЕ 'use client'!!!
export const dynamic = 'force-dynamic';
export const revalidate = false;

export default function HomePage() {
  const { totals } = useKassa();
  const [time, setTime] = useState(new Date());
  const [currentSlot, setCurrentSlot] = useState<string>('11:00');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const hour = time.getHours();
    if (hour >= 8 && hour < 13) setCurrentSlot('11:00');
    else if (hour >= 13 && hour < 17) setCurrentSlot('15:00');
    else if (hour >= 17 && hour < 21) setCurrentSlot('19:00');
    else setCurrentSlot('Закрытие');
  }, [time]);

  const formatCurrency = (num: any) => {
    if (!num || isNaN(num)) return '-';
    return `${Number(num).toLocaleString('ru-RU')} ₽`;
  };

  const slotData =
    totals?.turnover?.find((row: any) => row.time === currentSlot) || null;

  const dd = String(time.getDate()).padStart(2, '0');
  const mm = String(time.getMonth() + 1).padStart(2, '0');
  const yyyy = time.getFullYear();
  const dateStr = `${dd}.${mm}.${yyyy}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 flex flex-col gap-8 max-w-5xl mx-auto"
    >
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-xl border rounded-3xl shadow px-6 py-4">
          <Clock className="w-6 h-6 text-gray-700" />
          <div>
            <div className="text-4xl font-semibold text-gray-900">
              {time.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <div className="text-sm text-gray-500">
              {time.toLocaleDateString('ru-RU', { weekday: 'long' })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-xl border rounded-3xl shadow px-6 py-4">
          <CalendarDays className="w-6 h-6 text-gray-700" />
          <div>
            <div className="text-lg font-semibold text-gray-800">
              {dateStr}
            </div>
            <div className="text-sm text-gray-500">
              Слот кассы: <b>{currentSlot}</b>
            </div>
          </div>
        </div>
      </div>

      {slotData ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-slate-900 text-gray-100 shadow-lg rounded-2xl p-6"
        >
          <h2 className="text-lg font-semibold mb-4">
            Касса по сети на {currentSlot}
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="p-2 text-left">Показатель</th>
                <th className="p-2 text-right">Значение</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-800">
                <td className="p-2">Оборот прошлая неделя</td>
                <td className="p-2 text-right">{formatCurrency(slotData.prevWeekTurn)}</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="p-2">Оборот вчера</td>
                <td className="p-2 text-right">{formatCurrency(slotData.ydayTurn)}</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="p-2 font-semibold text-green-400">Оборот сегодня</td>
                <td className="p-2 text-right font-semibold text-green-400">
                  {formatCurrency(slotData.todayTurn)}
                </td>
              </tr>
              <tr>
                <td className="p-2">Касса сегодня</td>
                <td className="p-2 text-right">{formatCurrency(slotData.todayCash)}</td>
              </tr>
            </tbody>
          </table>
        </motion.div>
      ) : (
        <div className="text-gray-500 bg-white/70 rounded-2xl p-6 shadow text-center">
          Данные по кассе пока недоступны.
        </div>
      )}
    </motion.div>
  );
}