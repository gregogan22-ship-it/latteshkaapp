"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, Save } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { createClient } from "@supabase/supabase-js";

// Вставь свои данные Supabase
const supabaseUrl = "https://jsuehzanetagvcmglyld.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzdWVoemFuZXRhZ3ZjbWdseWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4OTE3ODcsImV4cCI6MjA3OTQ2Nzc4N30.6aQ2TaJwJw2fr1TxrvoQw90R0gGSIIbWHDbYvM4e4Po";
const supabase = createClient(supabaseUrl, supabaseKey);

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const VALUES = [
  "ЧЕРДАК",
  "🥐",
  "📦",
  "💻",
  "🛴",
  "Выходной",
  "Резерв",
  "—"
];

export default function SkladSchedule() {
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [localChanges, setLocalChanges] = useState<any[]>([]); // временные изменения до сохранения
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Загрузка сотрудников и графика
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Сотрудники
        const { data: empData, error: empError } = await supabase
          .from("employees")
          .select("id, full_name")
          .order("full_name");

        if (empError) throw empError;

        // 2. График
        const { data: schedData, error: schedError } = await supabase
          .from("sklad_schedule")
          .select("employee_id, day, value");

        if (schedError) throw schedError;

        setEmployees(empData || []);
        setSchedule(schedData || []);
        setLocalChanges(schedData || []);
      } catch (err: any) {
        setError("Ошибка загрузки данных: " + err.message);
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleChange = (employeeId: string, day: string, value: string) => {
    setLocalChanges(prev => {
      const updated = prev.filter(s => !(s.employee_id === employeeId && s.day === day));
      updated.push({ employee_id: employeeId, day, value });
      return updated;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (localChanges.length === 0) {
      toast.info("Нет изменений для сохранения");
      return;
    }

    try {
      const { error } = await supabase
        .from("sklad_schedule")
        .upsert(localChanges, { onConflict: "employee_id, day" });

      if (error) throw error;

      toast.success("График сохранён!");
      setSchedule(localChanges);
      setHasChanges(false);
    } catch (err: any) {
      toast.error("Ошибка сохранения: " + err.message);
      console.error(err);
    }
  };

  if (loading) return <div className="p-8 text-center">Загрузка графика...</div>;
  if (error) return <div className="p-8 text-center text-red-600">Ошибка: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/roznica/staff" className="flex items-center gap-2 text-amber-700 hover:underline">
              <ChevronLeft className="w-6 h-6" /> Назад к сотрудникам
            </Link>
            <h1 className="text-3xl font-bold text-amber-700">График работы Склада</h1>
          </div>

          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={`px-6 py-3 rounded-lg text-white transition flex items-center gap-2 ${
              hasChanges ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            <Save className="w-5 h-5" /> Сохранить график
          </button>
        </div>

        {employees.length > 0 ? (
          <div className="overflow-x-auto bg-white rounded-xl shadow-lg border">
            <table className="w-full min-w-max">
              <thead className="bg-amber-100 sticky top-0">
                <tr>
                  <th className="p-4 text-left font-semibold text-gray-800 border-b w-64">ФИО</th>
                  {DAY_LABELS.map(day => (
                    <th key={day} className="p-4 text-center font-semibold text-gray-800 border-b">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition">
                    <td className="p-4 border-b font-medium whitespace-nowrap">
                      {emp.full_name || "—"}
                    </td>
                    {DAYS.map(day => {
                      const sched = schedule.find(s => s.employee_id === emp.id && s.day === day);
                      const value = sched?.value || "—";

                      return (
                        <td key={day} className="p-4 border-b text-center">
                          <select
                            value={value}
                            onChange={e => handleChange(emp.id, day, e.target.value)}
                            className="w-full p-2 border rounded text-center focus:border-amber-500"
                          >
                            {VALUES.map(v => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 text-xl">
            Нет сотрудников в справочнике
          </div>
        )}
      </div>
    </div>
  );
}