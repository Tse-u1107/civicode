export const STATE_PROGRESS_STORAGE_KEY = "civicode_state_progress_v1";
export const MAX_STATE_PROGRESS = 10;
export const STATE_PROGRESS_UPDATED_EVENT = "civicode:state-progress-updated";

export type StateProgressMap = Record<string, number>;

function normalizeStateAbbr(value: string): string {
  return value.trim().toUpperCase();
}

export function extractStateFromInput(input: string): string | null {
  const segments = input.split(",");
  if (segments.length === 0) {
    return null;
  }

  const stateAbbr = normalizeStateAbbr(segments[0] ?? "");
  if (!/^[A-Z]{2}$/.test(stateAbbr)) {
    return null;
  }

  return stateAbbr;
}

export function readStateProgressFromStorage(): StateProgressMap {
  if (typeof window === "undefined") {
    return {};
  }

  const rawValue = window.localStorage.getItem(STATE_PROGRESS_STORAGE_KEY);
  if (!rawValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    const result: StateProgressMap = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        continue;
      }
      const normalizedKey = normalizeStateAbbr(key);
      if (/^[A-Z]{2}$/.test(normalizedKey)) {
        result[normalizedKey] = Math.max(0, Math.min(MAX_STATE_PROGRESS, Math.floor(value)));
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function incrementStateProgress(stateAbbr: string, amount = 1): StateProgressMap {
  if (typeof window === "undefined") {
    return {};
  }

  const normalizedState = normalizeStateAbbr(stateAbbr);
  if (!/^[A-Z]{2}$/.test(normalizedState)) {
    return readStateProgressFromStorage();
  }

  const safeAmount = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
  if (safeAmount <= 0) {
    return readStateProgressFromStorage();
  }

  const progressByState = readStateProgressFromStorage();
  const current = progressByState[normalizedState] ?? 0;
  progressByState[normalizedState] = Math.min(MAX_STATE_PROGRESS, current + safeAmount);
  window.localStorage.setItem(STATE_PROGRESS_STORAGE_KEY, JSON.stringify(progressByState));
  window.dispatchEvent(new Event(STATE_PROGRESS_UPDATED_EVENT));
  return progressByState;
}
