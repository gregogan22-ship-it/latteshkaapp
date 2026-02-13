// app/(app)/production/request/page.tsx
'use client';
import Link from 'next/link';
import { ChefHat, Package } from 'lucide-react';

export default function RequestHome() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-10 text-amber-700">Заявка</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">

          <Link href="/production/request/dishes" className="block">
            <div className="p-10 bg-white border-2 border-amber-200 rounded-3xl hover:border-amber-500 hover:shadow-lg transition-all">
              <ChefHat className="w-16 h-16 mx-auto mb-4 text-amber-600" />
              <h3 className="text-xl font-bold text-center">Заявка блюд</h3>
            </div>
          </Link>

          <Link href="/production/request/cuts" className="block">
            <div className="p-10 bg-white border-2 border-amber-200 rounded-3xl hover:border-amber-500 hover:shadow-lg transition-all">
              <Package className="w-16 h-16 mx-auto mb-4 text-amber-600" />
              <h3 className="text-xl font-bold text-center">Заявка нарезок</h3>
            </div>
          </Link>

        </div>
      </div>
    </div>
  );
}