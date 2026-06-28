"use client";

import {
  CHROMA_API_KEY_HEADER,
  CHROMA_DATABASE_HEADER,
  CHROMA_TENANT_HEADER,
  GEMINI_API_KEY_HEADER,
} from "@/lib/runtime-api-settings";

export const API_SETTINGS_STORAGE_KEY = "civicode_api_settings_v1";

export type ClientApiSettings = {
  geminiApiKey: string;
  chromaApiKey: string;
  chromaTenant: string;
  chromaDatabase: string;
};

export function getEmptyClientApiSettings(): ClientApiSettings {
  return {
    geminiApiKey: "",
    chromaApiKey: "",
    chromaTenant: "",
    chromaDatabase: "",
  };
}

export function readClientApiSettings(): ClientApiSettings {
  if (typeof window === "undefined") {
    return getEmptyClientApiSettings();
  }

  try {
    const raw = window.localStorage.getItem(API_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return getEmptyClientApiSettings();
    }

    const parsed = JSON.parse(raw) as Partial<ClientApiSettings>;
    return {
      geminiApiKey: typeof parsed.geminiApiKey === "string" ? parsed.geminiApiKey.trim() : "",
      chromaApiKey: typeof parsed.chromaApiKey === "string" ? parsed.chromaApiKey.trim() : "",
      chromaTenant: typeof parsed.chromaTenant === "string" ? parsed.chromaTenant.trim() : "",
      chromaDatabase: typeof parsed.chromaDatabase === "string" ? parsed.chromaDatabase.trim() : "",
    };
  } catch {
    return getEmptyClientApiSettings();
  }
}

export function saveClientApiSettings(settings: ClientApiSettings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    API_SETTINGS_STORAGE_KEY,
    JSON.stringify({
      geminiApiKey: settings.geminiApiKey.trim(),
      chromaApiKey: settings.chromaApiKey.trim(),
      chromaTenant: settings.chromaTenant.trim(),
      chromaDatabase: settings.chromaDatabase.trim(),
    }),
  );
}

export function buildApiSettingsHeaders(settings: ClientApiSettings): Record<string, string> {
  const headers: Record<string, string> = {};

  if (settings.geminiApiKey) {
    headers[GEMINI_API_KEY_HEADER] = settings.geminiApiKey;
  }
  if (settings.chromaApiKey) {
    headers[CHROMA_API_KEY_HEADER] = settings.chromaApiKey;
  }
  if (settings.chromaTenant) {
    headers[CHROMA_TENANT_HEADER] = settings.chromaTenant;
  }
  if (settings.chromaDatabase) {
    headers[CHROMA_DATABASE_HEADER] = settings.chromaDatabase;
  }

  return headers;
}

export function getMissingRequiredApiSettings(settings: ClientApiSettings): string[] {
  const missing: string[] = [];
  if (!settings.geminiApiKey) {
    missing.push("Gemini API key");
  }
  if (!settings.chromaApiKey) {
    missing.push("ChromaDB API key");
  }
  if (!settings.chromaTenant) {
    missing.push("Chroma tenant");
  }
  if (!settings.chromaDatabase) {
    missing.push("Chroma database");
  }
  return missing;
}
