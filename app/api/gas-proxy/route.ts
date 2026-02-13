import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const gasUrlParam = url.searchParams.get('url');

  if (!gasUrlParam) {
    console.error('[PROXY GET] Missing url parameter');
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    // Полностью декодируем и логируем
    const gasUrlDecoded = decodeURIComponent(gasUrlParam);
    console.log('[PROXY GET] Полный декодированный GAS URL:', gasUrlDecoded);

    // Парсим параметры для отладки
    const gasUrlObj = new URL(gasUrlDecoded);
    console.log('[PROXY GET] Параметры в URL:', Object.fromEntries(gasUrlObj.searchParams.entries()));

    const res = await fetch(gasUrlDecoded, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      redirect: 'follow',
      cache: 'no-store',
    });

    const text = await res.text();
    console.log('[PROXY GET] GAS статус:', res.status);
    console.log('[PROXY GET] GAS ответ (первые 500 символов):', text.substring(0, 500));

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('[PROXY GET] Не JSON от GAS:', e);
      data = { error: "Invalid JSON from GAS", raw: text.substring(0, 1000) };
    }

    return NextResponse.json(data, {
      status: res.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('[PROXY GET] Ошибка:', error);
    return NextResponse.json({ error: 'Failed to fetch GAS', details: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, body: gasBody } = body;

    if (!url) {
      console.error('[PROXY POST] Ошибка: отсутствует url');
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    console.log('[PROXY POST] Запрашиваемый GAS URL:', url);
    console.log('[PROXY POST] Тело для GAS:', JSON.stringify(gasBody).substring(0, 500));

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(gasBody),
      redirect: 'follow',
      cache: 'no-store',
    });

    const text = await res.text();
    console.log('[PROXY POST] GAS статус:', res.status);
    console.log('[PROXY POST] GAS текст (первые 500 символов):', text.substring(0, 500));

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('[PROXY POST] Не удалось распарсить JSON от GAS:', parseError);
      data = { error: "Invalid JSON from GAS", raw: text.substring(0, 1000) };
    }

    return NextResponse.json(data, {
      status: res.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('[PROXY POST] Критическая ошибка:', error);
    return NextResponse.json(
      { error: 'Failed to POST to GAS', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}