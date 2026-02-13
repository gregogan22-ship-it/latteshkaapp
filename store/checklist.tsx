"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ChecklistItem, SavePayload, toEntries as _toEntries } from "@/lib/checklist/types";
import { toEntries, formatDateDDMMYYYY, makeCompositeKey } from "@/lib/checklist/types";

/** Держим пункты секциями: sectionKey -> itemKey -> item */
type SectionMap = Record<string, Record<string, ChecklistItem>>;

type State = {
  sections: SectionMap;
  meta: { cafe?: string; date?: string; userEmail?: string };

  /** Метаданные (для итоговой отправки). */
  setMeta(meta: Partial<State["meta"]>): void;

  /** Полностью заменить пункты раздела. */
  setSectionItems(sectionKey: string, items: ChecklistItem[]): void;

  /** Частичное обновление одного пункта. */
  patchItem(sectionKey: string, itemKey: string, patch: Partial<ChecklistItem>): void;

  /** Удалить раздел целиком. */
  removeSection(sectionKey: string): void;

  /** Очистить всё. */
  clearAll(): void;

  /** Все пункты одним списком. */
  getAll(): ChecklistItem[];

  /** Краткая сводка. */
  summary(): { sections: number; items: number; withPhotos: number };

  /** Сборка payload (cafe/date можно передать или взять из meta). */
  makePayload(params: { cafe?: string; date?: Date | string; userEmail?: string }): SavePayload;
};

export const useChecklistStore = create<State>()(
  persist(
    (set, get) => ({
      sections: {},
      meta: {},

      setMeta(meta) {
        set((s) => ({ meta: { ...s.meta, ...meta } }));
      },

      setSectionItems(sectionKey, items) {
        set((s) => {
          const next: Record<string, ChecklistItem> = {};
          for (const raw of items) {
            const key = raw.key?.trim() || makeCompositeKey(raw);
            // Жёстко гарантируем ключ
            next[key] = { ...raw, key };
          }
          return { sections: { ...s.sections, [sectionKey]: next } };
        });
      },

      patchItem(sectionKey, itemKey, patch) {
        set((s) => {
          const sec = s.sections[sectionKey];
          if (!sec) return {};
          const cur = sec[itemKey];
          if (!cur) return {};
          return {
            sections: {
              ...s.sections,
              [sectionKey]: { ...sec, [itemKey]: { ...cur, ...patch } },
            },
          };
        });
      },

      removeSection(sectionKey) {
        set((s) => {
          const { [sectionKey]: _, ...rest } = s.sections;
          return { sections: rest };
        });
      },

      clearAll() {
        set({ sections: {}, meta: {} });
      },

      getAll() {
        const secs = get().sections;
        return Object.values(secs).flatMap((m) => Object.values(m));
      },

      summary() {
        const secs = get().sections;
        const items = Object.values(secs).reduce((acc, m) => acc + Object.keys(m).length, 0);
        const withPhotos = get().getAll().filter((i) => i.photoUrl || i.photoDataUrl).length;
        return { sections: Object.keys(secs).length, items, withPhotos };
      },

      makePayload({ cafe, date, userEmail }) {
        const meta = get().meta;
        const cafeName = cafe ?? meta.cafe ?? "";
        const dateStr =
          typeof date === "string"
            ? date
            : date instanceof Date
            ? formatDateDDMMYYYY(date)
            : meta.date ?? "";

        const entries = toEntries(get().getAll());
        return {
          action: "save",
          cafe: cafeName,
          date: dateStr,
          user: userEmail ?? meta.userEmail ?? "",
          entries,
        };
      },
    }),
    {
      name: "latteshka-checklist-v1",
      storage: createJSONStorage(() => sessionStorage),
      // Не тащим base64 фотки между вкладками — можно выключить сохранение photoDataUrl:
      partialize: (s) => ({
        sections: Object.fromEntries(
          Object.entries(s.sections).map(([sec, map]) => [
            sec,
            Object.fromEntries(
              Object.entries(map).map(([k, it]) => [
                k,
                { ...it, photoDataUrl: undefined }, // чистим base64 при сохранении
              ])
            ),
          ])
        ),
        meta: s.meta,
      }),
    }
  )
);
