import { createSupabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: { phone: string } }) {
  const admin = createSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Server only' }, { status: 500 });

  const { data, error } = await admin
    .from('guests')
    .select('*')
    .eq('phone', params.phone.replace(/\D/g, ''));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}