'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Factory, Package2, Store, Settings, FileText } from 'lucide-react';

const navItems = [
{ href: '/production', label: 'Цех', icon: Factory },
{ href: '/sklad', label: 'Склад', icon: Package2 },
  { href: '/roznica', label: 'Розница', icon: Store },
  { href: '/management', label: 'Управление', icon: Settings },
  { href: '/otchety', label: 'Отчёты', icon: FileText },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
                isActive ? 'text-purple-600' : 'text-gray-500'
              }`}
            >
              <item.icon className="w-7 h-7" />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
              {isActive && <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-600 rounded-t-full" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}