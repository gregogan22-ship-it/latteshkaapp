'use client';

const KEY = 'latteshka_token_v0';

export function loginLocal(user: string, pass: string): boolean {
  const U = process.env.NEXT_PUBLIC_ADMIN_USER ?? 'admin';
  const P = process.env.NEXT_PUBLIC_ADMIN_PASS ?? 'coffee';
  const ok = user === U && pass === P;
  if (ok) localStorage.setItem(KEY, 'ok');
  return ok;
}

export function isAuthed(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(KEY) === 'ok';
}

export function logoutLocal() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}