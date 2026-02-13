'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwrxeCi4LNyxoKlO-PP9WCkit53NRCDf64JG8diwRWfIVuYwUEWQwCugxhMoTS9ZLi5/exec'; // ← ВСТАВЬ СВОЙ URL ОТ GAS

export default function CreateTaskPage() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'Средний',
    due_date: '',
    coffee_shop: 'Общая',
  });

  useEffect(() => {
    const authStr = localStorage.getItem('auth');
    if (!authStr) {
      toast.error('Не авторизован. Войдите заново');
      router.push('/auth/login');
      return;
    }
    const auth = JSON.parse(authStr);
    setLogin(auth.login);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error('Введите заголовок задачи');
      return;
    }

    if (!login) {
      toast.error('Не найден логин. Войдите заново');
      router.push('/auth/login');
      return;
    }

    setLoading(true);

    try {
      console.log('[Создание задачи] Отправляем:', { login, form });

      const payload = {
        action: 'addTask',
        login: login,
        taskData: {
          title: form.title.trim(),
          description: form.description.trim() || '',
          priority: form.priority,
          due_date: form.due_date || '',
          coffee_shop: form.coffee_shop,
        }
      };

      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const result = await res.json();
      console.log('[Создание задачи] Ответ от GAS:', result);

      if (result.error) {
        throw new Error(result.error);
      }

      toast.success('Задача создана!');
      router.push('/roznica/tasks');
    } catch (e: any) {
      console.error('[Создание задачи] Ошибка:', e);
      toast.error('Ошибка создания задачи: ' + (e.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.back()} className="text-amber-700 hover:underline">
            ← Назад
          </button>
          <h1 className="text-3xl font-bold text-amber-700">Создать задачу</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Заголовок задачи
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Например: Проверить кофемашину"
              className="w-full px-4 py-3 border rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Описание (необязательно)
            </label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Подробности, что нужно сделать..."
              className="w-full px-4 py-3 border rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition min-h-[120px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Приоритет
            </label>
            <select
              value={form.priority}
              onChange={e => setForm({ ...form, priority: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition"
            >
              <option value="Низкий">Низкий</option>
              <option value="Средний">Средний</option>
              <option value="Высокий">Высокий</option>
              <option value="Срочный">Срочный</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Срок выполнения (необязательно)
            </label>
            <input
              type="date"
              value={form.due_date}
              onChange={e => setForm({ ...form, due_date: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Кофейня
            </label>
            <input
              type="text"
              value={form.coffee_shop}
              onChange={e => setForm({ ...form, coffee_shop: e.target.value })}
              placeholder="Ашан"
              className="w-full px-4 py-3 border rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 text-white font-bold rounded-xl transition shadow-md hover:shadow-lg ${
              loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {loading ? 'Создаём...' : 'Создать задачу'}
          </button>
        </form>
      </div>
    </div>
  );
}