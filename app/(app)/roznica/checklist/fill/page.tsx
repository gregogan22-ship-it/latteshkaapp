import { Suspense } from "react";
import ClientFill from "./ClientFill";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-gray-500">Загрузка...</div>}>
      <ClientFill />
    </Suspense>
  );
}