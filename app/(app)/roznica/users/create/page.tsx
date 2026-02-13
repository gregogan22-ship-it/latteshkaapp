'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CreateEmployeePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: '',
    login: '',
    role: 'employee',
    coffee_shop: 'Общая',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.full_name.trim() || !form.login.trim()) {
      toast.error('Заполните ФИО и логин');
      return;
    }

    try {
      console.log('[CreateEmployee] Отправка формы:', form);

      const { error } = await supabase.from('profiles_terms').insert({
        full_name: form.full_name.trim(),
        login: form.login.trim(),
        role: form.role,
        coffee_shop: form.coffee_shop,
      });

      if (error) {
        console.error('[CreateEmployee] Ошибка вставки:', error);
        throw error;
      }

      console.log('[CreateEmployee] Сотрудник успешно создан');
      toast.success('Сотрудник создан!');
      router.push('/roznica/users'); // или куда хочешь после создания
    } catch (e: any) {
      console.error('[CreateEmployee] Критическая ошибка:', e);
      toast.error('Ошибка создания сотрудника: ' + (e.message || 'Неизвестная ошибка'));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.back()} className="text-amber-700 hover:underline">
            ← Назад
          </button>
          <h1 className="text-3xl font-bold text-amber-700">Создать сотрудника</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ФИО</label>
            <input
              type="text"
              value={form.full_name}
              onChange={e => setForm({ ...form, full_name: e.target.value })}
              placeholder="Иванов Иван Иванович"
              className="w-full px-4 py-3 border rounded-xl focus:border-amber-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Логин</label>
            <input
              type="text"
              value={form.login}
              onChange={e => setForm({ ...form, login: e.target.value })}
              placeholder="ivanov"
              className="w-full px-4 py-3 border rounded-xl focus:border-amber-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Роль</label>
            <select
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl focus:border-amber-500 outline-none"
            >
              <option value="employee">Сотрудник</option>
              <option value="manager">Менеджер</option>
              <option value="owner">Владелец</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Кофейня</label>
            <input
              type="text"
              value={form.coffee_shop}
              onChange={e => setForm({ ...form, coffee_shop: e.target.value })}
              placeholder="Ашан"
              className="w-full px-4 py-3 border rounded-xl focus:border-amber-500 outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition shadow-md hover:shadow-lg"
          >
            Создать сотрудника
          </button>
        </form>
      </div>
    </div>
  );
}