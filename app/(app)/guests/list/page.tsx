// app/(app)/guests/list/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';

const PAGE_SIZE = 100;

type Guest = {
  id: string;
  phone: string;
  card_number?: string | null;
  created_at: string;
  surname?: string | null;
  name?: string | null;
  patronymic?: string | null;
  data?: Record<string, any> | null;
};

export default function GuestsList() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [filtered, setFiltered] = useState<Guest[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const isMounted = useRef(false);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    const from = guests.length;
    const to = from + PAGE_SIZE - 1;

    const { data } = await supabase
      .from('guests')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (data?.length) {
      setGuests(prev => {
        const existing = new Set(prev.map(g => g.id));
        const added = data.filter(g => !existing.has(g.id));
        return [...prev, ...added];
      });
      if (data.length < PAGE_SIZE) setHasMore(false);
    } else {
      setHasMore(false);
    }
    setLoading(false);
  }, [guests.length, loading, hasMore]);

  // Первая загрузка
  useEffect(() => {
    isMounted.current = true;
    loadMore();
  }, []);

  // Бесконечный скролл — только на клиенте
  useEffect(() => {
    if (!isMounted.current) return;

    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000 &&
        hasMore &&
        !loading
      ) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore, hasMore, loading]);

  // Поиск
  useEffect(() => {
    if (!search.trim()) {
      setFiltered(guests);
      return;
    }

    const q = search.toLowerCase().trim();
    const phoneDigits = search.replace(/\D/g, '');

    const result = guests.filter(g => {
      if (phoneDigits && g.phone.includes(phoneDigits)) return true;

      const get = (col: any, key: string) =>
        String(col ?? g.data?.[key] ?? '').toLowerCase();

      const surname = get(g.surname, 'surname');
      const name = get(g.name, 'name');
      const patronymic = get(g.patronymic, 'patronymic');
      const card = String(g.card_number ?? '').toLowerCase();

      return (
        surname.includes(q) ||
        name.includes(q) ||
        patronymic.includes(q) ||
        card.includes(q) ||
        `${surname} ${name} ${patronymic}`.includes(q)
      );
    });

    setFiltered(result);
  }, [search, guests]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center gap-4 mb-8">
          <Link href="/guests" className="p-3 hover:bg-white rounded-xl transition">
            <ArrowLeft className="w-8 h-8 text-purple-600" />
          </Link>
          <h1 className="text-3xl font-bold">Карты гостей</h1>
          <span className="text-gray-500">
            ({guests.length}{search && ` → ${filtered.length}`})
          </span>
        </div>

        <div className="relative max-w-2xl mb-8">
          <Search className="absolute left-4 top-4 w-6 h-6 text-gray-400" />
          <input
            type="text"
            placeholder="Фамилия, имя, телефон, карта..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-white border rounded-xl text-lg focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          {filtered.map(g => {
            const surname = g.surname ?? g.data?.surname ?? '—';
            const name = g.name ?? g.data?.name ?? '—';
            const patronymic = g.patronymic ?? g.data?.patronymic ?? '';
            const card = g.card_number ?? '—';

            return (
              <div
                key={g.id}
                className="flex flex-col sm:flex-row justify-between p-5 border rounded-xl hover:bg-gray-50 transition"
              >
                <div>
                  <p className="font-semibold text-lg">{surname} {name} {patronymic}</p>
                  <p className="text-gray-600">
                    {g.phone.replace(/(\d)(\d{3})(\d{3})(\d{2})(\d{2})/, '+$1 $2 $3-$4-$5')}
                    {card !== '—' && <> · {card}</>}
                  </p>
                </div>
                <div className="mt-4 sm:mt-0 text-right">
                  <span className="inline-block bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-bold">
                    5% скидка
                  </span>
                  <p className="text-sm text-gray-500 mt-2">
                    {new Date(g.created_at).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              </div>
            );
          })}

          {loading && <div className="text-center py-8 text-gray-500">Загружается...</div>}
          {!hasMore && guests.length > 0 && <div className="text-center py-8 text-gray-400">Больше нет</div>}
        </div>
      </div>
    </div>
  );
}