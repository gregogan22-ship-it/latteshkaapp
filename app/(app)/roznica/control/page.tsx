"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FileText, CheckCircle2 } from "lucide-react";

export default function ControlPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-amber-700 mb-4">Контроль</h1>
          <p className="text-xl text-gray-600">Мониторинг действий и выполнения чек-листов</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Журнал действий */}
          <Link href="/roznica/control/log">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl p-10 text-center hover:shadow-2xl transition-all cursor-pointer"
            >
              <div className="text-7xl mb-6 text-blue-600">
                <FileText className="w-24 h-24 mx-auto" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Журнал действий</h2>
              <p className="text-gray-600 text-lg">
                Кто, когда и что делал в чек-листах (вход, сохранение, просмотр)
              </p>
            </motion.div>
          </Link>

          {/* Выполнение чек-листов */}
          <Link href="/roznica/control/performance">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl p-10 text-center hover:shadow-2xl transition-all cursor-pointer"
            >
              <div className="text-7xl mb-6 text-green-600">
                <CheckCircle2 className="w-24 h-24 mx-auto" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Выполнение чек-листов</h2>
              <p className="text-gray-600 text-lg">
                Процент выполнения по кофейням и ролям за выбранный день
              </p>
            </motion.div>
          </Link>
        </div>
      </div>
    </div>
  );
}