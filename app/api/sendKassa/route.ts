import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  console.log('➡️ API sendKassa вызван');

  try {
    const body = await req.json();
    const GAS_URL = process.env.NEXT_PUBLIC_GAS_KASSA_URL;

    console.log('➡️ Проверка окружения...');
    console.log('🧩 NEXT_PUBLIC_GAS_KASSA_URL =', GAS_URL || '(не найдено)');

    // 🔍 Диагностика: если переменной нет — выводим подробный отчёт
    if (!GAS_URL) {
      console.error('❌ Переменная NEXT_PUBLIC_GAS_KASSA_URL отсутствует');
      return NextResponse.json(
        {
          error: true,
          message: '❌ Переменная NEXT_PUBLIC_GAS_KASSA_URL не найдена в окружении',
          hint: 'Проверь Settings → Environment Variables на Vercel (Production)',
          available_envs: Object.keys(process.env)
            .filter(k => k.toLowerCase().includes('gas') || k.toLowerCase().includes('url')),
        },
        { status: 500 }
      );
    }

    console.log('➡️ Отправка данных в GAS_URL:', GAS_URL);
    console.log('📦 Тело запроса:', body);

    // 🔄 Отправляем данные в Google Apps Script
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await res.text();

    // 🧠 Пробуем распарсить ответ
    try {
      const parsed = JSON.parse(text);
      console.log('✅ Ответ от GAS:', parsed);
      return NextResponse.json(parsed);
    } catch {
      console.warn('⚠️ Ответ не JSON:', text);
      return NextResponse.json({
        message: `Ответ не JSON (статус ${res.status})`,
        raw: text,
      });
    }
  } catch (err: any) {
    console.error('💥 Ошибка API:', err);
    return NextResponse.json(
      { message: 'Ошибка API: ' + err.message },
      { status: 500 }
    );
  }
}
