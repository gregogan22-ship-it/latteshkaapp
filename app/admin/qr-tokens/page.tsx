"use client";

import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import toast from "react-hot-toast";

const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbxOUHwpSvH9DBKAPn9-R0SXdvVFGrab5uo3mcXBL2l4yR6FR8OzgCtTq3no1aigXHvL/exec";

export default function QRTokensPage() {
  const [employeeLogin, setEmployeeLogin] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  const generateToken = async () => {
    if (!employeeLogin.trim()) {
      toast.error("Введите логин сотрудника");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(GAS_ENDPOINT, {
        method: "POST",
        body: JSON.stringify({
          action: "generateToken",
          ownerLogin: "твой_логин_владельца", // ← замени на реальный логин владельца
          employeeLogin,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setToken(data.token);
        toast.success(`QR для ${employeeLogin} успешно сгенерирован!`);
      } else {
        toast.error(data.error || "Ошибка генерации токена");
      }
    } catch (e) {
      toast.error("Ошибка сети — проверьте интернет");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-xl p-10">
        <h1 className="text-3xl font-bold text-amber-700 mb-8 text-center">
          Генерация QR-токенов для сотрудников
        </h1>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Логин сотрудника
            </label>
            <input
              type="text"
              placeholder="Например: kasir_lenina"
              value={employeeLogin}
              onChange={e => setEmployeeLogin(e.target.value)}
              className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl focus:border-amber-500 focus:outline-none transition text-lg"
            />
          </div>

          <button
            onClick={generateToken}
            disabled={loading}
            className="w-full py-4 bg-green-600 text-white font-bold text-xl rounded-xl shadow-lg hover:bg-green-700 disabled:opacity-70 transition"
          >
            {loading ? "Генерация..." : "Сгенерировать QR"}
          </button>

          {token && (
            <div className="mt-10 text-center border-t pt-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                QR для входа сотрудника: {employeeLogin}
              </h2>
              <div className="inline-block bg-white p-6 rounded-xl shadow-lg">
                <QRCodeCanvas value={token} size={280} level="H" />
              </div>
              <p className="mt-6 text-gray-600">
                Покажите этот QR сотруднику — пусть отсканирует в приложении
              </p>
              <p className="mt-3 text-sm text-gray-500">
                Старый токен (если был) автоматически деактивирован
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}