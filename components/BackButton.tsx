'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function BackButton({
  className = '',
  label,
}: {
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={`inline-flex items-center gap-1 p-2 rounded-lg hover:bg-gray-100 text-gray-700 ${className}`}
      aria-label={label || 'Назад'}
    >
      <ArrowLeft className="w-5 h-5" />
      {label ? <span className="text-sm">{label}</span> : null}
    </button>
  );
}
