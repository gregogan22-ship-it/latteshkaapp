'use client';

import { ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { isAuthed, logoutLocal } from '@/lib/auth';
import { cn } from '@/lib/cn';
import {
  Factory,
  Boxes,
  Store,
  Settings,
  BarChart3,
  LogOut,
  ArrowLeft,
} from 'lucide-react';

// ✅ Импорт контекста касс
import { KassaProvider } from '@/components/context/KassaContext';

const NAV = [
  { href: '/production', label: 'Цех', icon: Factory },
  { href: '/sklad', label: 'Склад', icon: Boxes },
  { href: '/roznica', label: 'Розница', icon: Store },
  { href: '/management', label: 'Управление', icon: Settings },
  { href: '/otchety', label: 'Отчёты', icon: BarChart3 },
] as const;

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthed()) router.replace('/login');
  }, [router]);

  const showBack = pathname !== '/home' && pathname !== '/otchety' && pathname !== '/';

  return (
    // ✅ Оборачиваем всё приложение в KassaProvider
    <KassaProvider>
      <div className="min-h-screen flex flex-col bg-[#f8f9fc] relative overflow-hidden">
        {/* === Верхняя панель === */}
        <header className="flex items-center justify-center relative px-6 py-4 bg-white/80 backdrop-blur-xl border-b shadow-sm sticky top-0 z-20 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="rain"></div>
          </div>

          {/* Кнопка "Назад" */}
          {showBack && (
            <button
              onClick={() => router.back()}
              className="absolute left-6 flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl bg-gray-900 text-white hover:opacity-80 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Назад
            </button>
          )}

          {/* Название приложения (ведёт на /home) */}
          <Link
            href="/home"
            className="relative z-20 text-2xl font-semibold tracking-tight select-none bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
            style={{ fontFamily: "'Poppins', 'Inter', sans-serif" }}
          >
            Latteshka<span className="font-light">APP</span>
          </Link>

          {/* Кнопка выхода */}
          <button
            onClick={() => {
              logoutLocal();
              router.replace('/login');
            }}
            className="absolute right-6 flex items-center gap-2 px-3 py-1.5 text-sm rounded-xl bg-gray-900 text-white hover:opacity-80 transition"
          >
            <LogOut className="w-4 h-4" />
            Выйти
          </button>
        </header>

        {/* === Контент === */}
        <main className="flex-1 p-6">{children}</main>

        {/* === Dock === */}
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 flex justify-center z-30">
          <div className="flex bg-white/80 backdrop-blur-xl rounded-3xl px-8 py-3 shadow-2xl border border-gray-200 gap-6">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname?.startsWith(href);
              return (
                <motion.div
                  key={href}
                  whileHover={{ scale: 1.25, y: -4 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  className="relative group flex flex-col items-center"
                >
                  <Link
                    href={href}
                    className={cn(
                      'p-3 rounded-2xl transition-all flex items-center justify-center',
                      active
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <Icon className="w-6 h-6" />
                  </Link>
                  <div className="absolute bottom-full mb-2 px-2 py-1 text-xs rounded-lg bg-gray-900 text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {label}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </nav>
      </div>
    </KassaProvider>
  );
}
