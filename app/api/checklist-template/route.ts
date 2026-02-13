import { NextRequest, NextResponse } from "next/server";

const SPREADSHEET_ID = "1lCHpyah_MeDoQRYPSARrW4NOJx57EcZyXmZtKz7l1zM";

const SHEET_NAMES: Record<string, string> = {
  Кассир: "Кассир",
  Бариста: "Бариста",
  "Феи Чистоты": "Феи Чистоты",
 "Разогрев/зал": "Разогрев/зал",
"Окошко": "Окошко",
 "Открытие": "Открытие",
"Замывка": "Замывка",
"Обед Уборщицы": "Обед Уборщицы",
"Закрытие": "Закрытие",
"Отчеты": "Отчеты",
"Ген.Уборка": "Ген.Уборка",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");
  const category = searchParams.get("category");

  if (!role) {
    return NextResponse.json({ error: "role обязателен" }, { status: 400 });
  }

  const sheetName = SHEET_NAMES[role];
  if (!sheetName) {
    return NextResponse.json({ error: "Роль не найдена" }, { status: 404 });
  }

  const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;

  try {
    const res = await fetch(csvUrl, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error("Не удалось загрузить лист");

    const csvText = await res.text();

    // Убираем BOM, если есть
    const cleanText = csvText.replace(/^\uFEFF/, "");

    const lines = cleanText.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return NextResponse.json({ items: [] });

    // Парсим заголовки — они в первой строке, в кавычках, с лишними кавычками
    const headerLine = lines[0];
    const headerMatches = headerLine.match(/"([^"]*)"/g) || [];
    const headers = headerMatches.map(h => h.slice(1, -1).trim());

    const idIdx = headers.findIndex(h => h.toLowerCase() === "id");
    const sectionIdx = headers.findIndex(h => h === "Раздел");
    const textIdx = headers.findIndex(h => h === "Текст пункта");
    const photoIdx = headers.findIndex(h => h.toLowerCase().includes("фото"));

    if (idIdx === -1 || sectionIdx === -1 || textIdx === -1) {
      return NextResponse.json({
        error: "Не найдены обязательные колонки",
        foundHeaders: headers
      }, { status: 500 });
    }

    const items = lines.slice(1).map(line => {
      const matches = line.match(/"([^"]*)"/g) || [];
      const values = matches.map(v => v.slice(1, -1).trim());

      const section = values[sectionIdx] || "";
      if (category && section !== category) return null;

      return {
        id: values[idIdx] || "",
        section,
        text: values[textIdx] || "",
        photoRequired: photoIdx !== -1 ? (values[photoIdx] || "НЕТ") : "НЕТ",
      };
    }).filter(Boolean);

    return NextResponse.json({ items });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка загрузки шаблона" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";