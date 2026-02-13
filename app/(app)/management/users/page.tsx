// app/(app)/management/users/page.tsx
'use client';
import Link from 'next/link';
import { UserPlus, Shield, History, Users } from 'lucide-react';

export default function UsersHome() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-10 text-teal-700">Пользователи и права</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <Link href="/management/users/list" className="block">
            <div className="p-8 bg-white border-2 border-teal-200 rounded-3xl hover:border-teal-500 transition-all hover:shadow-lg">
              <Users className="w-16 h-16 mx-auto mb-4 text-teal-600" />
              <h3 className="text-xl font-bold text-center">Список сотрудников</h3>
            </div>
          </Link>

          <Link href="/management/users/add" className="block">
            <div className="p-8 bg-white border-2 border-teal-200 rounded-3xl hover:border-teal-500 transition-all hover:shadow-lg">
              <UserPlus className="w-16 h-16 mx-auto mb-4 text-teal-600" />
              <h3 className="text-xl font-bold text-center">Добавить сотрудника</h3>
            </div>
          </Link>

          <Link href="/management/users/roles" className="block">
            <div className="p-8 bg-white border-2 border-teal-200 rounded-3xl hover:border-teal-500 transition-all hover:shadow-lg">
              <Shield className="w-16 h-16 mx-auto mb-4 text-teal-600" />
              <h3 className="text-xl font-bold text-center">Роли и права</h3>
            </div>
          </Link>

          <Link href="/management/users/logs" className="block">
            <div className="p-8 bg-white border-2 border-teal-200 rounded-3xl hover:border-teal-500 transition-all hover:shadow-lg">
              <History className="w-16 h-16 mx-auto mb-4 text-teal-600" />
              <h3 className="text-xl font-bold text-center">Журнал входов</h3>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}