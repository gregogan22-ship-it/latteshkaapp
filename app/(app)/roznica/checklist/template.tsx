"use client";

import { Suspense } from "react";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-4 text-gray-500">Загрузка…</div>}>
      {children}
    </Suspense>
  );
}
