'use client';

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import imageCompression from 'browser-image-compression';
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
  "Менеджер": [
    "Открытие",
    "Замывка",
    "Обед Уборщицы",
    "Закрытие",
    "Отчеты",
    "Ген.Уборка"
  ],
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
  "Кипарис 1": ["Окошко"],
  "Кипарис 2": ["Окошко"],
  "Ленина": ["Окошко"],
  default: ROLES,
};

// Ограничения ролей по дням недели
const DAY_ROLE_RESTRICTIONS: Record<string, string[]> = {
  "Ген.Уборка": ["Saturday", "Sunday"],
  "Отчеты": ["Saturday"],
};

const getAvailableRolesForDay = (allRolesForCafe: Role[]): Role[] => {
  const today = new Date();
  const dayOfWeek = today.toLocaleString('en-US', { weekday: 'long' });

  console.log("[DEBUG] Сегодня день недели:", dayOfWeek);

  return allRolesForCafe.filter(role => {
    const restrictedDays = DAY_ROLE_RESTRICTIONS[role];
    if (!restrictedDays) return true;
    const isAllowedToday = restrictedDays.includes(dayOfWeek);
    console.log(`[DEBUG] Роль "${role}" доступна сегодня? ${isAllowedToday} (ограничения: ${restrictedDays.join(", ")})`);
    return isAllowedToday;
  });
};

const MAX_PHOTOS = 5;

export default function ClientFill() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Авторизация
  const [auth, setAuth] = useState<{ login: string; role: string; fixed_cafe?: string } | null>(null);
  useEffect(() => {
    const stored = localStorage.getItem("auth");
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log("[DEBUG] Полные данные auth:", parsed);
      setAuth(parsed);
    }
  }, []);

  // Кофейня
  const fixedCafe = auth?.fixed_cafe || null;
  const urlCafe = searchParams.get("cafe") || "";
  const [selectedCafe, setSelectedCafe] = useState(fixedCafe || urlCafe);

  // Роль
  const urlRole = searchParams.get("role") as Role | null;
  const [role, setRole] = useState<Role | "">(urlRole || "");

  // Дата
  const urlDateParam = searchParams.get("date") || "";
  const [date, setDate] = useState(() => {
    if (urlDateParam.includes(".")) return urlDateParam;
    if (urlDateParam) {
      const [yyyy, mm, dd] = urlDateParam.split("-");
      return `${dd}.${mm}.${yyyy}`;
    }
    const today = new Date();
    return `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.${today.getFullYear()}`;
  });

  const category = searchParams.get("category") || "";

  const [fullTemplate, setFullTemplate] = useState<Item[]>([]);
  const [performed, setPerformed] = useState<PerformedItem[]>([]);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 });
  const [err, setErr] = useState<string | null>(null);

  const [localState, setLocalState] = useState<Record<string, {
    done: boolean;
    comment: string;
    photos: File[];
    photoUrls: string[];
    performedBy?: string;
  }>>({});

  const [fio, setFio] = useState("");

  // Пасхалка
  useEffect(() => {
    if (fio.trim().toLowerCase() === "армянская империя") {
      toast.success("БРАТ, ТЫ ЛУЧШИЙ, БРАТ", {
        duration: 10000,
        style: {
          fontSize: "42px",
          fontWeight: "bold",
          textAlign: "center",
          background: "#FFD700",
          color: "#000",
          padding: "40px 20px",
          borderRadius: "30px",
          boxShadow: "0 0 30px rgba(255, 215, 0, 0.8)",
        },
        icon: "🔥💪",
      });
    }
  }, [fio]);

  // Локальный кэш
  const CACHE_KEY = `checklist_${selectedCafe || "no-cafe"}_${date || "no-date"}_${role || "no-role"}_${category || "no-category"}`;

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const restoredState = Object.fromEntries(
          Object.entries(parsed).map(([id, val]: any) => [id, {
            ...val,
            photos: [],
            photoUrls: val.photoUrls || [],
          }])
        );
        setLocalState(prev => ({ ...prev, ...restoredState }));
        if (parsed.fio) setFio(parsed.fio);
        console.log("[DEBUG] Кэш восстановлен, пунктов:", Object.keys(restoredState).length);
      } catch (e) {
        console.error("[DEBUG] Ошибка кэша:", e);
        localStorage.removeItem(CACHE_KEY);
      }
    }
  }, [CACHE_KEY]);

  useEffect(() => {
    if (Object.keys(localState).length > 0 || fio.trim()) {
      const cacheable = {
        ...Object.fromEntries(
          Object.entries(localState).map(([id, val]) => [id, {
            done: val.done,
            comment: val.comment,
            photos: [],
            photoUrls: val.photoUrls,
            performedBy: val.performedBy,
          }])
        ),
        fio: fio.trim()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheable));
      console.log("[DEBUG] Кэш обновлён, пунктов:", Object.keys(cacheable).length - 1);
    }
  }, [localState, fio, CACHE_KEY]);

  const catOptions = useMemo(() => {
    if (!fullTemplate.length) return [];
    return Array.from(new Set(fullTemplate.map(i => i.section))).sort();
  }, [fullTemplate]);

  const currentItems = useMemo(() => {
    if (selectedCafe === "Менеджер") return fullTemplate;
    if (!category) return fullTemplate;
    return fullTemplate.filter(i => i.section === category);
  }, [fullTemplate, category, selectedCafe]);

  const availableRoles = useMemo(() => {
    if (!selectedCafe) return ROLES;
    const rolesForCafe = ROLE_MAPPING[selectedCafe] || ROLE_MAPPING.default || ROLES;
    const rolesForToday = getAvailableRolesForDay(rolesForCafe);
    console.log("[DEBUG] Доступные роли для", selectedCafe, "на сегодня:", rolesForToday);
    return rolesForToday;
  }, [selectedCafe]);

  const updateUrl = (newParams: Record<string, string>) => {
    const q = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) q.set(key, value);
      else q.delete(key);
    });
    if (newParams.role) q.delete("category");
    router.replace(`${pathname}?${q.toString()}`, { scroll: false });
  };

  // Установка фиксированной кофейни ОДИН РАЗ
  useEffect(() => {
    if (fixedCafe && !selectedCafe) {
      console.log("[DEBUG] Устанавливаем фиксированную кофейню:", fixedCafe);
      setSelectedCafe(fixedCafe);
      const q = new URLSearchParams(searchParams.toString());
      q.set("cafe", fixedCafe);
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    }
  }, []); // Пустые зависимости — один раз

  useEffect(() => {
    console.log("[DEBUG] Роль изменилась:", role, "typeof:", typeof role);
  }, [role]);

  // Загрузка шаблона
  useEffect(() => {
    if (!role || !selectedCafe) {
      setFullTemplate([]);
      return;
    }
    async function loadTemplate() {
      setLoadingTemplate(true);
      setErr(null);
      try {
        const { data, error } = await supabase
          .from('checklist_templates')
          .select('*')
          .eq('cafe', selectedCafe)
          .eq('role', role)
          .order('"order"', { ascending: true });
        if (error) throw error;
        const items = data.map((row: any) => ({
          id: row.item_id || `item-${role}-${Math.random()}`,
          text: row.text || "Без названия",
          photoRequired: row.photo_required ? "ДА" : "НЕТ",
          section: row.section || "Без раздела"
        }));
        setFullTemplate(items);
      } catch (e: any) {
        setErr(e.message || 'Не удалось загрузить чек-лист');
        setFullTemplate([]);
      } finally {
        setLoadingTemplate(false);
      }
    }
    loadTemplate();
  }, [role, selectedCafe]);

  // Загрузка выполненных
  useEffect(() => {
    if (!selectedCafe || !date || !role) {
      setPerformed([]);
      return;
    }
    async function loadPerformed() {
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
          timeStr: e.performed_at ? new Date(e.performed_at).toISOString() : ""
        })));
      } catch (e) {
        setPerformed([]);
      }
    }
    loadPerformed();
  }, [selectedCafe, date, role]);

  // Синхронизация performed → localState
  useEffect(() => {
    if (performed.length === 0) return;
    setLocalState(prev => {
      const newState = { ...prev };
      performed.forEach(p => {
        if (p.itemId && p.done) {
          newState[p.itemId] = {
            done: true,
            comment: p.comment || "",
            photos: [],
            photoUrls: p.photoUrls || [],
            performedBy: p.performedBy || "Неизвестно",
          };
        }
      });
      return newState;
    });
  }, [performed]);

  const handleToggle = (id: string) => {
    const current = localState[id];
    if (current?.performedBy) return;
    setLocalState(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || { done: false, comment: "", photos: [], photoUrls: [] }),
        done: !(prev[id]?.done || false)
      }
    }));
  };

  const handleComment = (id: string, comment: string) => {
    const current = localState[id];
    if (current?.performedBy) return;
    setLocalState(prev => ({
      ...prev,
      [id]: { ...(prev[id] || { done: false, comment: "", photos: [], photoUrls: [] }), comment }
    }));
  };

  const handleAddPhoto = async (id: string, file: File) => {
    const current = localState[id];
    if (current?.performedBy) return;
    if ((current?.photos.length || 0) + (current?.photoUrls.length || 0) >= MAX_PHOTOS) {
      toast.error("Максимум 5 фото");
      return;
    }
    try {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);
      setLocalState(prev => ({
        ...prev,
        [id]: {
          ...(prev[id] || { done: false, comment: "", photos: [], photoUrls: [] }),
          photos: [...(prev[id]?.photos || []), compressedFile]
        }
      }));
    } catch (e) {
      toast.error("Ошибка добавления фото");
    }
  };

  const handleRemovePhoto = (id: string, index: number) => {
    setLocalState(prev => ({
      ...prev,
      [id]: { ...prev[id], photos: prev[id].photos.filter((_, i) => i !== index) }
    }));
  };

  const save = async () => {
    if (!selectedCafe || !date || !role) {
      toast.error("Выберите кофейню, дату и роль");
      return;
    }
    if (!fio.trim()) {
      toast.error("Укажите ФИО");
      return;
    }
    setSaving(true);
    setSaveProgress({ current: 0, total: 0 });
    const toSave = currentItems
      .map(item => {
        const local = localState[item.id] || { done: false, comment: "", photos: [], photoUrls: [] };
        if (local.performedBy) return null;
        if (!local.done && !local.comment && local.photos.length === 0) return null;
        if (local.done && item.photoRequired === "ДА" && local.photos.length + local.photoUrls.length === 0) {
          toast.error(`Фото отсутствует: "${item.text}"`);
          return null;
        }
        return { item, local };
      })
      .filter(Boolean) as { item: Item; local: any }[];
    if (toSave.length === 0) {
      toast("Нет изменений");
      setSaving(false);
      return;
    }
    setSaveProgress({ current: 0, total: toSave.length });
    let successCount = 0;
    let errorCount = 0;
    for (const [index, { item, local }] of toSave.entries()) {
      try {
        let photoUrls = [...(local.photoUrls || [])];
        if (local.photos?.length > 0) {
          console.log(`[SAVE] Загружаем ${local.photos.length} фото для "${item.text}"`);
          const translitCafe = selectedCafe
            .replace(/Ашан/g, 'Ashan')
            .replace(/Кипарис/g, 'Kiparis')
            .replace(/Эссе/g, 'Esse')
            .replace(/Кофеин/g, 'Kofein')
            .replace(/Аптека/g, 'Apteka')
            .replace(/Адидас/g, 'Adidas')
            .replace(/Тренева/g, 'Treneva')
            .replace(/КМ/g, 'KM')
            .replace(/ЦУМ/g, 'TSUM')
            .replace(/Ленина/g, 'Lenina')
            .replace(/Менеджер/g, 'Manager')
            .replace(/Обход/g, 'Obhod')
            .replace(/[^a-zA-Z0-9-]/g, '_');
          const safeDate = date.split('.').reverse().join('-');
          const safeItemId = item.id.replace(/[^a-zA-Z0-9-]/g, '_');
          const photoPromises = local.photos.map(async (file) => {
            const extension = file.name.split('.').pop() || 'png';
            const fileName = `${safeDate}_${translitCafe}_${safeItemId}_${Date.now()}.${extension}`;
            console.log(`[SAVE] Имя файла для Supabase: ${fileName}`);
            const { data, error } = await supabase.storage
              .from('checklist-photos')
              .upload(fileName, file);
            if (error) throw error;
            const { data: publicUrl } = supabase.storage
              .from('checklist-photos')
              .getPublicUrl(fileName);
            return publicUrl.publicUrl;
          });
          const newUrls = await Promise.all(photoPromises);
          photoUrls = [...photoUrls, ...newUrls];
        }
        const { error } = await supabase
          .from('checklist_performed')
          .upsert({
            cafe: selectedCafe,
            date: date.split('.').reverse().join('-'),
            role: role,
            item_id: item.id,
            done: local.done,
            performed_by: fio.trim() || auth?.login || "Неизвестно",
            comment: local.comment,
            photo_urls: photoUrls
          });
        if (error) throw error;
        successCount++;
        setLocalState(prev => ({
          ...prev,
          [item.id]: {
            ...prev[item.id],
            performedBy: fio.trim() || auth?.login || "Неизвестно",
            photoUrls,
            photos: [],
          }
        }));
      } catch (e: any) {
        console.error(`[DEBUG] Ошибка сохранения пункта "${item.text}":`, e.message);
        errorCount++;
      }
      setSaveProgress({ current: index + 1, total: toSave.length });
    }
    toast.dismiss();
    if (successCount > 0) {
      toast.success(`Сохранено: ${successCount} из ${toSave.length}`);
      localStorage.removeItem(CACHE_KEY);
    }
    if (errorCount > 0) {
      toast.error(`Ошибок: ${errorCount}. Попробуйте снова`);
    }
    setSaving(false);
    setSaveProgress({ current: 0, total: 0 });
  };

  // Ранний возврат
  if (!selectedCafe || !date) {
    return (
      <div className="p-6 text-center text-gray-600">
        Выберите кофейню и дату
      </div>
    );
  }

  const filters = (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div>
        <label className="block text-sm font-medium mb-1">Кофейня</label>

        {fixedCafe ? (
          // Фиксированная кофейня — показываем только текст
          <div className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-800 cursor-not-allowed">
            {fixedCafe}
            <p className="text-xs text-gray-500 mt-1">
              Кофейня зафиксирована по вашей роли
            </p>
          </div>
        ) : (
          // Нет фиксированной — можно выбрать
          <select
            value={selectedCafe || ""}
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
          value={role}
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
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Дата</label>
        <input
          type="date"
          value={date.split(".").reverse().join("-")}
          onChange={e => {
            const newDate = e.target.value.split("-").reverse().join(".");
            setDate(newDate);
            const q = new URLSearchParams(searchParams.toString());
            if (newDate) q.set("date", newDate);
            else q.delete("date");
            router.replace(`${pathname}?${q.toString()}`, { scroll: false });
          }}
          className="w-full border rounded-lg px-3 py-2"
        />
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      {filters}

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ФИО (обязательно)
        </label>
        <input
          type="text"
          placeholder="Иванов Иван Иванович"
          value={fio}
          onChange={e => setFio(e.target.value)}
          className="w-full px-5 py-4 text-lg border-2 border-gray-300 rounded-xl focus:border-amber-500"
        />
      </div>

      <div className="mb-4 text-sm text-gray-600 flex justify-between">
        <span>
          Кофейня: <strong>{selectedCafe || "не выбрана"}</strong> · Дата: <strong>{date}</strong> · Роль: <strong>{role || "не выбрана"}</strong>
        </span>
        <button
          onClick={() => {
            if (confirm("Очистить?")) {
              localStorage.removeItem(CACHE_KEY);
              setLocalState({});
              setFio("");
              toast.success("Очищено");
            }
          }}
          className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
        >
          Очистить
        </button>
      </div>

      {loadingTemplate && <p className="text-center text-gray-600">Загрузка чек-листа...</p>}

      {err && <p className="text-center text-red-600 mb-4">{err}</p>}

      {!loadingTemplate && fullTemplate.length === 0 && role && selectedCafe && (
        <p className="text-center text-gray-600">Шаблон для "{role}" не найден в таблице "{selectedCafe}"</p>
      )}

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
              <h2 className="text-xl font-bold text-gray-800 bg-gray-100 px-5 py-3 rounded-lg">
                {sectionName}
              </h2>

              {grouped[sectionName].map((item) => {
                const local = localState[item.id] || { done: false, comment: "", photos: [], photoUrls: [], performedBy: "" };
                const isDone = local.done;
                const isSaved = !!local.performedBy;
                const photoReq = item.photoRequired;
                const totalPhotos = local.photos.length + local.photoUrls.length;

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-xl shadow-sm border p-5 ${isSaved ? "opacity-70 border-green-300" : ""}`}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => handleToggle(item.id)}
                        disabled={isSaved}
                        className="mt-1 w-6 h-6 text-green-600 rounded"
                      />
                      <div className="flex-1">
                        <p className={`font-medium ${isDone ? "line-through text-gray-500" : ""}`}>
                          {item.text}
                          {photoReq === "ДА" && <span className="text-red-600 ml-2">* фото</span>}
                        </p>
                        {isSaved && local.performedBy && (
                          <p className="text-xs text-gray-500 mt-1">
                            Выполнил: {local.performedBy}
                          </p>
                        )}
                        {local.comment && <p className="text-sm text-gray-700 mt-2 italic">"{local.comment}"</p>}
                        {local.photoUrls.length > 0 && (
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            {local.photoUrls.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noreferrer">
                                <img src={url} alt="фото" className="w-full h-32 object-cover rounded-lg border" />
                              </a>
                            ))}
                          </div>
                        )}
                        {local.photos.length > 0 && (
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            {local.photos.map((file, i) => (
                              <div key={i} className="relative">
                                <img src={URL.createObjectURL(file)} alt="новое" className="w-full h-32 object-cover rounded-lg border" />
                                <button
                                  onClick={() => handleRemovePhoto(item.id, i)}
                                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {!isSaved && isDone && (
                          <>
                            <textarea
                              placeholder="Комментарий"
                              value={local.comment}
                              onChange={e => handleComment(item.id, e.target.value)}
                              className="mt-3 w-full border rounded-lg px-3 py-2 text-sm"
                              rows={2}
                            />
                            <div className="mt-3">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Фото {photoReq === "ДА" ? "(обязательно)" : ""} ({totalPhotos}/{MAX_PHOTOS})
                              </label>
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={e => {
                                  if (e.target.files?.[0]) {
                                    handleAddPhoto(item.id, e.target.files[0]);
                                    e.target.value = "";
                                  }
                                }}
                                disabled={totalPhotos >= MAX_PHOTOS}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 disabled:opacity-50"
                              />
                            </div>
                          </>
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

      {currentItems.length > 0 && (
        <div className="mt-8 flex flex-col items-center gap-4">
          {saving && (
            <div className="w-full max-w-md p-4 bg-gray-100 rounded-xl">
              <div className="flex justify-between text-sm text-gray-700 mb-1">
                <span>Загрузка пунктов...</span>
                <span>{saveProgress.current} из {saveProgress.total}</span>
              </div>
              <div className="w-full bg-gray-300 rounded-full h-4">
                <div
                  className="bg-gradient-to-r from-amber-500 to-amber-600 h-4 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${(saveProgress.current / saveProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
          <button
            onClick={save}
            disabled={saving || !fio.trim()}
            className={`px-8 py-4 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition ${
              fio.trim() ? "bg-gradient-to-r from-green-600 to-emerald-700" : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {saving ? "Сохранение..." : "Сохранить чек-лист"}
          </button>
        </div>
      )}
    </div>
  );
}