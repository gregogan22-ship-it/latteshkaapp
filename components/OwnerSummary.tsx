'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzPfDDHmJ_CCFqQ0h4iY5zfk1l9lR6VUu9CZ2KLcma2VYdBGD48Xclb7ccCDOsEgsRU9g/exec'; // ← твой URL

export default function SummaryBlock() {
  const [data, setData] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      // Отключаем кэш
      const noCacheUrl = `${GAS_URL}?_=${Date.now()}`;

      const res = await fetch(noCacheUrl, {
        cache: 'no-store',
        next: { revalidate: 0 }
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const text = await res.text();

      // Убираем префикс Google Sheets JSON
      const jsonText = text.replace(/^\)]}'\n/, '').trim();
      const json = JSON.parse(jsonText);

      // Достаём значения из table.rows
      const values = json.table.rows.map(row => row.c.map(cell => cell?.v || ''));

      // Фильтруем только строки до "Общий процент" (или до конца, если нужно)
      const filtered = values.filter(row => {
        const label = row[0] || '';
        return !label.includes('ИТОГО') && label !== '5,5' && label !== '3,5' && !label.includes('-1');
      });

      setData(filtered);
    } catch (e) {
      console.error('Ошибка загрузки сводки:', e);
      toast.error('Не удалось загрузить сводку');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 mb-12 border border-amber-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-amber-800 text-center flex-1">
          Процент сдачи Экзаменов
        </h2>
        <button
          onClick={fetchSummary}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-600 py-10">Загрузка...</p>
      ) : data.length === 0 ? (
        <p className="text-center text-gray-500 py-10">Нет данных</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <tbody>
              {data.map((row, i) => {
                const label = row[0] || '';
                let value = row[1] || '';

                // Форматируем числа в проценты
                if (value && !isNaN(parseFloat(value))) {
                  const num = parseFloat(value);
                  value = `${(num * 100).toFixed(1)}%`; // 1 знак после запятой
                }

                return (
                  <tr key={i} className="border-b last:border-b-0">
                    <td className="py-4 pr-8 font-medium text-gray-800 text-xl">
                      {label}
                    </td>
                    <td className="py-4 text-right text-3xl font-bold text-gray-900">
                      {value}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}