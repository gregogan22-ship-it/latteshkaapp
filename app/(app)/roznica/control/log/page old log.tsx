"use client";

import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { format } from "date-fns";

const CSV_URL = "https://docs.google.com/spreadsheets/d/1CdI98yQzh4dQXNjXeVuNV4faGm8NryyQOGyMn1Gpw4Q/export?format=csv&gid=0";

export default function ControlLogPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [selectedDate]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const res = await fetch(CSV_URL);
      const text = await res.text();
      const rows = text.split("\n").map(row => row.split(","));

      const headers = rows[0];
      const data = rows.slice(1);

      const formatted = data
        .map(row => {
          const obj: any = {};
          headers.forEach((h, i) => {
            obj[h.trim()] = row[i]?.trim() || "";
          });
          return obj;
        })
        .filter(log => {
          if (!log["Время"]) return false;
          const logDate = log["Время"].split(" ")[0]; // dd.mm.yyyy
          const [d, m, y] = logDate.split(".");
          const formattedDate = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
          return formattedDate === selectedDate;
        })
        .sort((a, b) => b["Время"].localeCompare(a["Время"])); // новые сверху

      setLogs(formatted);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-amber-700">Журнал действий</h1>
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-gray-600" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-3 border rounded-xl text-lg"
              />
            </div>
          </div>

          {loading ? (
            <p className="text-center text-gray-600 py-10">Загрузка журнала...</p>
          ) : logs.length === 0 ? (
            <p className="text-center text-gray-600 py-10">Нет действий за эту дату</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-6 py-3">Время</th>
                    <th className="px-6 py-3">Кофейня</th>
                    <th className="px-6 py-3">Пользователь</th>
                    <th className="px-6 py-3">Действие</th>
                    <th className="px-6 py-3">Детали</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-3">{log["Время"] || "-"}</td>
                      <td className="px-6 py-3">{log["Кофейня"] || "-"}</td>
                      <td className="px-6 py-3">{log["Пользователь"] || "-"}</td>
                      <td className="px-6 py-3 font-medium">{log["Действие"] || "-"}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{log["Детали"] || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}