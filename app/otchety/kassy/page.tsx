"use client";
import Link from "next/link";

export default function KassyHome() {
  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-amber-700 mb-8 text-center">Кассы</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Просмотр касс */}
        <Link
          href="/otchety/kassy/view"
          className="bg-white rounded-2xl shadow-lg p-10 text-center hover:shadow-2xl transition transform hover:-translate-y-2"
        >
          <div className="text-6xl mb-6">📊</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Просмотр касс</h2>
          <p className="text-gray-600">Итоги, оборот, средний чек, карты лояльности</p>
        </Link>

        {/* Внесение касс */}
        <Link
          href="/otchety/kassy/add"
          className="bg-white rounded-2xl shadow-lg p-10 text-center hover:shadow-2xl transition transform hover:-translate-y-2"
        >
          <div className="text-6xl mb-6">💰</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Внесение касс</h2>
          <p className="text-gray-600">Внести данные по кассе за смену</p>
        </Link>
      </div>
    </div>
  );
}