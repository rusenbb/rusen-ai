const STORAGE_KEYS = {
  LAST_DOI: "paper-pilot:lastDoi",
  SELECTED_MODEL: "paper-pilot:selectedModel",
} as const;

function isLocalStorageAvailable(): boolean {
  try {
    const test = "__storage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

export function saveLastDoi(doi: string): void {
  if (!isLocalStorageAvailable()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_DOI, doi);
  } catch {
    // Ignore storage errors
  }
}

export function getLastDoi(): string | null {
  if (!isLocalStorageAvailable()) return null;
  try {
    return localStorage.getItem(STORAGE_KEYS.LAST_DOI);
  } catch {
    return null;
  }
}

export function clearLastDoi(): void {
  if (!isLocalStorageAvailable()) return;
  try {
    localStorage.removeItem(STORAGE_KEYS.LAST_DOI);
  } catch {
    // Ignore storage errors
  }
}

export function saveSelectedModel(modelId: string): void {
  if (!isLocalStorageAvailable()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, modelId);
  } catch {
    // Ignore storage errors
  }
}

export function getSelectedModel(): string | null {
  if (!isLocalStorageAvailable()) return null;
  try {
    return localStorage.getItem(STORAGE_KEYS.SELECTED_MODEL);
  } catch {
    return null;
  }
}
