import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";

const STORAGE_KEY = "pending_sync";

function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function setQueue(ops) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
  window.dispatchEvent(new Event("pending_sync_change"));
}

export function enqueue(op) {
  const queue = getQueue();
  queue.push({ ...op, timestamp: Date.now() });
  setQueue(queue);
}

export async function flush() {
  const queue = getQueue();
  if (queue.length === 0) return;

  const failed = [];
  for (const op of queue) {
    try {
      const { table, method, payload, matchColumns } = op;
      let query;
      if (method === "upsert") {
        query = supabase.from(table).upsert(payload, {
          onConflict: matchColumns?.join(","),
        });
      } else if (method === "update") {
        query = supabase.from(table).update(payload.data).match(payload.match);
      } else if (method === "delete") {
        query = supabase.from(table).delete().match(payload.match);
      } else if (method === "insert") {
        query = supabase.from(table).insert(payload);
      } else {
        continue;
      }
      const { error } = await query;
      if (error) failed.push(op);
    } catch {
      failed.push(op);
    }
  }
  setQueue(failed);
}

export function getPendingCount() {
  return getQueue().length;
}

export function usePendingCount() {
  const [count, setCount] = useState(getPendingCount);

  useEffect(() => {
    const update = () => setCount(getPendingCount());
    window.addEventListener("pending_sync_change", update);
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) update();
    });
    return () => {
      window.removeEventListener("pending_sync_change", update);
      // storage listener cleanup not critical — will GC with component
    };
  }, []);

  return count;
}
