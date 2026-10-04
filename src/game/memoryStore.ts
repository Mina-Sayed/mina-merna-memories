export type SharedMemory = {
  id: string;
  title: string;
  message: string;
  date?: string;
  imageDataUrl?: string;
  createdAt: number;
};

type MemoriesResponse = { memories: SharedMemory[] };
type CreateMemoryResponse = { memory: SharedMemory };

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
  '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);

  const data = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!response.ok) {
    const message =
      typeof data.message === 'string'
        ? data.message
        : typeof data.error === 'string'
          ? data.error
          : 'حصلت مشكلة في الاتصال.';
    throw new Error(message);
  }

  return data as T;
}

export async function listSharedMemories() {
  const data = await request<unknown>('/api/memories');
  if (
    data &&
    typeof data === 'object' &&
    'memories' in data &&
    Array.isArray((data as MemoriesResponse).memories)
  ) {
    return (data as MemoriesResponse).memories;
  }

  if (
    data &&
    typeof data === 'object' &&
    'data' in data &&
    (data as { data?: unknown }).data &&
    typeof (data as { data?: unknown }).data === 'object'
  ) {
    const nested = (data as { data: MemoriesResponse }).data;
    if (Array.isArray(nested.memories)) return nested.memories;
  }

  throw new Error('رد الذكريات من السيرفر غير متوقع.');
}

export async function verifyAdminPin(adminPin: string) {
  await request<{ authenticated: boolean }>('/api/admin/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ adminPin }),
  });
}

export async function deleteSharedMemory(id: string, adminPin: string) {
  await request<{ deleted: boolean }>(
    `/api/memories/${encodeURIComponent(id)}/delete`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ adminPin }),
    }
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذر قراءة الصورة.'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('تعذر تجهيز الصورة.'));
    image.src = src;
  });
}

export async function compressMemoryImage(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('اختار صورة من فضلك.');
  if (file.size > 12 * 1024 * 1024) {
    throw new Error('الصورة الأصلية أكبر من 12 ميجا.');
  }

  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  let maxSide = 1100;
  let quality = 0.72;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const scale = Math.min(
      1,
      maxSide / Math.max(image.naturalWidth, image.naturalHeight)
    );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('المتصفح مش قادر يجهز الصورة.');
    context.drawImage(image, 0, 0, width, height);
    const result = canvas.toDataURL('image/jpeg', quality);
    if (result.length <= 180000) return result;
    maxSide = Math.round(maxSide * 0.78);
    quality = Math.max(0.45, quality - 0.08);
  }

  throw new Error('الصورة لسه كبيرة. جرّب صورة أصغر أو أبسط.');
}

export async function createSharedMemory(
  input: {
    title: string;
    message: string;
    date?: string;
    imageDataUrl?: string;
  },
  adminPin: string
) {
  const data = await request<CreateMemoryResponse>('/api/memories', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ ...input, adminPin }),
  });
  return data.memory;
}