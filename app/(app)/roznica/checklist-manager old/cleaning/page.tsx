"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import imageCompression from 'browser-image-compression';

const MASTER_SPREADSHEET_ID = "1lCHpyah_MeDoQRYPSARrW4NOJx57EcZyXmZtKz7l1zM";
const SPECIAL_SHEET_NAME = "Специальные чек листы";
const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbxUeCKxS_EEwcbw4oOiVCO8YijUZ8cMRhf4c6r3XnxDGDqPYoUK88GSD0Lil06Wl5QF/exec";

const MAX_PHOTOS = 5;

export default function CleaningChecklist() {
  const [auth, setAuth] = useState<{ login: string; role: string; cafe?: string; fullName?: string } | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPerformed, setLoadingPerformed] = useState(false); // ← добавлено здесь
  const [error, setError] = useState<string | null>(null);
  const [localState, setLocalState] = useState<Record<string, {
    done: boolean;
    comment: string;
    photos: File[];
    photoUrls: string[];
    performedBy?: string;
  }>>({});
  const [saving, setSaving] = useState(false);

  // Загрузка auth
  useEffect(() => {
    const stored = localStorage.getItem("auth");
    if (stored) {
      setAuth(JSON.parse(stored));
    }
  }, []);

  // Загрузка пунктов
  useEffect(() => {
    const loadCleaningChecklist = async () => {
      setLoading(true);
      setError(null);
      setItems([]);
      try {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${MASTER_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SPECIAL_SHEET_NAME)}`;
        const res = await fetch(csvUrl);
        if (!res.ok) throw new Error("Не удалось загрузить чек-лист");
        const csvText = await res.text();
        const lines = csvText.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2) {
          setError("Вкладка 'Специальные чек листы' пуста");
          return;
        }
        const headerLine = lines[0];
        const headers = headerLine.match(/"([^"]*)"/g)?.map(h => h.slice(1, -1).trim()) || [];
        const sectionIdx = headers.findIndex(h => h.toLowerCase().includes("раздел") || h.toLowerCase().includes("категория"));
        const textIdx = headers.findIndex(h => h.toLowerCase().includes("пункт") || h.toLowerCase().includes("текст"));
        const photoIdx = headers.findIndex(h => h.toLowerCase().includes("фото"));
        if (sectionIdx === -1 || textIdx === -1) {
          throw new Error("Не найдены колонки Раздел и Пункт");
        }
        const parsedItems = lines.slice(1).map(line => {
          const values = line.match(/"([^"]*)"/g)?.map(v => v.slice(1, -1).trim()) || [];
          const section = values[sectionIdx] || "";
          const text = values[textIdx] || "";
          if (section.toLowerCase().includes("ген уборка") || section.toLowerCase().includes("генеральная уборка")) {
            return {
              section,
              text,
              photoRequired: photoIdx !== -1 ? (values[photoIdx] || "НЕТ") : "НЕТ",
            };
          }
          return null;
        }).filter(Boolean);
        setItems(parsedItems);
      } catch (e: any) {
        console.error("Ошибка загрузки:", e);
        setError(e.message || "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    };
    loadCleaningChecklist();
  }, []);

  // Загрузка выполненных пунктов
  useEffect(() => {
    async function loadPerformed() {
      setLoadingPerformed(true);
      try {
        const url = new URL(GAS_ENDPOINT);
        url.searchParams.set("action", "get");
        url.searchParams.set("cafe", "Менеджер");
        url.searchParams.set("date", new Date().toISOString().slice(0, 10));
        url.searchParams.set("role", "Менеджер");
        url.searchParams.set("isSpecialManager", "true");
        const res = await fetch(url.toString());
        const data = await res.json();
        console.log("Выполненные пункты загружены:", data);
        if (data.ok && data.entries) {
          setPerformed(data.entries);
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
  }, []);

  // Инициализация localState из выполненных
  useEffect(() => {
    const initial = {};
    performed.forEach(p => {
      if (p.itemTitle) {
        initial[p.itemTitle] = {
          done: p.status === "Выполнено",
          comment: p.comment,
          photos: [],
          photoUrls: p.photoUrl || [],
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
        [id]: { ... (prev[id] || { done: false, comment: "", photos: [], photoUrls: [] }), photos: [...(prev[id]?.photos || []), compressedFile] }
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

  const saveChecklist = async () => {
    console.log("saveChecklist вызвана");
    const toSave = items
      .map((item, index) => {
        const local = localState[index.toString()] || { done: false, comment: "", photos: [], photoUrls: [] };
        if (!local.done && !local.comment && local.photos.length === 0) return null;
        if (local.done && item.photoRequired === "ДА" && local.photos.length + local.photoUrls.length === 0) {
          toast.error(`Обязательное фото отсутствует: "${item.text}"`);
          return null;
        }
        return { item, local, index: index.toString() };
      })
      .filter(Boolean) as { item: any; local: any; index: string }[];
    console.log("toSave.length:", toSave.length);
    if (toSave.length === 0) {
      toast.info("Нет изменений");
      return;
    }
    setSaving(true);
    toast.loading("Сохранение...");
    try {
      const entries = await Promise.all(toSave.map(async ({ item, local, index }) => {
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
              fileName: `${new Date().toISOString().slice(0, 10)}_manager_cleaning_${index}.jpg`,
            }),
          });
          const json = await res.json();
          if (!json.ok || !json.viewUrl) throw new Error("Ошибка загрузки фото");
          console.log("Фото загружено:", json.viewUrl);
          return json.viewUrl;
        });
        const newUrls = await Promise.all(photoPromises);
        photoUrls.push(...newUrls);
        return {
          cafe: "Менеджер",
          date: new Date().toISOString().slice(0, 10),
          role: "Менеджер",
          category: item.section,
          itemTitle: item.text,
          status: local.done,
          comment: local.comment,
          photoUrl: photoUrls,
          performedBy: auth?.fullName || auth?.login || "Менеджер",
        };
      }));
      console.log("Отправляем в GAS:", { entriesLength: entries.length });
      const saveRes = await fetch(GAS_ENDPOINT, {
        method: "POST",
        body: JSON.stringify({
          action: "save",
          cafe: "Менеджер",
          date: new Date().toISOString().slice(0, 10),
          entries,
          isSpecialManager: true,
        }),
      });
      const saveJson = await saveRes.json();
      console.log("Ответ от GAS:", saveJson);
      if (saveJson.ok) {
        toast.dismiss();
        toast.success("Чек-лист Ген уборки сохранён!");
      } else {
        toast.error(saveJson.error || "Ошибка сохранения");
      }
    } catch (e) {
      console.error("Ошибка сохранения:", e);
      toast.error("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-amber-700 mb-8 text-center">
          Чек-лист Ген уборки
        </h1>
        {loading && <div className="text-center py-10 text-gray-600 text-xl">Загрузка...</div>}
        {error && <div className="text-center py-10 text-red-600 text-xl">{error}</div>}
        {!loading && !error && items.length === 0 && (
          <div className="text-center py-10 text-gray-600 text-xl">
            Нет пунктов в чек-листе Ген уборки
          </div>
        )}
        {!loading && !error && items.length > 0 && (
          <>
            <div className="space-y-10">
              {items.reduce((acc: any[], item, index) => {
                const currentSection = item.section;
                if (index === 0 || currentSection !== items[index - 1].section) {
                  acc.push(
                    <h2 key={`section-${currentSection}-${index}`} className="text-2xl font-bold text-amber-700 mt-10 mb-4 border-b-2 border-amber-500 pb-2">
                      {currentSection || "Без раздела"}
                    </h2>
                  );
                }
                const local = localState[index.toString()] || { done: false, comment: "", photos: [], photoUrls: [] };
                const isDone = local.done;
                const totalPhotos = local.photos.length + local.photoUrls.length;
                acc.push(
                  <div key={index} className={`bg-white rounded-xl shadow-sm border p-6 ${isDone ? "border-green-400 bg-green-50" : "border-gray-300"}`}>
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => handleToggle(index.toString())}
                        className="mt-1 w-6 h-6 text-green-600 rounded focus:ring-green-500"
                        disabled={!!local.performedBy}
                      />
                      <div className="flex-1">
                        <p className={`text-lg font-medium ${isDone ? "line-through text-gray-500" : ""}`}>
                          {item.text}
                          {item.photoRequired === "ДА" && <span className="text-red-600 ml-2">* фото обязательно</span>}
                        </p>
                        {local.performedBy && (
                          <p className="text-xs text-green-600 mt-1">
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
                                <img src={URL.createObjectURL(file)} alt="новое фото" className="w-full h-32 object-cover rounded-lg border" />
                                <button
                                  onClick={() => handleRemovePhoto(index.toString(), i)}
                                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                                  disabled={!!local.performedBy}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {isDone && (
                          <div className="mt-3">
                            <textarea
                              placeholder="Комментарий (опционально)"
                              value={local.comment}
                              onChange={e => handleComment(index.toString(), e.target.value)}
                              className="w-full border rounded-lg px-3 py-2 text-sm"
                              rows={2}
                              disabled={!!local.performedBy}
                            />
                          </div>
                        )}
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Фото {item.photoRequired === "ДА" ? "(обязательно)" : "(по желанию)"} (макс. {MAX_PHOTOS}, сейчас: {totalPhotos})
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={e => {
                              if (e.target.files?.[0]) {
                                handleAddPhoto(index.toString(), e.target.files[0]);
                                e.target.value = "";
                              }
                            }}
                            disabled={totalPhotos >= MAX_PHOTOS || !!local.performedBy}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 disabled:opacity-50"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
                return acc;
              }, [])}
            </div>
            <div className="mt-12 flex justify-center">
              <button
                onClick={saveChecklist}
                disabled={saving}
                className="px-12 py-5 bg-gradient-to-r from-green-600 to-emerald-700 text-white font-bold text-xl rounded-xl shadow-lg hover:shadow-xl disabled:opacity-70 transition"
              >
                {saving ? "Сохранение..." : "Сохранить чек-лист"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}