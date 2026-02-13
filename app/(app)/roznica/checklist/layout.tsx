import { Suspense } from "react";
import CafePicker from "@/components/CafePicker";

export const dynamic = "force-dynamic"; // снимаем статический пререндер для всего сегмента
export const revalidate = 0;

export default function ChecklistLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <Suspense fallback={<div className="text-sm text-gray-500">Загружаем параметры…</div>}>
        <CafePicker />
      </Suspense>

      {/* Тут тоже можно оставить Suspense — не мешает, но template.tsx уже накрывает всё */}
      <Suspense fallback={<div className="p-4 text-gray-500">Загрузка…</div>}>
        {children}
      </Suspense>
    </div>
  );
}
