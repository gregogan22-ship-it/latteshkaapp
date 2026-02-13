"use client";
import Link from "next/link";

export default function LoyaltyPage() {
  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-amber-700 mb-8 text-center">Система лояльности</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Анкета на регистрацию */}
        <Link
          href="/register"
          className="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-2xl transition transform hover:-translate-y-2"
        >
          <div className="text-6xl mb-4">📝</div>
          <h2 className="text-2xl font-bold text-gray-800">Анкета на регистрацию</h2>
          <p className="text-gray-600 mt-2">Регистрация новых гостей в программе лояльности</p>
        </Link>

        {/* Список гостей — заглушка */}
        <div className="bg-gray-100 rounded-2xl p-8 text-center opacity-60 cursor-not-allowed">
          <div className="text-6xl mb-4">👥</div>
          <h2 className="text-2xl font-bold text-gray-500">Список гостей</h2>
          <p className="text-gray-500 mt-2">Список зарегистрированных гостей, карты и бонусы (скоро...)</p>
        </div>
      </div>
    </div>
  );
}