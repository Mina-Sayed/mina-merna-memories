import { db, error, json, router, secrets } from '@appdeploy/sdk';

type MemoryRecord = {
  title: string;
  message: string;
  date?: string;
  imageDataUrl?: string;
  createdAt: number;
};

const TABLE = 'shared_memories';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
};

function cleanText(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function parsePayload(body: unknown, eventBody?: unknown) {
  const value = body ?? eventBody;
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return {};
}

function withCors(response: ReturnType<typeof json>) {
  return {
    ...response,
    headers: {
      ...response.headers,
      ...CORS_HEADERS,
    },
  };
}

function ok(data: unknown, status = 200) {
  return withCors(json(data, status));
}

function fail(message: string, status: number) {
  return withCors(error(message, status));
}

async function adminStatus(adminPin: unknown) {
  const pin = cleanText(adminPin, 120);
  if (!pin) return { ok: false as const, configured: true };

  try {
    const names = await secrets.listSecretNames();
    if (!names.includes('ADMIN_PIN')) {
      return { ok: false as const, configured: false };
    }
    const expected = await secrets.readSecret('ADMIN_PIN');
    return { ok: pin === expected, configured: true };
  } catch {
    return { ok: false as const, configured: false };
  }
}

export const handler = router({
  'OPTIONS /api/memories': [async () => ok({ ok: true })],
  'OPTIONS /api/memories/:id': [async () => ok({ ok: true })],
  'OPTIONS /api/admin/verify': [async () => ok({ ok: true })],

  'GET /api/memories': [
    async () => {
      const { items } = await db.list<MemoryRecord>(TABLE, { limit: 50 });
      const memories = items
        .map(item => ({
          id: item.id,
          title: item.title,
          message: item.message,
          date: item.date,
          imageDataUrl: item.imageDataUrl,
          createdAt: item.createdAt,
        }))
        .sort((a, b) => a.createdAt - b.createdAt);
      return ok({ memories });
    },
  ],

  'POST /api/admin/verify': [
    async ({ body, event }) => {
      const payload = parsePayload(body, event?.body);
      const status = await adminStatus(payload.adminPin);
      if (!status.configured) {
        return fail('وضع الإدارة لسه محتاج PIN يتحدد من صاحب اللعبة.', 503);
      }
      if (!status.ok) return fail('الـPIN غير صحيح.', 401);
      return ok({ authenticated: true });
    },
  ],

  'POST /api/memories': [
    async ({ body, event }) => {
      const payload = parsePayload(body, event?.body);
      const status = await adminStatus(payload.adminPin);
      if (!status.configured) {
        return fail('وضع الإدارة لسه مش متجهز.', 503);
      }
      if (!status.ok) return fail('غير مسموح بإضافة ذكريات.', 401);

      const title = cleanText(payload.title, 80);
      const message = cleanText(payload.message, 700);
      const date = cleanText(payload.date, 30);
      const imageDataUrl = cleanText(payload.imageDataUrl, 190000);

      if (!title || !message) {
        return fail('العنوان وكلام الذكرى مطلوبين.', 400);
      }
      if (
        typeof payload.imageDataUrl === 'string' &&
        payload.imageDataUrl.length > 190000
      ) {
        return fail('الصورة كبيرة جداً بعد الضغط. جرّب صورة أصغر.', 413);
      }
      if (
        imageDataUrl &&
        !imageDataUrl.startsWith('data:image/jpeg;base64,')
      ) {
        return fail('صيغة الصورة غير مدعومة.', 400);
      }

      const record: MemoryRecord = {
        title,
        message,
        ...(date ? { date } : {}),
        ...(imageDataUrl ? { imageDataUrl } : {}),
        createdAt: Date.now(),
      };
      const [id] = await db.add(TABLE, [record]);
      if (!id) return fail('مقدرناش نحفظ الذكرى دلوقتي.', 500);
      return ok({ memory: { id, ...record } }, 201);
    },
  ],

  'POST /api/memories/:id/delete': [
    async ({ params, body, event }) => {
      const payload = parsePayload(body, event?.body);
      const status = await adminStatus(payload.adminPin);
      if (!status.configured) {
        return fail('وضع الإدارة لسه مش متجهز.', 503);
      }
      if (!status.ok) return fail('غير مسموح بحذف ذكريات.', 401);

      const id = params.id?.trim();
      if (!id) return fail('معرف الذكرى غير صالح.', 400);

      const [existing] = await db.get<MemoryRecord>(TABLE, [id]);
      if (!existing) return fail('الذكرى دي مش موجودة.', 404);

      const [deleted] = await db.delete(TABLE, [id]);
      if (!deleted) return fail('مقدرناش نمسح الذكرى دلوقتي.', 500);

      return ok({ deleted: true, id });
    },
  ],
});