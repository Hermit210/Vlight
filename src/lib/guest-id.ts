"use client";

const STORAGE_KEY = "vlight_guest_id";

// Stable per-browser id so guest sessions (no wallet, no signup) can still
// be revisited/updated without a real auth user, per spec §0/§4.
export function getGuestId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
