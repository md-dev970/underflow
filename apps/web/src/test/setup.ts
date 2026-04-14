import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

const storageState = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageState.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storageState.set(key, String(value));
  },
  removeItem: (key: string) => {
    storageState.delete(key);
  },
  clear: () => {
    storageState.clear();
  },
  key: (index: number) => Array.from(storageState.keys())[index] ?? null,
  get length() {
    return storageState.size;
  },
};

Object.defineProperty(window, "localStorage", {
  configurable: true,
  writable: true,
  value: localStorageMock,
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
