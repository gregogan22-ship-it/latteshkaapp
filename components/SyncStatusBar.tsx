"use client";

import { useCallback, useEffect, useState } from "react";
import {
  flushOfflineQueue,
  isBrowserOnline,
  readQueue,
  startOfflineQueueSync,
  subscribeQueue,
  type OfflineQueueItem,
} from "@/lib/offlineQueue";

/**
 * Статус сети + очередь офлайн-отправки.
 * Показывать на главной и в чек-листе.
 */
export default function SyncStatusBar({ compact = false }: { compact?: boolean }) {
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<OfflineQueueItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastMsg, setLastMsg] = useState<string | null>(null);

  const refreshOnline = useCallback(() => {
    setOnline(isBrowserOnline());
  }, []);

  useEffect(() => {
    refreshOnline();
    setQueue(readQueue());
    const unsub = subscribeQueue((items) => setQueue(items));
    const stop = startOfflineQueueSync();

    const onOnline = () => {
      refreshOnline();
      setLastMsg("Сеть появилась — отправляем очередь…");
    };
    const onOffline = () => {
      refreshOnline();
      setLastMsg("Нет сети — данные сохраняются на устройстве");
    };
    const onFlushed = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      if (d.sent > 0) {
        setLastMsg(`Отправлено из очереди: ${d.sent}`);
        setTimeout(() => setLastMsg(null), 4000);
      }
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("latteshka-offline-flushed", onFlushed as any);

    return () => {
      unsub();
      stop();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("latteshka-offline-flushed", onFlushed as any);
    };
  }, [refreshOnline]);

  const onFlush = async () => {
    if (!online || queue.length === 0) return;
    setSyncing(true);
    try {
      const r = await flushOfflineQueue();
      if (r.sent > 0) setLastMsg(`Отправлено: ${r.sent}`);
      else if (r.remaining > 0)
        setLastMsg(r.lastError || `В очереди осталось: ${r.remaining}`);
      else setLastMsg("Очередь пуста");
      setTimeout(() => setLastMsg(null), 4000);
    } finally {
      setSyncing(false);
      setQueue(readQueue());
    }
  };

  const pending = queue.length;
  const showBar = !online || pending > 0 || !!lastMsg;

  if (!showBar && compact) return null;

  if (!showBar) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-emerald-700/80 px-1 py-0.5">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Онлайн
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border px-3 py-2 ${
        !online
          ? "border-amber-300 bg-amber-50 text-amber-950"
          : pending > 0
            ? "border-sky-300 bg-sky-50 text-sky-950"
            : "border-emerald-200 bg-emerald-50 text-emerald-900"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold">
            {!online
              ? "Офлайн"
              : syncing
                ? "Синхронизация…"
                : pending > 0
                  ? `В очереди: ${pending}`
                  : "Онлайн"}
          </div>
          <div className="text-[11px] opacity-80 truncate">
            {lastMsg
              ? lastMsg
              : !online
                ? "Пункты и заявки сохраняются на телефон и уйдут при сети"
                : pending > 0
                  ? queue
                      .slice(0, 2)
                      .map((q) => q.label)
                      .join(" · ") + (pending > 2 ? ` +${pending - 2}` : "")
                  : "Всё отправлено"}
          </div>
        </div>
        {online && pending > 0 && (
          <button
            type="button"
            onClick={onFlush}
            disabled={syncing}
            className="shrink-0 rounded-lg bg-sky-600 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-60"
          >
            {syncing ? "…" : "Отправить"}
          </button>
        )}
      </div>
    </div>
  );
}
