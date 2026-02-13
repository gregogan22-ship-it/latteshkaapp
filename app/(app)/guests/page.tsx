// app/(app)/guests/page.tsx   ← ГЛАВНАЯ СТРАНИЦА РАЗДЕЛА
'use client';
import Link from 'next/link';
import { FileText, CreditCard } from 'lucide-react';

export default function LoyaltyHome() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-purple-700 mb-12">
          Система лояльности
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">

          <Link href="/guests/form" className="block">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white p-12 rounded-3xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300">
              <FileText className="w-24 h-24 mx-auto mb-6" />
              <h3 className="text-2xl font-bold">Анкета на регистрацию</h3>
              <p className="mt-4 opacity-90">Выдать новую карту с QR-кодом</p>
            </div>
          </Link>

          <Link href="/guests/list" className="block">
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white p-12 rounded-3xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300">
              <CreditCard className="w-24 h-24 mx-auto mb-6" />
              <h3 className="text-2xl font-bold">Карты гостей</h3>
              <p className="mt-4 opacity-90">Поиск и просмотр всех карт</p>
            </div>
          </Link>

        </div>
      </div>
    </div>
  );
}