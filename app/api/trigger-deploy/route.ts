import { NextRequest, NextResponse } from "next/server";

const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN;
const PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const TEAM_ID = process.env.VERCEL_TEAM_ID || undefined; // если пусто — undefined

export async function POST() {
  if (!VERCEL_TOKEN || !PROJECT_ID) {
    return NextResponse.json(
      { ok: false, error: "Не настроены переменные Vercel API" },
      { status: 500 }
    );
  }

  try {
    const body: any = {
      name: "Ручной деплой из приложения",
      target: "production",
      gitSource: {
        type: "github",
        ref: "main", // твоя основная ветка (обычно main)
      },
    };

    const url = new URL("https://api.vercel.com/v13/deployments");
    url.searchParams.append("projectId", PROJECT_ID);
    if (TEAM_ID) url.searchParams.append("teamId", TEAM_ID);

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (res.ok && data.url) {
      return NextResponse.json({
        ok: true,
        message: "Деплой успешно запущен!",
        url: `https://vercel.com${data.url}`,
      });
    } else {
      return NextResponse.json({
        ok: false,
        error: data.error?.message || "Ошибка Vercel API",
      });
    }
  } catch (e: any) {
    console.error("Ошибка trigger-deploy:", e);
    return NextResponse.json(
      { ok: false, error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}