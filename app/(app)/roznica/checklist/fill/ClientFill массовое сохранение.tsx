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
  photoUrl: string;
  performedBy: string;
  timeStr: string;
};

const ROLES = ["Кассир", "Бариста", "Феи Чистоты", "Разогрев/зал"] as const;
type Role = typeof ROLES[number];

const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbz2vRoEOXmnQaF_phkaxeKGd9ISL9UxAWVKvJNL2siKGgOa3CCjxY5xpVwH8jXyxZQS/exec";

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
  let gasDate = ""; // dd.mm.yyyy для GAS

  if (urlDateParam) {
    if (urlDateParam.includes(".")) {
      gasDate = urlDateParam; // уже dd.mm.yyyy
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
  const [err, setErr] = useState<string | null>(null);

  const [localState, setLocalState] = useState<Record<string, {
    done: boolean;
    comment: string;
    photo?: File;
    photoUrl?: string;
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

  // Инициализация localState из выполненных
  useEffect(() => {
    const initial: typeof localState = {};
    performed.forEach(p => {
      if (p.itemId && p.done) {
        initial[p.itemId] = {
          done: true,
          comment: p.comment,
          photoUrl: p.photoUrl,
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
        ... (prev[id] || { done: false, comment: "" }),
        done: ! (prev[id]?.done || false)
      }
    }));
  };

  const handleComment = (id: string, comment: string) => {
    const current = localState[id];
    if (current?.performedBy) return;

    setLocalState(prev => ({
      ...prev,
      [id]: { ... (prev[id] || { done: false, comment: "" }), comment }
    }));
  };

  const handlePhoto = (id: string, file: File) => {
    const current = localState[id];
    if (current?.performedBy) return;

    setLocalState(prev => ({
      ...prev,
      [id]: { ... (prev[id] || { done: false, comment: "" }), photo: file }
    }));
  };

         const save = async () => {
    if (!cafe || !gasDate || !role || !category) {
      toast.error("Выберите все параметры");
      return;
    }

    setSaving(true);

    const toSave = currentItems
      .map(item => {
        const local = localState[item.id] || { done: false, comment: "", photo: null };
        if (local.performedBy) return null;
        if (!local.done && !local.comment && !local.photo) return null;

        if (local.done && item.photoRequired === "ДА" && !local.photo) {
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

    const totalPhotos = toSave.filter(t => t.local.photo).length;
    let uploadedPhotos = 0;

    const toastId = toast.loading(
      totalPhotos > 0
        ? `Загрузка фото: 0 из ${totalPhotos}...`
        : "Сохранение чек-листа...",
      { duration: 0 }
    );

    try {
      const entries = [];
      let photoIndex = 0;

      // Загружаем фото параллельно
      const photoPromises = toSave
        .filter(t => t.local.photo)
        .map(async ({ item, local }) => {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve((reader.result as string).split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(local.photo!);
          });

          const uploadRes = await fetch(GAS_ENDPOINT, {
            method: "POST",
            body: JSON.stringify({
              action: "upload",
              photoBase64: `data:${local.photo!.type};base64,${base64}`,
              fileName: `${gasDate}_${cafe}_${item.id}.jpg`,
            }),
          });

          const uploadJson = await uploadRes.json();
          if (!uploadJson.ok || !uploadJson.viewUrl) {
            throw new Error(`Не удалось загрузить фото для "${item.text}"`);
          }

          uploadedPhotos++;
          toast.loading(`Загрузка фото: ${uploadedPhotos} из ${totalPhotos}...`, { id: toastId });

          return uploadJson.viewUrl;
        });

      const photoUrls = await Promise.all(photoPromises);

      // Формируем entries
      for (const { item, local } of toSave) {
        const photoUrl = local.photo ? photoUrls[photoIndex++] : "";

        entries.push({
          role,
          category,
          itemTitle: item.text,
          itemId: item.id,
          status: local.done,
          comment: local.comment,
          photoUrl,
          login: auth?.login || "web-app",
        });
      }

      // Сохранение в GAS
      const saveRes = await fetch(GAS_ENDPOINT, {
        method: "POST",
        body: JSON.stringify({
          action: "save",
          cafe,
          date: gasDate,
          entries,
        }),
      });

      const saveJson = await saveRes.json();

      if (saveJson.ok) {
        toast.success(
          `Чек-лист сохранён! Добавлено: ${saveJson.appended || 0}, обновлено: ${saveJson.updated || 0}`,
          { id: toastId }
        );

        // Обновляем localState без перезагрузки
        const newLocal: typeof localState = { ...localState };
        toSave.forEach(({ item }) => {
          newLocal[item.id] = {
            ...newLocal[item.id],
            performedBy: auth?.login || "web-app",
          };
        });
        setLocalState(newLocal);
      } else {
        toast.error(saveJson.error || "Ошибка сохранения", { id: toastId });
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Ошибка при сохранении", { id: toastId });
    } finally {
      setSaving(false);
    }
  };
  if (!cafe || !gasDate) {
    return (
      <div className="p-6 text-center text-gray-600">
        Выберите кофейню и дату, затем откройте «Заполнить чек-лист».
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
          const local = localState[item.id] || { done: false, comment: "", photoUrl: "", performedBy: "" };
          const isDone = local.done;
          const isSaved = !!local.performedBy;
          const photoReq = item.photoRequired;

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

                  {local.photoUrl && (
                    <div className="mt-3">
                      <a href={local.photoUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline text-sm">
                        📷 Фото уже загружено
                      </a>
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
                          Фото {photoReq === "ДА" ? "(обязательно)" : "(по желанию)"}
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          key={item.id + "-camera"}
                          onChange={e => {
                            if (e.target.files?.[0]) {
                              handlePhoto(item.id, e.target.files[0]);
                              e.target.value = "";
                            }
                          }}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Фото будет сделано с камеры (на месте). Галерея недоступна.
                        </p>
                        {local.photo && <p className="text-xs text-green-600 mt-1">Фото готово к отправке</p>}
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
        <div className="mt-8 flex justify-center">
          <button
            onClick={save}
            disabled={saving}
            className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl disabled:opacity-70"
          >
            {saving ? "Сохранение..." : "Сохранить чек-лист"}
          </button>
        </div>
      )}
    </div>
  );
}