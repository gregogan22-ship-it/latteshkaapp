'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { Upload, FileSpreadsheet, Calendar, CheckCircle, RefreshCw } from 'lucide-react';

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const valid = ['.csv', '.xlsx', '.xls'].some(ext => selected.name.toLowerCase().endsWith(ext));
    if (valid) {
      setFile(selected);
      toast.success(`Файл выбран: ${selected.name}`);
    } else {
      toast.error('Только .csv, .xlsx, .xls');
    }
  };

  const uploadAndImport = async () => {
    if (!file) return toast.error('Выбери файл');
    if (!startDate || !endDate) return toast.error('Выбери период');

    setLoading(true);
    toast.loading('Импортируем...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('start', startDate);
    formData.append('end', endDate);

    try {
      const res = await fetch('/api/import-file', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();

      if (result.success) {
        toast.success(`Готово! Импортировано ${result.imported} записей за период`);
      } else {
        toast.error(result.error || 'Ошибка');
      }
    } catch {
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(false);
      toast.dismiss();
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-10 text-white">
              <div className="flex items-center justify-center gap-4">
                <FileSpreadsheet className="w-12 h-12" />
                <div className="text-center">
                  <h1 className="text-4xl font-bold">Импорт из файла</h1>
                  <p className="text-indigo-100 mt-2">CSV • XLSX • XLS + выбор периода</p>
                </div>
              </div>
            </div>

            <div className="p-10 space-y-10">
              {/* Выбор файла */}
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-indigo-500 transition">
                <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <label className="cursor-pointer">
                  <span className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition inline-block">
                    Выбрать файл
                  </span>
                  <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="hidden" />
                </label>
                {file && (
                  <p className="mt-4 text-indigo-600 font-medium">
                    {file.name} • {(file.size / 1024 / 1024).toFixed(2)} МБ
                  </p>
                )}
              </div>

              {/* Выбор периода */}
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-lg font-medium mb-3">С какой даты</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-5 py-4 border-2 rounded-xl focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-lg font-medium mb-3">По какую дату</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full px-5 py-4 border-2 rounded-xl focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Кнопка */}
              <motion.button
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                onClick={uploadAndImport}
                disabled={loading || !file || !startDate || !endDate}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-700 text-white py-8 rounded-2xl font-bold text-2xl shadow-2xl disabled:opacity-60 flex items-center justify-center gap-4"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-10 h-10 animate-spin" />
                    Импорт идёт...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-10 h-10" />
                    Импортировать за выбранный период
                  </>
                )}
              </motion.button>

              <div className="text-center text-gray-600 space-y-2">
                <p>• Импортируются только листы/строки за выбранный период</p>
                <p>• Никаких таймаутов — даже большой файл за 10–20 сек</p>
                <p>• Дубли не создаются</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      <Toaster position="top-right" />
    </>
  );
}