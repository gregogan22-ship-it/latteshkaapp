"use client";

import { useState } from "react";
import { downscaleImageToBase64 } from "@/lib/img/base64";

type Props = {
  onPicked: (base64: string | null) => void;
  disabled?: boolean;
};

export default function PhotoField({ onPicked, disabled }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) { setPreview(null); onPicked(null); return; }
    if (!f.type.startsWith("image/")) {
      alert("Выберите изображение");
      return;
    }
    setBusy(true);
    try {
      const base64 = await downscaleImageToBase64(f, 1600, "image/jpeg", 0.85);
      setPreview(base64);
      onPicked(base64);
    } catch (err: any) {
      console.error("photo convert error:", err);
      alert("Не удалось обработать фото");
      setPreview(null);
      onPicked(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-start gap-3">
      <label className={`inline-flex items-center gap-2 ${disabled ? "opacity-60" : ""}`}>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onChange}
          disabled={disabled || busy}
          className="hidden"
        />
        <span className="px-3 py-1 rounded border bg-white hover:bg-gray-50 cursor-pointer select-none">
          {busy ? "Обработка…" : "Выбрать фото"}
        </span>
      </label>
      {preview && (
        <img
          src={preview}
          alt="превью"
          className="w-20 h-20 object-cover rounded border"
        />
      )}
      {preview && !disabled && (
        <button
          type="button"
          className="text-xs text-gray-500 underline"
          onClick={() => { setPreview(null); onPicked(null); }}
        >
          Удалить фото
        </button>
      )}
    </div>
  );
}
