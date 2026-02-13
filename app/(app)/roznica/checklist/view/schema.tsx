// app/(app)/roznica/checklist/view/schema.ts
export type Item = { text: string };
export type Section = { title: string; items: Item[] };

// Минимальные примеры. Заменяй на реальные массивы,
// или импортируй из своих страниц заполнения.
const BASE: Record<string, Record<string, Section[]>> = {
  barista: {
    opening: [
      { title: "Открытие", items: [
        { text: "Подготовить станцию эспрессо" },
        { text: "Проверить витрину и запасы молока" },
        { text: "Запустить кассу" },
      ]},
    ],
    closing: [
      { title: "Закрытие", items: [
        { text: "Промывка группы эспрессо" },
        { text: "Протереть рабочие поверхности" },
        { text: "Сдать выручку" },
      ]},
    ],
  },
  kassir: {
    opening: [
      { title: "Открытие", items: [
        { text: "Открыть смену на кассе" },
        { text: "Проверить наличные" },
      ]},
    ],
    closing: [
      { title: "Закрытие", items: [
        { text: "Закрыть смену и распечатать Z-отчёт" },
      ]},
    ],
  },
  cleaning: {
    cleaning: [
      { title: "Уборка", items: [
        { text: "Вымыть полы" },
        { text: "Вынести мусор" },
      ]},
    ],
  },
};

export function getRoznicaSchema(role?: string, category?: string): Section[] {
  if (!role || !category) return [];
  const r = BASE[role]?.[category];
  return Array.isArray(r) ? r : [];
}
