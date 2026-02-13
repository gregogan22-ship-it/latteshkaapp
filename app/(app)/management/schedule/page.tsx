// app/(app)/management/schedule/page.tsx
'use client';
import Link from 'next/link';
import { Coffee, Sparkles, Package, Building2 } from 'lucide-react';

export default function ScheduleHome() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-10 text-indigo-700">График работы</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <Link href="/management/schedule/coffee" className="block">
            <div className="p-8 bg-white border-2 border-indigo-200 rounded-3xl hover:border-indigo-500 transition-all hover:shadow-lg">
              <Coffee className="w-16 h-16 mx-auto mb-4 text-indigo-600" />
              <h3 className="text-xl font-bold text-center">Кофейни</h3>
            </div>
          </Link>

          <Link href="/management/schedule/cleaning" className="block">
            <div className="p-8 bg-white border-2 border-indigo-200 rounded-3xl hover:border-indigo-500 transition-all hover:shadow-lg">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-indigo-600" />
              <h3 className="text-xl font-bold text-center">Клининг</h3>
            </div>
          </Link>

          <Link href="/management/schedule/production" className="block">
            <div className="p-8 bg-white border-2 border-indigo-200 rounded-3xl hover:border-indigo-500 transition-all hover:shadow-lg">
              <Package className="w-16 h-16 mx-auto mb-4 text-indigo-600" />
              <h3 className="text-xl font-bold text-center">Цех</h3>
            </div>
          </Link>

          <Link href="/management/schedule/warehouse" className="block">
            <div className="p-8 bg-white border-2 border-indigo-200 rounded-3xl hover:border-indigo-500 transition-all hover:shadow-lg">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-indigo-600" />
              <h3 className="text-xl font-bold text-center">Склад</h3>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}