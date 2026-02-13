"use client";
import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import imageCompression from 'browser-image-compression';

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

const ROLES = ["Кассир", "Бариста", "Феи Чистоты", "Разогрев/зал", "Окошко", "Открытие", "Замывка", "Обед Уборщицы", "Закрытие", "Отчеты", "Ген.Уборка"] as const;
type Role = typeof ROLES[number];

const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbzXsGIrf1loZILg84Jz6wX1xsJ1_cS9xQBAilxTG9XoHGgOPjYaBM_gGNzXLYN6qQsO/exec";
const MAX_PHOTOS = 5;

export default function ClientFill() {
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

  // Кофейня — берём из auth или URL
  const fixedCafe = auth?.cafe;
  const urlCafe = sp.get("cafe") || "";
  const selectedCafe = fixedCafe || urlCafe;

  // Обработка даты
  const urlDateParam = sp.get("date") || "";
  let gasDate = "";
  if (urlDateParam) {
    if (urlDateParam.includes(".")) {
      gasDate = urlDateParam;
    } else {
      const [yyyy, mm, dd] = urlDateParam.split("-");
      gasDate = `${dd}.${mm}.${yyyy}`;
    }
  } else {
    const today = new Date();
    gasDate = `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.${today.getFullYear()}`;
  }

  const role = sp.get("role") as Role | null;
  const category = sp.get("category") || "";

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

  // Поле ФИО (обязательное)
  const [fio, setFio] = useState("");

  // === ЛОКАЛЬНЫЙ КЭШ ===
  const CACHE_KEY = `checklist_${selectedCafe || "no-cafe"}_${gasDate || "no-date"}_${role || "no-role"}_${category || "no-category"}`;

  // Восстановление из кэша
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
        toast.success("Восстановлено из кэша");
      } catch (e) {
        console.error("Ошибка кэша:", e);
        localStorage.removeItem(CACHE_KEY);
      }
    }
  }, [CACHE_KEY]);

  // Сохранение в кэш
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
    }
  }, [localState, fio, CACHE_KEY]);

  const catOptions = useMemo(() => {
    if (!fullTemplate.length) return [];
    return Array.from(new Set(fullTemplate.map(i => i.section))).sort();
  }, [fullTemplate]);

  const currentItems = useMemo(() => {
    if (selectedCafe === "Менеджер") {
      return fullTemplate;
    }
    if (!category) return [];
    return fullTemplate.filter(i => i.section === category);
  }, [fullTemplate, category, selectedCafe]);

  const setParam = (name: string, value: string) => {
    const q = new URLSearchParams(sp.toString());
    if (value) q.set(name, value);
    else q.delete(name);
    if (name === "role") q.delete("category");
    router.replace(`${pathname}?${q.toString()}`);
  };

  useEffect(() => {
    if (fixedCafe && urlCafe !== fixedCafe) {
      router.replace(`${pathname}?cafe=${encodeURIComponent(fixedCafe)}&date=${gasDate}&role=${role || ""}&category=${category}`);
    }
  }, [fixedCafe, urlCafe, gasDate, role, category, pathname, router]);

  // Загрузка шаблона
  useEffect(() => {
    async function loadTemplate() {
      if (!role) return setFullTemplate([]);
      setLoadingTemplate(true);
      try {
        const res = await fetch(`/api/checklist-template?role=${encodeURIComponent(role)}`);
        if (!res.ok) throw new Error(`Ошибка шаблона: ${res.status}`);
        const data = await res.json();
        if (data.items) setFullTemplate(data.items);
        else throw new Error(data.error || "Нет данных");
      } catch (e: any) {
        setErr(e.message || "Ошибка шаблона");
      } finally {
        setLoadingTemplate(false);
      }
    }
    loadTemplate();
  }, [role]);

  // Загрузка выполненных
  useEffect(() => {
    async function loadPerformed() {
      if (!selectedCafe || !gasDate || !role) return setPerformed([]);
      try {
        const url = new URL(GAS_ENDPOINT);
        url.searchParams.set("action", "get");
        url.searchParams.set("cafe", selectedCafe);
        url.searchParams.set("date", gasDate);
        url.searchParams.set("role", role);
        if (selectedCafe !== "Менеджер" && category) {
          url.searchParams.set("category", category);
        }
        const res = await fetch(url.toString());
        if (!res.ok) {
          const text = await res.text();
          console.error("GAS вернул ошибку:", res.status, text.substring(0, 500));
          throw new Error(`Ошибка запроса: ${res.status}`);
        }
        const data = await res.json();
        console.log("Выполненные пункты загружены:", data);
        if (data.ok && data.entries) {
          setPerformed(data.entries.map((e: any) => ({
            itemId: e.itemId || "",
            done: e.done,
            comment: e.comment || "",
            photoUrls: Array.isArray(e.photoUrl) ? e.photoUrl : (e.photoUrl ? [e.photoUrl] : []),
            performedBy: e.performedBy || "",
            timeStr: e.timeStr || "",
          })));
        } else {
          setPerformed([]);
        }
      } catch (e) {
        console.error("Ошибка загрузки:", e);
        setPerformed([]);
      }
    }
    loadPerformed();
  }, [selectedCafe, gasDate, role, category]);

  // Инициализация localState из выполненных
  useEffect(() => {
    const initial: typeof localState = {};
    performed.forEach(p => {
      if (p.itemId && p.done) {
        initial[p.itemId] = {
          done: true,
          comment: p.comment,
          photos: [],
          photoUrls: p.photoUrls,
          performedBy: p.performedBy,
        };
      }
    });
    setLocalState(prev => ({ ...prev, ...initial }));
  }, [performed]);

  const handleToggle = (id: string) => {
    const current = localState[id];
    if (current?.performedBy) return;
    setLocalState(prev => ({
      ...prev,
      [id]: {
        ... (prev[id] || { done: false, comment: "", photos: [], photoUrls: [] }),
        done: ! (prev[id]?.done || false)
      }
    }));
  };

  const handleComment = (id: string, comment: string) => {
    const current = localState[id];
    if (current?.performedBy) return;
    setLocalState(prev => ({
      ...prev,
      [id]: { ... (prev[id] || { done: false, comment: "", photos: [], photoUrls: [] }), comment }
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
          ... (prev[id] || { done: false, comment: "", photos: [], photoUrls: [] }),
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
    if (!selectedCafe || !gasDate || !role) {
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
      toast.info("Нет изменений");
      setSaving(false);
      return;
    }

    setSaveProgress({ current: 0, total: toSave.length });
    let successCount = 0;
    let errorCount = 0;

    for (const [index, { item, local }] of toSave.entries()) {
      try {
        let photoUrls = [...local.photoUrls];
        const photoPromises = local.photos.map(async (file) => {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve((reader.result as string).split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          const res = await fetch(GAS_ENDPOINT, {
            method: "POST",
            body: JSON.stringify({
              action: "upload",
              photoBase64: `data:${file.type};base64,${base64}`,
              fileName: `${gasDate}_${selectedCafe}_${item.id}_${Date.now()}.jpg`,
            }),
          });
          if (!res.ok) throw new Error(`Ошибка загрузки фото: ${res.status}`);
          const json = await res.json();
          if (!json.ok || !json.viewUrl) throw new Error("Ошибка загрузки фото");
          return json.viewUrl;
        });
        const newUrls = await Promise.all(photoPromises);
        photoUrls.push(...newUrls);

        setLocalState(prev => ({
          ...prev,
          [item.id]: {
            ...prev[item.id],
            photoUrls,
            photos: [],
          }
        }));

        const saveRes = await fetch(GAS_ENDPOINT, {
          method: "POST",
          body: JSON.stringify({
            action: "save",
            cafe: selectedCafe,
            date: gasDate,
            entries: [{
              role,
              category: selectedCafe === "Менеджер" ? "" : category,
              itemTitle: item.text,
              itemId: item.id,
              status: local.done,
              comment: local.comment,
              photoUrl: photoUrls,
              login: auth?.login || "web-app",
              performedBy: auth?.login || "web-app",
              fio: fio.trim(),
            }],
          }),
        });

        if (!saveRes.ok) throw new Error(`Ошибка сохранения: ${saveRes.status}`);
        const saveJson = await saveRes.json();
        if (saveJson.ok) {
          successCount++;
          setLocalState(prev => ({
            ...prev,
            [item.id]: {
              ...prev[item.id],
              performedBy: auth?.login || "web-app",
              photoUrls,
              photos: [],
            },
          }));
        } else {
          throw new Error(saveJson.error || "Ошибка сохранения");
        }
      } catch (e: any) {
        console.error(`Ошибка пункта "${item.text}":`, e);
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

  if (!selectedCafe || !gasDate) {
    return (
      <div className="p-6 text-center text-gray-600">
        Выберите кофейню и дату
      </div>
    );
  }

  const filters = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      <div>
        <label className="block text-sm font-medium mb-1">Роль</label>
        <select
          value={role || ""}
          onChange={e => setParam("role", e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="">— роль —</option>
          {ROLES.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>
      {selectedCafe !== "Менеджер" && (
        <div>
          <label className="block text-sm font-medium mb-1">Раздел</label>
          <select
            value={category}
            onChange={e => setParam("category", e.target.value)}
            disabled={!role || loadingTemplate}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">— раздел —</option>
            {catOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}
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
          Кофейня: <strong>{selectedCafe}</strong> · Дата: <strong>{gasDate}</strong> · Роль: <strong>{role}</strong> {selectedCafe !== "Менеджер" && `· Раздел: <strong>${category}</strong>`}
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

      {/* === ГРУППИРОВКА ПО РАЗДЕЛАМ === */}
      <div className="space-y-8">
        {(() => {
          // Группируем по section
          const grouped = currentItems.reduce((acc, item) => {
            const sec = item.section || "Без раздела";
            if (!acc[sec]) acc[sec] = [];
            acc[sec].push(item);
            return acc;
          }, {} as Record<string, Item[]>);

          const sections = Object.keys(grouped);

          return sections.map((sectionName) => (
            <div key={sectionName} className="space-y-4">
              {/* Заголовок раздела */}
              <h2 className="text-xl font-bold text-gray-800 bg-gray-100 px-5 py-3 rounded-lg">
                {sectionName}
              </h2>

              {/* Пункты раздела */}
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

                        {/* Фото загруженные */}
                        {local.photoUrls.length > 0 && (
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            {local.photoUrls.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noreferrer">
                                <img src={url} alt="фото" className="w-full h-32 object-cover rounded-lg border" />
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Новые фото */}
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
        <div className="mt-8 flex justify-center gap-4">
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