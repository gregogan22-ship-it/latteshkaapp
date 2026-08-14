import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function tplTable(draft?: boolean | string | null) {
  return draft === true || draft === '1' || draft === 'true'
    ? 'checklist_templates_draft'
    : 'checklist_templates'
}

/**
 * CRUD шаблонов чек-листов под service role —
 * управляющие/менеджеры могут редактировать без RLS-блокировок.
 * Права на вход в UI проверяются на клиенте (роль).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const cafe = searchParams.get('cafe')
    const role = searchParams.get('role')
    const onlyCafes = searchParams.get('onlyCafes') === '1'
    const draft = searchParams.get('draft') === '1'
    const T = tplTable(draft)

    if (onlyCafes) {
      // пагинация — иначе PostgREST отдаёт только первые ~1000 строк
      const cafes = new Set<string>()
      const page = 1000
      let from = 0
      for (;;) {
        const { data, error } = await supabaseServer
          .from(T)
          .select('cafe')
          .range(from, from + page - 1)
        if (error) throw error
        const batch = data || []
        for (const r of batch) {
          const c = String((r as any).cafe || '').trim()
          if (c) cafes.add(c)
        }
        if (batch.length < page) break
        from += page
      }
      return NextResponse.json({ success: true, data: Array.from(cafes).sort((a, b) => a.localeCompare(b, 'ru')) })
    }

    const warehouseOnly = searchParams.get('warehouseOnly') === '1'

    // Все строки склада (локации с «склад» в имени) — для fill/editor без обрезки
    if (warehouseOnly && !cafe) {
      const all: any[] = []
      const page = 1000
      let from = 0
      for (;;) {
        const { data, error } = await supabaseServer
          .from(T)
          .select('*')
          .ilike('cafe', '%склад%')
          .order('order', { ascending: true })
          .range(from, from + page - 1)
        if (error) throw error
        const batch = data || []
        all.push(...batch)
        if (batch.length < page) break
        from += page
      }
      return NextResponse.json({ success: true, data: all })
    }

    // По cafe/role тоже пагинируем
    const all: any[] = []
    const page = 1000
    let from = 0
    for (;;) {
      let q = supabaseServer
        .from(T)
        .select('*')
        .order('order', { ascending: true })
        .range(from, from + page - 1)
      if (cafe) q = q.eq('cafe', cafe)
      if (role) q = q.eq('role', role)
      const { data, error } = await q
      if (error) throw error
      const batch = data || []
      all.push(...batch)
      if (batch.length < page) break
      from += page
    }
    return NextResponse.json({ success: true, data: all })
  } catch (e: any) {
    console.error('templates GET', e)
    return NextResponse.json({ success: false, error: e.message || 'error', data: [] }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const action = body.action as string
    const T = tplTable(body.draft)

    if (action === 'insert') {
      const rows = Array.isArray(body.rows) ? body.rows : body.row ? [body.row] : []
      if (!rows.length) {
        return NextResponse.json({ success: false, error: 'Нет данных' }, { status: 400 })
      }
      const { data, error } = await supabaseServer.from(T).insert(rows).select()
      if (error) throw error
      return NextResponse.json({ success: true, data })
    }

    if (action === 'update') {
      const { id, patch } = body
      if (!id || !patch) {
        return NextResponse.json({ success: false, error: 'id и patch обязательны' }, { status: 400 })
      }
      const { data, error } = await supabaseServer
        .from('checklist_templates')
        .update(patch)
        .eq('id', id)
        .select()
      if (error) throw error
      return NextResponse.json({ success: true, data })
    }

    if (action === 'update_many') {
      const { filter, patch } = body
      if (!filter || !patch) {
        return NextResponse.json({ success: false, error: 'filter и patch' }, { status: 400 })
      }
      let q = supabaseServer.from(T).update(patch)
      if (filter.id) q = q.eq('id', filter.id)
      if (filter.cafe) q = q.eq('cafe', filter.cafe)
      if (filter.role) q = q.eq('role', filter.role)
      if (filter.section !== undefined) {
        if (filter.section === null || filter.section === '') q = q.is('section', null)
        else q = q.eq('section', filter.section)
      }
      if (filter.ids?.length) q = q.in('id', filter.ids)
      const { data, error } = await q.select()
      if (error) throw error
      return NextResponse.json({ success: true, data })
    }

    if (action === 'delete') {
      if (body.id) {
        const { error } = await supabaseServer.from(T).delete().eq('id', body.id)
        if (error) throw error
        return NextResponse.json({ success: true })
      }
      if (body.ids?.length) {
        const { error } = await supabaseServer.from(T).delete().in('id', body.ids)
        if (error) throw error
        return NextResponse.json({ success: true })
      }
      // удалить роль или категорию: cafe + role [+ section]
      if (body.cafe && body.role) {
        let q = supabaseServer
          .from(T)
          .delete({ count: 'exact' })
          .eq('cafe', body.cafe)
          .eq('role', body.role)
        if (body.section !== undefined) {
          if (body.section === null || body.section === '' || body.section === 'Без раздела') {
            q = q.or('section.is.null,section.eq.')
          } else {
            q = q.eq('section', body.section)
          }
        }
        const { error, count } = await q
        if (error) throw error
        return NextResponse.json({ success: true, count: count ?? 0 })
      }
      if (body.cafe) {
        const { error, count } = await supabaseServer
          .from(T)
          .delete({ count: 'exact' })
          .eq('cafe', body.cafe)
        if (error) throw error
        return NextResponse.json({ success: true, count })
      }
      return NextResponse.json({ success: false, error: 'Нечего удалять' }, { status: 400 })
    }

    if (action === 'rename_cafe') {
      const { from, to } = body
      if (!from || !to) {
        return NextResponse.json({ success: false, error: 'from/to' }, { status: 400 })
      }
      const { error } = await supabaseServer
        .from('checklist_templates')
        .update({ cafe: to })
        .eq('cafe', from)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === 'rename_section') {
      const { cafe, role, from, to } = body
      if (!cafe || !role) {
        return NextResponse.json({ success: false, error: 'cafe и role обязательны' }, { status: 400 })
      }
      const fromSec = from === 'Без раздела' || from === '' || from == null ? null : String(from)
      const toSec =
        to === 'Без раздела' || to === '' || to == null ? null : String(to).trim()
      let q = supabaseServer
        .from('checklist_templates')
        .update({ section: toSec })
        .eq('cafe', cafe)
        .eq('role', role)
      if (fromSec === null) {
        q = q.or('section.is.null,section.eq.')
      } else {
        q = q.eq('section', fromSec)
      }
      const { data, error } = await q.select('id')
      if (error) throw error
      return NextResponse.json({ success: true, data: data || [], count: (data || []).length })
    }

    if (action === 'rename_role') {
      const { cafe, from, to } = body
      if (!cafe || !from || !to) {
        return NextResponse.json({ success: false, error: 'cafe/from/to обязательны' }, { status: 400 })
      }
      if (String(from).trim() === String(to).trim()) {
        return NextResponse.json({ success: true, data: [], count: 0 })
      }
      const { data, error } = await supabaseServer
        .from('checklist_templates')
        .update({ role: String(to).trim() })
        .eq('cafe', cafe)
        .eq('role', from)
        .select('id')
      if (error) throw error
      return NextResponse.json({ success: true, data: data || [], count: (data || []).length })
    }

    if (action === 'publish_from_draft') {
      // Меняем ТОЛЬКО кофейни, у которых есть строки в черновике.
      // Кофейни без черновика — не трогаем боевые шаблоны.
      // ВАЖНО: select без пагинации даёт только ~1000 строк → часть кофеен «пропадает».
      const draftCafeSet = new Set<string>()
      {
        const page = 1000
        let from = 0
        for (;;) {
          const { data: draftCafeRows, error: draftCafeErr } = await supabaseServer
            .from('checklist_templates_draft')
            .select('cafe')
            .range(from, from + page - 1)
          if (draftCafeErr) throw draftCafeErr
          const batch = draftCafeRows || []
          batch.forEach((r: any) => {
            const c = String(r.cafe || '').trim()
            if (c) draftCafeSet.add(c)
          })
          if (batch.length < page) break
          from += page
          if (from > 50000) break
        }
      }

      const norm = (s: string) =>
        String(s || '')
          .trim()
          .replace(/\s+/g, ' ')
          .toLowerCase()

      // map norm -> canonical name as stored in draft
      const draftByNorm = new Map<string, string>()
      Array.from(draftCafeSet).forEach((c) => {
        draftByNorm.set(norm(c), c)
      })

      const cafesRaw = body.cafes
      let requested: string[] = []
      if (cafesRaw === 'all') {
        requested = Array.from(draftCafeSet)
      } else if (Array.isArray(cafesRaw)) {
        requested = cafesRaw.map((c: any) => String(c || '').trim()).filter(Boolean)
      }

      // пересечение без учёта регистра/пробелов; в работу — каноническое имя из черновика
      const cafes: string[] = []
      const skipped: string[] = []
      for (const req of requested) {
        const hit = draftByNorm.get(norm(req))
        if (hit) {
          if (!cafes.includes(hit)) cafes.push(hit)
        } else {
          skipped.push(req)
        }
      }

      if (!cafes.length) {
        return NextResponse.json(
          {
            success: false,
            error:
              'В черновике нет выбранных кофеен — боевые шаблоны не изменены. Проверьте название (Тренева) и что пункты сохранены в checklist_templates_draft.',
            skipped,
            draftCafesSample: Array.from(draftCafeSet).slice(0, 30),
            draftCafesCount: draftCafeSet.size,
          },
          { status: 400 }
        )
      }

      const results: any[] = []
      for (const cafe of cafes) {
        const page = 1000
        const draftRows: any[] = []
        let from = 0
        for (;;) {
          const { data, error } = await supabaseServer
            .from('checklist_templates_draft')
            .select('*')
            .eq('cafe', cafe)
            .range(from, from + page - 1)
          if (error) throw error
          const batch = data || []
          draftRows.push(...batch)
          if (batch.length < page) break
          from += page
        }

        // пустой черновик по кофейне — не удаляем боевой
        if (!draftRows.length) {
          results.push({ cafe, deleted: 0, inserted: 0, skipped: true, reason: 'empty_draft' })
          continue
        }

        const { error: delErr, count } = await supabaseServer
          .from('checklist_templates')
          .delete({ count: 'exact' })
          .eq('cafe', cafe)
        if (delErr) throw delErr

        let inserted = 0
        const rows = draftRows.map((r: any) => {
          const { created_at, updated_at, ...rest } = r
          return {
            ...rest,
            id: rest.id || crypto.randomUUID(),
            item_id: rest.item_id || rest.id,
            updated_at: new Date().toISOString(),
          }
        })
        for (let i = 0; i < rows.length; i += 50) {
          const chunk = rows.slice(i, i + 50)
          const { error: insErr } = await supabaseServer.from('checklist_templates').insert(chunk)
          if (insErr) throw insErr
          inserted += chunk.length
        }
        results.push({ cafe, deleted: count ?? 0, inserted })
      }
      return NextResponse.json({
        success: true,
        results,
        skipped,
        note: 'Боевые шаблоны менялись только для кофеен с данными в черновике',
      })
    }

    if (action === 'copy_prod_to_draft') {
      const cafesRaw = body.cafes
      let cafes: string[] = []
      if (cafesRaw === 'all') {
        const { data, error } = await supabaseServer.from('checklist_templates').select('cafe')
        if (error) throw error
        cafes = Array.from(
          new Set((data || []).map((r: any) => String(r.cafe || '').trim()).filter(Boolean))
        )
      } else if (Array.isArray(cafesRaw)) {
        cafes = cafesRaw.map((c: any) => String(c || '').trim()).filter(Boolean)
      }
      if (!cafes.length) {
        return NextResponse.json({ success: false, error: 'Нет кофеен' }, { status: 400 })
      }
      const results: any[] = []
      for (const cafe of cafes) {
        await supabaseServer.from('checklist_templates_draft').delete().eq('cafe', cafe)
        const page = 1000
        const prod: any[] = []
        let from = 0
        for (;;) {
          const { data, error } = await supabaseServer
            .from('checklist_templates')
            .select('*')
            .eq('cafe', cafe)
            .range(from, from + page - 1)
          if (error) throw error
          const batch = data || []
          prod.push(...batch)
          if (batch.length < page) break
          from += page
        }
        let inserted = 0
        if (prod.length) {
          for (let i = 0; i < prod.length; i += 50) {
            const chunk = prod.slice(i, i + 50)
            const { error: insErr } = await supabaseServer.from('checklist_templates_draft').insert(chunk)
            if (insErr) throw insErr
            inserted += chunk.length
          }
        }
        results.push({ cafe, inserted })
      }
      return NextResponse.json({ success: true, results })
    }

    return NextResponse.json({ success: false, error: 'Неизвестное action' }, { status: 400 })
  } catch (e: any) {
    console.error('templates POST', e)
    return NextResponse.json({ success: false, error: e.message || 'error' }, { status: 500 })
  }
}
