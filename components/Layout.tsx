'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home } from 'lucide-react';

type LayoutProps = {
  children: ReactNode;
  title?: string;
  hideHeader?: boolean;
  className?: string;
  showBack?: boolean;
};

export default function Layout({
  children,
  title,
  hideHeader = false,
  className = '',
  showBack = true,
}: LayoutProps) {
  const router = useRouter();

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {!hideHeader && title ? (
        <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto flex items-center gap-2">
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
            <Link href="/" className="p-2 rounded-lg hover:bg-gray-100" aria-label="Главная">
              <Home className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-lg font-semibold text-gray-900 ml-1">{title}</h1>
          </div>
        </div>
      ) : null}
      <div className="max-w-6xl mx-auto px-4 py-4">{children}</div>
    </div>
  );
}