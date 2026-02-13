"use client";

import { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbxOUHwpSvH9DBKAPn9-R0SXdvVFGrab5uo3mcXBL2l4yR6FR8OzgCtTq3no1aigXHvL/exec";
export default function QRLogin() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner("reader", {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      rememberLastUsedCamera: true,
    });

    scanner.render(
      async (decodedText) => {
        try {
          scanner.clear(); // останавливаем сканер после успеха
          const res = await fetch(GAS_ENDPOINT, {
            method: "POST",
            body: JSON.stringify({
              action: "validateToken",
              token: decodedText,
            }),
          });
          const data = await res.json();
          if (data.ok) {
            localStorage.setItem("auth", JSON.stringify(data.auth));
            toast.success("Вход выполнен!");
            router.push("/");
          } else {
            toast.error(data.error || "Неверный QR-код");
            setError(data.error || "Неверный QR");
          }
        } catch (e) {
          toast.error("Ошибка обработки QR");
          setError("Ошибка обработки QR");
        }
      },
      (err) => {
        console.error("Сканер ошибка:", err);
        setError("Не удалось открыть камеру. Проверьте разрешения.");
      }
    );

    return () => {
      scanner.clear();
    };
  }, [router]);

  const retry = () => {
    setError(null);
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <h1 className="text-4xl font-bold text-amber-700 mb-8">Сканируй QR для входа</h1>

      {error ? (
        <div className="text-center text-red-600 mb-6">
          <p>{error}</p>
          <button
            onClick={retry}
            className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Попробовать снова
          </button>
        </div>
      ) : (
        <div id="reader" className="w-full max-w-md mb-6"></div>
      )}

      <p className="text-gray-600 text-center">
        Наведите камеру на QR-код сотрудника
      </p>
      <p className="text-sm text-gray-500 mt-4">
        Если камера не открывается — разрешите доступ в настройках браузера
      </p>
    </div>
  );
}