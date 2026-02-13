'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { BarChart3, Receipt } from 'lucide-react';

export default function OtchetyPage() {
  const cards = [
    {
      href: '/otchety/kassy',
      title: 'Кассы',
      desc: 'Внесение и просмотр кассовых данных',
      icon: Receipt,
      color: 'from-blue-600 to-indigo-500',
    },
    {
      href: '/otchety/ezhednevnye',
      title: 'Ежедневные отчёты',
      desc: 'Сводка и анализ показателей за день.',
      icon: BarChart3,
      color: 'from-green-500 to-emerald-500',
    },
    {
      href: '/otchety/ezhenedelnie',
      title: 'Еженедельные отчёты',
      desc: 'Аналитика за неделю по кофейням и сети.',
      icon: BarChart3,
      color: 'from-yellow-500 to-orange-500',
    },
    {
      href: '/otchety/ezhemesyachnie',
      title: 'Ежемесячные отчёты',
      desc: 'Показатели и динамика по месяцам.',
      icon: BarChart3,
      color: 'from-purple-500 to-pink-500',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 max-w-6xl mx-auto"
    >
      <h1 className="text-2xl font-semibold mb-8 text-gray-800">Отчёты</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Link
              key={i}
              // @ts-ignore — подавляем typedRoutes ругань
              href={card.href}
              className="group block bg-white/80 backdrop-blur-xl border rounded-3xl shadow-soft p-6 hover:shadow-lg transition"
            >
              <div
                className={`w-12 h-12 rounded-2xl bg-gradient-to-r ${card.color} flex items-center justify-center text-white shadow-md`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-semibold mt-4 mb-1 text-gray-900 group-hover:text-black transition">
                {card.title}
              </h2>
              <p className="text-sm text-gray-600">{card.desc}</p>
            </Link>
          );
        })}
      </div>

      <div className="mt-10 text-center text-gray-500 text-sm">
        🚧 Раздел в разработке. В будущем здесь появятся графики, фильтры и выгрузка данных.
      </div>
    </motion.div>
  );
}
