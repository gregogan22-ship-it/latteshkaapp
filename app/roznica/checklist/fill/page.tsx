'use client';

import React, { useEffect, useMemo, useState, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { supabase } from '@/lib/supabase';
import { mutateWithOffline, isBrowserOnline } from '@/lib/offlineQueue';
import {
  getCachedTemplate,
  saveCachedTemplate,
  computeTemplateVersion,
} from '@/lib/checklistTemplateCache';
import imageCompression from "browser-image-compression";

type ShiftType = "day" | "night";

/** Локально: офлайн-фото в IndexedDB (не зависит от экспорта offlineQueue) */
async function saveOfflinePhotos(
  clientId: string,
  files: { file: Blob; fileName: string }[]
): Promise<number> {
  if (!clientId || !files.length || typeof indexedDB === "undefined") return 0;
  const DB = "latteshka_checklist_photos_v1";
  const STORE = "photos";
  const db: IDBDatabase = await new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains(STORE)) {
        d.createObjectStore(STORE, { keyPath: "id", autoIncrement: true }).createIndex(
          "clientId",
          "clientId",
          { unique: false }
        );
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  let n = 0;
  try {
    for (const f of files) {
      const buf = await f.file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      const rec = {
        clientId,
        fileName: f.fileName,
        contentType: (f.file as File).type || "image/jpeg",
        base64: btoa(binary),
        createdAt: Date.now(),
      };
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).add(rec);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      n++;
    }
  } finally {
    db.close();
  }
  return n;
}



type Item = {
  id: string;
  text: string;
  photoRequired: string;
  section: string;
  days_of_week?: string[];
  shift_type?: ShiftType;
};

type PerformedItem = {
  itemId: string;
  done: boolean;
  comment: string;
  photoUrls: string[];
  performedBy: string;
  timeStr: string;
};

const DAY_ROLE_RESTRICTIONS: Record<string, string[]> = {
  "Ген.Уборка": ["Saturday", "Sunday"],
  "Отчеты": ["Saturday"],
};

const MAX_PHOTOS = 5;

const DEFAULT_CAFES = [
  "Ашан",
  "Кипарис 1",
  "Эссе",
  "Кофеин",
  "Аптека",
  "Адидас",
  "Тренева",
  "КМ",
  "ЦУМ",
  "Ленина",
  "Кипарис 2",
  "Менеджер",
  "Ашан ФУДКОРТ",
  "Центрум",
];

const CUSTOM_CAFES_KEY = "custom_cafes";

const SHIFT_TIME_WINDOWS = {
  day: {
    start: 6,
    end: 24,
    name: "Дневная смена (6:00 - 24:00)",
  },
  night: {
    start: 21,
    end: 8,
    name: "Ночная смена (21:00 - 8:00)",
  },
};

const isShiftAvailableByTime = (shiftType: ShiftType): boolean => {
  const now = new Date();
  const currentHour = now.getHours();

  if (shiftType === "day") {
    return currentHour >= 6 && currentHour < 24;
  }

  return currentHour >= 21 || currentHour < 8;
};

const getRecommendedShift = (): ShiftType => {
  const now = new Date();
  const currentHour = now.getHours();

  if (currentHour >= 6 && currentHour < 21) {
    return "day";
  }

  return "night";
};

const isItemAvailableToday = (item: Item): boolean => {
  if (!item.days_of_week || item.days_of_week.length === 0) {
    return true;
  }

  const today = new Date().toLocaleString("en-US", { weekday: "long" });
  return item.days_of_week.includes(today);
};

const toDbDate = (date: string) => {
  return date.split(".").reverse().join("-");
};

const translitCafeName = (name: string) => {
  return name
    .replace(/Ашан/g, "Ashan")
    .replace(/Кипарис/g, "Kiparis")
    .replace(/Эссе/g, "Esse")
    .replace(/Кофеин/g, "Kofein")
    .replace(/Аптека/g, "Apteka")
    .replace(/Адидас/g, "Adidas")
    .replace(/Тренева/g, "Treneva")
    .replace(/КМ/g, "KM")
    .replace(/ЦУМ/g, "TSUM")
    .replace(/Ленина/g, "Lenina")
    .replace(/Менеджер/g, "Manager")
    .replace(/Обход/g, "Obhod")
    .replace(/[^a-zA-Z0-9-]/g, "_");
};

function FillContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [auth, setAuth] = useState<{
    login: string;
    role: string;
    cafe?: string;
    fullName?: string;
    userId?: string;
  } | null>(null);

  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [allCafes, setAllCafes] = useState<string[]>(DEFAULT_CAFES);

  const [cafeShiftsInfo, setCafeShiftsInfo] = useState<
    Record<string, { day: boolean; night: boolean }>
  >({});

  const [selectedCafe, setSelectedCafe] = useState("");
  const [selectedShift, setSelectedShift] = useState<ShiftType>("day"); // устарело: всегда day, ночь = отдельная кофейня
  const [shiftLocked, setShiftLocked] = useState(false);

  const urlRole = searchParams.get("role") || "";
  const [role, setRole] = useState<string>(urlRole || "");

  const urlDateParam = searchParams.get("date") || "";
  const [date, setDate] = useState(() => {
    if (urlDateParam.includes(".")) return urlDateParam;

    if (urlDateParam) {
      const [yyyy, mm, dd] = urlDateParam.split("-");
      return `${dd}.${mm}.${yyyy}`;
    }

    const today = new Date();
    return `${String(today.getDate()).padStart(2, "0")}.${String(
      today.getMonth() + 1
    ).padStart(2, "0")}.${today.getFullYear()}`;
  });

  const [category, setCategory] = useState(searchParams.get("category") || "");
  const urlItemId = searchParams.get("itemId") || searchParams.get("item") || "";


  const [fullTemplate, setFullTemplate] = useState<Item[]>([]);
  const [templateUpdateAvailable, setTemplateUpdateAvailable] = useState(false);
  const [templateFromCache, setTemplateFromCache] = useState(false);
  const [templateVersion, setTemplateVersion] = useState<string>('');
  const [updatingTemplate, setUpdatingTemplate] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);
  const [syncProgressPct, setSyncProgressPct] = useState(0);


  const [performed, setPerformed] = useState<PerformedItem[]>([]);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 });
  const [err, setErr] = useState<string | null>(null);

  const [localState, setLocalState] = useState<
    Record<
      string,
      {
        done: boolean;
        comment: string;
        photos: File[];
        photoUrls: string[];
        performedBy?: string;
      }
    >
  >({});

  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");

  const getPerformedByName = () => {
    const ln = lastName.trim();
    const fn = firstName.trim();
    if (!ln || !fn) return "";
    return `${ln} ${fn}`;
  };

  const hasRequiredName = () => !!(lastName.trim() && firstName.trim());

  // Deep-link: прокрутка к пункту из «Задачи на день»
  useEffect(() => {
    if (!urlItemId) return;
    if (loadingTemplate) return;
    if (!fullTemplate.length) return;
    const tryScroll = () => {
      const el =
        document.getElementById(`checklist-item-${urlItemId}`) ||
        document.querySelector(`[data-item-id="${CSS.escape(urlItemId)}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-amber-400', 'ring-offset-2');
        const t = window.setTimeout(() => {
          el.classList.remove('ring-2', 'ring-amber-400', 'ring-offset-2');
        }, 4000);
        return () => window.clearTimeout(t);
      }
    };
    const t1 = window.setTimeout(tryScroll, 150);
    const t2 = window.setTimeout(tryScroll, 600);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [urlItemId, loadingTemplate, fullTemplate, category, localState]);

  // если пришли с itemId без category — подставим section пункта
  useEffect(() => {
    if (!urlItemId || category) return;
    if (!fullTemplate.length) return;
    const found = fullTemplate.find(
      (i) => String(i.id) === String(urlItemId) || String((i as any).itemId || '') === String(urlItemId)
    );
    if (found?.section) setCategory(found.section);
  }, [urlItemId, category, fullTemplate]);



  const isCafeLocked = useMemo(() => {
    if (searchParams.get("cafe")) return true;
    if (auth?.role === "Кассир" && auth?.cafe) return true;
    return false;
  }, [auth, searchParams]);

  const fixedCafe = useMemo(() => {
    const urlCafe = searchParams.get("cafe");
    if (urlCafe) return urlCafe;
    if (auth?.role === "Кассир" && auth?.cafe) return auth.cafe;
    return null;
  }, [auth, searchParams]);

  const CACHE_KEY = `checklist_${selectedCafe || "no-cafe"}_${selectedShift}_${
    date || "no-date"
  }_${role || "no-role"}_${category || "no-category"}`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_CAFES_KEY);
      if (stored) {
        const customCafes = JSON.parse(stored);
        if (Array.isArray(customCafes) && customCafes.length) {
          setAllCafes([
            ...DEFAULT_CAFES,
            ...customCafes.filter((c: string) => !DEFAULT_CAFES.includes(c)),
          ]);
        }
      }
    } catch (e) {
      console.error("Ошибка custom_cafes:", e);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("auth");

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log("[DEBUG] Auth данные:", parsed);
        setAuth(parsed);

        if (parsed.cafe) {
          setSelectedCafe(parsed.cafe);
        }
      } catch (e) {
        console.error("Ошибка auth:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (fixedCafe && selectedCafe !== fixedCafe) {
      setSelectedCafe(fixedCafe);
    }
  }, [fixedCafe, selectedCafe]);

  const SHIFTS_CACHE_KEY = "checklist_cafe_shifts_v1";
  const ROLES_CACHE_PREFIX = "checklist_roles_v1_";

  const loadCafeShiftsInfo = async () => {
    // 1) сразу из localStorage
    try {
      const raw = localStorage.getItem(SHIFTS_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setCafeShiftsInfo(parsed);
          console.log("[CACHE] shifts from localStorage");
        }
      }
    } catch {}

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      // офлайн: если кэша нет — все DEFAULT_CAFES как day
      setCafeShiftsInfo((prev) => {
        if (prev && Object.keys(prev).length) return prev;
        const fallback: Record<string, { day: boolean; night: boolean }> = {};
        for (const c of DEFAULT_CAFES) fallback[c] = { day: true, night: false };
        return fallback;
      });
      return;
    }

    try {
      console.log("[API] loadCafeShiftsInfo");

      const response = await fetch("/api/checklists/shifts", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Ошибка загрузки смен");
      }

      const shiftsInfo: Record<string, { day: boolean; night: boolean }> = {};

      (result.data || []).forEach((item: any) => {
        if (!item?.cafe) return;
        if (!shiftsInfo[item.cafe]) {
          shiftsInfo[item.cafe] = { day: false, night: false };
        }
        if (item.shift_type === "day") shiftsInfo[item.cafe].day = true;
        if (item.shift_type === "night") shiftsInfo[item.cafe].night = true;
        // если shift_type нет — считаем day
        if (!item.shift_type) shiftsInfo[item.cafe].day = true;
      });

      // если API пустой — day для дефолтных
      if (!Object.keys(shiftsInfo).length) {
        for (const c of DEFAULT_CAFES) shiftsInfo[c] = { day: true, night: false };
      }

      console.log("[DEBUG] shiftsInfo:", shiftsInfo);
      setCafeShiftsInfo(shiftsInfo);
      try {
        localStorage.setItem(SHIFTS_CACHE_KEY, JSON.stringify(shiftsInfo));
      } catch {}
    } catch (error) {
      console.error("Ошибка загрузки информации о сменах:", error);
      // не пугаем toast если есть кэш
      setCafeShiftsInfo((prev) => {
        if (prev && Object.keys(prev).length) return prev;
        const fallback: Record<string, { day: boolean; night: boolean }> = {};
        for (const c of DEFAULT_CAFES) fallback[c] = { day: true, night: false };
        try {
          const raw = localStorage.getItem(SHIFTS_CACHE_KEY);
          if (raw) return JSON.parse(raw);
        } catch {}
        return fallback;
      });
    }
  };


  const getAvailableShifts = (cafe: string): ShiftType[] => {
    const shifts = cafeShiftsInfo[cafe];

    if (!shifts) return ["day"];

    const available: ShiftType[] = [];

    if (shifts.day) available.push("day");
    if (shifts.night) available.push("night");

    return available.length > 0 ? available : ["day"];
  };

  const determineActiveShift = (cafe: string): ShiftType => {
    const availableShifts = getAvailableShifts(cafe);
    const recommendedShift = getRecommendedShift();

    if (availableShifts.includes(recommendedShift)) {
      return recommendedShift;
    }

    return availableShifts[0];
  };

  const canFillShift = (_shiftType?: ShiftType): boolean => {
    return true; // смены убраны — ночь через отдельную кофейню
  };

  useEffect(() => {
    loadCafeShiftsInfo();
  }, []);

  useEffect(() => {
    if (selectedCafe && cafeShiftsInfo[selectedCafe]) {
      const availableShifts = getAvailableShifts(selectedCafe);
      const activeShift = 'day' as ShiftType;

      setSelectedShift(activeShift);
      setShiftLocked(availableShifts.length === 1);

      const q = new URLSearchParams(searchParams.toString());
      q.set("shift", activeShift);
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    }
  }, [selectedCafe, cafeShiftsInfo]);

  const loadAvailableRoles = async (cafe: string, _shiftType?: ShiftType) => {
    if (!cafe) return;

    const cacheKey = ROLES_CACHE_PREFIX + cafe;
    setLoadingRoles(true);

    const applyRoles = (sortedRoles: string[]) => {
      setAvailableRoles(sortedRoles);
      if (role && !sortedRoles.includes(role)) {
        const isManagerRole = (r: string) => {
          const n = String(r || "").toLowerCase();
          return n.includes("управляющ") || n === "manager";
        };
        if (isManagerRole(role) || !sortedRoles.includes(role)) {
          setRole("");
          const q = new URLSearchParams(searchParams.toString());
          q.delete("role");
          router.replace(`${pathname}?${q.toString()}`, { scroll: false });
        }
      }
    };

    // 1) кэш ролей
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const roles = JSON.parse(raw);
        if (Array.isArray(roles) && roles.length) {
          applyRoles(roles);
          setLoadingRoles(false);
          console.log("[CACHE] roles", cafe, roles.length);
        }
      }
    } catch {}

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setLoadingRoles(false);
      return;
    }

    try {
      console.log("[API] loadAvailableRoles:", { cafe });

      const response = await fetch(
        `/api/checklists/roles?cafe=${encodeURIComponent(cafe)}`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Ошибка загрузки ролей");
      }

      const isManagerRole = (r: string) => {
        const n = String(r || "").toLowerCase();
        return n.includes("управляющ") || n === "manager";
      };

      const roles = [
        ...new Set(
          (result.data || [])
            .map((item: any) => item.role)
            .filter((r: any) => r && !isManagerRole(String(r)))
        ),
      ] as string[];

      const sortedRoles = roles.sort((a, b) => {
        const priorityRoles = [
          "Кассир",
          "Бармен",
          "Администратор",
          "Открытие",
          "Закрытие",
        ];
        const aIndex = priorityRoles.indexOf(a);
        const bIndex = priorityRoles.indexOf(b);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.localeCompare(b);
      });

      console.log("[DEBUG] roles:", sortedRoles);
      applyRoles(sortedRoles);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(sortedRoles));
      } catch {}
    } catch (e) {
      console.error("Ошибка загрузки ролей:", e);
      // молчим, если кэш уже показал роли
      setAvailableRoles((prev) => {
        if (prev?.length) return prev;
        try {
          const raw = localStorage.getItem(cacheKey);
          if (raw) return JSON.parse(raw);
        } catch {}
        return prev;
      });
    } finally {
      setLoadingRoles(false);
    }
  };


  useEffect(() => {
    if (selectedCafe) {
      loadAvailableRoles(selectedCafe);
    } else {
      setAvailableRoles([]);
    }
  }, [selectedCafe]);

  useEffect(() => {
    const full = `${lastName} ${firstName}`.trim().toLowerCase();
    if (full === "армянская империя") {
      toast.success("БРАТ, ТЫ ЛУЧШИЙ, БРАТ", {
        duration: 10000,
        style: {
          fontSize: "42px",
          fontWeight: "bold",
          textAlign: "center",
          background: "#FFD700",
          color: "#000",
          padding: "40px 20px",
          borderRadius: "30px",
          boxShadow: "0 0 30px rgba(255, 215, 0, 0.8)",
        },
        icon: "🔥💪",
      });
    }
  }, [lastName, firstName]);

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);

    if (cached) {
      try {
        const parsed = JSON.parse(cached);

        const restoredState = Object.fromEntries(
          Object.entries(parsed)
            .filter(([id]) => id !== "fio" && id !== "lastName" && id !== "firstName")
            .map(([id, val]: any) => [
              id,
              {
                ...val,
                photos: [],
                photoUrls: val.photoUrls || [],
              },
            ])
        );

        setLocalState((prev) => ({ ...prev, ...restoredState }));

        if (parsed.lastName) setLastName(String(parsed.lastName));
        if (parsed.firstName) setFirstName(String(parsed.firstName));
        // совместимость со старым кэшем «ФИО»
        if (!parsed.lastName && !parsed.firstName && parsed.fio) {
          const parts = String(parsed.fio).trim().split(/\s+/);
          if (parts[0]) setLastName(parts[0]);
          if (parts.length > 1) setFirstName(parts.slice(1).join(" "));
        }
      } catch (e) {
        localStorage.removeItem(CACHE_KEY);
      }
    }
  }, [CACHE_KEY]);

  useEffect(() => {
    if (Object.keys(localState).length > 0 || lastName.trim() || firstName.trim()) {
      const cacheable = {
        ...Object.fromEntries(
          Object.entries(localState).map(([id, val]) => [
            id,
            {
              done: val.done,
              comment: val.comment,
              photos: [],
              // photoUrls уже на сервере — сохраняем в кэш, File нет
              photoUrls: val.photoUrls,
              performedBy: val.performedBy,
            },
          ])
        ),
        lastName: lastName.trim(),
        firstName: firstName.trim(),
      };

      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheable));
    }
  }, [localState, lastName, firstName, CACHE_KEY]);

  const currentItems = useMemo(() => {
    let availableItems = fullTemplate.filter((item) =>
      isItemAvailableToday(item)
    );

    if (selectedCafe !== "Менеджер" && category) {
      availableItems = availableItems.filter((i) => i.section === category);
    }

    return availableItems;
  }, [fullTemplate, category, selectedCafe]);

  const getRolesAvailableToday = useMemo(() => {
    const today = new Date().toLocaleString("en-US", { weekday: "long" });

    return availableRoles.filter((roleName) => {
      const n = roleName.toLowerCase();
      if (n.includes('управляющ') || n === 'manager') return false;
      const restrictedDays = DAY_ROLE_RESTRICTIONS[roleName];

      if (!restrictedDays) return true;

      return restrictedDays.includes(today);
    });
  }, [availableRoles]);

  useEffect(() => {
    if (!role || !selectedCafe) {
      setFullTemplate([]);
      return;
    }

    function mapRows(rows: any[]): Item[] {
      const seen = new Set<string>();
      const items: Item[] = [];
      for (const row of rows || []) {
        const id = String(row.item_id || row.id || row.id || `item-${role}`);
        if (seen.has(id)) continue;
        seen.add(id);
        items.push({
          id,
          text: row.text || "Без названия",
          photoRequired:
            row.photoRequired === "ДА" || row.photo_required
              ? "ДА"
              : "НЕТ",
          section: row.section || "Без раздела",
          days_of_week: row.days_of_week || [],
          shift_type: row.shift_type || "day",
        });
      }
      return items;
    }

    async function fetchTemplateFromNetwork(force = false) {
      setSyncProgress("Загрузка шаблона с сервера…");
      setSyncProgressPct(30);
      const response = await fetch(
        `/api/checklists/template?cafe=${encodeURIComponent(
          selectedCafe
        )}&role=${encodeURIComponent(role)}`,
        { cache: "no-store" }
      );
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Ошибка загрузки шаблона");
      }
      const items = mapRows(result.data || []);
      const version =
        result.version || computeTemplateVersion(result.data || []);
      setSyncProgressPct(70);
      setSyncProgress("Сохраняем шаблон на устройство…");
      await saveCachedTemplate(selectedCafe, role, items as any, version);
      setFullTemplate(items);
      setTemplateVersion(version);
      setTemplateFromCache(false);
      setTemplateUpdateAvailable(false);
      setSyncProgressPct(100);
      setSyncProgress("Шаблоны загружены и сохранены на устройство");
      toast.success(
        `Чек-лист сохранён на устройство (${items.length} пунктов)`,
        { duration: 4000 }
      );
      setTimeout(() => {
        setSyncProgress(null);
        setSyncProgressPct(0);
      }, 3500);
      if (items.length === 0) {
        toast.error(
          `Нет чек-листов для роли "${role}" в кофейне "${selectedCafe}"`
        );
      }
      return items;
    }

    async function loadTemplate() {
      setLoadingTemplate(true);
      setErr(null);
      setTemplateUpdateAvailable(false);

      try {
        // 1) сразу из локального кэша
        let hadCache = false;
        try {
          const cached = await getCachedTemplate(selectedCafe, role);
          if (cached?.items?.length) {
            hadCache = true;
            setFullTemplate(cached.items as any);
            setTemplateVersion(cached.version || "");
            setTemplateFromCache(true);
            setLoadingTemplate(false);
            console.log("[CACHE] template from IDB", {
              cafe: selectedCafe,
              role,
              n: cached.items.length,
              version: cached.version,
            });
          }
        } catch (e) {
          console.warn("cache read", e);
        }

        // 2) если сети нет — остаёмся на кэше
        if (!isBrowserOnline()) {
          if (!hadCache) {
            setErr("Нет сети и нет сохранённого чек-листа на устройстве");
            setFullTemplate([]);
          }
          return;
        }

        // 3) лёгкая проверка версии
        try {
          const vr = await fetch(
            `/api/checklists/template-version?cafe=${encodeURIComponent(
              selectedCafe
            )}&role=${encodeURIComponent(role)}`,
            { cache: "no-store" }
          );
          const vj = await vr.json();
          const serverVer = vj?.version || "";
          if (hadCache && serverVer && templateVersion && serverVer !== templateVersion) {
            // версия в state может ещё не обновиться — сравним с кэшем
          }
          if (hadCache) {
            const cached = await getCachedTemplate(selectedCafe, role);
            if (serverVer && cached?.version && serverVer !== cached.version) {
              setTemplateUpdateAvailable(true);
              console.log("[CACHE] update available", {
                local: cached.version,
                server: serverVer,
              });
              return; // не качаем автоматически — ждём кнопку
            }
            if (serverVer && cached?.version && serverVer === cached.version) {
              // актуально
              return;
            }
          }
        } catch (e) {
          console.warn("version check", e);
        }

        // 4) нет кэша или версия неизвестна — грузим с сети
        if (!hadCache) {
          await fetchTemplateFromNetwork();
        } else {
          // кэш есть, version check не удался — тихо обновим в фоне без баннера
          try {
            await fetchTemplateFromNetwork();
          } catch (e) {
            console.warn("bg refresh", e);
          }
        }
      } catch (e: any) {
        console.error("Ошибка loadTemplate:", e);
        if (!fullTemplate.length) {
          setErr(e.message || "Не удалось загрузить чек-лист");
          setFullTemplate([]);
        } else {
          toast.error("Сеть: показан сохранённый чек-лист");
        }
      } finally {
        setLoadingTemplate(false);
      }
    }

    loadTemplate();
  }, [role, selectedCafe]);

  useEffect(() => {
    if (!selectedCafe || !date || !role) {
      setPerformed([]);
      return;
    }

    const performedCacheKey = () => {
      const dbDate = toDbDate(date);
      return `checklist_performed_v1_${selectedCafe}_${dbDate}_${role}`;
    };

    const readPerformedCache = (): PerformedItem[] | null => {
      try {
        const raw = localStorage.getItem(performedCacheKey());
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed as PerformedItem[];
        if (Array.isArray(parsed?.items)) return parsed.items as PerformedItem[];
      } catch {}
      return null;
    };

    const writePerformedCache = (items: PerformedItem[]) => {
      try {
        localStorage.setItem(
          performedCacheKey(),
          JSON.stringify({ savedAt: Date.now(), items })
        );
      } catch (e) {
        console.warn("performed cache write", e);
      }
    };

    async function loadPerformed() {
      const dbDate = toDbDate(date);

      // 1) сразу из кэша (чтобы галочки не мигали «пустыми»)
      const cached = readPerformedCache();
      if (cached && cached.length) {
        setPerformed(cached);
        console.log("[CACHE] performed", cached.length);
      }

      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        if (!cached?.length) {
          console.log("[CACHE] performed offline empty");
        }
        return;
      }

      try {
        console.log("[API] loadPerformed:", {
          selectedCafe,
          dbDate,
          role,
        });

        const response = await fetch(
          `/api/checklists/performed?cafe=${encodeURIComponent(
            selectedCafe
          )}&date=${encodeURIComponent(dbDate)}&role=${encodeURIComponent(role)}`,
          { cache: "no-store" }
        );

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Ошибка загрузки выполненных пунктов");
        }

        const mapped = (result.data || []).map((e: any) => ({
          itemId: e.item_id || "",
          done: Boolean(e.done),
          comment: e.comment || "",
          photoUrls: e.photo_urls || [],
          performedBy: e.performed_by || "",
          timeStr: e.performed_at ? new Date(e.performed_at).toISOString() : "",
        }));

        console.log("[DEBUG] performed:", mapped);
        setPerformed(mapped);
        writePerformedCache(mapped);
        if (mapped.length > 0) {
          console.log(
            "[CACHE] performed saved",
            mapped.filter((x: any) => x.done).length,
            "/",
            mapped.length
          );
        }
      } catch (e) {
        console.error("Ошибка loadPerformed:", e);
        // не затираем кэш пустым списком
        if (!cached?.length) {
          const again = readPerformedCache();
          if (again?.length) setPerformed(again);
        }
      }
    }

    loadPerformed();

    // периодически и при возврате на экран — чтобы отмена управляющим сразу видна сотруднику
    const interval = setInterval(loadPerformed, 20000);
    const onVis = () => {
      if (document.visibilityState === "visible") loadPerformed();
    };
    const onFocus = () => loadPerformed();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
    };
  }, [selectedCafe, date, role]);

  useEffect(() => {
    // Всегда синхронизируем с сервером: и «выполнено», и «отменено управляющим»
    setLocalState((prev) => {
      const newState = { ...prev };
      const serverById = new Map<string, (typeof performed)[0]>();
      performed.forEach((p) => {
        if (p.itemId) serverById.set(String(p.itemId), p);
      });

      // 1) с сервера: выполненные и явно отменённые (done=false)
      performed.forEach((p) => {
        if (!p.itemId) return;
        if (p.done) {
          newState[p.itemId] = {
            done: true,
            comment: p.comment || "",
            photos: [],
            photoUrls: p.photoUrls || [],
            performedBy: p.performedBy || "Неизвестно",
          };
        } else {
          // отмена управляющим / сброс — можно делать заново
          newState[p.itemId] = {
            done: false,
            comment: p.comment || "",
            photos: [],
            photoUrls: [],
            performedBy: undefined,
          };
        }
      });

      // 2) локально «выполненные», которых на сервере уже нет / done=false
      Object.keys(newState).forEach((id) => {
        const local = newState[id];
        if (!local?.done && !local?.performedBy) return;
        if ((local as any)._offlineQueued) return;

        const srv = serverById.get(String(id));
        const stillDone = !!(srv && srv.done);
        if (!stillDone) {
          newState[id] = {
            done: false,
            comment: srv?.comment || local.comment || "",
            photos: [],
            photoUrls: [],
            performedBy: undefined,
          };
        }
      });

      return newState;
    });
  }, [performed]);


  const forceRefreshTemplate = async () => {
    if (!selectedCafe || !role) return;
    setUpdatingTemplate(true);
    try {
      const response = await fetch(
        `/api/checklists/template?cafe=${encodeURIComponent(
          selectedCafe
        )}&role=${encodeURIComponent(role)}`,
        { cache: "no-store" }
      );
      const result = await response.json();
      if (!result.success) throw new Error(result.error || "Ошибка");
      const seen = new Set<string>();
      const items: Item[] = [];
      for (const row of result.data || []) {
        const id = String(row.item_id || row.id);
        if (seen.has(id)) continue;
        seen.add(id);
        items.push({
          id,
          text: row.text || "Без названия",
          photoRequired: row.photo_required ? "ДА" : "НЕТ",
          section: row.section || "Без раздела",
          days_of_week: row.days_of_week || [],
          shift_type: row.shift_type || "day",
        });
      }
      const version =
        result.version || computeTemplateVersion(result.data || []);
      await saveCachedTemplate(selectedCafe, role, items as any, version);
      setFullTemplate(items);
      setTemplateVersion(version);
      setTemplateFromCache(false);
      setTemplateUpdateAvailable(false);
      toast.success("Чек-лист обновлён и сохранён на устройство");
    } catch (e: any) {
      toast.error(e?.message || "Не удалось обновить");
    } finally {
      setUpdatingTemplate(false);
    }
  };

  /** Сохранить один пункт сразу (как при «выполнить») — с уже загруженными photoUrls */
  const saveOneItemNow = async (
    item: Item,
    local: {
      done: boolean;
      comment: string;
      photos: File[];
      photoUrls: string[];
      performedBy?: string;
    }
  ) => {
    if (!selectedCafe || !date || !role || !selectedShift) {
      toast.error("Выберите кофейню, дату, смену и роль");
      return false;
    }
    if (!hasRequiredName()) {
      toast.error("Укажите фамилию и имя");
      return false;
    }
    if (
      local.done &&
      item.photoRequired === "ДА" &&
      (local.photoUrls?.length || 0) + (local.photos?.length || 0) === 0
    ) {
      toast.error(`Нужно фото: «${item.text}»`);
      return false;
    }

    let photoUrls = [...(local.photoUrls || [])];
    const clientId = `checklist_save_${selectedCafe}_${toDbDate(date)}_${role}_${item.id}`;
    // догрузить оставшиеся File; при сбое — IndexedDB + очередь
    if (local.photos?.length > 0) {
      const translitCafe = translitCafeName(selectedCafe);
      const safeDate = toDbDate(date);
      const safeItemId = item.id.replace(/[^a-zA-Z0-9-]/g, "_");
      const pendingFiles: { file: Blob; fileName: string }[] = [];
      for (const file of local.photos) {
        const fileName = `${safeDate}_${translitCafe}_${selectedShift}_${safeItemId}_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2)}.jpg`;
        try {
          if (!isBrowserOnline()) throw new Error("offline");
          const url = await uploadPhoto(file, fileName);
          photoUrls.push(url);
        } catch (photoErr: any) {
          console.warn("photo offline/fail → IDB", photoErr);
          pendingFiles.push({ file, fileName });
        }
      }
      if (pendingFiles.length) {
        try {
          await saveOfflinePhotos(clientId, pendingFiles);
          toast("Фото сохранено офлайн — уйдёт при появлении сети", {
            duration: 3500,
            icon: "📷",
          });
        } catch (e) {
          console.error(e);
          toast.error("Не удалось сохранить фото офлайн на устройстве");
        }
      }
    }

    const name = getPerformedByName();
    const saved = await savePerformedItem({
      item,
      local: { ...local, done: local.done },
      photoUrls,
      performedBy: name,
    });

    setLocalState((prev) => ({
      ...prev,
      [item.id]: {
        ...(prev[item.id] || local),
        done: local.done,
        comment: local.comment || "",
        photoUrls,
        photos: [],
        // offline: помечаем как «своё», чтобы не откатывать UI
        performedBy: name,
        _offlineQueued: !!(saved as any)?.offline,
      },
    }));
    return { ok: true, offline: !!(saved as any)?.offline };
  };

  const handleToggle = async (id: string) => {
    const current = localState[id];

    // только если уже выполнен и есть ФИО исполнителя — не даём снять «чужой» чужим способом
    // снятие через галочку разрешаем: очищаем фото и пишем done=false

    const nextDone = !(current?.done || false);

    if (nextDone && !hasRequiredName()) {
      toast.error("Сначала укажите фамилию и имя");
      return;
    }

    const item = currentItems.find((i) => i.id === id);
    if (!item) return;

    // Пункт с обязательным фото: галочка «вкл» без фото не сохраняет — ждём фото
    if (
      nextDone &&
      item.photoRequired === "ДА" &&
      (current?.photoUrls?.length || 0) + (current?.photos?.length || 0) === 0
    ) {
      const nextLocal = {
        ...(current || {
          done: false,
          comment: "",
          photos: [] as File[],
          photoUrls: [] as string[],
        }),
        done: true,
      };
      setLocalState((prev) => ({ ...prev, [id]: nextLocal }));
      toast("Добавьте фото — пункт сохранится сам после загрузки");
      return;
    }

    // Снятие галочки: если были фото — убираем, пункт не выполнен
    const nextLocal = {
      ...(current || {
        done: false,
        comment: "",
        photos: [] as File[],
        photoUrls: [] as string[],
      }),
      done: nextDone,
      photoUrls: nextDone ? (current?.photoUrls || []) : [],
      photos: nextDone ? (current?.photos || []) : [],
      performedBy: nextDone ? current?.performedBy : undefined,
    };

    setLocalState((prev) => ({
      ...prev,
      [id]: nextLocal,
    }));

    try {
      const res: any = await saveOneItemNow(item, {
        ...nextLocal,
        done: nextDone,
        comment: nextLocal.comment || "",
        photoUrls: nextLocal.photoUrls || [],
        photos: [],
      });
      if (res?.offline) {
        toast.success(
          nextDone
            ? "Нет сети — пункт в очереди"
            : "Нет сети — снятие пункта в очереди",
          { duration: 4000 }
        );
      } else if (res === true || res?.ok) {
        toast.success(nextDone ? "Пункт сохранён" : "Пункт снят");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Ошибка сохранения пункта");
      setLocalState((prev) => ({
        ...prev,
        [id]: current || {
          done: false,
          comment: "",
          photos: [],
          photoUrls: [],
        },
      }));
    }
  };

  const handleComment = (id: string, comment: string) => {
    setLocalState((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {
          done: false,
          comment: "",
          photos: [],
          photoUrls: [],
        }),
        comment,
      },
    }));
  };

  /** Сохранить комментарий вместе с текущим done/фото (после blur) */
  const handleCommentBlur = async (id: string) => {
    const current = localState[id];
    if (!current) return;
    // сохраняем коммент только если пункт уже «в работе» (done или есть фото)
    const hasPhotos =
      (current.photoUrls?.length || 0) + (current.photos?.length || 0) > 0;
    if (!current.done && !hasPhotos) return;
    if (!hasRequiredName()) return;
    const item = currentItems.find((i) => i.id === id);
    if (!item) return;
    try {
      await saveOneItemNow(item, {
        ...current,
        done: current.done || hasPhotos,
        comment: current.comment || "",
        photoUrls: current.photoUrls || [],
        photos: current.photos || [],
      });
    } catch (e) {
      console.warn("comment save", e);
    }
  };

  const compressPhoto = async (file: File): Promise<File> => {
    // Агрессивнее: цель ~120–250 КБ, 1280→960 — меньше обрывов на мобильном интернете
    const opts = [
      { maxSizeMB: 0.18, maxWidthOrHeight: 1280, useWebWorker: true, initialQuality: 0.68, fileType: "image/jpeg" as const },
      { maxSizeMB: 0.22, maxWidthOrHeight: 1024, useWebWorker: false, initialQuality: 0.65, fileType: "image/jpeg" as const },
      { maxSizeMB: 0.28, maxWidthOrHeight: 960, useWebWorker: false, initialQuality: 0.6, fileType: "image/jpeg" as const },
      { maxSizeMB: 0.35, maxWidthOrHeight: 800, useWebWorker: false, initialQuality: 0.55, fileType: "image/jpeg" as const },
    ];
    for (const o of opts) {
      try {
        const out = await imageCompression(file, o);
        if (out && out.size > 0) return out;
      } catch (e) {
        console.warn("compress step failed", o.maxSizeMB, e);
      }
    }
    try {
      const bmp = await createImageBitmap(file);
      const max = 960;
      const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
      const w = Math.max(1, Math.round(bmp.width * scale));
      const h = Math.max(1, Math.round(bmp.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(bmp, 0, 0, w, h);
      const blob: Blob | null = await new Promise((res) =>
        canvas.toBlob(res, "image/jpeg", 0.62)
      );
      if (!blob) return file;
      return new File([blob], (file.name || "photo").replace(/\.[^.]+$/, ".jpg"), {
        type: "image/jpeg",
      });
    } catch {
      return file;
    }
  };

  const handleAddPhoto = async (id: string, file: File) => {
    const current = localState[id];

    if (
      (current?.photos.length || 0) + (current?.photoUrls.length || 0) >=
      MAX_PHOTOS
    ) {
      toast.error("Максимум 5 фото");
      return;
    }

    // можно добавлять фото и после автосохранения (до MAX_PHOTOS)

    if (!selectedCafe || !date || !selectedShift) {
      toast.error("Сначала выберите кофейню, дату и смену");
      return;
    }

    if (!file || file.size === 0) {
      toast.error("Пустой файл — выберите фото ещё раз");
      return;
    }

    // очень большие исходники режем по смыслу сообщением
    if (file.size > 25 * 1024 * 1024) {
      toast.error("Файл слишком большой (больше 25 МБ)");
      return;
    }

    try {
      toast.loading("Обработка фото…", { id: "photo-up" });
      const compressedFile = await compressPhoto(file);

      const translitCafe = translitCafeName(selectedCafe);
      const safeDate = toDbDate(date);
      const safeItemId = id.replace(/[^a-zA-Z0-9-]/g, "_");
      // после сжатия часто jpeg
      let extension = (compressedFile.name.split(".").pop() || "jpg").toLowerCase();
      if (extension === "heic" || extension === "heif" || extension === "png") {
        extension = compressedFile.type.includes("jpeg") ? "jpg" : extension;
      }
      if (compressedFile.type === "image/jpeg") extension = "jpg";

      const fileName = `${safeDate}_${translitCafe}_${selectedShift}_${safeItemId}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}.${extension}`;

      toast.loading("Загрузка фото…", { id: "photo-up" });
      let url: string | null = null;
      let offlineStored = false;
      try {
        if (!isBrowserOnline()) throw new Error("offline");
        url = await uploadPhoto(compressedFile, fileName);
      } catch (upErr: any) {
        console.warn("upload photo → offline IDB", upErr);
        const clientId = `checklist_save_${selectedCafe}_${toDbDate(date)}_${role}_${id}`;
        try {
          await saveOfflinePhotos(clientId, [
            { file: compressedFile, fileName },
          ]);
          offlineStored = true;
        } catch (e) {
          console.error(e);
        }
      }
      toast.dismiss("photo-up");

      // хотя бы одно фото (url или offline) → пункт выполнен
      const nextUrls = url
        ? [...(current?.photoUrls || []), url]
        : [...(current?.photoUrls || [])];
      const markedDone = nextUrls.length > 0 || offlineStored;
      const nextLocal = {
        ...(current || {
          done: false,
          comment: "",
          photos: [] as File[],
          photoUrls: [] as string[],
        }),
        photoUrls: nextUrls,
        photos: [] as File[],
        done: markedDone,
        comment: current?.comment || "",
        performedBy: current?.performedBy,
        _offlinePhoto: offlineStored || undefined,
      };

      setLocalState((prev) => ({
        ...prev,
        [id]: nextLocal,
      }));

      const item = currentItems.find((i) => i.id === id);
      if (!item) {
        if (url) toast.success("Фото загружено");
        return;
      }
      if (!hasRequiredName()) {
        toast.error("Укажите фамилию и имя — затем фото сохранится в базу");
        return;
      }
      try {
        const ok: any = await saveOneItemNow(item, {
          ...nextLocal,
          done: true,
          comment: nextLocal.comment || "",
          photoUrls: nextUrls,
          photos: [],
        });
        if (ok?.offline || offlineStored) {
          toast.success("Фото на устройстве — уйдёт при сети; пункт отмечен");
        } else if (ok === true || ok?.ok) {
          const n = nextUrls.length;
          toast.success(
            n > 1 ? `Фото ${n}/${MAX_PHOTOS} сохранено` : "Пункт с фото сохранён"
          );
        } else if (url) {
          toast.success("Фото загружено");
        }
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Не удалось сохранить пункт с фото");
      }
    } catch (e: any) {
      console.error("Ошибка добавления фото:", e);
      toast.dismiss("photo-up");
      const msg = String(e?.message || e || "Ошибка добавления фото");
      toast.error(msg.length > 120 ? msg.slice(0, 120) + "…" : msg, {
        duration: 5000,
      });
    }
  };

  const handleRemovePhoto = async (id: string, index: number) => {
    const current = localState[id];
    if (!current) return;
    // index относится к photoUrls (серверные); локальные File — отдельно ниже
    const urls = [...(current.photoUrls || [])];
    if (index < 0 || index >= urls.length) {
      // возможно удаление из pending File[]
      const files = [...(current.photos || [])];
      const fi = index - urls.length;
      if (fi >= 0 && fi < files.length) {
        files.splice(fi, 1);
        const still =
          urls.length + files.length > 0;
        const next = {
          ...current,
          photos: files,
          done: still ? true : false,
          performedBy: still ? current.performedBy : undefined,
        };
        setLocalState((prev) => ({ ...prev, [id]: next }));
        return;
      }
      return;
    }
    urls.splice(index, 1);
    const still = urls.length > 0;
    const next = {
      ...current,
      photoUrls: urls,
      photos: current.photos || [],
      done: still,
      performedBy: still ? current.performedBy : undefined,
    };
    setLocalState((prev) => ({ ...prev, [id]: next }));

    const item = currentItems.find((i) => i.id === id);
    if (!item || !hasRequiredName()) {
      if (!still) toast("Все фото удалены — пункт не выполнен");
      return;
    }
    try {
      const res: any = await saveOneItemNow(item, {
        ...next,
        done: still,
        comment: next.comment || "",
        photoUrls: urls,
        photos: [],
      });
      if (res === true || res?.ok || res?.offline) {
        toast.success(
          still
            ? `Фото удалено (${urls.length} осталось)`
            : "Все фото удалены — пункт снят"
        );
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Не удалось сохранить после удаления фото");
    }
  };

  const uploadPhoto = async (file: File, fileName: string) => {
    const isNetworkish = (e: any) => {
      const msg = String(e?.message || e || "").toLowerCase();
      return (
        e?.name === "AbortError" ||
        msg.includes("failed to fetch") ||
        msg.includes("network") ||
        msg.includes("aborted") ||
        msg.includes("timeout") ||
        msg.includes("load failed") ||
        msg.includes("net::") ||
        msg.includes("503") ||
        msg.includes("502") ||
        msg.includes("504") ||
        msg.includes("429")
      );
    };

    const doFormData = async (timeoutMs: number) => {
      const formData = new FormData();
      // всегда jpeg после compress
      const blob =
        file.type && file.type.startsWith("image/")
          ? file
          : new File([file], fileName, { type: "image/jpeg" });
      formData.append("file", blob, fileName.endsWith(".jpg") ? fileName : fileName.replace(/\.[^.]+$/, ".jpg"));
      formData.append("fileName", fileName.replace(/\.[^.]+$/, ".jpg"));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch("/api/checklists/upload-photo", {
          method: "POST",
          body: formData,
          signal: controller.signal,
          // не кэшировать
          cache: "no-store",
        });
        const text = await response.text();
        let result: any = null;
        try {
          result = text ? JSON.parse(text) : null;
        } catch {
          throw new Error(
            `Сервер вернул не JSON (${response.status}). Проверьте сеть.`
          );
        }
        if (!response.ok || !result?.success) {
          throw new Error(
            result?.error || `Ошибка загрузки фото (${response.status})`
          );
        }
        if (!result.publicUrl) throw new Error("Сервер не вернул ссылку на фото");
        return result.publicUrl as string;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    // fallback: base64 JSON — иногда FormData режется мобильными прокси
    const doBase64 = async (timeoutMs: number) => {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      const base64 = btoa(binary);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch("/api/checklists/upload-photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: fileName.replace(/\.[^.]+$/, ".jpg"),
            contentType: "image/jpeg",
            base64,
          }),
          signal: controller.signal,
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok || !result?.success) {
          throw new Error(result?.error || `base64 upload ${response.status}`);
        }
        if (!result.publicUrl) throw new Error("Нет publicUrl");
        return result.publicUrl as string;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const attempts = 5;
    let lastErr: any = null;
    for (let i = 0; i < attempts; i++) {
      const timeoutMs = 30000 + i * 15000; // 30s → 90s
      try {
        // чередуем FormData и base64
        if (i % 2 === 0) {
          return await doFormData(timeoutMs);
        }
        return await doBase64(timeoutMs);
      } catch (e: any) {
        lastErr = e;
        console.warn(`uploadPhoto try ${i + 1}/${attempts}`, e);
        if (i < attempts - 1 && isNetworkish(e)) {
          const wait = 700 * Math.pow(2, i); // 0.7s, 1.4, 2.8, 5.6
          toast.loading(`Сеть слабая, повтор ${i + 2}/${attempts}…`, {
            id: "photo-up",
          });
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }
        if (i < attempts - 1) {
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }
      }
    }
    throw lastErr || new Error("Не удалось загрузить фото");
  };

  const savePerformedItem = async ({
    item,
    local,
    photoUrls,
    performedBy,
  }: {
    item: Item;
    local: any;
    photoUrls: string[];
    performedBy?: string;
  }) => {
    const name =
      performedBy || getPerformedByName() || auth?.login || "Неизвестно";
    const payload = {
      cafe: selectedCafe,
      date: toDbDate(date),
      role,
      itemId: item.id,
      done: local.done,
      performedBy: name,
      comment: local.comment || "",
      photoUrls: photoUrls || [],
    };
    const clientId = `checklist_save_${selectedCafe}_${toDbDate(date)}_${role}_${item.id}`;
    const result = await mutateWithOffline(
      "/api/checklists/save",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        label: `Чек-лист: ${selectedCafe} / ${item.text?.slice(0, 40) || item.id}`,
        clientId,
      }
    );

    if (!result.success) {
      throw new Error(result.error || "Ошибка сохранения");
    }

    return { ...(result.data || {}), offline: !!result.offline };
  };

  const save = async () => {
    if (!selectedCafe || !date || !role || !selectedShift) {
      toast.error("Выберите кофейню, дату, смену и роль");
      return;
    }

    if (!canFillShift(selectedShift)) {
      const shiftInfo = SHIFT_TIME_WINDOWS[selectedShift];
      toast.error(
        `Сейчас нельзя заполнять ${
          selectedShift === "day" ? "дневной" : "ночной"
        } чек-лист. ${shiftInfo.name}`
      );
      return;
    }

    if (!hasRequiredName()) {
      toast.error("Укажите фамилию и имя");
      return;
    }

    setSaving(true);
    setSaveProgress({ current: 0, total: 0 });

    const toSave = currentItems
      .map((item) => {
        const local = localState[item.id] || {
          done: false,
          comment: "",
          photos: [],
          photoUrls: [],
        };

        const hasNewPhotos = local.photos?.length > 0;
        const isUnsaved = !local.performedBy;
        const hasUnsavedData = (local.done || local.comment) && isUnsaved;

        if (!hasNewPhotos && !hasUnsavedData) return null;

        if (
          isUnsaved &&
          local.done &&
          item.photoRequired === "ДА" &&
          local.photos.length + local.photoUrls.length === 0
        ) {
          toast.error(`Фото отсутствует: "${item.text}"`);
          return null;
        }

        return { item, local };
      })
      .filter(Boolean) as { item: Item; local: any }[];

    if (toSave.length === 0) {
      toast("Нет изменений");
      setSaving(false);
      return;
    }

    setSaveProgress({ current: 0, total: toSave.length });

    let successCount = 0;
    let errorCount = 0;

    for (const [index, { item, local }] of toSave.entries()) {
      try {
        let photoUrls = [...(local.photoUrls || [])];

        if (local.photos?.length > 0) {
          const translitCafe = translitCafeName(selectedCafe);
          const safeDate = toDbDate(date);
          const safeItemId = item.id.replace(/[^a-zA-Z0-9-]/g, "_");

          const photoPromises = local.photos.map(async (file: File) => {
            const extension = file.name.split(".").pop() || "jpg";
            const fileName = `${safeDate}_${translitCafe}_${selectedShift}_${safeItemId}_${Date.now()}_${Math.random()
              .toString(36)
              .slice(2)}.${extension}`;

            return uploadPhoto(file, fileName);
          });

          const newUrls = await Promise.all(photoPromises);
          photoUrls = [...photoUrls, ...newUrls];
        }

        await savePerformedItem({
          item,
          local,
          photoUrls,
        });

        successCount++;

        setLocalState((prev) => ({
          ...prev,
          [item.id]: {
            ...prev[item.id],
            performedBy: getPerformedByName() || auth?.login || "Неизвестно",
            photoUrls,
            photos: [],
          },
        }));
      } catch (e: any) {
        console.error("Save error:", e);
        toast.error(`Ошибка: ${e.message || "Неизвестная ошибка"}`);
        errorCount++;
      }

      setSaveProgress({ current: index + 1, total: toSave.length });
    }

    toast.dismiss();

    if (successCount > 0) {
      toast.success(`Сохранено: ${successCount} из ${toSave.length}`);
      localStorage.removeItem(CACHE_KEY);
    }

    if (errorCount > 0) {
      toast.error(`Ошибок: ${errorCount}. Проверьте консоль`);
    }

    setSaving(false);
    setSaveProgress({ current: 0, total: 0 });
  };

  const availableCafes = useMemo(() => {
    if (isCafeLocked && fixedCafe) {
      return [fixedCafe];
    }

    return allCafes;
  }, [allCafes, isCafeLocked, fixedCafe]);

  const isShiftFillable = true; // смены убраны
  const availableShifts = selectedCafe ? getAvailableShifts(selectedCafe) : ["day"];
  const currentShiftInfo = SHIFT_TIME_WINDOWS[selectedShift];

    const catOptions = useMemo(() => {
    if (!fullTemplate.length) return [];
    return Array.from(new Set(fullTemplate.map(i => i.section))).sort();
  }, [fullTemplate]);

  const filters = (
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6">
      <div>
        <label className="block text-sm font-medium mb-1">Кофейня</label>


        {templateUpdateAvailable && (
          <div className="mb-3 rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
            <div className="text-sm text-blue-900">
              <span className="font-semibold">Доступна новая версия чек-листа.</span>
              <span className="block text-xs text-blue-800/80">
                На устройстве старая копия. Нажмите, чтобы подгрузить изменения.
              </span>
            </div>
            <button
              type="button"
              onClick={forceRefreshTemplate}
              disabled={updatingTemplate}
              className="shrink-0 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              {updatingTemplate ? "Обновление…" : "Обновить чек-лист"}
            </button>
          </div>
        )}
        {templateFromCache && !templateUpdateAvailable && (
          <p className="mb-2 text-[11px] text-gray-500">
            Чек-лист с устройства (офлайн-копия)
            {templateVersion ? ` · ${templateVersion}` : ""}
          </p>
        )}

        {isCafeLocked ? (
          <div className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-800 cursor-not-allowed flex items-center justify-between">
            <span>{fixedCafe || selectedCafe}</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              Закреплено
            </span>
          </div>
        ) : (
          <select
            value={selectedCafe || ""}
            onChange={(e) => {
              const newCafe = e.target.value;
              setSelectedCafe(newCafe);
              const q = new URLSearchParams(searchParams.toString());
              if (newCafe) q.set("cafe", newCafe);
              else q.delete("cafe");
              router.replace(`${pathname}?${q.toString()}`, { scroll: false });
            }}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">— кофейня —</option>
            {availableCafes.map((cafe) => (
              <option key={cafe} value={cafe}>{cafe}</option>
            ))}
          </select>
        )}
        {isCafeLocked && (
          <p className="text-xs text-gray-500 mt-1">
            Кофейня закреплена для вашей роли
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Тип смены</label>

        <p className="text-xs text-slate-500">
          Смены убраны: для ночи используйте отдельную кофейню (например «Кофеин НОЧЬ»).
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Роль</label>

        <select
          value={role}
          onChange={(e) => {
            const newRole = e.target.value;
            setRole(newRole);
            const q = new URLSearchParams(searchParams.toString());
            if (newRole) q.set("role", newRole);
            else q.delete("role");
            if (newRole) q.delete("category");
            router.replace(`${pathname}?${q.toString()}`, { scroll: false });
          }}
          className="w-full border rounded-lg px-3 py-2"
          disabled={!selectedCafe || loadingRoles}
        >
          <option value="">— роль —</option>
          {getRolesAvailableToday.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        {loadingRoles && (
          <p className="text-xs text-gray-500 mt-1">Загрузка ролей...</p>
        )}
        {!loadingRoles && availableRoles.length === 0 && selectedCafe && (
          <p className="text-xs text-amber-600 mt-1">
            Нет доступных ролей для этой кофейни
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Дата</label>
        <input
          type="date"
          value={date.split(".").reverse().join("-")}
          onChange={(e) => {
            const newDate = e.target.value.split("-").reverse().join(".");
            setDate(newDate);
            const q = new URLSearchParams(searchParams.toString());
            if (newDate) q.set("date", newDate);
            else q.delete("date");
            router.replace(`${pathname}?${q.toString()}`, { scroll: false });
          }}
          className="w-full border rounded-lg px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Категория (фильтр)</label>
        <select
          value={category}
          onChange={(e) => {
            const newCategory = e.target.value;
            setCategory(newCategory);
            const q = new URLSearchParams(searchParams.toString());
            if (newCategory) q.set("category", newCategory);
            else q.delete("category");
            router.replace(`${pathname}?${q.toString()}`, { scroll: false });
          }}
          disabled={!role || loadingTemplate}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="">— все категории —</option>
          {catOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      {syncProgress && (
        <div className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-sm font-medium text-emerald-900">{syncProgress}</p>
            <span className="text-xs text-emerald-700 tabular-nums">{syncProgressPct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-emerald-100 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(5, syncProgressPct))}%` }}
            />
          </div>
        </div>
      )}
      {filters}

      {selectedCafe && date && !role && availableRoles.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <p className="text-yellow-700">
            👆 Выберите роль для загрузки чек-листа
          </p>
        </div>
      )}

      {selectedCafe && date && availableRoles.length === 0 && !loadingRoles && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <p className="text-red-700">
            ⚠️ Для кофейни "{selectedCafe}" не найдено ролей.
            {typeof navigator !== "undefined" && !navigator.onLine
              ? " Нет сети — сначала откройте чек-лист с интернетом один раз, чтобы роли и шаблон сохранились на телефон."
              : " Обратитесь к менеджеру или обновите страницу."}
          </p>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Фамилия <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            placeholder="Иванов"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
            className="w-full px-5 py-4 text-lg border-2 border-gray-300 rounded-xl focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Имя <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            placeholder="Иван"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            className="w-full px-5 py-4 text-lg border-2 border-gray-300 rounded-xl focus:border-amber-500"
          />
        </div>
        <p className="sm:col-span-2 text-xs text-gray-500">
          Оба поля обязательны. Без фамилии и имени пункт не сохранится.
        </p>
      </div>

      <div className="mb-4 text-sm text-gray-600 flex justify-between">
        <span>
          Кофейня: <strong>{selectedCafe || "не выбрана"}</strong> · Смена:{" "}
          <strong>{selectedShift === "day" ? "Дневная" : "Ночная"}</strong> ·
          Дата: <strong>{date}</strong> · Роль:{" "}
          <strong>{role || "не выбрана"}</strong>
          {isCafeLocked && <span className="ml-2 text-blue-600">(закреплена)</span>}
        </span>
        <button
          onClick={() => {
            if (confirm("Очистить?")) {
              localStorage.removeItem(CACHE_KEY);
              setLocalState({});
              setLastName("");
              setFirstName("");
              toast.success("Очищено");
            }
          }}
          className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
        >
          Очистить
        </button>
      </div>

      {loadingTemplate && <p className="text-center text-gray-600">Загрузка чек-листа...</p>}
      {err && <p className="text-center text-red-600 mb-4">{err}</p>}

      {!loadingTemplate && fullTemplate.length === 0 && role && selectedCafe && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <p className="text-yellow-700">
            ⚠️ Шаблон для роли "{role}" не найден в кофейне "{selectedCafe}" для{" "}
            {selectedShift === "day" ? "дневной" : "ночной"} смены
          </p>
        </div>
      )}

      {!isShiftFillable && selectedCafe && role && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <p className="text-red-700 font-medium">⚠️ Внимание!</p>
          <p className="text-red-600 text-sm mt-1">
            Сейчас нельзя заполнять{" "}
            {selectedShift === "day" ? "дневной" : "ночной"} чек-лист.
            {selectedShift === "day"
              ? " Дневная смена доступна с 6:00 до 24:00."
              : " Ночная смена доступна с 21:00 до 8:00."}
          </p>
        </div>
      )}

      {selectedCafe && date && role && isShiftFillable ? (
        <div className="space-y-8">
          {(() => {
            const grouped = currentItems.reduce((acc, item) => {
              const sec = item.section || "Без раздела";
              if (!acc[sec]) acc[sec] = [];
              acc[sec].push(item);
              return acc;
            }, {} as Record<string, Item[]>);

            const sections = Object.keys(grouped);

            if (sections.length === 0 && !loadingTemplate) {
              return (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <p className="text-yellow-700">
                    Нет активных пунктов для сегодняшнего дня
                  </p>
                </div>
              );
            }

            return sections.map((sectionName) => (
              <div key={sectionName} className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 bg-gray-100 px-5 py-3 rounded-lg">
                  {sectionName}
                </h2>

                {grouped[sectionName].map((item) => {
                  const local = localState[item.id] || {
                    done: false,
                    comment: "",
                    photos: [],
                    photoUrls: [],
                    performedBy: "",
                  };
                  const isDone = local.done;
                  const isSaved = !!(local.done && local.performedBy);
                  const isRejected = !local.done && /отклон|отмен/i.test(local.comment || "");
                  const photoReq = item.photoRequired;
                  const totalPhotos = local.photos.length + local.photoUrls.length;

                  return (
                    <div
                      key={item.id}
                      id={`checklist-item-${item.id}`}
                      data-item-id={item.id}
                      className={`bg-white rounded-xl shadow-sm border p-5 transition-shadow ${
                        isSaved ? "opacity-70 border-green-300" : ""
                      } ${
                        urlItemId && (urlItemId === item.id || urlItemId === String(item.id))
                          ? "ring-2 ring-amber-400 ring-offset-2"
                          : ""
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={() => handleToggle(item.id)}
                          className="mt-1 w-6 h-6 text-green-600 rounded"
                        />
                        <div className="flex-1">
                          <p className={`font-medium ${isDone ? "line-through text-gray-500" : ""}`}>
                            {item.text}
                            {photoReq === "ДА" && <span className="text-red-600 ml-2">* фото</span>}
                          </p>
                          {isRejected && (
                            <p className="text-xs text-red-600 mt-1 font-medium">
                              {local.comment || 'Отменено управляющим — выполните пункт заново'}
                            </p>
                          )}
                          {isSaved && local.performedBy && (
                            <p className="text-xs text-gray-500 mt-1">
                              Выполнил: {local.performedBy}
                            </p>
                          )}
                          {(local.photoUrls.length > 0 || local.photos.length > 0) && (
                            <div className="mt-3 grid grid-cols-3 gap-2">
                              {local.photoUrls.map((url, i) => (
                                <div key={`u-${i}`} className="relative group">
                                  <a href={url} target="_blank" rel="noreferrer">
                                    <img
                                      src={url}
                                      alt="фото"
                                      className="w-full h-32 object-cover rounded-lg border"
                                    />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePhoto(item.id, i)}
                                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm shadow"
                                    title="Удалить фото"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                              {local.photos.map((file, i) => (
                                <div key={`f-${i}`} className="relative">
                                  <img
                                    src={URL.createObjectURL(file)}
                                    alt="новое"
                                    className="w-full h-32 object-cover rounded-lg border"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemovePhoto(
                                        item.id,
                                        local.photoUrls.length + i
                                      )
                                    }
                                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm shadow"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="mt-3">
                            <textarea
                              placeholder="Комментарий (сохранится с пунктом / фото)"
                              value={local.comment}
                              onChange={(e) =>
                                handleComment(item.id, e.target.value)
                              }
                              onBlur={() => handleCommentBlur(item.id)}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 text-sm"
                            />
                          </div>
                          {isDone && (
                            <div className="mt-3">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Фото {photoReq === "ДА" ? "(обязательно)" : ""} — только с камеры (
                                {totalPhotos}/{MAX_PHOTOS})
                              </label>
                              <label
                                className={`flex items-center justify-center gap-2 w-full min-h-[48px] rounded-xl border-2 border-dashed text-sm font-semibold ${
                                  totalPhotos >= MAX_PHOTOS
                                    ? 'border-slate-200 text-slate-400 bg-slate-50'
                                    : 'border-emerald-400 text-emerald-800 bg-emerald-50 active:bg-emerald-100'
                                }`}
                              >
                                {totalPhotos > 0
                                  ? `📷 Ещё фото (${totalPhotos}/${MAX_PHOTOS})`
                                  : '📷 Сделать фото'}
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                      handleAddPhoto(item.id, e.target.files[0]);
                                      e.target.value = "";
                                    }
                                  }}
                                  disabled={totalPhotos >= MAX_PHOTOS}
                                  className="sr-only"
                                />
                              </label>
                              <p className="text-[11px] text-slate-500 mt-1">
                                До 5 фото. После первого фото пункт считается выполненным.
                                Можно добавить или удалить фото позже.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ));
          })()}
        </div>
      ) : selectedCafe && date && role && !isShiftFillable ? null : (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-gray-500 text-lg">
            {!selectedCafe || !date
              ? "Выберите кофейню и дату"
              : !role
              ? "Выберите роль для отображения чек-листа"
              : "Выберите параметры для отображения чек-листа"}
          </p>
        </div>
      )}

      {currentItems.length > 0 && isShiftFillable && (
        <div className="mt-8 flex flex-col items-center gap-4">
          {saving && (
            <div className="w-full max-w-md p-4 bg-gray-100 rounded-xl">
              <div className="flex justify-between text-sm text-gray-700 mb-1">
                <span>Загрузка пунктов...</span>
                <span>{saveProgress.current} из {saveProgress.total}</span>
              </div>
              <div className="w-full bg-gray-300 rounded-full h-4">
                <div
                  className="bg-gradient-to-r from-amber-500 to-amber-600 h-4 rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: `${
                      saveProgress.total > 0
                        ? (saveProgress.current / saveProgress.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          )}
          <button
            onClick={save}
            disabled={saving || !hasRequiredName()}
            className={`px-8 py-4 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition ${
              hasRequiredName()
                ? "bg-gradient-to-r from-green-600 to-emerald-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {saving ? "Сохранение..." : "Сохранить чек-лист"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ClientFill() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-gray-600 mb-4">Загрузка чек-листа...</p>
            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        </div>
      }
    >
      <FillContent />
    </Suspense>
  );
}