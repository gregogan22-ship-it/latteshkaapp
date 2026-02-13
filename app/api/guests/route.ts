// app/api/guests/route.ts
import { createSupabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const admin = createSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Server only' }, { status: 500 })

  const { phone, data, discount_percent = 5 } = await request.json()

  const cleanPhone = phone.replace(/\D/g, '')
  if (cleanPhone.length !== 11) return NextResponse.json({ error: 'Bad phone' }, { status: 400 })

  const finalPhone = cleanPhone.startsWith('8') ? '7' + cleanPhone.slice(1) : cleanPhone

  const { data: guest, error } = await admin
    .from('guests')
    .upsert({ phone: finalPhone, data, discount_percent }, { onConflict: 'phone' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(guest)
}