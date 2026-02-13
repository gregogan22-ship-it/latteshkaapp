// lib/dishSales.ts

import { supabase } from '@/lib/supabase';

export async function getSalesByCoffeeShop(): Promise<Record<string, Record<string, number>>> {
  try {
    const { data, error } = await supabase
      .from('dish_sales')
      .select('data')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.error('Ошибка загрузки продаж из Supabase:', error);
      return {};
    }

    return data.data || {};
  } catch (err) {
    console.error('Ошибка:', err);
    return {};
  }
}