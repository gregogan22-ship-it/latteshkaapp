'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Заглушка: старый файл был недописан ("Скопируйте сюда код...").
 * Редирект на рабочую страницу товаров.
 * Если нужен свой accounting products — замените содержимое.
 */
export default function AccountingProductsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/products');
  }, [router]);
  return (
    <div className="p-8 text-center text-gray-600">
      Перенаправление в товары…
    </div>
  );
}
