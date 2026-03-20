import Dexie from "dexie";

const db = new Dexie("pinata-pdfs");
db.version(1).stores({ pdfs: "lessonId" });

export async function cachePdf(lessonId, blob) {
  await db.pdfs.put({ lessonId, blob, cachedAt: Date.now() });
}

export async function getCachedPdf(lessonId) {
  const entry = await db.pdfs.get(lessonId);
  return entry?.blob ?? null;
}

export async function removeCachedPdf(lessonId) {
  await db.pdfs.delete(lessonId);
}

export async function isCached(lessonId) {
  return (await db.pdfs.get(lessonId)) != null;
}
