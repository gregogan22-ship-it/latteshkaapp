// app/api/import-file/route.ts

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CAFE_NAMES = ['Ашан', 'Эссе', 'Кофеин', 'Адидас', 'Тренева', 'Аптека', 'КМ', 'ЦУМ', 'Ленина', 'Кипарис 1', 'Кипарис 2'];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const start = formData.get('start') as string;
    const end = formData.get('end') as string;

    if (!file) return NextResponse.json({ error: 'Файл не загружен' }, { status: 400 });
    if (!start || !end) return NextResponse.json({ error: 'Выбери период' }, { status: 400 });

    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setDate(endDate.getDate() + 1);

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    let imported = 0;

    for (const sheetName of workbook.SheetNames) {
      const dateMatch = sheetName.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
      if (!dateMatch) continue;

      const sheetDateStr = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
      const sheetDate = new Date(sheetDateStr);
      if (sheetDate < startDate || sheetDate >= endDate) continue;

      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', range: 'A1:Z200' });

      let currentCafe = '';
      let cafeStartRow = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cellA = row[0]?.toString().trim();

        if (cellA && CAFE_NAMES.some(name => cellA.includes(name))) {
          currentCafe = CAFE_NAMES.find(name => cellA.includes(name))!;
          cafeStartRow = i;
          continue;
        }

        if (!currentCafe) continue;

        const timeRowIndex = i - cafeStartRow - 6;
        if (timeRowIndex < 0 || timeRowIndex > 3) continue;

        const times = ['11:00', '15:00', '19:00', 'Закрытие'];
        const time = times[timeRowIndex];

        const turnoverToday = parseFloat(row[4]?.toString().replace(/[^0-9.-]/g, '') || '0') || 0;
        const cashToday = parseFloat(row[5]?.toString().replace(/[^0-9.-]/g, '') || '0') || 0;

        const cardsRow = rows[cafeStartRow + 8 + timeRowIndex];
        const cardsFact = parseInt(cardsRow?.[7]?.toString().replace(/[^0-9]/g, '') || '0') || 0;

        if (turnoverToday === 0 && cashToday === 0 && cardsFact === 0) continue;

        const success = await importLog(currentCafe, sheetDateStr, time, cashToday, 0, turnoverToday, 0, cardsFact);
        if (success) imported++;
      }
    }

    return NextResponse.json({ success: true, imported });
  } catch (err: any) {
    console.error('ИМПОРТ ОШИБКА:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function importLog(cafeName: string, date: string, logTime: string, cash: number, bonus: number, turnover: number, checks: number, cards: number) {
  try {
    const { data: cafe } = await supabase.from('coffee_shops').select('id').eq('name', cafeName).single();
    if (!cafe) return false;

    let { data: shift } = await supabase
      .from('shifts')
      .select('id')
      .eq('cafe_id', cafe.id)
      .gte('opened_at', `${date}T00:00:00`)
      .lte('opened_at', `${date}T23:59:59`)
      .is('closed_at', null)
      .single();

    if (!shift) {
      const { data: newShift } = await supabase.from('shifts').insert({ cafe_id: cafe.id }).select().single();
      if (!newShift) return false;
      shift = newShift;
    }

    const { error } = await supabase.from('cash_logs').upsert({
      shift_id: shift.id,
      log_time: logTime,
      cash_amount: cash,
      bonus_amount: bonus,
      turnover: turnover,
      checks_count: checks,
      loyalty_cards_issued: cards,
    }, { onConflict: 'shift_id,log_time' });

    return !error;
  } catch (err) {
    return false;
  }
}