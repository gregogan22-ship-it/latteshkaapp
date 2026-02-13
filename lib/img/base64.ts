// lib/img/base64.ts
export async function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

/**
 * Уменьшаем изображение до разумных размеров (по умолчанию 1600px по длинной стороне)
 * и конвертим в JPEG ~85% — этого хватает для отчёта и экономит квоты/время.
 */
export async function downscaleImageToBase64(
  file: File,
  maxSize = 1600,
  mime = "image/jpeg",
  quality = 0.85
): Promise<string> {
  // Попытка прочитать как ImageBitmap (быстро), с фолбэком на Image
  const createBitmap = async () => {
    try {
      // @ts-ignore
      if (window.createImageBitmap) return await createImageBitmap(file);
    } catch {}
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = rej;
        im.src = url;
      });
      // @ts-ignore
      return await (window.createImageBitmap ? createImageBitmap(img) : img);
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const bmp: any = await createBitmap();
  const w: number = bmp.width;
  const h: number = bmp.height;

  const scale = Math.min(1, maxSize / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, tw, th);

  const dataURL = canvas.toDataURL(mime, quality);
  return dataURL; // "data:image/jpeg;base64,...."
}
