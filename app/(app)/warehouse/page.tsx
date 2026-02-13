'use client';

import { Package2, Construction } from 'lucide-react';

export default function SkladPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 pb-20">
      <div className="pt-12 px-6 text-center">
        <Package2 className="w-32 h-32 text-blue-600 mx-auto mb-8 animate-pulse" />
        
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-4">
          Склад
        </h1>
        
        <p className="text-xl text-gray-600 mb-12">
          Учёт товаров, инвентаризация, поставки
        </p>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white/90 backdrop-blur rounded-3xl shadow-2xl p-12">
            <Construction className="w-20 h-20 text-blue-500 mx-auto mb-6" />
            
            <h2 className="text-3xl font-bold text-gray-800 mb-6">
              Раздел в разработке
            </h2>
            
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Скоро здесь появится:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="bg-blue-50 p-4 rounded-xl">
                <p className="font-semibold text-blue-800">📦 Остатки</p>
                <p className="text-sm text-gray-600">По всем кофейням</p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-xl">
                <p className="font-semibold text-indigo-800">🚚 Поставки</p>
                <p className="text-sm text-gray-600">Приём и списание</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-xl">
                <p className="font-semibold text-purple-800">📊 Инвентаризация</p>
                <p className="text-sm text-gray-600">Автоматические проверки</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}