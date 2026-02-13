"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbwwG2R3RZ93CkE__tkGlsDNwIY56fxRNeZdJrAO3JdjRme1vFpK8MVTl0yAol33i6_p/exec"; // твой GAS URL

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [auth, setAuth] = useState<{ login: string; role: string; cafe?: string } | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("auth");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setAuth(parsed);

        // Логируем вход в приложение
        fetch(GAS_ENDPOINT, {
          method: "POST",
          body: JSON.stringify({
            action: "log",
            user: parsed.login,
            cafe: parsed.cafe || "неизвестно",
            details: "Вход в приложение",
          }),
        }).catch(() => {}); // не критично, если лог не запишется
      } catch (e) {
        localStorage.removeItem("auth");
      }
    }
    setIsChecking(false);
  }, []);

  const logout = () => {
    localStorage.removeItem("auth");
    toast.success("Вы вышли из аккаунта");
    router.push("/auth/login");
  };

  // Автовыход через 30 минут бездействия
  useEffect(() => {
    if (!auth) return;

    let timeout: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        localStorage.removeItem("auth");
        toast.info("Сессия истекла — войдите заново");
        router.push("/auth/login");
      }, 30 * 60 * 1000); // 30 минут
    };

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    events.forEach(event => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      clearTimeout(timeout);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [auth, router]);

  // Редирект на логин, если не авторизован и не на странице логина
  useEffect(() => {
    if (!isChecking && !auth && pathname !== "/auth/login") {
      router.push("/auth/login");
    }
  }, [isChecking, auth, pathname, router]);

  // Если на странице логина, но авторизован — редирект в приложение
  useEffect(() => {
    if (!isChecking && auth && pathname === "/auth/login") {
      if (auth.role === "owner") {
        router.push("/");
      } else if (auth.role === "manager") {
        router.push("/roznica/checklist");
      } else if (auth.role === "checklist") {
        router.push("/roznica/checklist/fill");
      }
    }
  }, [isChecking, auth, pathname, router]);

  // Функция запуска деплоя
  const triggerDeploy = async () => {
    if (!confirm("Запустить деплой новых изменений в продакшен? Это займёт 1–2 минуты.")) return;

    const toastId = toast.loading("Запуск деплоя...");

    try {
      const res = await fetch("/api/trigger-deploy", { method: "POST" });
      const data = await res.json();

      if (data.ok) {
        toast.success(
          <>
            <p className="font-medium">Деплой успешно запущен!</p>
            <p className="text-sm mt-1">Через 1–2 минуты изменения будут в приложении.</p>
            <a
              href={data.url}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline text-sm mt-2 block"
            >
              Отслеживать прогресс на Vercel →
            </a>
          </>,
          { id: toastId, duration: 15000 }
        );
      } else {
        toast.error(data.error || "Ошибка запуска деплоя", { id: toastId });
      }
    } catch (e) {
      toast.error("Ошибка связи с Vercel", { id: toastId });
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-xl text-gray-600">Проверка авторизации...</p>
      </div>
    );
  }

  return (
    <html lang="ru">
      <body className="min-h-screen bg-gray-50">
        {/* Шапка — только если авторизован */}
        {auth && (
          <header className="bg-white shadow-sm border-b sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Кнопка "Назад" */}
                <button
                  onClick={() => router.back()}
                  className="p-2 rounded-lg hover:bg-gray-100 transition"
                  title="Назад"
                >
                  <ArrowLeft className="w-6 h-6 text-gray-700" />
                </button>

                {/* Кнопка "Домой" */}
                <Link
                  href="/"
                  className="p-2 rounded-lg hover:bg-gray-100 transition"
                  title="На главную"
                >
                  <Home className="w-6 h-6 text-gray-700" />
                </Link>

                <Link href="/" className="text-2xl font-bold text-amber-700 hover:text-amber-600 transition">
                  Latteshka
                </Link>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-sm text-gray-700 text-right">
                  <p className="font-medium">{auth.login}</p>
                  <p className="text-xs text-gray-500">
                    {auth.role === "owner" ? "Владелец" :
                     auth.role === "manager" ? "Менеджер" :
                     "Сотрудник чек-листов"}
                    {auth.cafe && <span> · {auth.cafe}</span>}
                  </p>
                </div>

                <button
                  onClick={logout}
                  className="px-5 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition shadow"
                >
                  Выйти
                </button>

                {/* Кнопка "Выгрузить изменения" — только для владельца */}
                {auth.role === "owner" && (
                  <button
                    onClick={triggerDeploy}
                    className="px-5 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition shadow ml-2"
                  >
                    🚀 Выгрузить изменения
                  </button>
                )}
              </div>
            </div>
          </header>
        )}

        <main className={auth ? "mt-4" : ""}>
          {children}
        </main>
      </body>
    </html>
  );
}