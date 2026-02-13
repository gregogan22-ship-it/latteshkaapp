'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { PackageSearch, ArrowLeft } from 'lucide-react';

export default function CehPotrebnostPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 max-w-5xl mx-auto"
    >
      <Link
        href="/ceh"
        className="inline-flex items-center gap-2 text-gray-700 hover:text-black mb-6 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Назад к Цеху
      </Link>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border shadow-soft p-6">
        <div className="flex items-center gap-3 mb-4">
          <PackageSearch className="w-6 h-6 text-orange-600" />
          <h1 className="text-2xl font-semibold text-gray-800">Потребность в продуктах</h1>
        </div>
        <p className="text-gray-600 mb-4">
          Здесь будет отображаться прогноз по потребности в ингредиентах и полуфабрикатах на основании заказов.
        </p>
        <div className="text-gray-400 italic">
          🚧 Раздел в разработке. Планируется автоматический расчёт по данным продаж.
        </div>
      </div>
    </motion.div>
  );
}
