import { Suspense } from "react";
import dynamicImport from "next/dynamic";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Рендерим клиентский экран без SSR
// Правильно — просто импортируем клиентский компонент
import ClientView from './ClientView';

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-gray-500">Загрузка параметров…</div>}>
      <ClientView />
    </Suspense>
  );
}
