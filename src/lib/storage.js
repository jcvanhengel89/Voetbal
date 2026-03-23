const STORAGE_PREFIX = 'voetbal_v3';

export const storageKey = (name) => `${STORAGE_PREFIX}_${name}`;

export const appStorageKeys = [
  'players',
  'timer',
  'history',
  'score',
  'quarter',
  'formation',
  'archive',
  'opponent',
].map(storageKey);

export function clearAppStorage() {
  appStorageKeys.forEach((key) => localStorage.removeItem(key));
  sessionStorage.removeItem('voetbal_runtime');
}
