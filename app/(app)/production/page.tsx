// app/(app)/production/page.tsx
'use client';
import Link from 'next/link';
import { ClipboardList, Package } from 'lucide-react';

export default function ProductionHome() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 pt-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12 text-amber-700">
          Цех
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">

          {/* Заявка */}
          <Link href="/production/request" className="block">
            <div className="p-12 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-3xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300">
              <ClipboardList className="w-20 h-20 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-center">Заявка</h3>
              <p className="mt-4 text-center opacity-90">
                Создать новую заявку на производство
              </p>
            </div>
          </Link>

          {/* Можно потом добавить "Отчёты", "История" и т.д. */}
          <div className="p-12 bg-white/70 backdrop-blur rounded-3xl border-2 border-dashed border-amber-300">
            <Package className="w-20 h-20 mx-auto mb-6 text-amber-400 opacity-50" />
            <p className="text-center text-amber-600 font-medium">Скоро здесь будут отчёты</p>
          </div>

        </div>
      </div>
    </div>
  );
}