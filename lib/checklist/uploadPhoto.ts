// lib/checklist/uploadPhoto.ts
export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("FileReader error"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

export async function uploadPhotoToDrive(file: File): Promise<{
  ok: boolean;
  viewUrl?: string;   // это и есть ваш пригодный для записи photoUrl
  downloadUrl?: string;
  id?: string;
  fileName?: string;
  mime?: string;
  error?: string;
}> {
  const base64 = await fileToDataUrl(file);
  const res = await fetch("/api/checklist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "upload",
      base64,
      fileName: file.name,
      mime: file.type || "image/jpeg",
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || `HTTP ${res.status}`);
  }
  // Apps Script возвращает { ok:true, id, viewUrl, downloadUrl, fileName, mime }
  return json;
}
