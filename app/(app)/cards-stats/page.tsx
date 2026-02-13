'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { COFFEE_SHOPS_MAP } from '@/lib/coffeeShops';
import { BarChart3 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, addDays } from 'date-fns';

type Stats = Record<string, number>;

export default function CardsStats() {
  const [stats, setStats] = useState<Stats>({});
  const [total, setTotal] = useState(0);
  const [period, setPeriod] = useState<'all' | 'month' | 'last30' | 'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [period, customStart, customEnd]);

  async function fetchStats() {
    setLoading(true);

    let query = supabase.from('guests').select('*, created_at');

    if (period === 'month') {
      const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const endNext = format(addDays(endOfMonth(new Date()), 1), 'yyyy-MM-dd');
      query = query.gte('created_at', `${start}T00:00:00`).lt('created_at', `${endNext}T00:00:00`);
    } else if (period === 'last30') {
      const start = format(subMonths(new Date(), 1), 'yyyy-MM-dd');
      query = query.gte('created_at', `${start}T00:00:00`);
    } else if (period === 'custom' && customStart && customEnd && customStart <= customEnd) {
      const endNext = format(addDays(new Date(customEnd), 1), 'yyyy-MM-dd');
      query = query.gte('created_at', `${customStart}T00:00:00`).lt('created_at', `${endNext}T00:00:00`);
    }

    const { data } = await query;

    const count: Stats = {};
    let sum = 0;

    data?.forEach((guest: any) => {
      const address = guest.coffee_shop || guest.data?.coffee_shop;
      if (address && COFFEE_SHOPS_MAP[address]) {
        const name = COFFEE_SHOPS_MAP[address];
        count[name] = (count[name] || 0) + 1;
        sum++;
      }
    });

    setStats(count);
    setTotal(sum);
    setLoading(false);
  }

  const sorted = Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    }));

  const getPeriodText = () => {
    if (period === 'all') return 'За всё время';
    if (period === 'month') return 'Текущий месяц';
    if (period === 'last30') return 'Последние 30 дней';
    if (period === 'custom' && customStart && customEnd) {
      try {
        return `${format(new Date(customStart), 'dd.MM.yyyy')} — ${format(new Date(customEnd), 'dd.MM.yyyy')}`;
      } catch {
        return 'Неверные даты';
      }
    }
    return 'Выберите период';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 inline-block">
            Статистика выданных карт
          </h1>
          <p className="text-xl text-gray-600 mt-4">
            Всего выдано: <strong className="text-4xl text-purple-600">{total.toLocaleString('ru')}</strong> карт
          </p>
        </div>

        {/* Выбор периода */}
        <div className="bg-white/80 backdrop-blur rounded-3xl shadow-xl p-8 mb-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={() => setPeriod('all')}
              className={`py-4 px-6 rounded-2xl font-semibold text-lg transition-all ${period === 'all' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              За всё время
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`py-4 px-6 rounded-2xl font-semibold text-lg transition-all ${period === 'month' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              Текущий месяц
            </button>
            <button
              onClick={() => setPeriod('last30')}
              className={`py-4 px-6 rounded-2xl font-semibold text-lg transition-all ${period === 'last30' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              Последние 30 дней
            </button>
            <div className="flex gap-3 items-center">
              <input type="date" value={customStart} onChange={e => { setCustomStart(e.target.value); setPeriod('custom'); }} className="px-4 py-4 border rounded-xl text-lg" />
              <span className="text-gray-600">—</span>
              <input type="date" value={customEnd} onChange={e => { setCustomEnd(e.target.value); setPeriod('custom'); }} className="px-4 py-4 border rounded-xl text-lg" />
              <button onClick={() => setPeriod('custom')} className="px-6 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-semibold">
                Показать
              </button>
            </div>
          </div>
          <p className="text-center mt-6 text-xl text-gray-700">
            Период: <strong className="text-purple-600">{getPeriodText()}</strong>
          </p>
        </div>

        {/* Статистика */}
        {loading ? (
          <div className="text-center py-32">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-8 border-purple-600 border-t-transparent"></div>
            <p className="mt-6 text-2xl text-gray-600">Загружаем статистику...</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-3xl shadow-xl">
            <p className="text-3xl text-gray-500">Нет данных за выбранный период</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {sorted.map(({ name, count, percent }) => (
              <div key={name} className="bg-white rounded-3xl shadow-2xl p-8 hover:shadow-3xl transition-all transform hover:-translate-y-2">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-800">{name}</h3>
                  <div className="text-right">
                    <p className="text-5xl font-bold text-purple-600">{count}</p>
                    <p className="text-xl text-gray-600">{percent}%</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-1000"
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}