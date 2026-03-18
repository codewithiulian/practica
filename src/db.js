const DB_NAME = "spanish-quiz";
const DB_VERSION = 2;
const STORE = "attempts";
const QUIZ_STORE = "quizzes";

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        store.createIndex("timestamp", "timestamp");
        store.createIndex("quizKey", "quizKey");
      }
      if (!db.objectStoreNames.contains(QUIZ_STORE)) {
        const qs = db.createObjectStore(QUIZ_STORE, { keyPath: "quizKey" });
        qs.createIndex("savedAt", "savedAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

function tx(storeName, mode, fn) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const t = db.transaction(storeName, mode);
      const store = t.objectStore(storeName);
      fn(store, resolve, reject);
      t.onerror = () => reject(t.error);
    });
  });
}

// ── Attempts ──

export function saveAttempt(record) {
  return tx(STORE, "readwrite", (store, resolve) => {
    const req = store.add(record);
    req.onsuccess = () => resolve(req.result);
  }).catch((err) => {
    console.warn("Failed to save attempt:", err);
    return null;
  });
}

export function getAttempts(limit = 50) {
  return tx(STORE, "readonly", (store, resolve) => {
    const idx = store.index("timestamp");
    const req = idx.openCursor(null, "prev");
    const results = [];
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
  }).catch((err) => {
    console.warn("Failed to get attempts:", err);
    return [];
  });
}

export function deleteAttempt(id) {
  return tx(STORE, "readwrite", (store, resolve) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve();
  }).catch((err) => {
    console.warn("Failed to delete attempt:", err);
  });
}

export function clearAllAttempts() {
  return tx(STORE, "readwrite", (store, resolve) => {
    const req = store.clear();
    req.onsuccess = () => resolve();
  }).catch((err) => {
    console.warn("Failed to clear attempts:", err);
  });
}

// ── Quizzes ──

export function saveQuiz(quizKey, data) {
  return tx(QUIZ_STORE, "readwrite", (store, resolve) => {
    const req = store.put({ quizKey, data, savedAt: Date.now() });
    req.onsuccess = () => resolve();
  }).catch((err) => {
    console.warn("Failed to save quiz:", err);
  });
}

export function getQuizzes() {
  return tx(QUIZ_STORE, "readonly", (store, resolve) => {
    const idx = store.index("savedAt");
    const req = idx.openCursor(null, "prev");
    const results = [];
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
  }).catch((err) => {
    console.warn("Failed to get quizzes:", err);
    return [];
  });
}

export function deleteQuiz(quizKey) {
  return tx(QUIZ_STORE, "readwrite", (store, resolve) => {
    const req = store.delete(quizKey);
    req.onsuccess = () => resolve();
  }).catch((err) => {
    console.warn("Failed to delete quiz:", err);
  });
}
