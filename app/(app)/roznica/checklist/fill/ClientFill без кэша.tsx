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
};

const ROLES = ["Кассир", "Бариста", "Феи Чистоты", "Разогрев/зал", "Окошко", "Менеджер"] as const;
type Role = typeof ROLES[number];

const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycby-TUSThKT3PfaiSUAUqYvxrBzSyfdpGlN-BvCGZJN8imXYUtd_nVuL99WuV5ZIJCa_/exec";

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

  // Кофейня
  const fixedCafe = auth?.cafe;
  const urlCafe = sp.get("cafe") || "";
  const cafe = fixedCafe || urlCafe;

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
  const [loadingPerformed, setLoadingPerformed] = useState(false);
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

  const handleAddPhoto = (id: string, file: File) => {
    const current = localState[id];
    if (current?.performedBy) return;
    if ((current?.photos.length || 0) + (current?.photoUrls.length || 0) >= MAX_PHOTOS) {
      toast.error("Максимум 5 фото на пункт");
      return;
    }
    setLocalState(prev => ({
      ...prev,
      [id]: { ... (prev[id] || { done: false, comment: "", photos: [], photoUrls: [] }), photos: [...(prev[id]?.photos || []), file] }
    }));
  };

  const handleRemovePhoto = (id: string, index: number, isNew: boolean) => {
    const current = localState[id];
    if (current?.performedBy) return;
    if (isNew) {
      setLocalState(prev => ({
        ...prev,
        [id]: { ...prev[id], photos: prev[id].photos.filter((_, i) => i !== index) }
      }));
    }
  };

  // Сохранение каждого пункта отдельно с прогресс-баром
  const save = async () => {
    if (!cafe || !gasDate || !role || !category) {
      toast.error("Выберите все параметры");
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
          toast.error(`Обязательное фото отсутствует: "${item.text}"`);
          return null;
        }
        return { item, local };
      })
      .filter(Boolean) as { item: Item; local: any }[];

    if (toSave.length === 0) {
      toast.info("Нет изменений для сохранения");
      setSaving(false);
      return;
    }

    setSaveProgress({ current: 0, total: toSave.length });
    let successCount = 0;
    let errorCount = 0;

    for (const [index, { item, local }] of toSave.entries()) {
      try {
        let photoUrls = [...local.photoUrls];

        // Загрузка новых фото
        for (const file of local.photos) {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve((reader.result as string).split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const uploadRes = await fetch(GAS_ENDPOINT, {
            method: "POST",
            body: JSON.stringify({
              action: "upload",
              photoBase64: `data:${file.type};base64,${base64}`,
              fileName: `${gasDate}_${cafe}_${item.id}_${Date.now()}.jpg`,
            }),
          });

          const uploadJson = await uploadRes.json();
          if (!uploadJson.ok || !uploadJson.viewUrl) {
            throw new Error(`Не удалось загрузить фото для "${item.text}"`);
          }
          photoUrls.push(uploadJson.viewUrl);
        }

        // Сохранение пункта — передаём массив photoUrls
        const saveRes = await fetch(GAS_ENDPOINT, {
          method: "POST",
          body: JSON.stringify({
            action: "save",
            cafe,
            date: gasDate,
            entries: [{
              role,
              category,
              itemTitle: item.text,
              itemId: item.id,
              status: local.done,
              comment: local.comment,
              photoUrl: photoUrls, // ← массив URL
              login: auth?.login || "web-app",
              performedBy: auth?.login || "web-app", // ← записываем логин в колонку "Выполнил"
            }],
          }),
        });

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
        console.error(`Ошибка при сохранении "${item.text}":`, e);
        errorCount++;
        toast.error(`Ошибка для "${item.text}": ${e.message}`);
      }

      setSaveProgress(prev => ({ ...prev, current: index + 1 }));
    }

    if (successCount > 0) {
      toast.success(`Успешно сохранено: ${successCount} пунктов`);
    }
    if (errorCount > 0) {
      toast.error(`Ошибок: ${errorCount}`);
    }

    setSaving(false);
    setSaveProgress({ current: 0, total: 0 });
  };

  if (!cafe || !gasDate) {
    return (
      <div className="p-6 text-center text-gray-600">
        Выберите кофейню и дату, затем откройте «Заполнить чек-лист».
      </div>
    );
  }

  // Разрешённые логины для "Окошко"
  const oкошкоAllowedLogins = ["Кассир Кипарис 1", "Кассир Кипарис 2", "Кассир Ленина"];
  const isOкошкоUser = auth?.login && oкошкоAllowedLogins.includes(auth.login);

  const filters = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      <div>
        <label className="block text-sm font-medium mb-1">Роль</label>
        <select
          value={role || ""}
          onChange={e => setParam("role", e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="">— выберите роль —</option>
          {ROLES.map(r => {
            if (isOкошкоUser) {
              if (r !== "Окошко") return null;
            } else {
              if (r === "Окошко") return null;
            }
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
          Выберите раздел для заполнения
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {filters}
      <div className="mb-4 text-sm text-gray-600">
        Кофейня: <strong>{cafe}</strong> · Дата: <strong>{gasDate}</strong> · Роль: <strong>{role}</strong> · Раздел: <strong>{category}</strong>
      </div>
      {loadingPerformed && <div className="text-center py-4 text-gray-500">Загрузка выполненных пунктов...</div>}
      <div className="space-y-6">
        {currentItems.map(item => {
          const local = localState[item.id] || { done: false, comment: "", photos: [], photoUrls: [], performedBy: "" };
          const isDone = local.done;
          const isSaved = !!local.performedBy;
          const photoReq = item.photoRequired;
          const totalPhotos = local.photos.length + local.photoUrls.length;

          return (
            <div key={item.id} className={`bg-white rounded-xl shadow-sm border p-5 ${isSaved ? "opacity-70 border-green-300" : ""}`}>
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() => handleToggle(item.id)}
                  disabled={isSaved}
                  className="mt-1 w-6 h-6 text-green-600 rounded focus:ring-green-500"
                />
                <div className="flex-1">
                  <p className={`font-medium ${isDone ? "line-through text-gray-500" : ""}`}>
                    {item.text}
                    {photoReq === "ДА" && <span className="text-red-600 ml-2">* фото обязательно</span>}
                    {photoReq === "По желанию" && <span className="text-amber-600 ml-2">(фото по желанию)</span>}
                  </p>
                  {isSaved && local.performedBy && (
                    <p className="text-xs text-gray-500 mt-1">
                      Выполнил: {local.performedBy}
                    </p>
                  )}
                  {local.comment && (
                    <p className="text-sm text-gray-700 mt-2 italic">"{local.comment}"</p>
                  )}
                  {/* Уже загруженные фото */}
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
                          <img src={URL.createObjectURL(file)} alt="новое фото" className="w-full h-32 object-cover rounded-lg border" />
                          {!isSaved && (
                            <button
                              onClick={() => handleRemovePhoto(item.id, i, true)}
                              className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {!isSaved && isDone && (
                    <>
                      <textarea
                        placeholder="Комментарий (опционально)"
                        value={local.comment}
                        onChange={e => handleComment(item.id, e.target.value)}
                        className="mt-3 w-full border rounded-lg px-3 py-2 text-sm"
                        rows={2}
                      />
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Фото {photoReq === "ДА" ? "(обязательно)" : "(по желанию)"} (макс. {MAX_PHOTOS}, сейчас: {totalPhotos})
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
                        <p className="text-xs text-gray-500 mt-2">
                          Фото будет сделано с камеры (на месте). Галерея недоступна.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {currentItems.length > 0 && (
        <div className="mt-8 space-y-4">
          {saving && saveProgress.total > 0 && (
            <div className="bg-gray-200 rounded-full h-8 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-600 to-emerald-700 h-full flex items-center justify-center text-white font-bold transition-all duration-300"
                style={{ width: `${(saveProgress.current / saveProgress.total) * 100}%` }}
              >
                {saveProgress.current} / {saveProgress.total}
              </div>
            </div>
          )}
          <div className="flex justify-center">
            <button
              onClick={save}
              disabled={saving}
              className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl disabled:opacity-70"
            >
              {saving ? "Сохранение..." : "Сохранить чек-лист"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}