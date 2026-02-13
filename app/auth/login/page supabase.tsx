'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Формируем фиктивный email на основе логина
    const fakeEmail = `${login.trim().toLowerCase()}@latteshka.fake`;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Неверный логин или пароль');
        } else {
          toast.error(error.message);
        }
        console.error(error);
        return;
      }

      // Сохраняем логин в localStorage (для совместимости со старым кодом)
      localStorage.setItem('auth', JSON.stringify({
        login: login.trim().toLowerCase(),
        role: 'employee' // можно потом подтянуть из profiles_terms
      }));

      toast.success('Вход выполнен!');
      router.push('/roznica/tasks');
    } catch (e: any) {
      toast.error('Ошибка входа');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50 p-6">
      <form onSubmit={handleLogin} className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-xl space-y-6">
        <h1 className="text-3xl font-bold text-center text-amber-700">Вход</h1>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Логин</label>
          <input
            type="text"
            value={login}
            onChange={e => setLogin(e.target.value)}
            placeholder="greg"
            className="w-full px-4 py-3 border rounded-xl focus:border-amber-500 outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3 border rounded-xl focus:border-amber-500 outline-none"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 text-white font-bold rounded-xl transition ${
            loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700'
          }`}
        >
          {loading ? 'Входим...' : 'Войти'}
        </button>
      </form>
    </div>
  );
}