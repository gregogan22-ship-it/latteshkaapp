'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, CalendarRange } from 'lucide-react';

export default function WeeklyReportsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 max-w-5xl mx-auto"
    >
      <Link
        href="/otchety"
        className="inline-flex items-center gap-2 text-gray-700 hover:text-black mb-6 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Назад к отчётам
      </Link>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border shadow-soft p-6">
        <div className="flex items-center gap-3 mb-4">
          <CalendarRange className="w-6 h-6 text-emerald-600" />
          <h1 className="text-2xl font-semibold text-gray-800">
            Еженедельные отчёты
          </h1>
        </div>
        <p className="text-gray-600 mb-4">
          Аналитика по неделям — динамика оборота, средние значения и сравнительные показатели.
        </p>
        <div className="text-gray-400 italic">
          🚧 В разработке. Планируется диаграмма с недельной выручкой и свод по росту/падению.
        </div>
      </div>
    </motion.div>
  );
}
