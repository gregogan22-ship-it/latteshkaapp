"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import imageCompression from 'browser-image-compression';
import Link from "next/link";

const MASTER_SPREADSHEET_ID = "1lCHpyah_MeDoQRYPSARrW4NOJx57EcZyXmZtKz7l1zM";
const MANAGER_SHEET_NAME = "Менеджер";
const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbxUeCKxS_EEwcbw4oOiVCO8YijUZ8cMRhf4c6r3XnxDGDqPYoUK88GSD0Lil06Wl5QF/exec";

const MAX_PHOTOS = 5;

const CAFE_LIST = [
  "Ашан", "Кипарис 1", "Кипарис 2", "Ленина", "Эссе", "Кофеин", "Аптека", "Адидас", "Тренева", "КМ", "ЦУМ"
];

export default function ManagerChecklist() {
  const [auth, setAuth] = useState<{ login: string; role: string; cafe?: string; fullName?: string } | null>(null);
  const [selectedCafe, setSelectedCafe] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [performed, setPerformed] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPerformed, setLoadingPerformed] = useState(false);
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

  // Реальный день недели
  const currentDay = new Date().toLocaleString('ru-RU', { weekday: 'long' });

  // Загрузка пунктов из мастер-таблицы
  const loadManagerChecklist = async () => {
    if (!selectedCafe) return;

    setLoading(true);
    setError(null);
    setItems([]);

    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${MASTER_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(MANAGER_SHEET_NAME)}`;
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error("Не удалось загрузить чек-лист");

      const csvText = await res.text();
      const lines = csvText.split(/\r?\n/).filter(line => line.trim());

      if (lines.length < 2) {
        setError("Лист 'Менеджер' пуст");
        return;
      }

      const headerLine = lines[0];
      const headers = headerLine.match(/"([^"]*)"/g)?.map(h => h.slice(1, -1).trim()) || [];

      const sectionIdx = headers.findIndex(h => h.toLowerCase().includes("раздел") || h.toLowerCase().includes("категория"));
      const textIdx = headers.findIndex(h => h.toLowerCase().includes("пункт") || h.toLowerCase().includes("текст"));
      const photoIdx = headers.findIndex(h => h.toLowerCase().includes("фото"));
      const daysIdx = headers.findIndex(h => h.toLowerCase().includes("дни доступности"));

      if (sectionIdx === -1 || textIdx === -1) {
        throw new Error("Не найдены колонки Раздел и Пункт");
      }

      const parsedItems = lines.slice(1).map(line => {
        const values = line.match(/"([^"]*)"/g)?.map(v => v.slice(1, -1).trim()) || [];
        const days = values[daysIdx] ? values[daysIdx].split(',').map(d => d.trim()) : [];

        if (days.length === 0 || days.includes(currentDay)) {
          return {
            section: values[sectionIdx] || "",
            text: values[textIdx] || "",
            photoRequired: photoIdx !== -1 ? (values[photoIdx] || "НЕТ") : "НЕТ",
            days,
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

  useEffect(() => {
    if (selectedCafe) loadManagerChecklist();
  }, [selectedCafe]);

  // Загрузка выполненных пунктов
  useEffect(() => {
    async function loadPerformed() {
      if (!selectedCafe) return;
      setLoadingPerformed(true);
      try {
        const url = new URL(GAS_ENDPOINT);
        url.searchParams.set("action", "get");
        url.searchParams.set("cafe", selectedCafe);
        url.searchParams.set("date", new Date().toISOString().slice(0, 10));
        url.searchParams.set("role", "Менеджер");
        const res = await fetch(url.toString());
        const data = await res.json();
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
  }, [selectedCafe]);

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
    if (current?.performedBy) return; // блокируем, если уже выполнен
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
      toast.error("Ошибка фото");
    }
  };

  const handleRemovePhoto = (id: string, index: number) => {
    setLocalState(prev => ({
      ...prev,
      [id]: { ...prev[id], photos: prev[id].photos.filter((_, i) => i !== index) }
    }));
  };

  const saveManagerChecklist = async () => {
    if (!selectedCafe) {
      toast.error("Выберите кофейню");
      return;
    }

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
              fileName: `${new Date().toISOString().slice(0, 10)}_${selectedCafe}_manager_${index}.jpg`,
            }),
          });
          const json = await res.json();
          if (!json.ok || !json.viewUrl) throw new Error("Ошибка загрузки фото");
          return json.viewUrl;
        });

        const newUrls = await Promise.all(photoPromises);
        photoUrls.push(...newUrls);

        return {
          cafe: selectedCafe,
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

      const saveRes = await fetch(GAS_ENDPOINT, {
        method: "POST",
        body: JSON.stringify({
          action: "save",
          cafe: selectedCafe,
          date: new Date().toISOString().slice(0, 10),
          entries,
          isSpecialManager: true,
        }),
      });

      const saveJson = await saveRes.json();
      if (saveJson.ok) {
        toast.dismiss();
        toast.success(`Сохранено!`);
      } else {
        toast.error(saveJson.error || "Ошибка сохранения");
      }
    } catch (e) {
      toast.error("Ошибка сохранения");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-amber-700 mb-8 text-center">
          Чек-лист менеджера
        </h1>

        <div className="mb-8">
          <label className="block text-lg font-medium text-gray-700 mb-2">
            Выберите кофейню
          </label>
          <select
            value={selectedCafe}
            onChange={e => setSelectedCafe(e.target.value)}
            className="w-full px-5 py-4 text-lg border-2 border-gray-300 rounded-xl focus:border-amber-500 focus:outline-none transition"
          >
            <option value="">— выберите кофейню —</option>
            {CAFE_LIST.map(cafe => (
              <option key={cafe} value={cafe}>
                {cafe}
              </option>
            ))}
          </select>
        </div>

        {/* Специальные чек-листы */}
        <div className="mb-12 space-y-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Специальные чек-листы</h2>

          <Link
            href="/roznica/checklist-manager/reports"
            className="block w-full p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition text-center border border-amber-300"
          >
            <h3 className="text-xl font-bold text-amber-700">Заполнить чек-лист проверки отчетов</h3>
            <p className="text-gray-600 mt-2">Доступно всегда</p>
          </Link>

          <Link
            href="/roznica/checklist-manager/cleaning"
            className="block w-full p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition text-center border border-amber-300"
          >
            <h3 className="text-xl font-bold text-amber-700">Чек-лист Ген уборки</h3>
            <p className="text-gray-600 mt-2">Доступно всегда</p>
          </Link>
        </div>

        {/* Обычный чек-лист */}
        {selectedCafe && (
          <>
            {loading && <div className="text-center py-10 text-gray-600 text-xl">Загрузка...</div>}

            {error && <div className="text-center py-10 text-red-600 text-xl">{error}</div>}

            {!loading && !error && items.length === 0 && (
              <div className="text-center py-10 text-gray-600 text-xl">
                Нет пунктов в чек-листе менеджера
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
                          />
                          <div className="flex-1">
                            <p className={`text-lg font-medium ${isDone ? "line-through text-gray-500" : ""}`}>
                              {item.text}
                              {item.photoRequired === "ДА" && <span className="text-red-600 ml-2">* фото обязательно</span>}
                            </p>

                            {local.comment && (
                              <p className="text-sm text-gray-700 mt-2 italic">"{local.comment}"</p>
                            )}

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
                                disabled={totalPhotos >= MAX_PHOTOS}
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
                    onClick={saveManagerChecklist}
                    disabled={saving}
                    className="px-12 py-5 bg-gradient-to-r from-green-600 to-emerald-700 text-white font-bold text-xl rounded-xl shadow-lg hover:shadow-xl disabled:opacity-70 transition"
                  >
                    {saving ? "Сохранение..." : "Сохранить чек-лист менеджера"}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}