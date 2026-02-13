"use client";
import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Item = {
  id: string;
  text: string;
  photoRequired: string;
  section: string;
};

type PerformedItem = {
  itemId: string;
  done: boolean;
  comment: string;
  photoUrl: string;
  performedBy: string;
  timeStr: string;
};

const ROLES = ["Кассир", "Бариста", "Феи Чистоты", "Разогрев/зал", "Окошко"] as const;
type Role = typeof ROLES[number];

const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbzC70YU-fQbT-u_TGSPhYBMOz92INMayGPwQmUcnn24giFgUyte707L7HD67yaLQYdb/exec";

export default function ClientView() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Авторизация
  const [auth, setAuth] = useState<{ login: string; role: string; cafe?: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("auth");
    if (stored) {
      setAuth(JSON.parse(stored));
    }
  }, []);

  // Кофейня
  const fixedCafe = auth?.cafe;
  const urlCafe = sp.get("cafe") || "";
  const cafe = fixedCafe || urlCafe;

  // Обработка даты
  const urlDateParam = sp.get("date") || "";
  let displayDate = new Date().toISOString().slice(0, 10); // yyyy-MM-dd для input
  let gasDate = ""; // dd.mm.yyyy для GAS

  if (urlDateParam) {
    if (urlDateParam.includes(".")) {
      // dd.mm.yyyy → yyyy-MM-dd
      const [dd, mm, yyyy] = urlDateParam.split(".");
      displayDate = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
      gasDate = urlDateParam;
    } else {
      // yyyy-MM-dd → dd.mm.yyyy
      const [yyyy, mm, dd] = urlDateParam.split("-");
      displayDate = urlDateParam;
      gasDate = `${dd}.${mm}.${yyyy}`;
    }
  } else {
    const today = new Date();
    displayDate = today.toISOString().slice(0, 10);
    gasDate = `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.${today.getFullYear()}`;
  }

  const [date, setDate] = useState(displayDate);

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    const [yyyy, mm, dd] = newDate.split("-");
    const formatted = `${dd}.${mm}.${yyyy}`;
    setParam("date", formatted);
  };

  const role = sp.get("role") as Role | null;
  const category = sp.get("category") || "";

  const [fullTemplate, setFullTemplate] = useState<Item[]>([]);
  const [performed, setPerformed] = useState<PerformedItem[]>([]);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [loadingPerformed, setLoadingPerformed] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const catOptions = useMemo(() => {
    if (!fullTemplate.length) return [];
    return Array.from(new Set(fullTemplate.map(i => i.section))).sort();
  }, [fullTemplate]);

  const currentItems = useMemo(() => {
    if (!category) return [];
    return fullTemplate.filter(i => i.section === category);
  }, [fullTemplate, category]);

  const setParam = (name: string, value: string) => {
    const q = new URLSearchParams(sp.toString());
    if (value) q.set(name, value);
    else q.delete(name);
    if (name === "role") q.delete("category");
    router.replace(`${pathname}?${q.toString()}`);
  };

  // Если кофейня фиксирована — подставляем её
  useEffect(() => {
    if (fixedCafe && urlCafe !== fixedCafe) {
      router.replace(`${pathname}?cafe=${encodeURIComponent(fixedCafe)}&date=${gasDate}&role=${role || ""}&category=${category}`);
    }
  }, [fixedCafe, urlCafe, gasDate, role, category, pathname, router]);

  // Загрузка шаблона
  useEffect(() => {
    async function loadTemplate() {
      if (!role) {
        setFullTemplate([]);
        return;
      }
      setLoadingTemplate(true);
      try {
        const res = await fetch(`/api/checklist-template?role=${encodeURIComponent(role)}`);
        const data = await res.json();
        if (data.items) {
          setFullTemplate(data.items);
        } else {
          throw new Error(data.error || "Нет данных");
        }
      } catch (e: any) {
        setErr(e.message || "Ошибка загрузки шаблона");
      } finally {
        setLoadingTemplate(false);
      }
    }
    loadTemplate();
  }, [role]);

  // Загрузка выполненных (используем gasDate в dd.mm.yyyy)
  useEffect(() => {
    async function loadPerformed() {
      if (!cafe || !gasDate || !role || !category) {
        setPerformed([]);
        return;
      }
      setLoadingPerformed(true);
      try {
        const url = new URL(GAS_ENDPOINT);
        url.searchParams.set("action", "get");
        url.searchParams.set("cafe", cafe);
        url.searchParams.set("date", gasDate); // dd.mm.yyyy
        url.searchParams.set("role", role);
        url.searchParams.set("category", category);

        const res = await fetch(url.toString());
        const data = await res.json();

        if (data.ok && data.entries) {
          setPerformed(data.entries.map((e: any) => ({
            itemId: e.itemId || "",
            done: e.done,
            comment: e.comment || "",
            photoUrl: e.photoUrl || "",
            performedBy: e.performedBy || "",
            timeStr: e.timeStr || "",
          })));
        } else {
          setPerformed([]);
        }
      } catch (e) {
        console.error("Ошибка загрузки выполненных:", e);
        setPerformed([]);
      } finally {
        setLoadingPerformed(false);
      }
    }
    loadPerformed();
  }, [cafe, gasDate, role, category]);

  const getItemStatus = (id: string) => {
    return performed.find(p => p.itemId === id) || { done: false, comment: "", photoUrl: "", performedBy: "", timeStr: "" };
  };

  if (!cafe) {
    return (
      <div className="p-6 text-center text-gray-600">
        Выберите кофейню в общем меню, затем откройте «Просмотр».
      </div>
    );
  }

  const filters = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div>
        <label className="block text-sm font-medium mb-1">Дата</label>
        <input
          type="date"
          value={date}
          onChange={e => handleDateChange(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Роль</label>
        <select
          value={role || ""}
          onChange={e => setParam("role", e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="">— выберите роль —</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Раздел</label>
        <select
          value={category}
          onChange={e => setParam("category", e.target.value)}
          disabled={!role || loadingTemplate}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="">— выберите раздел —</option>
          {catOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
    </div>
  );

  if (!role) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        {filters}
        <p className="text-center text-gray-600 mt-10">
          Кофейня: <strong>{cafe}</strong> · Дата: <strong>{gasDate}</strong>
        </p>
        <div className="text-center py-10 text-gray-500">
          Выберите роль
        </div>
      </div>
    );
  }

  if (loadingTemplate) return <div className="p-6 text-center">Загрузка шаблона...</div>;
  if (err) return <div className="p-6 text-red-600 text-center">{err}</div>;

  if (!category) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        {filters}
        <p className="text-center text-gray-600 mt-10">
          Кофейня: <strong>{cafe}</strong> · Дата: <strong>{gasDate}</strong> · Роль: <strong>{role}</strong>
        </p>
        <div className="text-center py-10 text-gray-500">
          Выберите раздел
        </div>
      </div>
    );
  }

  const performedCount = currentItems.filter(i => getItemStatus(i.id).done).length;
  const totalCount = currentItems.length;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {filters}

      <div className="mb-6 text-center">
        <p className="text-xl font-bold text-gray-800">
          Кофейня: <span className="text-amber-600">{cafe}</span> · Дата: <span className="text-amber-600">{gasDate}</span>
        </p>
        <p className="text-xl font-bold text-gray-800">
          Роль: <span className="text-amber-600">{role}</span> · Раздел: <span className="text-amber-600">{category}</span>
        </p>
        <p className="text-3xl font-bold mt-4">
          <span className="text-green-600">{performedCount}</span> / {totalCount} выполнено
        </p>
      </div>

      {loadingPerformed && <div className="text-center py-4 text-gray-500">Загрузка выполненных...</div>}

      <div className="space-y-6">
        {currentItems.map(item => {
          const status = getItemStatus(item.id);
          const isDone = status.done;

          return (
            <div key={item.id} className={`bg-white rounded-xl shadow-sm border-2 p-6 ${isDone ? "border-green-400 bg-green-50" : "border-gray-300"}`}>
              <div className="flex items-start gap-4">
                <div className="text-3xl">
                  {isDone ? "✅" : "⬜"}
                </div>
                <div className="flex-1">
                  <p className={`text-lg font-medium ${isDone ? "text-gray-700" : "text-gray-900"}`}>
                    {item.text}
                  </p>

                  {status.timeStr && status.performedBy && (
                    <p className="text-sm text-gray-600 mt-2">
                      Выполнил: <strong>{status.performedBy}</strong> · {status.timeStr}
                    </p>
                  )}

                  {status.comment && (
                    <div className="mt-3 p-3 bg-gray-100 rounded-lg">
                      <p className="text-sm italic">"{status.comment}"</p>
                    </div>
                  )}

                  {status.photoUrl && (
                    <div className="mt-4">
                      <a
                        href={status.photoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        📷 Открыть фото
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {currentItems.length === 0 && !loadingTemplate && (
        <div className="text-center py-20 text-gray-500">
          Нет пунктов в этом разделе
        </div>
      )}
    </div>
  );
}