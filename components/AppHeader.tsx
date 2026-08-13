'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home, LogOut } from 'lucide-react';

type AppHeaderProps = {
  title?: string;
  showBack?: boolean;
  showHome?: boolean;
  showLogout?: boolean;
  right?: React.ReactNode;
  className?: string;
};

/**
 * Шапка страниц admin / otchety / sklad и т.п.
 */
export default function AppHeader({
  title = 'Latteshka',
  showBack = true,
  showHome = true,
  showLogout = false,
  right,
  className = '',
}: AppHeaderProps) {
  const router = useRouter();

  const logout = () => {
    if (typeof window === 'undefined') return;
    if (!confirm('Выйти?')) return;
    try {
      localStorage.removeItem('auth');
      sessionStorage.clear();
    } catch {}
    router.push('/login');
  };

  return (
    <header
      className={`sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 min-w-0">
          {showBack && (
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-gray-100"
              aria-label="Назад"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
          {showHome && (
            <Link
              href="/"
              className="p-2 rounded-lg hover:bg-gray-100"
              aria-label="Главная"
            >
              <Home className="w-5 h-5 text-gray-600" />
            </Link>
          )}
          <h1 className="text-lg font-semibold text-gray-900 truncate ml-1">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {right}
          {showLogout && (
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1 px-2 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Выход</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
