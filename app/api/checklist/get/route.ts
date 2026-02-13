export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const src = new URL(req.url);
    const url = new URL(req.url);
    url.pathname = "/api/checklist";
    url.searchParams.set("action", "get");

    const r = await fetch(url.toString(), { method: "GET", cache: "no-store" });
    const data = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.ok ? 200 : r.status });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
