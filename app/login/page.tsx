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
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Находим пользователя по nickname
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, role, coffee_shop')
        .eq('nickname', nickname.trim())
        .single();

      if (profileError || !profile) {
        throw new Error('Пользователь с таким логином не найден');
      }

      // 2. Логинимся по user_id (uuid) и паролю
      // Supabase Auth требует email, но мы используем uuid как "email" (это хак)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: profile.user_id, // ← используем uuid вместо email
        password,
      });

      if (error) throw error;

      // 3. Сохраняем данные в localStorage (как раньше)
      localStorage.setItem('auth', JSON.stringify({
        login: nickname,
        fullName: profile.full_name,
        role: profile.role,
        cafe: profile.coffee_shop,
      }));

      toast.success('Вход выполнен!');
      router.push('/roznica/tasks'); // или на дашборд
    } catch (e: any) {
      toast.error(e.message || 'Неверный логин или пароль');
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Логин (nickname)</label>
          <input
            type="text"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
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