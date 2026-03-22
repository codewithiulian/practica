import Dexie from "dexie";

const db = new Dexie("pinata-pdfs");
db.version(1).stores({ pdfs: "lessonId" });
db.version(2)
  .stores({ pdfs: "lessonId", pdfMeta: "lessonId" })
  .upgrade(async (tx) => {
    // Populate pdfMeta from existing pdfs entries (one-time migration)
    const metas = [];
    await tx.table("pdfs").each((pdf) => {
      metas.push({ lessonId: pdf.lessonId, cachedAt: pdf.cachedAt || Date.now() });
    });
    if (metas.length) await tx.table("pdfMeta").bulkAdd(metas);
  });

export async function cachePdf(lessonId, blob) {
  const cachedAt = Date.now();
  await db.pdfs.put({ lessonId, blob, cachedAt });
  await db.pdfMeta.put({ lessonId, cachedAt });
}

export async function getCachedPdf(lessonId) {
  const entry = await db.pdfs.get(lessonId);
  return entry?.blob ?? null;
}

export async function removeCachedPdf(lessonId) {
  await db.pdfs.delete(lessonId);
  await db.pdfMeta.delete(lessonId);
}

export async function isCached(lessonId) {
  return (await db.pdfs.get(lessonId)) != null;
}

/** Returns Map<lessonId, cachedAt> — lightweight, no blob data loaded */
export async function getAllPdfMeta() {
  const entries = await db.pdfMeta.toArray();
  return new Map(entries.map((e) => [e.lessonId, e.cachedAt]));
}
