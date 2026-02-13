'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ClipboardList, ArrowLeft } from 'lucide-react';

export default function CehZayavkaPage() {
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
          <ClipboardList className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-semibold text-gray-800">Заявка</h1>
        </div>
        <p className="text-gray-600 mb-4">
          Раздел для создания и отправки заявок на продукцию. Здесь можно будет указать позиции, количество и дату.
        </p>
        <div className="text-gray-400 italic">
          🚧 В разработке. Планируется связка с Google Sheets и Telegram для уведомлений.
        </div>
      </div>
    </motion.div>
  );
}
