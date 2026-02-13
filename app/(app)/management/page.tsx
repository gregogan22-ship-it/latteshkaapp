'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { Upload, Calendar, RefreshCw } from 'lucide-react';

export default function ImportPeriodPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  async function runImport() {
    if (!startDate || !endDate) {
      toast.error('Выбери даты!');
      return;
    }

    setLoading(true);
    toast.loading(`Импорт с ${startDate} по ${endDate}...`);

    try {
      const res = await fetch(`/api/import-kassy-period?start=${startDate}&end=${endDate}`);
      const data = await res.json();

      if (data.success) {
        toast.success(`Импортировано ${data.imported} записей за период!`);
      } else {
        toast.error(data.error || 'Ошибка импорта');
      }
    } catch (err) {
      toast.error('Не удалось выполнить импорт');
    } finally {
      setLoading(false);
      toast.dismiss();
    }
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-2xl p-10"
          >
            <div className="text-center mb-10">
              <Upload className="w-16 h-16 mx-auto text-green-600 mb-4" />
              <h1 className="text-4xl font-bold">Импорт за период</h1>
              <p className="text-gray-600 mt-2">Подтянет все листы за выбранные даты</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  С какой даты
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  По какую дату
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={runImport}
              disabled={loading || !startDate || !endDate}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-700 text-white py-6 rounded-2xl font-bold text-2xl shadow-2xl disabled:opacity-60 flex items-center justify-center gap-4"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-10 h-10 animate-spin" />
                  Импорт идёт...
                </>
              ) : (
                <>
                  <Calendar className="w-10 h-10" />
                  Импортировать за период
                </>
              )}
            </motion.button>
          </motion.div>
        </div>
      </div>
      <Toaster position="top-right" />
    </>
  );
}