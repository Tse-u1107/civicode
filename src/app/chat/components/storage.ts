import { SavedChat } from "./types";

export const SAVED_CHATS_STORAGE_KEY = "civicode:saved-chats";

export function loadSavedChats(): SavedChat[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SAVED_CHATS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedChat[]) : [];
  } catch {
    return [];
  }
}

export function saveSavedChats(chats: SavedChat[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SAVED_CHATS_STORAGE_KEY, JSON.stringify(chats));
}
