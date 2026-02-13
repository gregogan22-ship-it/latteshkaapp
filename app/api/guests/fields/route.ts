import { createSupabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Server only' }, { status: 500 });
  }

  const { data, error } = await admin
    .from('form_fields')
    .select('*')
    .order('order_index');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}