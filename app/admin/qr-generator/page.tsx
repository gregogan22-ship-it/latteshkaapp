"use client";

import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react"; // ← правильный импорт (Canvas версия для клиента)
import toast from "react-hot-toast";

const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbxOUHwpSvH9DBKAPn9-R0SXdvVFGrab5uo3mcXBL2l4yR6FR8OzgCtTq3no1aigXHvL/exec";

export default function QRGenerator() {
  const [employeeLogin, setEmployeeLogin] = useState("");
  const [token, setToken] = useState("");

  const generate = async () => {
    if (!employeeLogin.trim()) {
      toast.error("Введите логин сотрудника");
      return;
    }

    try {
      const res = await fetch(GAS_ENDPOINT, {
        method: "POST",
        body: JSON.stringify({
          action: "generateToken",
          ownerLogin: "твой_логин_владельца", // ← ЗАМЕНИ на реальный логин владельца
          employeeLogin,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setToken(data.token);
        toast.success("Новый QR сгенерирован!");
      } else {
        toast.error(data.error || "Ошибка генерации");
      }
    } catch (e) {
      toast.error("Ошибка сети");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-amber-700 mb-6 text-center">
          Генерация QR для входа
        </h1>
        <input
          type="text"
          placeholder="Логин сотрудника (например: kasir_lenina)"
          value={employeeLogin}
          onChange={e => setEmployeeLogin(e.target.value)}
          className="w-full p-4 border rounded-lg mb-6 text-lg"
        />
        <button
          onClick={generate}
          className="w-full py-4 bg-green-600 text-white font-bold text-lg rounded-xl hover:bg-green-700 transition"
        >
          Сгенерировать новый QR
        </button>

        {token && (
          <div className="mt-10 text-center">
            <h2 className="text-2xl font-bold mb-4">QR для {employeeLogin}</h2>
            <div className="inline-block bg-white p-4 rounded-lg shadow">
              <QRCodeCanvas value={token} size={256} /> {/* ← используем Canvas */}
            </div>
            <p className="mt-4 text-gray-600">
              Покажите этот QR сотруднику — пусть отсканирует в приложении
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Старый токен автоматически деактивирован
            </p>
          </div>
        )}
      </div>
    </div>
  );
}