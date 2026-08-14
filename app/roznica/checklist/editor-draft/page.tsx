'use client';

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from '@/lib/supabase';
import toast from "react-hot-toast";
import { 
  Plus, Save, Trash2, Edit, X, CheckSquare, ChevronDown, ChevronRight, 
  Copy, Layers, ListChecks, FolderTree, Building
} from "lucide-react";

type ShiftType = 'day' | 'night';

interface ChecklistItem {
  id: string;
  item_id?: string;
  cafe: string;
  role: string;
  text: string;
  photo_required: boolean;
  section: string | null;
  order: number;
  days_of_week?: string[];
  due_time?: string | null;
  due_time_end?: string | null;
  shift_type?: ShiftType;
  created_at?: string;
  updated_at?: string;
}

const DAYS_OF_WEEK = [
  { value: 'Monday', label: 'Понедельник' },
  { value: 'Tuesday', label: 'Вторник' },
  { value: 'Wednesday', label: 'Среда' },
  { value: 'Thursday', label: 'Четверг' },
  { value: 'Friday', label: 'Пятница' },
  { value: 'Saturday', label: 'Суббота' },
  { value: 'Sunday', label: 'Воскресенье' },
];

// Стандартные кофейни для инициализации
const DEFAULT_CAFES = [
  'Ашан', 'Кипарис 1', 'Эссе', 'Кофеин', 'Аптека',
  'Адидас', 'Тренева', 'КМ', 'ЦУМ', 'Ленина', 'Кипарис 2', 'Менеджер', 'Ашан ФУДКОРТ', 'Центрум'
];

// Хранилище для пользовательских кофеен (в localStorage)
const CUSTOM_CAFES_KEY = 'custom_cafes_draft';
const DELETED_CAFES_KEY = 'deleted_cafes_draft';

/** Служебные «кофейни» из модулей Управляющего / Руководителя — не точки продаж */
const SERVICE_CAFES = new Set(['Обход', 'Контроль', 'Руководитель', 'Управляющий']);



async function apiTemplatesGet(params: Record<string, string>) {
  const q = new URLSearchParams({ ...params, draft: '1' }).toString();
  const res = await fetch(`/api/checklists/templates?${q}`, { cache: 'no-store' });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Ошибка загрузки');
  return json.data;
}

async function apiTemplatesPost(body: any) {
  const res = await fetch('/api/checklists/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, draft: true }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Ошибка сохранения');
  return json;
}

export default function ChecklistDraftEditor() {
  const [auth, setAuth] = useState<any>(null);
  const [selectedCafe, setSelectedCafe] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedShift, setSelectedShift] = useState<ShiftType>('day'); // UI смен скрыт: ночь = отдельная кофейня
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [allCafes, setAllCafes] = useState<string[]>([])
  const [publishBusy, setPublishBusy] = useState(false)
  const [publishCafe, setPublishCafe] = useState<string>("")
;

  // Модалка для создания/редактирования пункта
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [newText, setNewText] = useState("");
  const [newPhotoRequired, setNewPhotoRequired] = useState(false);
  const [newDueTime, setNewDueTime] = useState("");
  const [newDueTimeEnd, setNewDueTimeEnd] = useState("");
  const [newSection, setNewSection] = useState("");
  const [newDaysOfWeek, setNewDaysOfWeek] = useState<string[]>([]);
  const [newShiftType, setNewShiftType] = useState<ShiftType>('day');
  
  // Модалка для управления кофейнями
  const [cafeModalOpen, setCafeModalOpen] = useState(false);
  const [newCafeName, setNewCafeName] = useState("");
  const [editingCafe, setEditingCafe] = useState<string | null>(null);
  const [cafeToDelete, setCafeToDelete] = useState<string | null>(null);
  
  // Модалка для массового копирования
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copySourceCafe, setCopySourceCafe] = useState("");
  const [copySourceRole, setCopySourceRole] = useState("");
  const [copySourceShift, setCopySourceShift] = useState<ShiftType>('day');
  const [copySourceSection, setCopySourceSection] = useState("");
  const [copySelectedItems, setCopySelectedItems] = useState<string[]>([]);
  const [copySourceItems, setCopySourceItems] = useState<ChecklistItem[]>([]);
  const [copyTargetCafe, setCopyTargetCafe] = useState("");
  const [copyTargetRole, setCopyTargetRole] = useState("");
  const [copyTargetShift, setCopyTargetShift] = useState<ShiftType>('day');
  const [copyTargetSection, setCopyTargetSection] = useState("");
  const [copyPreview, setCopyPreview] = useState<ChecklistItem[]>([]);
  const [copyMode, setCopyMode] = useState<'all' | 'section' | 'selected'>('all');
  const [sourceRoles, setSourceRoles] = useState<string[]>([]);

  // Новая модалка для копирования полной структуры (роли + категории + пункты)
  // Массовое добавление одного пункта на несколько кофеен / ролей / разделов
  const [multiAddOpen, setMultiAddOpen] = useState(false);
  const [multiText, setMultiText] = useState('');
  const [multiPhoto, setMultiPhoto] = useState(false);
  const [multiDays, setMultiDays] = useState<string[]>([]);
  const [multiShift, setMultiShift] = useState<ShiftType>('day');
  const [multiCafes, setMultiCafes] = useState<string[]>([]);
  const [multiRoles, setMultiRoles] = useState<string[]>([]);
  const [multiSections, setMultiSections] = useState<string[]>([]);
  const [multiSectionInput, setMultiSectionInput] = useState('');
  const [multiSaving, setMultiSaving] = useState(false);
  // Парсер: пункт | категория | роль | ДА/нет (фото)
  const [pasteImportOpen, setPasteImportOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteSaving, setPasteSaving] = useState(false);
  const [pastePreview, setPastePreview] = useState<{ text: string; section: string; role: string; photo: boolean; cafes: string[] }[]>([]);

  const [knownSections, setKnownSections] = useState<string[]>([]);
  const [knownRolesAll, setKnownRolesAll] = useState<string[]>([]);

  const [copyStructureModalOpen, setCopyStructureModalOpen] = useState(false);
  const [structureSourceCafe, setStructureSourceCafe] = useState("");
  const [structureSourceShift, setStructureSourceShift] = useState<ShiftType>('day');
  const [structureTargetCafe, setStructureTargetCafe] = useState("");
  const [structureTargetShift, setStructureTargetShift] = useState<ShiftType>('day');
  const [structureCopyMode, setStructureCopyMode] = useState<'all_roles' | 'selected_roles'>('all_roles');
  const [structureSelectedRoles, setStructureSelectedRoles] = useState<string[]>([]);
  const [structureSourceRoles, setStructureSourceRoles] = useState<string[]>([]);
  const [structurePreview, setStructurePreview] = useState<any>(null);

  // Модалка для массового редактирования
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkSection, setBulkSection] = useState("");
  const [bulkDaysOfWeek, setBulkDaysOfWeek] = useState<string[]>([]);
  const [bulkShiftType, setBulkShiftType] = useState<ShiftType | null>(null);
  const [bulkAction, setBulkAction] = useState<'set' | 'add' | 'remove'>('set');
  const [bulkPreview, setBulkPreview] = useState<ChecklistItem[]>([]);

  const readDeletedCafes = (): string[] => {
    try {
      const raw = localStorage.getItem(DELETED_CAFES_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.map(String) : [];
    } catch {
      return [];
    }
  };

  const markCafeDeleted = (name: string) => {
    const set = new Set(readDeletedCafes());
    set.add(name);
    localStorage.setItem(DELETED_CAFES_KEY, JSON.stringify([...set]));
  };

  const unmarkCafeDeleted = (name: string) => {
    const next = readDeletedCafes().filter(c => c !== name);
    localStorage.setItem(DELETED_CAFES_KEY, JSON.stringify(next));
  };

  /** Список = БД + ручные, без удалённых и без принудительного DEFAULT */

  const copyFromProduction = async (cafes: string[] | 'all') => {
    if (!confirm(cafes === 'all'
      ? 'Скопировать ВСЕ кофейни из боевого чек-листа в черновик? Черновик по этим кофейням будет перезаписан.'
      : `Скопировать в черновик: ${(cafes as string[]).join(', ')}?`)) return;
    setPublishBusy(true);
    try {
      const res = await fetch('/api/checklists/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'copy_prod_to_draft', cafes }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Ошибка');
      toast.success('Скопировано в черновик');
      await rebuildCafeList();
      if (selectedCafe) {
        await loadRoles();
        await loadItems();
      }
    } catch (e: any) {
      toast.error(e.message || 'Ошибка копирования');
    } finally {
      setPublishBusy(false);
    }
  };

  const publishDraft = async (cafes: string[] | 'all') => {
    const label = cafes === 'all' ? 'все кофейни, которые ЕСТЬ в черновике' : (cafes as string[]).join(', ');
    if (!confirm(
      `ВЫГРУЗИТЬ черновик в основной чек-лист (${label})?\n\nЗаменятся ТОЛЬКО кофейни из черновика. Остальные боевые шаблоны не трогаем.\nБэкап вы уже сделали?`
    )) return;
    if (!confirm('Точно заменить боевую структуру по кофейням черновика?')) return;
    setPublishBusy(true);
    try {
      const res = await fetch('/api/checklists/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish_from_draft', cafes }),
      });
      const json = await res.json();
      if (!json.success) {
        const extra = json.draftCafesSample?.length
          ? ` В черновике сейчас: ${json.draftCafesSample.join(', ')}`
          : '';
        const skip = json.skipped?.length ? ` Не найдены: ${json.skipped.join(', ')}.` : '';
        throw new Error((json.error || 'Ошибка публикации') + skip + extra);
      }
      const sum = (json.results || []).map((r: any) => `${r.cafe}: −${r.deleted}/+${r.inserted}`).join('; ');
      toast.success('Опубликовано: ' + sum, { duration: 6000 });
    } catch (e: any) {
      toast.error(e.message || 'Ошибка публикации');
    } finally {
      setPublishBusy(false);
    }
  };

  const rebuildCafeList = async () => {
    const deleted = new Set(readDeletedCafes());
    let custom: string[] = [];
    try {
      const raw = localStorage.getItem(CUSTOM_CAFES_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr)) custom = arr.map(String);
    } catch {}

    let fromDb: string[] = [];
    try {
      const { data, error } = await supabase.from('checklist_templates_draft').select('cafe');
      if (error) throw error;
      fromDb = [
        ...new Set(
          (data || [])
            .map((r: any) => String(r.cafe || '').trim())
            .filter(Boolean)
        ),
      ];
    } catch (e) {
      console.error('load cafes from db', e);
    }

    const merged = new Set<string>();
    for (const c of DEFAULT_CAFES) {
      if (!deleted.has(c)) merged.add(c);
    }
    for (const c of fromDb) {
      if (!deleted.has(c) && !SERVICE_CAFES.has(c)) merged.add(c);
    }
    for (const c of custom) {
      if (!deleted.has(c) && !SERVICE_CAFES.has(c)) merged.add(c);
    }

    setAllCafes(Array.from(merged).sort((a, b) => a.localeCompare(b, 'ru')));
  };

  useEffect(() => {
    void rebuildCafeList();
  }, []);

  const saveCustomCafes = (customCafes: string[]) => {
    localStorage.setItem(CUSTOM_CAFES_KEY, JSON.stringify(customCafes));
  };

  // Добавление новой кофейни
  const addCafe = () => {
    if (!newCafeName.trim()) {
      toast.error("Введите название кофейни");
      return;
    }
    
    if (allCafes.includes(newCafeName.trim())) {
      toast.error("Такая кофейня уже существует");
      return;
    }
    
    const name = newCafeName.trim();
    unmarkCafeDeleted(name);
    let custom: string[] = [];
    try {
      const raw = localStorage.getItem(CUSTOM_CAFES_KEY);
      custom = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(custom)) custom = [];
    } catch { custom = []; }
    if (!custom.includes(name)) custom.push(name);
    saveCustomCafes(custom);
    void rebuildCafeList();
    toast.success(`Кофейня "${name}" добавлена`);
    setNewCafeName("");
    setCafeModalOpen(false);
  };

  // Редактирование кофейни
  const updateCafe = () => {
    if (!editingCafe || !newCafeName.trim()) {
      toast.error("Введите название кофейни");
      return;
    }
    
    if (DEFAULT_CAFES.includes(editingCafe)) {
      toast.error("Нельзя редактировать стандартные кофейни");
      return;
    }
    
    if (allCafes.includes(newCafeName.trim()) && newCafeName.trim() !== editingCafe) {
      toast.error("Такая кофейня уже существует");
      return;
    }
    
    // Обновляем все чек-листы с этой кофейней
    const updateCafeInDb = async () => {
      try {
        const { error } = await supabase
          .from('checklist_templates_draft')
          .update({ cafe: newCafeName.trim() })
          .eq('cafe', editingCafe);
        
        if (error) throw error;
        
        const customCafes = allCafes.filter(cafe => !DEFAULT_CAFES.includes(cafe));
        const index = customCafes.indexOf(editingCafe);
        if (index !== -1) {
          customCafes[index] = newCafeName.trim();
          saveCustomCafes(customCafes);
        }
        
        toast.success(`Кофейня переименована в "${newCafeName}"`);
        if (selectedCafe === editingCafe) {
          setSelectedCafe(newCafeName.trim());
        }
        setEditingCafe(null);
        setNewCafeName("");
        setCafeModalOpen(false);
      } catch (e) {
        toast.error("Ошибка обновления кофейни в базе данных");
        console.error(e);
      }
    };
    
    updateCafeInDb();
  };

  // Удаление кофейни
  /** Только скрыть в редакторе — пункты в БД и заполнение не трогаем */
  const deleteCafe = () => {
    if (!cafeToDelete) return;

    if (
      !confirm(
        `Скрыть кофейню «${cafeToDelete}» в редакторе?\n\nВ заполнении чек-листов она останется. Шаблоны в базе не удаляются.`
      )
    ) {
      setCafeToDelete(null);
      return;
    }

    markCafeDeleted(cafeToDelete);
    try {
      const customCafes = JSON.parse(localStorage.getItem(CUSTOM_CAFES_KEY) || '[]');
      if (Array.isArray(customCafes)) {
        saveCustomCafes(customCafes.filter((c: string) => c !== cafeToDelete));
      }
    } catch {}
    void rebuildCafeList();
    toast.success(`«${cafeToDelete}» скрыта в редакторе`);
    if (selectedCafe === cafeToDelete) {
      setSelectedCafe('');
      setSelectedRole('');
      setItems([]);
    }
    setCafeToDelete(null);
    setCafeModalOpen(false);
  };

  useEffect(() => {
    const stored = localStorage.getItem("auth");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setAuth(parsed);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (selectedCafe) {
      loadRoles();
    }
  }, [selectedCafe]);

  useEffect(() => {
    if (selectedCafe && selectedRole) {
      loadItems();
    }
  }, [selectedCafe, selectedRole]);


  /** Создать роль без пунктов — маркерный шаблон в черновике */
  const createRole = async () => {
    if (!selectedCafe) {
      toast.error('Сначала выберите или создайте кофейню');
      return;
    }
    const name = prompt('Название новой роли')?.trim();
    if (!name) return;
    if (availableRoles.some(r => r.toLowerCase() === name.toLowerCase())) {
      toast.error('Такая роль уже есть');
      return;
    }
    try {
      const id = crypto.randomUUID();
      await apiTemplatesPost({
        action: 'insert',
        rows: [{
          id,
          item_id: id,
          cafe: selectedCafe,
          role: name,
          shift_type: 'day',
          text: '[Раздел] Общее',
          photo_required: false,
          section: 'Общее',
          days_of_week: [],
          order: 10,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }],
      });
      toast.success(`Роль «${name}» создана`);
      setAvailableRoles(prev => [...prev, name].sort((a, b) => a.localeCompare(b, 'ru')));
      setSelectedRole(name);
    } catch (e: any) {
      toast.error(e.message || 'Не удалось создать роль');
    }
  };

  /** Создать категорию (раздел) в текущей роли */
  const createCategory = async () => {
    if (!selectedCafe || !selectedRole) {
      toast.error('Выберите кофейню и роль');
      return;
    }
    const name = prompt('Название новой категории (раздела)')?.trim();
    if (!name) return;
    const exists = items.some(i => (i.section || 'Без раздела') === name);
    if (exists) {
      toast.error('Такая категория уже есть');
      return;
    }
    try {
      const id = crypto.randomUUID();
      await apiTemplatesPost({
        action: 'insert',
        rows: [{
          id,
          item_id: id,
          cafe: selectedCafe,
          role: selectedRole,
          shift_type: 'day',
          text: `[Раздел] ${name}`,
          photo_required: false,
          section: name,
          days_of_week: [],
          order: (items.length + 1) * 10,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }],
      });
      toast.success(`Категория «${name}» создана`);
      await loadItems();
    } catch (e: any) {
      toast.error(e.message || 'Не удалось создать категорию');
    }
  };

  /** Быстро создать кофейню из строки (без модалки) */
  const createCafeQuick = async () => {
    const name = prompt('Название новой кофейни')?.trim();
    if (!name) return;
    if (allCafes.includes(name)) {
      toast.error('Такая кофейня уже в списке');
      return;
    }
    try {
      const raw = localStorage.getItem(CUSTOM_CAFES_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      const next = Array.isArray(arr) ? [...arr.map(String), name] : [name];
      localStorage.setItem(CUSTOM_CAFES_KEY, JSON.stringify(Array.from(new Set(next))));
      // маркер, чтобы кофейня была в БД черновика
      const id = crypto.randomUUID();
      await apiTemplatesPost({
        action: 'insert',
        rows: [{
          id,
          item_id: id,
          cafe: name,
          role: 'Кассир',
          shift_type: 'day',
          text: '[Раздел] Общее',
          photo_required: false,
          section: 'Общее',
          days_of_week: [],
          order: 10,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }],
      });
      toast.success(`Кофейня «${name}» создана`);
      await rebuildCafeList();
      setSelectedCafe(name);
      setSelectedRole('Кассир');
    } catch (e: any) {
      toast.error(e.message || 'Не удалось создать кофейню');
    }
  };

  const loadRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('checklist_templates_draft')
        .select('role')
        .eq('cafe', selectedCafe)
        ;

      if (error) throw error;
      const roles = [...new Set(data?.map(item => item.role).filter(Boolean))];
      setAvailableRoles(roles.sort());
    } catch (e) {
      console.error('Ошибка загрузки ролей:', e);
    }
  };

  const loadSourceRoles = async (cafe: string, _shift?: ShiftType) => {
    if (!cafe) return [];
    try {
      const { data, error } = await supabase
        .from('checklist_templates_draft')
        .select('role')
        .eq('cafe', cafe);

      if (error) throw error;
      return [...new Set(data?.map(item => item.role).filter(Boolean))];
    } catch (e) {
      console.error('Ошибка загрузки ролей источника:', e);
      return [];
    }
  };

  const loadItems = useCallback(async () => {
    if (!selectedCafe || !selectedRole) return;
    setLoading(true);
    try {
      try {
        const data = await apiTemplatesGet({ cafe: selectedCafe, role: selectedRole });
        setItems(data || []);
      } catch (e) {
        const { data, error } = await supabase
          .from('checklist_templates_draft')
          .select('*')
          .eq('cafe', selectedCafe)
          .eq('role', selectedRole)
          .order('order', { ascending: true });
        if (error) throw error;
        setItems(data || []);
      }
    } catch (e) {
      toast.error("Ошибка загрузки");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedCafe, selectedRole]);

  const loadSourceItems = async () => {
    if (!copySourceCafe || !copySourceRole) return;
    
    try {
      const { data, error } = await supabase
        .from('checklist_templates_draft')
        .select('*')
        .eq('cafe', copySourceCafe)
        .eq('role', copySourceRole)
        
        .order('order', { ascending: true });

      if (error) throw error;
      setCopySourceItems(data || []);
    } catch (e) {
      toast.error("Ошибка загрузки исходных данных");
      console.error(e);
    }
  };

  // Загрузка структуры для копирования
  const loadStructurePreview = async () => {
    if (!structureSourceCafe) return;
    
    try {
      const { data, error } = await supabase
        .from('checklist_templates_draft')
        .select('*')
        .eq('cafe', structureSourceCafe)
        
        .order('role', { ascending: true })
        .order('section', { ascending: true })
        .order('order', { ascending: true });

      if (error) throw error;
      
      // Группируем по ролям
      const rolesMap = new Map();
      data?.forEach(item => {
        if (!rolesMap.has(item.role)) {
          rolesMap.set(item.role, []);
        }
        rolesMap.get(item.role).push(item);
      });
      
      const rolesList = Array.from(rolesMap.keys()).sort();
      setStructureSourceRoles(rolesList);
      
      // Создаем предпросмотр
      let filteredData = data || [];
      if (structureCopyMode === 'selected_roles' && structureSelectedRoles.length > 0) {
        filteredData = filteredData.filter(item => structureSelectedRoles.includes(item.role));
      }
      
      // Группируем по ролям и разделам для предпросмотра
      const previewData: any = {};
      filteredData.forEach(item => {
        if (!previewData[item.role]) {
          previewData[item.role] = {};
        }
        const section = item.section || "Без раздела";
        if (!previewData[item.role][section]) {
          previewData[item.role][section] = [];
        }
        previewData[item.role][section].push(item);
      });
      
      setStructurePreview({
        roles: Object.keys(previewData),
        itemsCount: filteredData.length,
        details: previewData
      });
    } catch (e) {
      toast.error("Ошибка загрузки структуры");
      console.error(e);
    }
  };

  useEffect(() => {
    if (copySourceItems.length > 0 && copyMode === 'all') {
      setCopyPreview(copySourceItems);
    } else if (copySourceItems.length > 0 && copyMode === 'section' && copySourceSection) {
      setCopyPreview(copySourceItems.filter(item => item.section === copySourceSection));
    } else if (copySourceItems.length > 0 && copyMode === 'selected' && copySelectedItems.length > 0) {
      setCopyPreview(copySourceItems.filter(item => copySelectedItems.includes(item.id)));
    } else {
      setCopyPreview([]);
    }
  }, [copySourceItems, copyMode, copySourceSection, copySelectedItems]);

  useEffect(() => {
    if (structureSourceCafe) {
      loadStructurePreview();
    }
  }, [structureSourceCafe, structureCopyMode, structureSelectedRoles]);

  const performCopy = async () => {
    if (!copyTargetCafe || !copyTargetRole) {
      toast.error("Выберите целевую кофейню и роль");
      return;
    }

    if (copyPreview.length === 0) {
      toast.error("Нет пунктов для копирования");
      return;
    }

    setSaving(true);
    let successCount = 0;
    let skipCount = 0;

    try {
      for (const sourceItem of copyPreview) {
        const { data: existing } = await supabase
          .from('checklist_templates_draft')
          .select('id')
          .eq('cafe', copyTargetCafe)
          .eq('role', copyTargetRole)
          .eq('text', sourceItem.text)
          .eq('section', copyTargetSection || sourceItem.section)
          .maybeSingle();

        if (existing) {
          skipCount++;
          continue;
        }

        const newItem = {
          id: crypto.randomUUID(),
          item_id: crypto.randomUUID(),
          cafe: copyTargetCafe,
          role: copyTargetRole,
          shift_type: 'day',
          text: sourceItem.text,
          photo_required: sourceItem.photo_required,
          section: copyTargetSection || sourceItem.section,
          days_of_week: sourceItem.days_of_week || [],
          order: 999,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        await apiTemplatesPost({ action: 'insert', rows: [newItem] });
        successCount++;
      }

      toast.success(`Скопировано: ${successCount} пунктов. Пропущено (уже есть): ${skipCount}`);
      
      if (copyTargetCafe === selectedCafe && copyTargetRole === selectedRole) {
        loadItems();
      }
      
      setCopyModalOpen(false);
      resetCopyState();
    } catch (e) {
      toast.error("Ошибка копирования");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Новая функция для копирования полной структуры
  const performCopyStructure = async () => {
    if (!structureSourceCafe || !structureTargetCafe) {
      toast.error("Выберите кофейню-источник и кофейню-назначение");
      return;
    }

    if (structureSourceCafe === structureTargetCafe) {
      toast.error("Кофейня-источник и кофейня-назначение не могут совпадать (для одной смены)");
      return;
    }

    setSaving(true);
    let totalRoles = 0;
    let totalItems = 0;
    let skipItems = 0;

    try {
      // Загружаем все данные из источника
      let query = supabase
        .from('checklist_templates_draft')
        .select('*')
        .eq('cafe', structureSourceCafe)
        ;
      
      if (structureCopyMode === 'selected_roles' && structureSelectedRoles.length > 0) {
        query = query.in('role', structureSelectedRoles);
      }
      
      const { data: sourceData, error: loadError } = await query;
      
      if (loadError) throw loadError;
      
      if (!sourceData || sourceData.length === 0) {
        toast.error("В источнике нет данных для копирования");
        return;
      }
      
      // Группируем по ролям
      const rolesMap = new Map();
      sourceData.forEach(item => {
        if (!rolesMap.has(item.role)) {
          rolesMap.set(item.role, []);
        }
        rolesMap.get(item.role).push(item);
      });
      
      // Для каждой роли копируем все пункты
      for (const [role, items] of rolesMap.entries()) {
        totalRoles++;
        
        for (const sourceItem of items as ChecklistItem[]) {
          // Проверяем, существует ли уже такой пункт в целевой кофейне
          const { data: existing } = await supabase
            .from('checklist_templates_draft')
            .select('id')
            .eq('cafe', structureTargetCafe)
            .eq('role', role)
            .eq('text', sourceItem.text)
            .eq('section', sourceItem.section || null)
            .maybeSingle();

          if (existing) {
            skipItems++;
            continue;
          }

          const newItem = {
            id: crypto.randomUUID(),
            item_id: crypto.randomUUID(),
            cafe: structureTargetCafe,
            role: role,
            shift_type: 'day',
            text: sourceItem.text,
            photo_required: sourceItem.photo_required,
            section: sourceItem.section,
            days_of_week: sourceItem.days_of_week || [],
            order: sourceItem.order || 999,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          await apiTemplatesPost({ action: 'insert', rows: [newItem] });
          totalItems++;
        }
      }
      
      toast.success(`Скопировано: ${totalRoles} ролей, ${totalItems} пунктов. Пропущено дубликатов: ${skipItems}`);
      
      // Если целевая кофейня выбрана в основном интерфейсе, обновляем данные
      if (structureTargetCafe === selectedCafe) {
        await loadRoles();
        if (selectedRole) {
          await loadItems();
        }
      }
      
      setCopyStructureModalOpen(false);
      resetStructureState();
    } catch (e) {
      toast.error("Ошибка копирования структуры");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const resetCopyState = () => {
    setCopySourceCafe("");
    setCopySourceRole("");
    setCopySourceShift('day');
    setCopySourceSection("");
    setCopySelectedItems([]);
    setCopySourceItems([]);
    setCopyTargetCafe("");
    setCopyTargetRole("");
    setCopyTargetShift('day');
    setCopyTargetSection("");
    setCopyPreview([]);
    setCopyMode('all');
    setSourceRoles([]);
  };

  const resetStructureState = () => {
    setStructureSourceCafe("");
    setStructureSourceShift('day');
    setStructureTargetCafe("");
    setStructureTargetShift('day');
    setStructureCopyMode('all_roles');
    setStructureSelectedRoles([]);
    setStructureSourceRoles([]);
    setStructurePreview(null);
  };

  const toggleSelectItem = (itemId: string) => {
    setCopySelectedItems(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const selectAllItems = () => {
    setCopySelectedItems(copySourceItems.map(item => item.id));
    setCopyPreview(copySourceItems);
  };

  const deselectAllItems = () => {
    setCopySelectedItems([]);
    setCopyPreview([]);
  };

  const openCopyModal = () => {
    resetCopyState();
    setCopyModalOpen(true);
  };

  const openCopyStructureModal = () => {
    resetStructureState();
    setCopyStructureModalOpen(true);
  };

  const openBulkModal = () => {
    setBulkSection("");
    setBulkDaysOfWeek([]);
    setBulkShiftType(null);
    setBulkAction('set');
    setBulkPreview([]);
    setBulkModalOpen(true);
  };

  const applyBulkChanges = async () => {
    if (!bulkSection) {
      toast.error("Выберите раздел");
      return;
    }

    const itemsToUpdate = items.filter(item => item.section === bulkSection);
    
    if (itemsToUpdate.length === 0) {
      toast.error("Нет пунктов в выбранном разделе");
      return;
    }

    setSaving(true);

    try {
      for (const item of itemsToUpdate) {
        let newDays = [...(item.days_of_week || [])];
        let updateData: any = { updated_at: new Date().toISOString() };

        // Обновление дней недели
        switch (bulkAction) {
          case 'set':
            newDays = bulkDaysOfWeek;
            break;
          case 'add':
            newDays = [...new Set([...newDays, ...bulkDaysOfWeek])];
            break;
          case 'remove':
            newDays = newDays.filter(day => !bulkDaysOfWeek.includes(day));
            break;
        }
        updateData.days_of_week = newDays;

        // Обновление типа смены
        if (bulkShiftType) {
          // shift_type removed
        }

        await apiTemplatesPost({ action: 'update', id: item.id, patch: updateData });
      }

      toast.success(`Обновлено ${itemsToUpdate.length} пунктов`);
      setBulkModalOpen(false);
      loadItems();
    } catch (e) {
      toast.error("Ошибка массового обновления");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setNewText("");
    setNewPhotoRequired(false);
    setNewSection("");
    setNewDaysOfWeek([]);
    setNewShiftType(selectedShift);
    setNewDueTime("");
    setModalOpen(true);
  };




  /** Нормализация заголовка колонки */
  const normHeader = (h: string) =>
    String(h || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

  /** Индексы колонок по названию или позиции (0..4) */
  const resolveColumnMap = (headers: string[]) => {
    const h = headers.map(normHeader);
    const find = (...keys: string[]) => {
      for (let i = 0; i < h.length; i++) {
        for (const k of keys) {
          if (h[i] === k || h[i].includes(k)) return i;
        }
      }
      return -1;
    };
    let text = find('пункт', 'название', 'text', 'item', 'задача');
    let section = find('категор', 'раздел', 'section', 'группа');
    let role = find('роль', 'role', 'должность');
    let photo = find('фото', 'photo', 'нужно фото', 'photo_required');
    let cafes = find('кофейн', 'cafe', 'точки', 'магазины', 'локац');

    const looksLikeHeader =
      text >= 0 || section >= 0 || role >= 0 || photo >= 0 || cafes >= 0;
    if (!looksLikeHeader) {
      return { text: 0, section: 1, role: 2, photo: 3, cafes: 4, hasHeader: false };
    }
    if (text < 0) text = 0;
    if (section < 0) section = 1;
    if (role < 0) role = 2;
    if (photo < 0) photo = 3;
    if (cafes < 0) cafes = 4;
    return { text, section, role, photo, cafes, hasHeader: true };
  };

  const cellPhoto = (v: any): boolean => {
    const s = String(v ?? '')
      .trim()
      .toLowerCase();
    return s === 'да' || s === 'yes' || s === 'true' || s === '1' || s === '+' || s === 'y';
  };

  /** Кофейни через запятую / ; / | */
  const parseCafesCell = (v: any): string[] => {
    const s = String(v ?? '').trim();
    if (!s) return [];
    return s
      .split(/[,;|]/)
      .map((x) => x.trim())
      .filter(Boolean);
  };

  const rowsFromMatrix = (
    matrix: any[][]
  ): { text: string; section: string; role: string; photo: boolean; cafes: string[] }[] => {
    if (!matrix.length) return [];
    const first = matrix[0].map((c) => String(c ?? ''));
    const map = resolveColumnMap(first);
    const startRow = map.hasHeader ? 1 : 0;
    const out: { text: string; section: string; role: string; photo: boolean; cafes: string[] }[] = [];
    for (let r = startRow; r < matrix.length; r++) {
      const row = matrix[r] || [];
      const text = String(row[map.text] ?? '').trim();
      const section = String(row[map.section] ?? '').trim() || 'Без раздела';
      const role = String(row[map.role] ?? '').trim();
      if (!text || !role) continue;
      if (text.toLowerCase() === 'пункт' && role.toLowerCase() === 'роль') continue;
      out.push({
        text,
        section,
        role,
        photo: cellPhoto(row[map.photo]),
        cafes: parseCafesCell(row[map.cafes]),
      });
    }
    return out;
  };

  /** Текст (Tab/;/|) — fallback */
  const parsePasteRows = (raw: string) => {
    const lines = raw
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .map((l) => l.trimEnd())
      .filter((l) => l.trim() && !l.trim().startsWith('#'));
    const matrix = lines.map((line) => {
      if (line.includes('\t')) return line.split('\t');
      if (line.includes(';')) return line.split(';');
      if (line.includes('|')) return line.split('|');
      return line.split(/\s{2,}/);
    });
    return rowsFromMatrix(matrix);
  };

  const refreshPastePreview = (raw: string) => {
    setPasteText(raw);
    setPastePreview(parsePasteRows(raw));
  };

  /** Загрузка .xlsx / .xls / .csv */
  const handleExcelFile = async (file: File) => {
    const name = (file.name || '').toLowerCase();
    try {
      if (name.endsWith('.csv') || name.endsWith('.tsv') || name.endsWith('.txt')) {
        const text = await file.text();
        // CSV: простая разбивка с учётом ; или ,
        const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
        const sep = lines[0]?.includes(';') ? ';' : lines[0]?.includes('\t') ? '\t' : ',';
        const matrix = lines.map((line) => {
          // грубый CSV без вложенных кавычек в середине
          if (sep === ',') {
            const cells: string[] = [];
            let cur = '';
            let q = false;
            for (let i = 0; i < line.length; i++) {
              const ch = line[i];
              if (ch === '"') {
                q = !q;
                continue;
              }
              if (ch === ',' && !q) {
                cells.push(cur);
                cur = '';
                continue;
              }
              cur += ch;
            }
            cells.push(cur);
            return cells;
          }
          return line.split(sep);
        });
        const rows = rowsFromMatrix(matrix);
        setPasteText(matrix.map((r) => r.join('\t')).join('\n'));
        setPastePreview(rows);
        toast.success(`Файл: ${rows.length} строк`);
        return;
      }

      // Excel
      let XLSX: any;
      try {
        XLSX = await import('xlsx');
      } catch (e) {
        console.error(e);
        toast.error('Нужна библиотека xlsx: npm i xlsx');
        return;
      }
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) {
        toast.error('В файле нет листов');
        return;
      }
      const sheet = wb.Sheets[sheetName];
      const matrix: any[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
        raw: false,
      });
      const rows = rowsFromMatrix(matrix);
      setPasteText(
        matrix
          .map((r) => (r || []).map((c: any) => String(c ?? '')).join('\t'))
          .join('\n')
      );
      setPastePreview(rows);
      toast.success(`Лист «${sheetName}»: ${rows.length} пунктов`);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Не удалось прочитать файл');
    }
  };

  const runPasteImport = async () => {
    const rows = pastePreview.length ? pastePreview : parsePasteRows(pasteText);
    if (!rows.length) {
      toast.error('Нет распознанных строк. Загрузите Excel или вставьте таблицу.');
      return;
    }
    // раскрываем по кофейням: 5-я колонка или selectedCafe
    type Exp = { text: string; section: string; role: string; photo: boolean; cafe: string };
    const expanded: Exp[] = [];
    const missing: string[] = [];
    for (const r of rows) {
      let cafes = (r.cafes && r.cafes.length) ? r.cafes : (selectedCafe ? [selectedCafe] : []);
      cafes = cafes.map((c) => c.trim()).filter(Boolean);
      if (!cafes.length) {
        missing.push(r.text.slice(0, 40));
        continue;
      }
      for (const cafe of cafes) {
        expanded.push({
          text: r.text,
          section: r.section,
          role: r.role,
          photo: r.photo,
          cafe,
        });
      }
    }
    if (missing.length) {
      toast.error(
        `У ${missing.length} строк нет кофейни. Укажите в 5-й колонке или выберите кофейню сверху / поправьте в превью.`
      );
      return;
    }
    if (!expanded.length) {
      toast.error('Нечего импортировать');
      return;
    }
    const cafeList = Array.from(new Set(expanded.map((e) => e.cafe)));
    if (
      !confirm(
        `Добавить ${expanded.length} записей (строк×кофейни) в черновик?\nКофейни: ${cafeList.join(', ')}`
      )
    )
      return;
    setPasteSaving(true);
    let ok = 0;
    let fail = 0;
    try {
      const orderByKey: Record<string, number> = {};
      const chunk: any[] = [];
      for (const r of expanded) {
        const key = `${r.cafe}||${r.role}||${r.section}`;
        orderByKey[key] = (orderByKey[key] || 0) + 10;
        const id = crypto.randomUUID();
        chunk.push({
          id,
          item_id: id,
          cafe: r.cafe,
          role: r.role,
          shift_type: 'day',
          text: r.text,
          photo_required: r.photo,
          section: r.section === 'Без раздела' ? null : r.section,
          days_of_week: [],
          order: orderByKey[key],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      for (let i = 0; i < chunk.length; i += 40) {
        const part = chunk.slice(i, i + 40);
        try {
          await apiTemplatesPost({ action: 'insert', rows: part });
          ok += part.length;
        } catch (e) {
          console.error(e);
          fail += part.length;
        }
      }
      // новые имена кофеен — в localStorage списка черновика
      try {
        const raw = localStorage.getItem(CUSTOM_CAFES_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        const next = Array.isArray(arr) ? arr.map(String) : [];
        for (const c of cafeList) {
          if (!next.includes(c)) next.push(c);
        }
        localStorage.setItem(CUSTOM_CAFES_KEY, JSON.stringify(next));
      } catch {}
      toast.success(`Импорт: ${ok}${fail ? `, ошибок: ${fail}` : ''}`);
      setPasteImportOpen(false);
      setPasteText('');
      setPastePreview([]);
      await rebuildCafeList();
      await loadRoles();
      if (selectedRole) await loadItems();
      else if (rows[0]?.role) setSelectedRole(rows[0].role);
    } catch (e: any) {
      toast.error(e.message || 'Ошибка импорта');
    } finally {
      setPasteSaving(false);
    }
  };

  const openMultiAdd = async () => {
    setMultiText('');
    setMultiPhoto(false);
    setMultiDays([]);
    setMultiShift(selectedShift || 'day');
    setMultiCafes(selectedCafe ? [selectedCafe] : []);
    setMultiRoles(selectedRole ? [selectedRole] : []);
    setMultiSections([]);
    setMultiSectionInput('');
    setMultiAddOpen(true);
    try {
      const { data } = await supabase
        .from('checklist_templates_draft')
        .select('section, role')
        .limit(5000);
      const secs = new Set<string>();
      const roles = new Set<string>();
      (data || []).forEach((r: any) => {
        if (r.section) secs.add(String(r.section));
        if (r.role) roles.add(String(r.role));
      });
      // текущие разделы выбранной роли
      items.forEach(i => {
        if (i.section) secs.add(i.section);
        if (i.role) roles.add(i.role);
      });
      availableRoles.forEach(r => roles.add(r));
      setKnownSections(Array.from(secs).sort((a, b) => a.localeCompare(b, 'ru')));
      setKnownRolesAll(Array.from(roles).sort((a, b) => a.localeCompare(b, 'ru')));
    } catch (e) {
      console.error(e);
      setKnownSections(
        Object.keys(
          items.reduce((acc: Record<string, boolean>, i) => {
            if (i.section) acc[i.section] = true;
            return acc;
          }, {})
        ).sort((a, b) => a.localeCompare(b, 'ru'))
      );
      setKnownRolesAll([...availableRoles]);
    }
  };

  const toggleMultiList = (
    list: string[],
    setList: (v: string[]) => void,
    value: string
  ) => {
    if (list.includes(value)) setList(list.filter(x => x !== value));
    else setList([...list, value]);
  };

  const saveMultiAdd = async () => {
    if (!multiText.trim()) return toast.error('Введите текст пункта');
    if (multiCafes.length === 0) return toast.error('Выберите хотя бы одну кофейню');
    if (multiRoles.length === 0) return toast.error('Выберите хотя бы одну роль');
    const sections =
      multiSections.length > 0
        ? multiSections
        : multiSectionInput.trim()
          ? [multiSectionInput.trim()]
          : [null as string | null];
    if (sections.length === 1 && sections[0] === null) {
      if (!confirm('Раздел не выбран — пункт будет без раздела на все комбинации. Продолжить?'))
        return;
    }

    const combos: { cafe: string; role: string; section: string | null }[] = [];
    for (const cafe of multiCafes) {
      for (const role of multiRoles) {
        for (const section of sections) {
          combos.push({ cafe, role, section });
        }
      }
    }

    if (
      !confirm(
        `Добавить пункт в ${combos.length} комбинаций (кофейня × роль × раздел)?`
      )
    )
      return;

    setMultiSaving(true);
    let ok = 0;
    let fail = 0;
    try {
      // пачками по 40
      const rows = combos.map((c, idx) => ({
        id: crypto.randomUUID(),
        item_id: crypto.randomUUID(),
        cafe: c.cafe,
        role: c.role,
        text: multiText.trim(),
        photo_required: multiPhoto,
        section: c.section,
        days_of_week: multiDays,
        order: idx + 1,
        shift_type: 'day',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      for (let i = 0; i < rows.length; i += 40) {
        const chunk = rows.slice(i, i + 40);
        try {
          await apiTemplatesPost({ action: 'insert', rows: chunk });
          ok += chunk.length;
        } catch (error) {
          console.error(error);
          fail += chunk.length;
        }
      }
      if (ok) toast.success(`Добавлено: ${ok}${fail ? `, ошибок: ${fail}` : ''}`);
      else toast.error('Не удалось добавить пункты');
      setMultiAddOpen(false);
      if (selectedCafe && selectedRole) loadItems();
    } catch (e) {
      console.error(e);
      toast.error('Ошибка массового добавления');
    } finally {
      setMultiSaving(false);
    }
  };

  const saveItem = async () => {
    if (!newText.trim()) {
      toast.error("Текст обязателен");
      return;
    }

    setSaving(true);
    try {
      if (editingItem?.id) {
        await apiTemplatesPost({
          action: 'update',
          id: editingItem.id,
          patch: {
            text: newText.trim(),
            photo_required: newPhotoRequired,
            section: newSection.trim() || null,
            days_of_week: newDaysOfWeek,
            shift_type: 'day',
            due_time: newDueTime.trim() || null,
            due_time_end: newDueTimeEnd.trim() || null,
            updated_at: new Date().toISOString(),
          },
        });
        toast.success("Пункт обновлён");
      } else {
        const tempId = crypto.randomUUID();
        await apiTemplatesPost({
          action: 'insert',
          rows: [{
            id: tempId,
            item_id: tempId,
            cafe: selectedCafe,
            role: selectedRole,
            shift_type: 'day',
            text: newText.trim(),
            photo_required: newPhotoRequired,
            section: newSection.trim() || null,
            days_of_week: newDaysOfWeek,
            due_time: newDueTime.trim() || null,
            due_time_end: newDueTimeEnd.trim() || null,
            order: items.length + 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }],
        });
        toast.success("Пункт добавлен");
      }

      setModalOpen(false);
      loadItems();
    } catch (e) {
      toast.error("Ошибка сохранения");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };


  /** Массовое удаление из черновика */
  const deleteDraftBulk = async (scope: 'section' | 'role' | 'cafe' | 'all_visible') => {
    if (scope !== 'all_visible' && !selectedCafe) {
      toast.error('Выберите кофейню');
      return;
    }
    if ((scope === 'role' || scope === 'section' || scope === 'all_visible') && !selectedRole) {
      toast.error('Выберите роль');
      return;
    }
    let msg = '';
    let body: any = { action: 'delete', draft: true };
    if (scope === 'section') {
      const section = prompt('Какую категорию (раздел) удалить целиком?', '')?.trim();
      if (!section) return;
      msg = `Удалить категорию «${section}» у роли «${selectedRole}» в «${selectedCafe}»?`;
      body = { ...body, cafe: selectedCafe, role: selectedRole, section: section === 'Без раздела' ? null : section };
    } else if (scope === 'role') {
      msg = `Удалить ВСЮ роль «${selectedRole}» (все категории и пункты) в кофейне «${selectedCafe}»?`;
      body = { ...body, cafe: selectedCafe, role: selectedRole };
    } else if (scope === 'cafe') {
      msg = `Удалить ВЕСЬ черновик кофейни «${selectedCafe}» (все роли и пункты)?`;
      body = { ...body, cafe: selectedCafe };
    } else {
      // all visible items on screen
      if (!items.length) {
        toast.error('Нет пунктов на экране');
        return;
      }
      msg = `Удалить все ${items.length} пунктов текущей роли «${selectedRole}» на экране?`;
      body = { action: 'delete', draft: true, ids: items.map((i) => i.id) };
    }
    if (!confirm(msg + '\n\nЭто только черновик, боевой чек-лист не затронется.')) return;
    if (scope === 'cafe' || scope === 'role') {
      if (!confirm('Точно удалить?')) return;
    }
    try {
      const res = await apiTemplatesPost(body);
      const n = res?.count ?? (body.ids?.length ?? '—');
      toast.success(`Удалено: ${n}`);
      if (scope === 'cafe') {
        setSelectedRole('');
        setItems([]);
        await loadRoles();
        await rebuildCafeList();
      } else if (scope === 'role') {
        setSelectedRole('');
        setItems([]);
        await loadRoles();
      } else {
        await loadItems();
        await loadRoles();
      }
    } catch (e: any) {
      toast.error(e.message || 'Ошибка удаления');
    }
  };

  const deleteSectionInDraft = async (section: string) => {
    if (!selectedCafe || !selectedRole) return;
    const cnt = items.filter((i) => (i.section || 'Без раздела') === section).length;
    if (
      !confirm(
        `Удалить категорию «${section}» и все её пункты (${cnt}) в черновике?\nКофейня: ${selectedCafe}, роль: ${selectedRole}`
      )
    )
      return;
    try {
      const res = await apiTemplatesPost({
        action: 'delete',
        cafe: selectedCafe,
        role: selectedRole,
        section: section === 'Без раздела' ? null : section,
      });
      toast.success(`Удалено: ${res?.count ?? cnt}`);
      await loadItems();
    } catch (e: any) {
      toast.error(e.message || 'Ошибка удаления категории');
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Удалить пункт?")) return;
    try {
      await apiTemplatesPost({ action: 'delete', id });
      toast.success("Пункт удалён");
      loadItems();
    } catch (e) {
      toast.error("Ошибка удаления");
    }
  };

  /** Диапазон времени на всю категорию (всем пунктам раздела) */
  const setSectionDueTime = async (section: string) => {
    if (!selectedCafe || !selectedRole) return;
    const sample = items.find(i => (i.section || 'Без раздела') === section);
    const curStart = sample?.due_time || '';
    const curEnd = sample?.due_time_end || '';
    const def = curStart && curEnd ? `${curStart}-${curEnd}` : curStart || '15:00-16:00';
    const next = prompt(
      `Интервал категории «${section}»\nФормат: ЧЧ:ММ-ЧЧ:ММ (например 15:00-16:00)\nИли одно время ЧЧ:ММ — дедлайн\nПусто — сбросить`,
      def
    );
    if (next === null) return;
    const raw = next.trim();
    let start: string | null = null;
    let end: string | null = null;
    if (raw) {
      const m = raw.match(/^(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})$/);
      if (m) {
        start = m[1];
        end = m[2];
      } else if (/^\d{1,2}:\d{2}$/.test(raw)) {
        start = raw;
        end = raw;
      } else {
        toast.error('Формат: 15:00-16:00 или 18:00');
        return;
      }
    }
    const inSection = items.filter(i => (i.section || 'Без раздела') === section);
    if (!inSection.length) {
      toast.error('В категории нет пунктов');
      return;
    }
    try {
      await apiTemplatesPost({
        action: 'update_many',
        filter: {
          cafe: selectedCafe,
          role: selectedRole,
          section: section === 'Без раздела' ? null : section,
        },
        patch: { due_time: start, due_time_end: end },
      });
      toast.success(
        start
          ? start !== end
            ? `Интервал категории: ${start}–${end}`
            : `Время категории: ${start}`
          : 'Время категории сброшено'
      );
      loadItems();
    } catch (e: any) {
      toast.error(
        e.message ||
          'Не удалось сохранить время (нужны колонки due_time и due_time_end)'
      );
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const formatDaysOfWeek = (days: string[] | undefined) => {
    if (!days || days.length === 0) return 'Ежедневно';
    const dayLabels: Record<string, string> = {
      'Monday': 'Пн', 'Tuesday': 'Вт', 'Wednesday': 'Ср', 'Thursday': 'Чт',
      'Friday': 'Пт', 'Saturday': 'Сб', 'Sunday': 'Вс'
    };
    return days.map(d => dayLabels[d] || d).join(', ');
  };

  const groupedItems = items.reduce((acc: Record<string, ChecklistItem[]>, item) => {
    const section = item.section || "Без раздела";
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {});

  const userRole = (auth?.role || "").toLowerCase().trim();

  const canEditTemplates = (() => {
    const r = String(auth?.role || '').toLowerCase();
    return (
      r.includes('владел') ||
      r === 'owner' ||
      r.includes('менеджер') ||
      r.includes('manager') ||
      r.includes('управляющ')
    );
  })();

  const isAllowed =
    userRole.includes("владел") ||
    userRole === "owner" ||
    userRole.includes("менеджер") ||
    userRole.includes("manager") ||
    userRole.includes("управляющ") ||
    canEditTemplates;

  if (auth && !isAllowed) {
    return (
      <div className="p-8 text-center text-red-600">
        Доступ запрещён. Редактировать чек-листы могут владелец, менеджеры и управляющие.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">

      <div className="mb-4 rounded-2xl border-2 border-violet-300 bg-violet-50 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-bold text-violet-900">Режим черновика</h2>
            <p className="text-xs text-violet-800">
              Правки только в checklist_templates_draft. При выгрузке меняются только кофейни, которые есть в черновике — остальные боевые не трогаем.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/roznica/checklist/fill-draft${selectedCafe ? `?cafe=${encodeURIComponent(selectedCafe)}` : ''}`}
              className="px-3 py-2 rounded-xl bg-white border border-violet-300 text-violet-900 text-sm font-medium"
            >
              👁 Просмотр
            </a>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            disabled={publishBusy}
            onClick={() => copyFromProduction(selectedCafe ? [selectedCafe] : 'all')}
            className="px-3 py-2 rounded-xl bg-white border text-sm disabled:opacity-50"
          >
            ← Из боевого {selectedCafe ? `(${selectedCafe})` : '(все)'}
          </button>
          <button
            type="button"
            disabled={publishBusy}
            onClick={() => copyFromProduction('all')}
            className="px-3 py-2 rounded-xl bg-white border text-sm disabled:opacity-50"
          >
            ← Из боевого (все кофейни)
          </button>
          <span className="text-violet-300">|</span>
          <button
            type="button"
            disabled={publishBusy || !selectedCafe}
            onClick={() => selectedCafe && publishDraft([selectedCafe])}
            className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
          >
            Выгрузить «{selectedCafe || '…'}» в боевой
          </button>
          <button
            type="button"
            disabled={publishBusy}
            onClick={() => publishDraft('all')}
            className="px-3 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-50"
          >
            Выгрузить ВСЕ кофейни черновика
          </button>
        </div>
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center">Черновик чек-листов</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div>
          <label className="block text-sm font-medium mb-1">Кофейня</label>
          <div className="flex gap-2">
            <select
              value={selectedCafe}
              onChange={e => setSelectedCafe(e.target.value)}
              className="flex-1 p-3 border rounded-lg text-base"
            >
              <option value="">— выберите —</option>
              {allCafes.map(cafe => (
                <option key={cafe} value={cafe}>
                  {SERVICE_CAFES.has(cafe) ? `${cafe} (служебная)` : cafe}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void createCafeQuick()}
              className="px-3 py-2 bg-violet-100 border border-violet-300 text-violet-900 rounded-lg hover:bg-violet-200"
              title="Создать кофейню"
            >
              <Plus size={20} />
            </button>
            <button
              onClick={() => {
                setEditingCafe(null);
                setNewCafeName("");
                setCafeModalOpen(true);
              }}
              className="px-3 py-2 bg-gray-100 border rounded-lg hover:bg-gray-200"
              title="Управление кофейнями"
            >
              <Building size={20} />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Роль</label>
          <div className="flex gap-2">
            <select
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
              disabled={!selectedCafe}
              className="flex-1 p-3 border rounded-lg text-base"
            >
              <option value="">— выберите роль —</option>
              {availableRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void createRole()}
              disabled={!selectedCafe}
              className="px-3 py-2 bg-violet-100 border border-violet-300 text-violet-900 rounded-lg hover:bg-violet-200 disabled:opacity-40"
              title="Создать роль"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

      </div>

      {selectedCafe && (
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={openCopyStructureModal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Layers size={20} /> Копировать всю структуру из другой кофейни
          </button>
        </div>
      )}

            {selectedCafe && !selectedRole && (
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setPasteText('');
              setPastePreview([]);
              setPasteImportOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            <ListChecks size={20} /> Вставить таблицу (роли из колонки)
          </button>
        </div>
      )}

      {selectedCafe && selectedRole && (
        <>
          <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
            <div>
              <h2 className="text-xl font-bold">{selectedRole}</h2>
              <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={openCopyModal}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <Copy size={20} /> Копировать пункты из другой роли
              </button>
              <button
                onClick={openBulkModal}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <CheckSquare size={20} /> Массовое редактирование
              </button>
              <button
                type="button"
                onClick={() => void createCategory()}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
              >
                <FolderTree size={20} /> Категория
            </button>
            <button
                onClick={openAddModal}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Plus size={20} /> Добавить пункт
            </button>
            <button
              type="button"
              onClick={() => void openMultiAdd()}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
                <ListChecks size={20} /> Пункт на несколько мест
              </button>
            <button
              type="button"
              onClick={() => {
                setPasteText('');
                setPastePreview([]);
                setPasteImportOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
            >
                <ListChecks size={20} /> Вставить таблицу
              </button>
            <button
              type="button"
              onClick={() => void deleteDraftBulk('section')}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-300 text-red-800 rounded-lg hover:bg-red-100"
              title="Удалить одну категорию"
            >
              <Trash2 size={18} /> Категорию
            </button>
            <button
              type="button"
              onClick={() => void deleteDraftBulk('role')}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 border border-red-400 text-red-900 rounded-lg hover:bg-red-200"
              title="Удалить всю роль"
            >
              <Trash2 size={18} /> Роль
            </button>
            <button
              type="button"
              onClick={() => void deleteDraftBulk('cafe')}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              title="Удалить весь черновик кофейни"
            >
              <Trash2 size={18} /> Всю кофейню
            </button>
            </div>
          </div>

          {loading ? (
            <p className="text-center py-10">Загрузка пунктов...</p>
          ) : (
            <div className="space-y-4">
              {Object.keys(groupedItems).map(section => (
                <div key={section} className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b gap-2">
                    <button onClick={() => toggleSection(section)} className="flex items-center gap-2 min-w-0">
                      {expandedSections[section] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      <h3 className="text-lg font-semibold truncate">{section}</h3>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSectionDueTime(section)}
                        className="px-3 py-1.5 text-sm font-medium rounded-lg border-2 border-amber-400 bg-amber-100 text-amber-900 hover:bg-amber-200"
                        title="Время выполнения всей категории"
                      >
                        ⏰ Время категории
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteSectionInDraft(section)}
                        className="px-3 py-1.5 text-sm font-medium rounded-lg border-2 border-red-300 bg-red-50 text-red-800 hover:bg-red-100"
                        title="Удалить категорию и все пункты"
                      >
                        🗑 Удалить
                      </button>
                      <span className="text-sm text-gray-500">
                        {groupedItems[section].length} {groupedItems[section].length === 1 ? 'пункт' : 'пунктов'}
                      </span>
                    </div>
                  </div>

                  {expandedSections[section] !== false && (
                    <div className="p-4 space-y-3">
                      {groupedItems[section].map(item => (
                        <div key={item.id} className="flex items-center gap-3 p-3 border rounded-xl bg-white hover:bg-gray-50">
                          <div className="flex-1">
                            <p className="font-medium">{item.text}</p>
                            <div className="flex gap-3 text-sm text-gray-600 mt-1 flex-wrap">
                              <span>{item.photo_required ? "📸 Фото требуется" : "📝 Без фото"}</span>
                              {item.due_time && (
                                <span className="text-amber-700">
                                  ⏰{' '}
                                  {item.due_time_end && item.due_time_end !== item.due_time
                                    ? `${item.due_time}–${item.due_time_end}`
                                    : item.due_time}
                                </span>
                              )}
                              <span className="text-blue-600">📅 {formatDaysOfWeek(item.days_of_week)}</span>
                              <span className="text-purple-600">
                                
                              </span>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              setEditingItem(item);
                              setNewText(item.text);
                              setNewPhotoRequired(item.photo_required);
                              setNewDueTime(item.due_time || '');
                              setNewDueTimeEnd(item.due_time_end || '');
                              setNewSection(item.section || "");
                              setNewDaysOfWeek(item.days_of_week || []);
                              setNewShiftType(item.shift_type || 'day');
                              setModalOpen(true);
                            }} 
                            className="p-2 hover:bg-blue-100 rounded-full text-blue-600"
                          >
                            <Edit size={18} />
                          </button>
                          <button onClick={() => deleteItem(item.id)} className="p-2 hover:bg-red-100 rounded-full text-red-600">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {Object.keys(groupedItems).length === 0 && (
                <p className="text-center text-gray-500 py-10">Нет пунктов</p>
              )}
            </div>
          )}
        </>
      )}

      {/* Модалка управления кофейнями */}
      {cafeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Управление кофейнями</h3>
              <button onClick={() => setCafeModalOpen(false)}><X size={24} /></button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCafeName}
                  onChange={(e) => setNewCafeName(e.target.value)}
                  placeholder="Название новой кофейни"
                  className="flex-1 p-3 border rounded-lg"
                />
                <button
                  onClick={editingCafe ? updateCafe : addCafe}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  {editingCafe ? "Сохранить" : "Добавить"}
                </button>
              </div>

              <div className="border-t pt-4">
                <p className="font-medium mb-2">Список кофеен:</p>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {allCafes.map(cafe => (
                    <div key={cafe} className="flex items-center justify-between p-2 border rounded-lg gap-2">
                      <span className="min-w-0 break-words">
                        {cafe}
                        {DEFAULT_CAFES.includes(cafe) && (
                          <span className="text-xs text-gray-400 ml-2">(в списке по умолчанию)</span>
                        )}
                        {SERVICE_CAFES.has(cafe) && (
                          <span className="text-xs text-amber-600 ml-2">(служебная)</span>
                        )}
                      </span>
                      <div className="flex gap-1 shrink-0">
                        {!SERVICE_CAFES.has(cafe) && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCafe(cafe);
                              setNewCafeName(cafe);
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Переименовать"
                          >
                            <Edit size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setCafeToDelete(cafe)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Скрыть в редакторе"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модалка подтверждения удаления кофейни */}
      {cafeToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold mb-4">Подтверждение удаления</h3>
            <p className="mb-4">Скрыть кофейню в редакторе <strong>"{cafeToDelete}"</strong>?</p>
            <p className="text-sm text-red-600 mb-4">Все чек-листы для этой кофейни будут удалены безвозвратно.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setCafeToDelete(null)} className="px-4 py-2 border rounded-lg">Отмена</button>
              <button onClick={deleteCafe} className="px-4 py-2 bg-red-600 text-white rounded-lg">Удалить</button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка добавления/редактирования */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">{editingItem?.id ? "Редактировать пункт" : "Новый пункт"}</h3>
            <div className="space-y-4">
              <textarea
                value={newText}
                onChange={e => setNewText(e.target.value)}
                className="w-full p-3 border rounded-lg"
                rows={3}
                placeholder="Текст пункта"
              />
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={newPhotoRequired} onChange={e => setNewPhotoRequired(e.target.checked)} />
                Требуется фото
              </label>
              <div>
                <label className="block text-sm font-medium mb-1">⏰ Интервал выполнения</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs text-gray-500">С</span>
                    <input
                      type="time"
                      value={newDueTime}
                      onChange={e => setNewDueTime(e.target.value)}
                      className="w-full p-3 border rounded-lg border-amber-300 bg-amber-50"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">До</span>
                    <input
                      type="time"
                      value={newDueTimeEnd}
                      onChange={e => setNewDueTimeEnd(e.target.value)}
                      className="w-full p-3 border rounded-lg border-amber-300 bg-amber-50"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Например 15:00–16:00: задача на главной за 1 час до начала; в интервале — «к выполнению»;
                  после «До» без выполнения — просрочено. Одно время = дедлайн.
                </p>
                {(newDueTime || newDueTimeEnd) ? (
                  <button
                    type="button"
                    className="text-xs text-red-600 mt-1 underline"
                    onClick={() => {
                      setNewDueTime('');
                      setNewDueTimeEnd('');
                    }}
                  >
                    Сбросить время
                  </button>
                ) : null}
              </div>
              <input
                type="text"
                value={newSection}
                onChange={e => setNewSection(e.target.value)}
                className="w-full p-3 border rounded-lg"
                placeholder="Раздел (опционально)"
              />
              <div>
                <label className="block text-sm mb-2">Дни недели (оставьте пустым для ежедневно)</label>
                <div className="grid grid-cols-2 gap-2">
                  {DAYS_OF_WEEK.map(day => (
                    <label key={day.value} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={newDaysOfWeek.includes(day.value)}
                        onChange={(e) => {
                          if (e.target.checked) setNewDaysOfWeek([...newDaysOfWeek, day.value]);
                          else setNewDaysOfWeek(newDaysOfWeek.filter(d => d !== day.value));
                        }}
                      />
                      {day.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setModalOpen(false)} className="px-5 py-2 border rounded-lg">Отмена</button>
                <button onClick={saveItem} className="px-5 py-2 bg-green-600 text-white rounded-lg">Сохранить</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модалка копирования структуры (роли + категории + пункты) */}
      
      
      {/* Импорт таблицы: пункт | категория | роль | фото */}
      {pasteImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold">Импорт пунктов в черновик</h3>
              <button type="button" onClick={() => setPasteImportOpen(false)}><X size={22} /></button>
            </div>
            <p className="mb-2 text-sm text-gray-600">
              Кофейня: <b>{selectedCafe || '— выберите сверху —'}</b>. Вставьте строки из Excel / Google Sheets.
            </p>
            <div className="mb-3 p-3 rounded-xl border-2 border-amber-200 bg-amber-50 space-y-2">
              <label className="block text-sm font-semibold text-amber-900">
                Загрузить Excel / CSV
              </label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                className="block w-full text-sm"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleExcelFile(f);
                  e.target.value = '';
                }}
              />
              <p className="text-xs text-amber-800">
                Колонки: Пункт | Категория | Роль | Фото | Кофейни (через запятую).<br />
                В «Фото» — <b>ДА</b> если нужно фото. В «Кофейни» — например: <b>Тренева, Ашан, Эссе</b>.<br />
                Если 5-я колонка пустая — берётся кофейня, выбранная сверху. После парсинга кофейни можно поправить вручную.
              </p>
              <p className="text-[11px] text-gray-600">
                Нужен пакет: <code className="bg-white px-1 rounded">npm i xlsx</code>
              </p>
            </div>
            <p className="mb-2 text-xs text-gray-500">Или вставьте из буфера (Tab / ; / |):</p>
            <textarea
              value={pasteText}
              onChange={e => refreshPastePreview(e.target.value)}
              className="w-full min-h-[140px] rounded-lg border px-3 py-2 font-mono text-sm"
              placeholder={'Пункт\tКатегория\tРоль\tФото\tКофейни\nПротереть витрину\tОткрытие\tКассир\tДА\tТренева, Ашан'}
            />
            <div className="mt-3">
              <div className="text-sm font-medium mb-1">
                Распознано: {pastePreview.length} строк
              </div>
              {pastePreview.length > 0 && (
                <div className="max-h-56 overflow-auto border rounded-lg text-xs">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left p-2">Пункт</th>
                        <th className="text-left p-2">Категория</th>
                        <th className="text-left p-2">Роль</th>
                        <th className="text-left p-2">Фото</th>
                        <th className="text-left p-2 min-w-[140px]">Кофейни (через запятую)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastePreview.slice(0, 80).map((r, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{r.text}</td>
                          <td className="p-2">{r.section}</td>
                          <td className="p-2">{r.role}</td>
                          <td className="p-2">{r.photo ? 'ДА' : '—'}</td>
                          <td className="p-1">
                            <input
                              className="w-full border rounded px-1.5 py-1 text-xs"
                              value={(r.cafes && r.cafes.length) ? r.cafes.join(', ') : (selectedCafe || '')}
                              placeholder={selectedCafe || 'Тренева, Ашан'}
                              onChange={(e) => {
                                const cafes = e.target.value
                                  .split(/[,;|]/)
                                  .map((x) => x.trim())
                                  .filter(Boolean);
                                setPastePreview((prev) =>
                                  prev.map((row, idx) => (idx === i ? { ...row, cafes } : row))
                                );
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {pastePreview.length > 80 && (
                    <p className="p-2 text-gray-500">… и ещё {pastePreview.length - 80}</p>
                  )}
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPasteImportOpen(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={pasteSaving || pastePreview.length === 0}
                onClick={() => void runPasteImport()}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg disabled:opacity-50"
              >
                {pasteSaving ? 'Импорт…' : `Импортировать (${pastePreview.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {multiAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Один пункт → много мест</h3>
              <button type="button" onClick={() => setMultiAddOpen(false)}><X size={22} /></button>
            </div>
            <p className="mb-3 text-sm text-gray-500">
              Текст один. Выберите кофейни, роли и разделы — пункт создастся во всех комбинациях.
            </p>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Текст пункта</label>
                <textarea
                  value={multiText}
                  onChange={e => setMultiText(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2"
                  rows={3}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={multiPhoto} onChange={e => setMultiPhoto(e.target.checked)} />
                Требуется фото
              </label>
              <div>
                
                
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Дни (пусто = каждый день)</label>
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                  {DAYS_OF_WEEK.map(day => (
                    <label key={day.value} className="flex items-center gap-1.5 text-xs">
                      <input
                        type="checkbox"
                        checked={multiDays.includes(day.value)}
                        onChange={() => toggleMultiList(multiDays, setMultiDays, day.value)}
                      />
                      {day.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-sm font-medium">Кофейни</label>
                  <button
                    type="button"
                    className="text-xs text-blue-600"
                    onClick={() =>
                      setMultiCafes(
                        multiCafes.length === allCafes.length ? [] : [...allCafes]
                      )
                    }
                  >
                    {multiCafes.length === allCafes.length ? 'Снять все' : 'Выбрать все'}
                  </button>
                </div>
                <div className="max-h-36 overflow-y-auto rounded-lg border p-2">
                  <div className="grid grid-cols-2 gap-1">
                    {allCafes.map(c => (
                      <label key={c} className="flex items-center gap-1.5 text-sm">
                        <input
                          type="checkbox"
                          checked={multiCafes.includes(c)}
                          onChange={() => toggleMultiList(multiCafes, setMultiCafes, c)}
                        />
                        {c}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-sm font-medium">Роли</label>
                  <button
                    type="button"
                    className="text-xs text-blue-600"
                    onClick={() => {
                      const all = knownRolesAll.length ? knownRolesAll : availableRoles;
                      setMultiRoles(multiRoles.length === all.length ? [] : [...all]);
                    }}
                  >
                    Все / снять
                  </button>
                </div>
                <div className="max-h-32 overflow-y-auto rounded-lg border p-2">
                  <div className="grid grid-cols-2 gap-1">
                    {(knownRolesAll.length ? knownRolesAll : availableRoles).map(r => (
                      <label key={r} className="flex items-center gap-1.5 text-sm">
                        <input
                          type="checkbox"
                          checked={multiRoles.includes(r)}
                          onChange={() => toggleMultiList(multiRoles, setMultiRoles, r)}
                        />
                        {r}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Разделы</label>
                <input
                  value={multiSectionInput}
                  onChange={e => setMultiSectionInput(e.target.value)}
                  placeholder="Или введите новый раздел и Enter"
                  className="mb-2 w-full rounded-lg border px-3 py-2 text-sm"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const v = multiSectionInput.trim();
                      if (v && !multiSections.includes(v)) {
                        setMultiSections([...multiSections, v]);
                        setMultiSectionInput('');
                      }
                    }
                  }}
                />
                <div className="mb-1 flex flex-wrap gap-1">
                  {multiSections.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setMultiSections(multiSections.filter(x => x !== s))}
                      className="rounded-full bg-teal-100 px-2 py-0.5 text-xs text-teal-900"
                    >
                      {s} ×
                    </button>
                  ))}
                </div>
                <div className="max-h-32 overflow-y-auto rounded-lg border p-2">
                  {knownSections.length === 0 && (
                    <p className="text-xs text-gray-400">Нет известных разделов — введите новый выше</p>
                  )}
                  {knownSections.map(s => (
                    <label key={s} className="flex items-center gap-1.5 py-0.5 text-sm">
                      <input
                        type="checkbox"
                        checked={multiSections.includes(s)}
                        onChange={() => toggleMultiList(multiSections, setMultiSections, s)}
                      />
                      <span className="break-words">{s}</span>
                    </label>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Будет создано примерно:{' '}
                <b>
                  {multiCafes.length *
                    multiRoles.length *
                    Math.max(1, multiSections.length || (multiSectionInput.trim() ? 1 : 1))}
                </b>{' '}
                записей
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMultiAddOpen(false)}
                  className="rounded-lg border px-4 py-2"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  disabled={multiSaving}
                  onClick={() => void saveMultiAdd()}
                  className="rounded-lg bg-teal-600 px-4 py-2 font-medium text-white disabled:opacity-50"
                >
                  {multiSaving ? 'Сохранение…' : 'Добавить везде'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

{copyStructureModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Копирование полной структуры</h3>
              <button onClick={() => setCopyStructureModalOpen(false)}><X size={24} /></button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Кофейня-источник *</label>
                  <select
                    value={structureSourceCafe}
                    onChange={(e) => setStructureSourceCafe(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">— выберите —</option>
                    {allCafes.map(cafe => (
                      <option key={cafe} value={cafe}>{cafe}</option>
                    ))}
                  </select>
                </div>
                <div>
                  
                  
                </div>
                <div>
                  <label className="block text-sm mb-1">Кофейня-назначение *</label>
                  <select
                    value={structureTargetCafe}
                    onChange={(e) => setStructureTargetCafe(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">— выберите —</option>
                    {allCafes.map(cafe => (
                      <option key={cafe} value={cafe}>{cafe}</option>
                    ))}
                  </select>
                </div>
                <div>
                  
                  
                </div>
              </div>

              {structureSourceCafe && (
                <>
                  <div className="border rounded-lg p-4">
                    <p className="font-medium mb-3">Выберите режим копирования:</p>
                    <div className="flex gap-4 mb-4">
                      <label className="flex items-center gap-2">
                        <input 
                          type="radio" 
                          name="structureCopyMode" 
                          value="all_roles" 
                          checked={structureCopyMode === 'all_roles'} 
                          onChange={() => {
                            setStructureCopyMode('all_roles');
                            setStructureSelectedRoles([]);
                          }} 
                        />
                        Все роли ({structureSourceRoles.length})
                      </label>
                      <label className="flex items-center gap-2">
                        <input 
                          type="radio" 
                          name="structureCopyMode" 
                          value="selected_roles" 
                          checked={structureCopyMode === 'selected_roles'} 
                          onChange={() => setStructureCopyMode('selected_roles')} 
                        />
                        Выбранные роли
                      </label>
                    </div>

                    {structureCopyMode === 'selected_roles' && (
                      <div className="mt-3 border rounded-lg p-3 max-h-40 overflow-y-auto">
                        <p className="text-sm font-medium mb-2">Выберите роли для копирования:</p>
                        {structureSourceRoles.map(role => (
                          <label key={role} className="flex items-center gap-2 py-1">
                            <input
                              type="checkbox"
                              checked={structureSelectedRoles.includes(role)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setStructureSelectedRoles([...structureSelectedRoles, role]);
                                } else {
                                  setStructureSelectedRoles(structureSelectedRoles.filter(r => r !== role));
                                }
                              }}
                              className="w-4 h-4"
                            />
                            <span>{role}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {structurePreview && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium text-sm mb-2">
                          📋 Будет скопировано: {structurePreview.roles.length} ролей, {structurePreview.itemsCount} пунктов
                        </p>
                        <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                          {structurePreview.roles.map((role: string) => (
                            <div key={role} className="border-l-2 border-indigo-300 pl-3">
                              <p className="font-medium text-sm text-indigo-700">👤 {role}</p>
                              {structurePreview.details[role] && (
                                <div className="ml-4 mt-1 space-y-1">
                                  {Object.entries(structurePreview.details[role]).map(([section, sectionItems]: [string, any]) => (
                                    <div key={section} className="text-xs">
                                      <span className="text-gray-500">📁 {section}:</span>
                                      <span className="text-gray-600 ml-1">({sectionItems.length} пунктов)</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setCopyStructureModalOpen(false)}
                      className="px-5 py-2 border rounded-lg hover:bg-gray-100"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={performCopyStructure}
                      disabled={!structureSourceCafe || !structureTargetCafe || saving}
                      className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {saving ? "Копирование..." : `Копировать структуру`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модалка копирования пунктов */}
      {copyModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Копирование из другой роли</h3>
              <button onClick={() => setCopyModalOpen(false)}><X size={24} /></button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Кофейня-источник *</label>
                  <select
                    value={copySourceCafe}
                    onChange={async (e) => { 
                      const cafe = e.target.value;
                      setCopySourceCafe(cafe); 
                      setCopySourceRole("");
                      setCopySourceItems([]);
                      setCopyPreview([]);
                      if (cafe) {
                        const roles = await loadSourceRoles(cafe, copySourceShift);
                        setSourceRoles(roles);
                      } else {
                        setSourceRoles([]);
                      }
                    }}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">— выберите —</option>
                    {allCafes.map(cafe => (
                      <option key={cafe} value={cafe}>{cafe}</option>
                    ))}
                  </select>
                </div>
                <div>
                  
                  
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Роль-источник *</label>
                  <select
                    value={copySourceRole}
                    onChange={async (e) => { 
                      const role = e.target.value;
                      setCopySourceRole(role);
                      if (copySourceCafe && role) {
                        await loadSourceItems();
                      }
                    }}
                    disabled={!copySourceCafe}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">— выберите —</option>
                    {sourceRoles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
              </div>

              {copySourceRole && copySourceItems.length > 0 && (
                <>
                  <div className="border rounded-lg p-4">
                    <p className="font-medium mb-3">Выберите режим копирования:</p>
                    <div className="flex gap-4 mb-4">
                      <label className="flex items-center gap-2">
                        <input 
                          type="radio" 
                          name="copyMode" 
                          value="all" 
                          checked={copyMode === 'all'} 
                          onChange={() => {
                            setCopyMode('all');
                            setCopyPreview(copySourceItems);
                          }} 
                        />
                        Все пункты ({copySourceItems.length})
                      </label>
                      <label className="flex items-center gap-2">
                        <input 
                          type="radio" 
                          name="copyMode" 
                          value="section" 
                          checked={copyMode === 'section'} 
                          onChange={() => {
                            setCopyMode('section');
                            setCopyPreview([]);
                            setCopySourceSection("");
                          }} 
                        />
                        По разделу
                      </label>
                      <label className="flex items-center gap-2">
                        <input 
                          type="radio" 
                          name="copyMode" 
                          value="selected" 
                          checked={copyMode === 'selected'} 
                          onChange={() => {
                            setCopyMode('selected');
                            setCopyPreview([]);
                            setCopySelectedItems([]);
                          }} 
                        />
                        Выбранные пункты
                      </label>
                    </div>

                    {copyMode === 'section' && (
                      <div className="mt-3">
                        <label className="block text-sm mb-1">Выберите раздел</label>
                        <select
                          value={copySourceSection}
                          onChange={(e) => {
                            const section = e.target.value;
                            setCopySourceSection(section);
                            const filtered = copySourceItems.filter(item => item.section === section);
                            setCopyPreview(filtered);
                          }}
                          className="w-full p-3 border rounded-lg"
                        >
                          <option value="">— выберите раздел —</option>
                          {[...new Set(copySourceItems.map(i => i.section).filter((s): s is string => s !== null && s !== undefined))].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {copyMode === 'selected' && (
                      <div className="mt-3 border rounded-lg p-3 max-h-60 overflow-y-auto">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-medium">Выберите пункты для копирования:</span>
                          <div className="flex gap-3">
                            <button onClick={selectAllItems} className="text-xs text-blue-600">Выбрать все</button>
                            <button onClick={deselectAllItems} className="text-xs text-gray-500">Снять все</button>
                          </div>
                        </div>
                        {copySourceItems.map(item => (
                          <label key={item.id} className="flex items-center gap-2 py-2 border-b last:border-0">
                            <input
                              type="checkbox"
                              checked={copySelectedItems.includes(item.id)}
                              onChange={(e) => toggleSelectItem(item.id)}
                              className="w-4 h-4"
                            />
                            <div className="flex-1">
                              <div className="text-sm">{item.text}</div>
                              <div className="text-xs text-gray-500">{item.section || "Без раздела"}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}

                    {copyPreview.length > 0 && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium text-sm mb-2">📋 Будет скопировано: {copyPreview.length} пунктов</p>
                        <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                          {copyPreview.slice(0, 10).map(item => (
                            <li key={item.id} className="flex justify-between">
                              <span className="truncate max-w-[250px]">{item.text}</span>
                              <span className="text-gray-400 ml-2">{item.section || "Без раздела"}</span>
                            </li>
                          ))}
                          {copyPreview.length > 10 && (
                            <li className="text-gray-400">... и ещё {copyPreview.length - 10}</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <p className="font-medium mb-3">Куда копировать:</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm mb-1">Целевая кофейня *</label>
                        <select
                          value={copyTargetCafe}
                          onChange={(e) => setCopyTargetCafe(e.target.value)}
                          className="w-full p-3 border rounded-lg"
                        >
                          <option value="">— выберите —</option>
                          {allCafes.map(cafe => (
                            <option key={cafe} value={cafe}>{cafe}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm mb-1">Целевая смена *</label>
                        
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <label className="block text-sm mb-1">Целевая роль *</label>
                        <input
                          type="text"
                          value={copyTargetRole}
                          onChange={(e) => setCopyTargetRole(e.target.value)}
                          className="w-full p-3 border rounded-lg"
                          placeholder="Введите название роли"
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-1">Целевой раздел (опционально)</label>
                        <input
                          type="text"
                          value={copyTargetSection}
                          onChange={(e) => setCopyTargetSection(e.target.value)}
                          className="w-full p-3 border rounded-lg"
                          placeholder="Оставьте пустым для сохранения исходного раздела"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-4">
                    <button
                      onClick={() => setCopyModalOpen(false)}
                      className="px-5 py-2 border rounded-lg hover:bg-gray-100"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={performCopy}
                      disabled={!copyTargetCafe || !copyTargetRole || copyPreview.length === 0 || saving}
                      className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {saving ? "Копирование..." : `Копировать (${copyPreview.length})`}
                    </button>
                  </div>
                </>
              )}

              {copySourceRole && copySourceItems.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>В выбранной роли нет пунктов для копирования</p>
                </div>
              )}

              {!copySourceRole && copySourceCafe && (
                <div className="text-center py-8 text-gray-500">
                  <p>Выберите роль-источник для копирования</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модалка массового редактирования */}
      {bulkModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Массовое редактирование</h3>
              <button onClick={() => setBulkModalOpen(false)}><X size={24} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Выберите раздел</label>
                <select
                  value={bulkSection}
                  onChange={(e) => setBulkSection(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                >
                  <option value="">— выберите раздел —</option>
                  {[...new Set(items.map(item => item.section).filter((s): s is string => s !== null && s !== undefined))].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {bulkSection && (
                <>
                  <div>
                    <label className="block text-sm mb-1">Действие с днями недели</label>
                    <select
                      value={bulkAction}
                      onChange={(e) => setBulkAction(e.target.value as 'set' | 'add' | 'remove')}
                      className="w-full p-3 border rounded-lg"
                    >
                      <option value="set">Установить дни (заменить)</option>
                      <option value="add">Добавить дни</option>
                      <option value="remove">Убрать дни</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm mb-2">Выберите дни</label>
                    <div className="grid grid-cols-2 gap-2">
                      {DAYS_OF_WEEK.map(day => (
                        <label key={day.value} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={bulkDaysOfWeek.includes(day.value)}
                            onChange={(e) => {
                              if (e.target.checked) setBulkDaysOfWeek([...bulkDaysOfWeek, day.value]);
                              else setBulkDaysOfWeek(bulkDaysOfWeek.filter(d => d !== day.value));
                            }}
                          />
                          {day.label}
                        </label>
                      ))}
                    </div>
                  </div>


                  <button
                    onClick={() => {
                      const filtered = items.filter(item => item.section === bulkSection);
                      setBulkPreview(filtered);
                    }}
                    className="w-full py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Предпросмотр ({items.filter(i => i.section === bulkSection).length} пунктов)
                  </button>

                  {bulkPreview.length > 0 && (
                    <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                      <p className="text-sm font-medium mb-2">Будут изменены:</p>
                      <ul className="text-xs space-y-1">
                        {bulkPreview.map(item => (
                          <li key={item.id} className="truncate">{item.text}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex justify-end gap-3">
                    <button onClick={() => setBulkModalOpen(false)} className="px-5 py-2 border rounded-lg">Отмена</button>
                    <button
                      onClick={applyBulkChanges}
                      disabled={!bulkDaysOfWeek.length || saving}
                      className="px-5 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                    >
                      {saving ? "Сохранение..." : "Применить"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}