import { NextRequest, NextResponse } from "next/server";

const AUTH_SHEET_ID = "12_OJUrwXA00NcMBFm9P7pFPxWA_9rxnHnPZj6_Cn-lA";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const login = searchParams.get("login");

  if (!login) {
    return NextResponse.json({ ok: false, error: "Параметр login обязателен" }, { status: 400 });
  }

  const csvUrl = `https://docs.google.com/spreadsheets/d/${AUTH_SHEET_ID}/gviz/tq?tqx=out:csv`;

  try {
    const res = await fetch(csvUrl, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error("Не удалось загрузить таблицу");

    const csvText = await res.text();
    const lines = csvText.split("\n").map(l => l.trim()).filter(l => l);
    if (lines.length < 2) return NextResponse.json({ ok: false, error: "Таблица пуста" });

    const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());
    const loginIdx = headers.findIndex(h => h.toLowerCase() === "login");
    const passIdx = headers.findIndex(h => h.toLowerCase() === "password");
    const roleIdx = headers.findIndex(h => h.toLowerCase() === "role");
    const cafeIdx = headers.findIndex(h => h.toLowerCase() === "cafe");

    if (loginIdx === -1 || passIdx === -1) {
      return NextResponse.json({ ok: false, error: "Не найдены колонки login/password" }, { status: 500 });
    }

    let found = false;
    let role = "";
    let cafe = null;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map(c => c.replace(/^"|"$/g, "").trim());
      if (cols[loginIdx] === login) {
        role = cols[roleIdx]?.toLowerCase() || "checklist";
        cafe = cafeIdx !== -1 ? cols[cafeIdx]?.trim() || null : null;
        found = true;
        break;
      }
    }

    if (!found) {
      return NextResponse.json({ ok: false, error: "Аккаунт не найден" }, { status: 401 });
    }

    // Успешный автоматический вход
    const response = NextResponse.redirect(new URL("/roznica/checklist", request.url));

    // Сохраняем авторизацию в cookies
    response.cookies.set("auth_token", login, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 дней
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: err.message || "Ошибка" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";