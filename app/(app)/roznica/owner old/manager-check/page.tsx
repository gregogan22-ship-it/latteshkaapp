"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

const MASTER_SPREADSHEET_ID = "1lCHpyah_MeDoQRYPSARrW4NOJx57EcZyXmZtKz7l1zM";
const MANAGER_SHEET_NAME = "Менеджер";
const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbxUeCKxS_EEwcbw4oOiVCO8YijUZ8cMRhf4c6r3XnxDGDqPYoUK88GSD0Lil06Wl5QF/exec";

export default function ManagerCheckPage() {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [allItems, setAllItems] = useState<any[]>([]);
  const [performed, setPerformed] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPerformed, setLoadingPerformed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка полного списка пунктов из листа "Менеджер"
  useEffect(() => {
    const loadAllItems = async () => {
      setLoading(true);
      setError(null);
      setAllItems([]);
      try {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${MASTER_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(MANAGER_SHEET_NAME)}`;
        const res = await fetch(csvUrl);
        if (!res.ok) throw new Error("Не удалось загрузить пункты");
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
        if (sectionIdx === -1 || textIdx === -1) throw new Error("Не найдены колонки Раздел и Пункт");
        const parsedItems = lines.slice(1).map(line => {
          const values = line.match(/"([^"]*)"/g)?.map(v => v.slice(1, -1).trim()) || [];
          return {
            section: values[sectionIdx] || "",
            text: values[textIdx] || "",
            photoRequired: photoIdx !== -1 ? (values[photoIdx] || "НЕТ") : "НЕТ",
          };
        }).filter(Boolean);
        setAllItems(parsedItems);
      } catch (e: any) {
        console.error("Ошибка загрузки пунктов:", e);
        setError(e.message || "Ошибка загрузки пунктов");
      } finally {
        setLoading(false);
      }
    };
    loadAllItems();
  }, []);

  // Загрузка выполненных пунктов за выбранную дату
  useEffect(() => {
    async function loadPerformed() {
      setLoadingPerformed(true);
      try {
        const url = new URL(GAS_ENDPOINT);
        url.searchParams.set("action", "get");
        url.searchParams.set("cafe", "Менеджер");
        url.searchParams.set("date", "Manager_" + selectedDate); // Manager_2026-01-23
        url.searchParams.set("role", "Менеджер");
        url.searchParams.set("isSpecialManager", "true");
        const res = await fetch(url.toString());
        const data = await res.json();
        console.log("Выполненные пункты загружены:", data);
        if (data.ok && data.entries) {
          setPerformed(data.entries);
        } else {
          setError(data.error || "Нет данных за эту дату");
        }
      } catch (e) {
        console.error("Ошибка загрузки выполненных:", e);
        setError("Ошибка загрузки выполненных пунктов");
      } finally {
        setLoadingPerformed(false);
      }
    }
    loadPerformed();
  }, [selectedDate]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-amber-700 mb-8 text-center">
          Проверка чек-листов менеджера
        </h1>

        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center justify-center">
          <label className="text-lg font-medium text-gray-700">
            Выберите дату:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none"
          />
        </div>

        {(loading || loadingPerformed) && <div className="text-center py-10 text-gray-600 text-xl">Загрузка...</div>}

        {error && <div className="text-center py-10 text-red-600 text-xl">{error}</div>}

        {!loading && !loadingPerformed && allItems.length === 0 && (
          <div className="text-center py-10 text-gray-600 text-xl">
            Нет пунктов в чек-листе менеджера
          </div>
        )}

        {!loading && !loadingPerformed && allItems.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Раздел</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Пункт</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Фото</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allItems.map((item, idx) => {
                    const performedItem = performed.find(p => p.itemTitle === item.text);
                    const isDone = !!performedItem;

                    return (
                      <tr key={idx} className={isDone ? "bg-green-50" : ""}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.section}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.text}</td>
                        <td className="px-6 py-4">
                          {performedItem?.photoUrl ? (
                            <a href={performedItem.photoUrl} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
                              Фото
                            </a>
                          ) : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${isDone ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                            {isDone ? "Выполнено" : "Не выполнено"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}