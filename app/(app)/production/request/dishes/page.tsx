// app/(app)/production/request/dishes/page.tsx
'use client';

import Link from 'next/link';
import { Factory, PackageCheck, ClipboardList } from 'lucide-react';

export default function DishesRequest() {
  // Никаких useEffect, window, localStorage — только UI
  return (
    <div className="min-h-screen bg-gray-50 p-6 pt-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-10 text-amber-700">
          Заявка блюд
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">

          <Link href="/production/request/dishes/new" className="block">
            <div className="p-10 bg-white border-2 border-amber-200 rounded-3xl hover:border-amber-500 hover:shadow-xl transition-all text-center">
              <Factory className="w-16 h-16 mx-auto mb-4 text-amber-600" />
              <h3 className="text-xl font-bold">Заявка на цех</h3>
            </div>
          </Link>

          <Link href="/production/request/dishes/stock" className="block">
            <div className="p-10 bg-white border-2 border-amber-200 rounded-3xl hover:border-amber-500 hover:shadow-xl transition-all text-center">
              <PackageCheck className="w-16 h-16 mx-auto mb-4 text-amber-600" />
              <h3 className="text-xl font-bold">Остаток</h3>
            </div>
          </Link>

          <Link href="/production/request/dishes/assembly" className="block">
            <div className="p-10 bg-white border-2 border-amber-200 rounded-3xl hover:border-amber-500 hover:shadow-xl transition-all text-center">
              <ClipboardList className="w-16 h-16 mx-auto mb-4 text-amber-600" />
              <h3 className="text-xl font-bold">Заявки на сборку</h3>
            </div>
          </Link>

        </div>
      </div>
    </div>
  );
}