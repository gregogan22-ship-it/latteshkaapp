// app/api/checklist/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";

const GAS_URL =
  process.env.CHECKLIST_API_URL ||
  process.env.CKL_SAVE_URL ||
  "";

function ensureGasUrl() {
  if (!GAS_URL) {
    throw new Error("CHECKLIST_API_URL / CKL_SAVE_URL is not set");
  }
}

function json(status: number, data: any) {
  return NextResponse.json(data, { status });
}

// GET: прокси «получить состояние» (action=get)
export async function GET(req: NextRequest) {
  try {
    ensureGasUrl();
    const { searchParams } = new URL(req.url);
    const cafe     = searchParams.get("cafe")     || "";
    const date     = searchParams.get("date")     || "";
    const role     = searchParams.get("role")     || "";
    const category = searchParams.get("category") || "";

    const url = `${GAS_URL}?` + new URLSearchParams({
      action: "get",
      cafe, date, role, category,
    }).toString();

    const r = await fetch(url, { method: "GET", cache: "no-store" });
    const data = await r.json().catch(() => ({}));
    // Отдаём как есть. Если GAS вернул ok:false — оставляем 200, пусть клиент покажет текст ошибки.
    return json(r.ok ? 200 : 500, data);
  } catch (e: any) {
    return json(500, { ok: false, error: String(e?.message || e) });
  }
}

// POST: save | upload
export async function POST(req: NextRequest) {
  try {
    ensureGasUrl();
    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload !== "object") {
      return json(400, { ok: false, error: "Expected JSON body" });
    }

    const action = String(payload.action || "").toLowerCase();

    // SAVE
    if (action === "save") {
      const { cafe, date, entries } = payload as any;
      if (!cafe || !date || !Array.isArray(entries)) {
        return json(400, { ok: false, error: "Missing cafe/date/entries" });
      }
      const r = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ ...payload, action: "save" }),
        cache: "no-store",
      });
      const data = await r.json().catch(() => ({}));
      return json(r.ok ? 200 : 500, data);
    }

    // UPLOAD (base64 → Google Drive via GAS)
    if (action === "upload") {
      const { base64, photoBase64, fileName, mime } = payload as any;
      const b64 = base64 || photoBase64;
      if (!b64) {
        return json(400, { ok: false, error: "No base64 provided" });
      }

      // Лёгкая защита: отсечём слишком большие data URL (например > 15 МБ)
      const approxBytes =
        typeof b64 === "string" && b64.includes(",")
          ? Math.floor((b64.split(",")[1].length * 3) / 4)
          : (b64?.length || 0);
      if (approxBytes > 15 * 1024 * 1024) {
        return json(413, { ok: false, error: "File too large (>15MB)" });
      }

      const r = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          action: "upload",
          base64: b64,
          fileName: fileName || "photo.jpg",
          mime: mime || "image/jpeg",
        }),
        cache: "no-store",
      });
      const data = await r.json().catch(() => ({}));
      return json(r.ok ? 200 : 500, data);
    }

    return json(400, { ok: false, error: "Unknown action (expected 'save' or 'upload')" });
  } catch (e: any) {
    return json(500, { ok: false, error: String(e?.message || e) });
  }
}

export async function OPTIONS() {
  return json(200, { ok: true });
}
