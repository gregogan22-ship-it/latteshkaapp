"use client";

import { useState } from "react";
import {
  ChevronLeft,
  Coffee,
  Utensils,
  Calculator,
  Sparkles,
  BookOpen,
  FileText,
  Video,
  Presentation,
  Table,
  Download,
  ExternalLink,
  Smartphone,
  Apple,
} from "lucide-react";

// Отдельные файлы вне папок (7 штук)
const TOP_FILES = [
  { name: "Внешний вид сотрудника", type: "pdf", size: "1.2 МБ", url: "https://disk.yandex.ru/i/hxpP2TJRTfurzw" },
  { name: "Задачи Администратора", type: "pdf", size: "1.5 МБ", url: "https://disk.yandex.ru/i/1UaPf4aUV8BiOQ" },
  { name: "Задачи Бармена", type: "pdf", size: "1.8 МБ", url: "https://disk.yandex.ru/i/lGfRHSdO8aMPxg" },
  { name: "Задачи Кассира", type: "pdf", size: "1.3 МБ", url: "https://disk.yandex.ru/i/SHZCTxY9E7O78w" },
  { name: "План обучения стажера", type: "pdf", size: "2.1 МБ", url: "https://disk.yandex.ru/i/w5WJCLG2GYrhlQ" },
  { name: "Рабочие группы", type: "pdf", size: "1.7 МБ", url: "https://disk.yandex.ru/i/IJr7WO7lot2fTA" },
  { name: "Рабочие группы для накладных", type: "pdf", size: "1.4 МБ", url: "https://disk.yandex.ru/i/62_DXzn7rDK07Q" },
];

// 4 основные папки с иконками
const SECTIONS = [
  {
    title: "Бар",
    icon: <Coffee className="w-20 h-20 text-amber-600" />,
    items: [
      { name: "Бар Раскладки", type: "pptx", size: "2.4 МБ", url: "https://disk.yandex.ru/i/J-u1aZFx8HbZpg" },
      { name: "Взбивание пены на мыле", type: "mov", size: "45 МБ", url: "https://disk.yandex.ru/i/2zwfqP2TBv5tUA" },
      { name: "Крашер забился, решение проблемы", type: "mp4", size: "45 МБ", url: "https://disk.yandex.ru/i/a0A_gX-cSglw9w" },
      { name: "Настройка помола", type: "mp4", size: "45 МБ", url: "https://disk.yandex.ru/i/L6fkikR_oXebjQ" },
      { name: "Обучение Латте Арту", type: "mp4", size: "45 МБ", url: "https://disk.yandex.ru/i/eSJCaUYhs3VkdQ" },
      { name: "Правильное приготовление Айс Раф", type: "mp4", size: "45 МБ", url: "https://disk.yandex.ru/i/JDq3yCfoRTEwSQ" },
      { name: "Правильное приготовление какао", type: "mp4", size: "45 МБ", url: "https://disk.yandex.ru/i/rajkOjN0fNSkvw" },
      { name: "Правильно приготовление Лимонад тропический микс", type: "mp4", size: "45 МБ", url: "https://disk.yandex.ru/i/S_Gcxv2xSjDtTg" },
      { name: "Спич про наш кофе", type: "jpg", size: "45 МБ", url: "https://disk.yandex.ru/i/S40iSnTZLqgl_Q" },
    ]
  },
  {
    title: "Блюда",
    icon: <Utensils className="w-20 h-20 text-amber-600" />,
    items: [
      { name: "Как правильно заливать хот-дог соусами", type: "mp4", size: "180 КБ", url: "https://disk.yandex.ru/i/VHoXyCy3AmC3lg" },
      { name: "Подача Цезарь ролла и хот-дога", type: "docx", size: "180 КБ", url: "https://disk.yandex.ru/i/EdUb20nmxLAh8A" },
      { name: "Правильный разогрев чизбургера", type: "mp4", size: "180 КБ", url: "https://disk.yandex.ru/i/8mOyCk8E49Lhdg" },
      { name: "Раскладка витрины", type: "xlsx", size: "180 КБ", url: "https://disk.yandex.ru/i/c0HTOYlfhOtkug" },
      { name: "Состав блюд, разогрев, выдача", type: "xlsx", size: "180 КБ", url: "https://disk.yandex.ru/i/oYRL_GD0ftWwSg" },
      { name: "Точное время установки на микроволновке", type: "mp4", size: "180 КБ", url: "https://disk.yandex.ru/i/wrRUnBCHLlqytA" },
    ]
  },
  {
    title: "Кассир",
    icon: <Calculator className="w-20 h-20 text-amber-600" />,
    items: [
      { name: "Закрытие кассы", type: "mp4", size: "120 КБ", url: "https://disk.yandex.ru/i/mZCAbjjQMVlEVw" },
      { name: "Как пробивать раф", type: "mp4", size: "120 КБ", url: "https://disk.yandex.ru/i/PZFnr2Na1OwB7Q" },
      { name: "Регламент поведения кассиров в негативных ситуациях с гостями", type: "xlsx", size: "120 КБ", url: "https://disk.yandex.ru/i/O4bI39tSIEaEIQ" },
    ]
  },
  {
    title: "Чистота и порядок",
    icon: <Sparkles className="w-20 h-20 text-amber-600" />,
    items: [
      { name: "Обучение уборке столов", type: "mp4", size: "1.8 МБ", url: "https://disk.yandex.ru/i/CUXUpoND4ssplQ" },
      { name: "Пылесос и его использование", type: "mov", size: "1.8 МБ", url: "https://disk.yandex.ru/i/_GwSajxrS01k7A" },
    ]
  },
];

export default function TrainingPage() {
  const [currentSection, setCurrentSection] = useState<string | null>(null);

  const goBack = () => setCurrentSection(null);

  const getFileIcon = (type: string) => {
    if (type === "pdf") return <FileText className="w-16 h-16 text-red-600" />;
    if (type === "video" || type === "mp4" || type === "mov") return <Video className="w-16 h-16 text-blue-600" />;
    if (type === "pptx" || type === "ppt") return <Presentation className="w-16 h-16 text-orange-600" />;
    if (type === "xlsx" || type === "xls") return <Table className="w-16 h-16 text-green-600" />;
    if (type === "docx" || type === "doc") return <FileText className="w-16 h-16 text-blue-600" />;
    return <FileText className="w-16 h-16 text-gray-600" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center gap-4 mb-8">
          {currentSection && (
            <button onClick={goBack} className="flex items-center gap-2 text-amber-700 hover:underline text-lg">
              <ChevronLeft className="w-6 h-6" /> Назад
            </button>
          )}
          <h1 className="text-4xl font-bold text-amber-700">
            Учебный материал {currentSection && `· ${currentSection}`}
          </h1>
        </div>

        {/* БЛОК С РЕКОМЕНДАЦИЕЙ УСТАНОВИТЬ ПРИЛОЖЕНИЕ ЯНДЕКС.ДИСК */}
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-2xl p-6 mb-10 border border-amber-200 shadow-sm">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-xl font-semibold text-amber-800 mb-2">
                Для корректного отображения материалов
              </h3>
              <p className="text-gray-700">
                Рекомендуем открыть эту страницу в официальном приложении Яндекс.Диск
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              {/* Android */}
              <a
                href="https://play.google.com/store/apps/details?id=ru.yandex.disk&pcampaignid=web_share"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-white px-6 py-3 rounded-xl shadow hover:shadow-md transition hover:-translate-y-0.5 border border-gray-200 min-w-[160px]"
              >
                <Smartphone className="w-8 h-8 text-green-600" />
                <div>
                  <div className="text-xs text-gray-500">Скачать на</div>
                  <div className="font-semibold text-gray-800">Android</div>
                </div>
              </a>

              {/* iOS */}
              <a
                href="https://apps.apple.com/ru/app/яндекс-диск-хранилище-фото/id553266487"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-white px-6 py-3 rounded-xl shadow hover:shadow-md transition hover:-translate-y-0.5 border border-gray-200 min-w-[160px]"
              >
                <Apple className="w-8 h-8 text-gray-900" />
                <div>
                  <div className="text-xs text-gray-500">Скачать на</div>
                  <div className="font-semibold text-gray-800">iPhone / iPad</div>
                </div>
              </a>
            </div>
          </div>
        </div>

        {!currentSection ? (
          <>
            {/* Отдельные файлы вне папок — вверху страницы */}
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Важные материалы</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
              {TOP_FILES.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center p-6 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition cursor-pointer border hover:border-amber-500"
                  onClick={() => window.open(item.url, "_blank")}
                >
                  <div className="w-20 h-20 mb-4 flex items-center justify-center">
                    {getFileIcon(item.type)}
                  </div>
                  <p className="text-center text-lg font-medium text-gray-800 line-clamp-2">
                    {item.name}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{item.size}</p>
                  <div className="mt-4 flex gap-3">
                    <button
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(item.url, "_blank");
                      }}
                    >
                      <ExternalLink className="w-4 h-4" /> Открыть
                    </button>
                    <button
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(item.url, "_blank");
                      }}
                    >
                      <Download className="w-4 h-4" /> Скачать
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 4 плитки-папки */}
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Папки</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {SECTIONS.map((section, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition cursor-pointer border hover:border-amber-500"
                  onClick={() => setCurrentSection(section.title)}
                >
                  {section.icon || <Folder className="w-20 h-20 text-amber-600 mb-4" />}
                  <p className="text-center text-xl font-medium text-gray-800">
                    {section.title}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          // Содержимое выбранной папки
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {SECTIONS.find(s => s.title === currentSection)?.items.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center p-6 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition cursor-pointer border hover:border-amber-500"
                onClick={() => window.open(item.url, "_blank")}
              >
                <div className="w-20 h-20 mb-4 flex items-center justify-center">
                  {getFileIcon(item.type)}
                </div>
                <p className="text-center text-lg font-medium text-gray-800 line-clamp-2">
                  {item.name}
                </p>
                <p className="text-sm text-gray-500 mt-1">{item.size}</p>
                <div className="mt-4 flex gap-3">
                  <button
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(item.url, "_blank");
                    }}
                  >
                    <ExternalLink className="w-4 h-4" /> Открыть
                  </button>
                  <button
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(item.url, "_blank");
                    }}
                  >
                    <Download className="w-4 h-4" /> Скачать
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}