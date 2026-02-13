"use client";
import { useState } from "react";
import { useChecklistStore } from "@/store/checklist";
import { postChecklist } from "@/lib/checklist/save";

export default function ChecklistSaveButton({
  cafe,
  date,         // Date | "dd.MM.yyyy"
  userEmail,
  className,
}: {
  cafe: string;
  date: Date | string;
  userEmail?: string;
  className?: string;
}) {
  const makePayload = useChecklistStore((s) => s.makePayload);
  const summary = useChecklistStore((s) => s.summary());
  const [loading, setLoading] = useState(false);

  return (
    <button
      className={className ?? "px-4 py-2 rounded-xl shadow-md"}
      disabled={loading}
      onClick={async () => {
        try {
          setLoading(true);
          const payload = makePayload({ cafe, date, userEmail });
          const res = await postChecklist(payload);
          alert(`Сохранено: ${res.appended}/${res.total} → ${res.sheet} (${res.cafe})`);
        } catch (e: any) {
          alert(`Ошибка сохранения: ${e.message}`);
        } finally {
          setLoading(false);
        }
      }}
      title={`Собрано пунктов: ${summary.items} (разделов: ${summary.sections}, с фото: ${summary.withPhotos})`}
    >
      {loading ? "Сохраняю..." : `Отправить чек-лист (${summary.items})`}
    </button>
  );
}
