"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

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
  photoUrls: string[]; // массив URL
  performedBy: string;
  timeStr: string;
  fio?: string; // ← новое поле: ФИО заполнившего
  managerTask?: {
    comment: string;
    requireNewPhoto: boolean;
    from: string;
    createdAt: string;
  };
};

const ROLES = ["Кассир", "Бариста", "Феи Чистоты", "Разогрев/зал", "Окошко", "Открытие", "Замывка", "Обед Уборщицы", "Закрытие", "Отчеты", "Ген.Уборка"] as const;
type Role = typeof ROLES[number];

const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbzXsGIrf1loZILg84Jz6wX1xsJ1_cS9xQBAilxTG9XoHGgOPjYaBM_gGNzXLYN6qQsO/exec";

export default function ClientView() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Авторизация
  const [auth, setAuth] = useState<{ login: string; role: string; cafe?: string; fullName?: string } | null>(null);
  useEffect(() => {
    const stored = localStorage.getItem("auth");
    if (stored) {
      setAuth(JSON.parse(stored));
    }
  }, []);

  const isManagerOrOwner = auth?.role === "manager" || auth?.role === "owner";

  // Специальные кассиры — видят ТОЛЬКО "Окошко"
  const specialCashiers = ["Кассир Кипарис 1", "Кассир Кипарис 2", "Кассир Ленина"];
  const isSpecialCashier = auth?.login && specialCashiers.includes(auth.login);

  // Кофейня
  const fixedCafe = auth?.cafe;
  const urlCafe = sp.get("cafe") || "";
  const cafe = fixedCafe || urlCafe;

  // Обработка даты
  const urlDateParam = sp.get("date") || "";
  let displayDate = new Date().toISOString().slice(0, 10); // yyyy-MM-dd для input
  let gasDate = "";
  if (urlDateParam) {
    if (urlDateParam.includes(".")) {
      const [dd, mm, yyyy] = urlDateParam.split(".");
      displayDate = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
      gasDate = urlDateParam;
    } else {
      displayDate = urlDateParam;
      const [yyyy, mm, dd] = urlDateParam.split("-");
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

  // Модальное окно для задачи
  const [taskModal, setTaskModal] = useState<{ itemId: string; text: string } | null>(null);
  const [taskComment, setTaskComment] = useState("");
  const [requireNewPhoto, setRequireNewPhoto] = useState(false);
  const [savingTask, setSavingTask] = useState(false);

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

  // Загрузка выполненных
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
        url.searchParams.set("date", gasDate);
        url.searchParams.set("role", role);
        url.searchParams.set("category", category);
        const res = await fetch(url.toString());
        const data = await res.json();
        if (data.ok && data.entries) {
          setPerformed(data.entries.map((e: any) => ({
            itemId: e.itemId || "",
            done: e.done,
            comment: e.comment || "",
            photoUrls: Array.isArray(e.photoUrl) ? e.photoUrl : (e.photoUrl ? [e.photoUrl] : []),
            performedBy: e.performedBy || "",
            timeStr: e.timeStr || "",
            managerTask: e.managerTask || undefined,
            fio: e.fio || "" // ← добавляем ФИО
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
    return performed.find(p => p.itemId === id) || { done: false, comment: "", photoUrls: [], performedBy: "", timeStr: "", fio: "" };
  };

  // Сохранение задачи от менеджера
  const saveManagerTask = async () => {
    if (!taskModal || !taskComment.trim()) {
      toast.error("Введите комментарий");
      return;
    }

    setSavingTask(true);

    try {
      const res = await fetch(GAS_ENDPOINT, {
        method: "POST",
        body: JSON.stringify({
          action: "addTask",
          cafe,
          date: gasDate,
          role,
          category,
          itemId: taskModal.itemId,
          managerLogin: auth?.login || "менеджер",
          task: {
            comment: taskComment,
            requireNewPhoto,
            from: auth?.fullName || auth?.login || "Менеджер",
            createdAt: new Date().toISOString(),
          },
        }),
      });

      const data = await res.json();

      if (data.ok) {
        toast.success("Задача успешно поставлена сотруднику");
        setTaskModal(null);
        setTaskComment("");
        setRequireNewPhoto(false);
        // Обновляем страницу, чтобы увидеть сброс галочки
        window.location.reload();
      } else {
        toast.error(data.error || "Неизвестная ошибка от сервера");
        console.error("Ошибка от GAS:", data);
      }
    } catch (e) {
      toast.error("Ошибка сети — проверьте интернет");
      console.error("Ошибка сети:", e);
    } finally {
      setSavingTask(false);
    }
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
          {ROLES.map(r => {
            // Специальные кассиры — ТОЛЬКО "Окошко"
            if (specialCashiers.includes(auth?.login || "")) {
              if (r !== "Окошко") return null;
              return <option key={r} value={r}>{r}</option>;
            }

            // Менеджеры и владельцы — все роли
            if (isManagerOrOwner) {
              return <option key={r} value={r}>{r}</option>;
            }

            // Обычные сотрудники — все кроме "Окошко" и "Менеджер"
            if (r === "Окошко" || r === "Менеджер") return null;
            return <option key={r} value={r}>{r}</option>;
          })}
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
                  {status.fio && (
                    <p className="text-sm text-gray-600 mt-1">
                      Заполнил: <strong>{status.fio}</strong>
                    </p>
                  )}
                  {status.comment && (
                    <div className="mt-3 p-3 bg-gray-100 rounded-lg">
                      <p className="text-sm italic">"{status.comment}"</p>
                    </div>
                  )}
                  {status.photoUrls.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {status.photoUrls.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block"
                        >
                          <img src={url} alt={`Фото ${i + 1}`} className="w-full h-32 object-cover rounded-lg border" />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Задача от менеджера */}
                  {status.managerTask && (
                    <div className="mt-4 p-4 bg-red-100 border border-red-400 rounded-lg">
                      <p className="text-sm font-bold text-red-800">
                        Задача от менеджера ({status.managerTask.from} · {new Date(status.managerTask.createdAt).toLocaleString("ru-RU")}):
                      </p>
                      <p className="text-sm text-red-700 mt-1">"{status.managerTask.comment}"</p>
                      {status.managerTask.requireNewPhoto && (
                        <p className="text-sm text-red-700 mt-1 font-bold">Требуется новое фото</p>
                      )}
                    </div>
                  )}

                  {/* Кнопка "Поставить задачу" — только для менеджера/владельца и только для выполненных пунктов */}
                  {isManagerOrOwner && isDone && !status.managerTask && (
                    <button
                      onClick={() => setTaskModal({ itemId: item.id, text: item.text })}
                      className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
                    >
                      Поставить задачу
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Модальное окно для задачи */}
      {taskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Поставить задачу</h3>
            <p className="text-gray-700 mb-4">{taskModal.text}</p>
            <textarea
              placeholder="Комментарий менеджера..."
              value={taskComment}
              onChange={e => setTaskComment(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-4"
              rows={4}
            />
            <label className="flex items-center gap-2 mb-6">
              <input
                type="checkbox"
                checked={requireNewPhoto}
                onChange={e => setRequireNewPhoto(e.target.checked)}
                className="w-5 h-5"
              />
              <span>Требовать новое фото</span>
            </label>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setTaskModal(null);
                  setTaskComment("");
                  setRequireNewPhoto(false);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Отмена
              </button>
              <button
                onClick={saveManagerTask}
                disabled={savingTask || !taskComment.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-70"
              >
                {savingTask ? "Сохранение..." : "Поставить задачу"}
              </button>
            </div>
          </div>
        </div>
      )}

      {currentItems.length === 0 && !loadingTemplate && (
        <div className="text-center py-20 text-gray-500">
          Нет пунктов в этом разделе
        </div>
      )}
    </div>
  );
}