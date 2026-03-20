import { supabase } from "./supabase.js";

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    Authorization: `Bearer ${session?.access_token}`,
    "Content-Type": "application/json",
  };
}

export async function fetchWeeks() {
  const headers = await authHeaders();
  const res = await fetch("/api/weeks", { headers });
  if (!res.ok) throw new Error("Failed to fetch weeks");
  return res.json();
}

export async function createWeek(week_number, title) {
  const headers = await authHeaders();
  const res = await fetch("/api/weeks", {
    method: "POST",
    headers,
    body: JSON.stringify({ week_number, title }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create week");
  }
  return res.json();
}

export async function deleteWeek(weekId) {
  const headers = await authHeaders();
  const res = await fetch(`/api/weeks/${weekId}`, { method: "DELETE", headers });
  if (!res.ok) throw new Error("Failed to delete week");
  return res.json();
}

export async function fetchLesson(lessonId) {
  const headers = await authHeaders();
  const res = await fetch(`/api/lessons/${lessonId}`, { headers });
  if (!res.ok) throw new Error("Failed to fetch lesson");
  return res.json();
}

export async function fetchLessons(weekId) {
  const headers = await authHeaders();
  const res = await fetch(`/api/lessons?week_id=${weekId}`, { headers });
  if (!res.ok) throw new Error("Failed to fetch lessons");
  return res.json();
}

export async function createLesson(week_id, title, markdown_content) {
  const headers = await authHeaders();
  const res = await fetch("/api/lessons", {
    method: "POST",
    headers,
    body: JSON.stringify({ week_id, title, markdown_content }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create lesson");
  }
  return res.json();
}

export async function deleteLesson(lessonId) {
  const headers = await authHeaders();
  const res = await fetch(`/api/lessons/${lessonId}`, { method: "DELETE", headers });
  if (!res.ok) throw new Error("Failed to delete lesson");
  return res.json();
}

export async function reorderLessons(updates) {
  const headers = await authHeaders();
  const res = await fetch("/api/lessons/reorder", {
    method: "PATCH",
    headers,
    body: JSON.stringify({ updates }),
  });
  if (!res.ok) throw new Error("Failed to reorder lessons");
  return res.json();
}

export async function searchLessons(query) {
  const headers = await authHeaders();
  const res = await fetch(`/api/lessons/search?q=${encodeURIComponent(query)}`, { headers });
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

// ── PDF ──

export async function uploadLessonPdf(lessonId, file, onProgress) {
  const { data: { session } } = await supabase.auth.getSession();
  const xhr = new XMLHttpRequest();
  return new Promise((resolve, reject) => {
    xhr.open("PUT", `/api/lessons/${lessonId}/pdf`);
    xhr.setRequestHeader("Authorization", `Bearer ${session?.access_token}`);
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
      else reject(new Error(JSON.parse(xhr.responseText)?.error || "Upload failed"));
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    const fd = new FormData();
    fd.append("file", file);
    xhr.send(fd);
  });
}

export async function getLessonPdfUrl(lessonId) {
  const headers = await authHeaders();
  const res = await fetch(`/api/lessons/${lessonId}/pdf`, { headers });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error("Failed to get PDF URL");
  }
  return res.json();
}

export async function deleteLessonPdf(lessonId) {
  const headers = await authHeaders();
  const res = await fetch(`/api/lessons/${lessonId}/pdf`, { method: "DELETE", headers });
  if (!res.ok) throw new Error("Failed to delete PDF");
  return res.json();
}
