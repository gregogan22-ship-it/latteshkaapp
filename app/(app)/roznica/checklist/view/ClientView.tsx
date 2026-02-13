'use client';

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { supabase } from '@/lib/supabase';

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
  photoUrls: string[];
  performedBy: string;
  timeStr: string;
  fio?: string;
  managerTask?: {
    comment: string;
    requireNewPhoto: boolean;
    from: string;
    createdAt: string;
  };
};

const ROLES = [
  "Кассир",
  "Бармен",
  "Фея Чистоты",
  "Разогрев/Зал",
  "Окошко",
  "Открытие",
  "Замывка",
  "Обед Уборщицы",
  "Закрытие",
  "Отчеты",
  "Ген.Уборка",
  "Администратор"
] as const;

const MANAGER_ROLES = [
  "Открытие",
  "Замывка",
  "Обед Уборщицы",
  "Закрытие",
  "Отчеты",
  "Ген.Уборка"
] as const;

type Role = typeof ROLES[number];

// Маппинг: кофейня → список доступных ролей
const ROLE_MAPPING: Record<string, Role[]> = {
  // Менеджер — только менеджерские роли
  "Менеджер": [
    "Открытие",
    "Замывка",
    "Обед Уборщицы",
    "Закрытие",
    "Отчеты",
    "Ген.Уборка"
  ],
  // Ашан, Эссе, Кофеин — эти роли
  "Ашан": [
    "Кассир",
    "Бармен",
    "Фея Чистоты",
    "Разогрев/Зал"
  ],
  "Эссе": [
    "Кассир",
    "Бармен",
    "Фея Чистоты",
    "Разогрев/Зал"
  ],
  "Кофеин": [
    "Кассир",
    "Бармен",
    "Фея Чистоты",
    "Разогрев/Зал"
  ],
  // Аптека, Адидас, Тренева, КМ, ЦУМ — эти роли
  "Аптека": [
    "Администратор",
    "Бармен",
    "Фея Чистоты"
  ],
  "Адидас": [
    "Администратор",
    "Бармен",
    "Фея Чистоты"
  ],
  "Тренева": [
    "Администратор",
    "Бармен",
    "Фея Чистоты"
  ],
  "КМ": [
    "Администратор",
    "Бармен",
    "Фея Чистоты"
  ],
  "ЦУМ": [
    "Администратор",
    "Бармен",
    "Фея Чистоты"
  ],
  // Кипарис 1, Кипарис 2, Ленина — только Окошко
  "Кипарис 1": ["Окошко"],
  "Кипарис 2": ["Окошко"],
  "Ленина": ["Окошко"],
  // Для всех остальных кофеен — полный список
  default: ROLES,
};

// Ограничения ролей по дням недели (только эти роли доступны в указанные дни)
const DAY_ROLE_RESTRICTIONS: Record<string, string[]> = {
  "Ген.Уборка": ["Saturday", "Sunday"], // только выходные
  "Отчеты": ["Saturday"],               // только суббота
  // "Открытие" — ежедневно, поэтому не указываем
  // Добавь сюда другие роли с ограничениями, если нужно
};

// Функция фильтрации ролей по текущему дню недели
const getAvailableRolesForDay = (allRolesForCafe: Role[]): Role[] => {
  const today = new Date();
  const dayOfWeek = today.toLocaleString('en-US', { weekday: 'long' }); // "Monday", "Saturday" и т.д.

  console.log("[DEBUG] Сегодня день недели:", dayOfWeek);

  return allRolesForCafe.filter(role => {
    const restrictedDays = DAY_ROLE_RESTRICTIONS[role];
    if (!restrictedDays) {
      // Роль без ограничений — доступна всегда
      return true;
    }
    const isAllowedToday = restrictedDays.includes(dayOfWeek);
    console.log(`[DEBUG] Роль "${role}" доступна сегодня? ${isAllowedToday} (ограничения: ${restrictedDays.join(", ")})`);
    return isAllowedToday;
  });
};

export default function ClientView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [auth, setAuth] = useState<{ login: string; role: string; cafe?: string; fullName?: string } | null>(null);
  useEffect(() => {
  const stored = localStorage.getItem("auth");
  if (stored) {
    const parsed = JSON.parse(stored);
    console.log("[DEBUG] Полные данные auth:", parsed); // ← посмотри здесь
    setAuth(parsed);
  }
}, []);

  const fixedCafe = auth?.fixed_cafe || null; // явно только fixed_cafe
  const urlCafe = searchParams.get("cafe") || "";
  const [selectedCafe, setSelectedCafe] = useState(fixedCafe || urlCafe);

  const urlRole = searchParams.get("role") as Role | null;
  const [role, setRole] = useState<Role | "">(urlRole || "");

  const urlDateParam = searchParams.get("date") || "";
  let displayDate = new Date().toISOString().slice(0, 10);
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
    const q = new URLSearchParams(searchParams.toString());
    q.set("date", formatted);
    router.replace(`${pathname}?${q.toString()}`);
  };

  const category = searchParams.get("category") || "";

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
    if (selectedCafe === "Менеджер") return fullTemplate;
    if (!category) return [];
    return fullTemplate.filter(i => i.section === category);
  }, [fullTemplate, category, selectedCafe]);

  // Динамический список ролей: учитываем кофейню и текущий день недели
  const availableRoles = useMemo(() => {
    if (!selectedCafe) return ROLES;

    // 1. Берём роли для выбранной кофейни
    const rolesForCafe = ROLE_MAPPING[selectedCafe] || ROLE_MAPPING.default || ROLES;

    // 2. Фильтруем роли по текущему дню недели
    const rolesForToday = getAvailableRolesForDay(rolesForCafe);

    console.log("[DEBUG] Доступные роли для", selectedCafe, "на сегодня:", rolesForToday);

    return rolesForToday;
  }, [selectedCafe]);

  // Сброс недоступной роли
  useEffect(() => {
    if (selectedCafe && role && !availableRoles.includes(role)) {
      console.log("[DEBUG] Роль", role, "недоступна для", selectedCafe, "— сбрасываем");
      setRole("");
      const q = new URLSearchParams(searchParams.toString());
      q.delete("role");
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    }
  }, [availableRoles, selectedCafe, role]);

  const setParam = (name: string, value: string) => {
    const q = new URLSearchParams(searchParams.toString());
    if (value) q.set(name, value);
    else q.delete(name);
    if (name === "role") q.delete("category");
    router.replace(`${pathname}?${q.toString()}`);
  };

  // Если кофейня фиксирована — подставляем её только при первом рендере
  useEffect(() => {
    if (fixedCafe && !selectedCafe) {
      console.log("[DEBUG] Фиксированная кофейня из auth:", fixedCafe);
      setSelectedCafe(fixedCafe);
      setParam("cafe", fixedCafe);
    }
  }, []);

  // Загрузка шаблона из Supabase
  useEffect(() => {
    async function loadTemplate() {
      if (!role || !selectedCafe) {
        setFullTemplate([]);
        return;
      }
      setLoadingTemplate(true);
      try {
        const { data, error } = await supabase
          .from('checklist_templates')
          .select('*')
          .eq('cafe', selectedCafe)
          .eq('role', role)
          .order('"order"', { ascending: true });

        if (error) throw error;

        const items = data.map((row: any) => ({
          id: row.item_id,
          text: row.text,
          photoRequired: row.photo_required ? "ДА" : "НЕТ",
          section: row.section || "Без раздела"
        }));

        setFullTemplate(items);
      } catch (e: any) {
        setErr(e.message || "Ошибка загрузки шаблона");
      } finally {
        setLoadingTemplate(false);
      }
    }
    loadTemplate();
  }, [role, selectedCafe]);

  // Загрузка выполненных из Supabase
  useEffect(() => {
    async function loadPerformed() {
      if (!selectedCafe || !date || !role) {
        setPerformed([]);
        return;
      }
      const needsCategory = selectedCafe !== "Менеджер";
      if (needsCategory && !category) {
        setPerformed([]);
        return;
      }
      setLoadingPerformed(true);
      try {
        const { data, error } = await supabase
          .from('checklist_performed')
          .select('*')
          .eq('cafe', selectedCafe)
          .eq('date', date.split('.').reverse().join('-'))
          .eq('role', role);

        if (error) throw error;

        setPerformed(data.map((e: any) => ({
          itemId: e.item_id || "",
          done: e.done,
          comment: e.comment || "",
          photoUrls: e.photo_urls || [],
          performedBy: e.performed_by || "",
          timeStr: e.performed_at ? new Date(e.performed_at).toISOString() : "",
          managerTask: e.manager_task || undefined,
          fio: e.fio || ""
        })));
      } catch (e) {
        console.error("Ошибка загрузки выполненных:", e);
        setPerformed([]);
      } finally {
        setLoadingPerformed(false);
      }
    }
    loadPerformed();
  }, [selectedCafe, date, role, category]);

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
      const { error } = await supabase
        .from('checklist_performed')
        .update({
          manager_task: {
            comment: taskComment,
            require_new_photo: requireNewPhoto,
            from: auth?.fullName || auth?.login || "Менеджер",
            created_at: new Date().toISOString(),
          }
        })
        .eq('cafe', selectedCafe)
        .eq('date', date.split('.').reverse().join('-'))
        .eq('role', role)
        .eq('item_id', taskModal.itemId);

      if (error) throw error;

      toast.success("Задача успешно поставлена сотруднику");
      setTaskModal(null);
      setTaskComment("");
      setRequireNewPhoto(false);
      window.location.reload();
    } catch (e: any) {
      toast.error(e.message || "Ошибка сохранения задачи");
    } finally {
      setSavingTask(false);
    }
  };

    // ... (весь код до return остаётся без изменений)

  if (!selectedCafe) {
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
        <label className="block text-sm font-medium mb-1">Кофейня</label>
        {fixedCafe ? (
          <div className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-800 cursor-not-allowed">
            {fixedCafe}
            <p className="text-xs text-gray-500 mt-1">
              Кофейня зафиксирована по вашей роли
            </p>
          </div>
        ) : (
          <select
            value={selectedCafe}
            onChange={e => {
              const newCafe = e.target.value;
              console.log("[DEBUG] Выбрана кофейня:", newCafe);
              setSelectedCafe(newCafe);
              const q = new URLSearchParams(searchParams.toString());
              if (newCafe) q.set("cafe", newCafe);
              else q.delete("cafe");
              router.replace(`${pathname}?${q.toString()}`, { scroll: false });
            }}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">— кофейня —</option>
            <option value="Ашан">Ашан</option>
            <option value="Кипарис 1">Кипарис 1</option>
            <option value="Эссе">Эссе</option>
            <option value="Кофеин">Кофеин</option>
            <option value="Аптека">Аптека</option>
            <option value="Адидас">Адидас</option>
            <option value="Тренева">Тренева</option>
            <option value="КМ">КМ</option>
            <option value="ЦУМ">ЦУМ</option>
            <option value="Ленина">Ленина</option>
            <option value="Кипарис 2">Кипарис 2</option>
            <option value="Менеджер">Менеджер</option>
          </select>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Роль</label>
        <select
          value={role || ""}
          onChange={e => {
            const newRole = e.target.value as Role;
            console.log("[DEBUG] Выбрана роль:", newRole);
            setRole(newRole);
            const q = new URLSearchParams(searchParams.toString());
            if (newRole) q.set("role", newRole);
            else q.delete("role");
            if (newRole) q.delete("category");
            router.replace(`${pathname}?${q.toString()}`, { scroll: false });
          }}
          className="w-full border rounded-lg px-3 py-2"
          disabled={!selectedCafe}
        >
          <option value="">— роль —</option>
          {availableRoles.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {selectedCafe !== "Менеджер" && (
        <div>
          <label className="block text-sm font-medium mb-1">Категория</label>
          <select
            value={category}
            onChange={e => setParam("category", e.target.value)}
            disabled={!role || loadingTemplate}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">— все категории —</option>
            {catOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}
    </div>
  );

  // Убираем лишние проверки — сразу показываем контент, если есть роль
  if (!role) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        {filters}
        <div className="text-center py-10 text-gray-500">
          Выберите роль
        </div>
      </div>
    );
  }

  if (loadingTemplate) return <div className="p-6 text-center">Загрузка шаблона...</div>;
  if (err) return <div className="p-6 text-red-600 text-center">{err}</div>;

  const performedCount = currentItems.filter(i => getItemStatus(i.id).done).length;
  const totalCount = currentItems.length;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {filters}

      <div className="mb-8 text-center">
        <p className="text-xl font-bold text-gray-800">
          Кофейня: <span className="text-amber-600">{selectedCafe}</span> · Дата: <span className="text-amber-600">{date.split('-').reverse().join('.')}</span>
        </p>
        <p className="text-xl font-bold text-gray-800">
          Роль: <span className="text-amber-600">{role}</span>
          {selectedCafe !== "Менеджер" && category && ` · Категория: <span className="text-amber-600">${category}</span>`}
        </p>
        <p className="text-3xl font-bold mt-6">
          <span className="text-green-600">{performedCount}</span> / {totalCount} выполнено
        </p>
      </div>

      {loadingPerformed && <div className="text-center py-4 text-gray-500">Загрузка выполненных...</div>}

      <div className="space-y-8">
        {(() => {
          const grouped = currentItems.reduce((acc, item) => {
            const sec = item.section || "Без раздела";
            if (!acc[sec]) acc[sec] = [];
            acc[sec].push(item);
            return acc;
          }, {} as Record<string, Item[]>);

          const sections = Object.keys(grouped);

          return sections.map((sectionName) => (
            <div key={sectionName} className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800 bg-gray-100 px-5 py-4 rounded-lg text-center">
                {sectionName}
              </h2>

              {grouped[sectionName].map((item) => {
                const status = getItemStatus(item.id);
                const isDone = status.done;

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-xl shadow-sm border-2 p-6 ${isDone ? "border-green-400 bg-green-50" : "border-gray-300"}`}
                  >
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
                              <a key={i} href={url} target="_blank" rel="noreferrer">
                                <img src={url} alt={`Фото ${i + 1}`} className="w-full h-32 object-cover rounded-lg border" />
                              </a>
                            ))}
                          </div>
                        )}
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
                        {auth?.role === "manager" && isDone && !status.managerTask && (
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
          ));
        })()}
      </div>

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
          Нет пунктов для этой категории
        </div>
      )}
    </div>
  );
}