import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export function useAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState<{ login: string; role: string; cafe?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("auth");
    if (!stored) {
      if (pathname !== "/auth/login") {
        router.push("/auth/login");
      }
      setLoading(false);
      return;
    }

    const parsed = JSON.parse(stored);
    setAuth(parsed);
    setLoading(false);

    // Если на странице логина, но уже авторизован — редирект
    if (pathname === "/auth/login") {
      if (parsed.role === "owner" || parsed.role === "manager") {
        router.push("/roznica/checklist");
      } else if (parsed.role === "checklist") {
        router.push("/roznica/checklist/fill");
      }
    }
  }, [router, pathname]);

  // Автоматический выход через 30 минут бездействия
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

    resetTimer(); // запуск при загрузке

    return () => {
      clearTimeout(timeout);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [auth, router]);

  const logout = () => {
    localStorage.removeItem("auth");
    toast.success("Вы вышли из аккаунта");
    router.push("/auth/login");
  };

  return { auth, loading, logout };
}