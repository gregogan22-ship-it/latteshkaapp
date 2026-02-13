// app/api/register-guest/route.ts
import { createSupabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();

  const guestData = {
    phone: body.phone,
    card_number: body.card_number,
    surname: body.data.surname?.trim() || null,
    name: body.data.name?.trim() || null,
    patronymic: body.data.patronymic?.trim() || null,
    birthday: body.data.birthday || null,
    coffee_shop: body.data.coffee_shop,
    consent: true,                                    // ты проверяешь галочку на клиенте
    unique_id: body.card_number,                      // или можно сгенерировать отдельно, если хочешь
    data: body.data,                                  // оставляем полную копию, если нужно
  };

  const { data, error } = await createSupabaseAdmin()!
    .from('guests')
    .upsert(guestData, { onConflict: 'phone' });

  if (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}