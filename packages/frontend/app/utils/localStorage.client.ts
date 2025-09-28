import { canUseDOM } from './browser.client';

export const localStorageHelper = {
  set: (key: string, value: any) => {
    try {
      if (!canUseDOM) return;
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(key, serializedValue);
    } catch (err) {
      console.error(`Error setting ${key} in localStorage`, err);
    }
  },

  get: <T extends unknown>(key: string): T | null => {
    if (!canUseDOM) return null;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (err) {
      console.error(`Error getting ${key} from localStorage`, err);
      return null;
    }
  },

  remove: (key: string) => {
    if (!canUseDOM) return;
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.error(`Error removing ${key} from localStorage`, err);
    }
  },
};
