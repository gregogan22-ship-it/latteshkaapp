import { NextRequest, NextResponse } from "next/server";

const AUTH_SHEET_ID = "12_OJUrwXA00NcMBFm9P7pFPxWA_9rxnHnPZj6_Cn-lA";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const login = searchParams.get("login");
  const password = searchParams.get("password");

  if (!login || !password) {
    return NextResponse.json({ ok: false, error: "login и password обязательны" }, { status: 400 });
  }

  const csvUrl = `https://docs.google.com/spreadsheets/d/${AUTH_SHEET_ID}/gviz/tq?tqx=out:csv`;

  let csvText = "";
  try {
    const res = await fetch(csvUrl, { next: { revalidate: 60 } });
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: "Не удалось загрузить таблицу" }, { status: 500 });
    }
    csvText = await res.text();
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: "Ошибка загрузки таблицы" }, { status: 500 });
  }

  const lines = csvText.split("\n").map(l => l.trim()).filter(l => l);
  if (lines.length < 2) {
    return NextResponse.json({ ok: false, error: "Таблица пуста" }, { status: 500 });
  }

  const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());
  const loginIdx = headers.findIndex(h => h.toLowerCase() === "login");
  const roleIdx = headers.findIndex(h => h.toLowerCase() === "role");
  const passIdx = headers.findIndex(h => h.toLowerCase() === "password");
  const cafeIdx = headers.findIndex(h => h.toLowerCase() === "cafe");

  if (loginIdx === -1 || roleIdx === -1 || passIdx === -1) {
    return NextResponse.json({ ok: false, error: "Не найдены колонки login/role/password" }, { status: 500 });
  }

  let found = false;
  let role = "";
  let cafe = null;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.replace(/^"|"$/g, "").trim());
    if (cols[loginIdx] === login && cols[passIdx] === password) {
      role = cols[roleIdx]?.toLowerCase() || "";
      cafe = cafeIdx !== -1 ? cols[cafeIdx]?.trim() || null : null;
      if (["owner", "manager", "checklist"].includes(role)) {
        found = true;
        break;
      }
    }
  }

  if (found) {
    return NextResponse.json({ ok: true, role, login, cafe });
  }

  return NextResponse.json({ ok: false, error: "Неверный логин или пароль" });
}

export const dynamic = "force-dynamic";