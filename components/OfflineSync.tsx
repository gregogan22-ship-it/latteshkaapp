'use client';

import { useEffect, useState } from 'react';
import {
  flushOfflineQueue,
  isBrowserOnline,
  readQueue,
  startOfflineQueueSync,
  subscribeQueue,
  type OfflineQueueItem,
} from '@/lib/offlineQueue';
import { CloudOff, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Глобально (layout): статус сети + очередь.
 * Закреплён снизу на всех страницах.
 */
export default function OfflineSync() {
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<OfflineQueueItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setOnline(isBrowserOnline());
    setQueue(readQueue());

    const onOnline = () => {
      setOnline(true);
      setTimeout(() => {
        void flushOfflineQueue().then(r => {
          if (r.sent > 0) toast.success(`Отправлено из очереди: ${r.sent}`);
          setQueue(readQueue());
        });
      }, 1000);
    };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    const unsub = subscribeQueue(setQueue);
    const stop = startOfflineQueueSync();

    const onFlushed = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d?.sent > 0) {
        toast.success(`Отправлено из офлайн-очереди: ${d.sent}`);
      }
      setQueue(readQueue());
    };
    window.addEventListener('latteshka-offline-flushed', onFlushed);

    const ensureLink = (rel: string, href: string, attrs: Record<string, string> = {}) => {
      let el = document.querySelector(`link[rel="${rel}"][href="${href}"]`) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement('link');
        el.rel = rel;
        el.href = href;
        Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
        document.head.appendChild(el);
      }
    };
    ensureLink('manifest', '/manifest.webmanifest');
    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = '#db2777';
      document.head.appendChild(meta);
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js?v=3')
        .then(reg => {
          try {
            reg.update();
          } catch {
            /* ignore */
          }
        })
        .catch(err => {
          console.warn('SW register failed', err);
        });
    }

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('latteshka-offline-flushed', onFlushed);
      unsub();
      stop();
    };
  }, []);

  const syncNow = async () => {
    setSyncing(true);
    try {
      if (!isBrowserOnline()) {
        toast.error('Нет сети');
        return;
      }
      const r = await flushOfflineQueue();
      setQueue(readQueue());
      if (r.sent > 0) toast.success(`Отправлено: ${r.sent}`);
      else if (r.remaining === 0) toast.success('Очередь пуста');
      else if (r.failed > 0) {
        const err = r.lastError || readQueue()[0]?.lastError || 'неизвестная ошибка';
        toast.error(`Не удалось: ${err}`, { duration: 6000 });
      }
    } catch (e: any) {
      toast.error(`Ошибка: ${e?.message || e}`);
    } finally {
      setSyncing(false);
    }
  };

  if (!mounted) return null;

  const pending = queue.length;
  const lastErr = queue.find(q => q.lastError)?.lastError;
  const quiet = online && pending === 0;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[200] pointer-events-none">
      {/* отступ под нижнее меню приложения, если есть */}
      <div className="max-w-lg mx-auto px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-auto">
        <div
          className={`rounded-2xl shadow-lg border px-3 py-2 flex items-center gap-2 text-sm transition-colors ${
            !online
              ? 'bg-amber-50 border-amber-300 text-amber-950'
              : pending > 0
                ? 'bg-sky-50 border-sky-300 text-sky-950'
                : 'bg-white/95 border-emerald-200 text-emerald-900 backdrop-blur'
          }`}
        >
          {!online ? (
            <WifiOff className="w-4 h-4 flex-shrink-0" />
          ) : (
            <Wifi className={`w-4 h-4 flex-shrink-0 ${quiet ? 'text-emerald-600' : ''}`} />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium leading-tight">
              {!online ? 'Офлайн' : quiet ? 'Онлайн' : 'Онлайн'}
              {pending > 0 ? ` · в очереди: ${pending}` : quiet ? ' · всё синхронизировано' : ''}
            </p>
            {!quiet && (
              <>
                {pending > 0 && (
                  <p className="text-[11px] opacity-80 truncate">
                    {queue[0].label}
                    {pending > 1 ? ` +${pending - 1}` : ''}
                  </p>
                )}
                {!online && (
                  <p className="text-[11px] opacity-80 truncate">
                    Данные сохраняются на устройстве
                  </p>
                )}
                {lastErr && (
                  <p className="text-[10px] text-red-700 truncate mt-0.5" title={lastErr}>
                    {lastErr}
                  </p>
                )}
              </>
            )}
          </div>
          {pending > 0 && (
            <button
              type="button"
              onClick={() => void syncNow()}
              disabled={syncing || !online}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/90 border text-xs font-medium disabled:opacity-50"
            >
              {syncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CloudOff className="w-3.5 h-3.5" />
              )}
              Отправить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
