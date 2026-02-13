"use client";
import { useEffect } from "react";
import { useChecklistStore } from "@/store/checklist";
import type { ChecklistItem } from "@/lib/checklist/types";

/** Привязывает список пунктов к разделу в сторе. */
export default function SectionBinder({
  sectionKey,
  items,
}: {
  sectionKey: string;
  items: ChecklistItem[];
}) {
  const setSectionItems = useChecklistStore((s) => s.setSectionItems);
  useEffect(() => {
    setSectionItems(sectionKey, items);
  }, [sectionKey, items, setSectionItems]);
  return null;
}
