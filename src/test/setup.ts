import '@testing-library/jest-dom/vitest';

try {
  // @ts-ignore
  await import('fake-indexeddb/auto');
} catch {
  // Polyfill IndexedDB if not available
}

// jsdom لا يوفر ResizeObserver — @dnd-kit/dom يحتاجه عبر ResizeNotifier
if (typeof globalThis.ResizeObserver === 'undefined') {
  // @ts-expect-error polyfill for jsdom
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom لا يوفر matchMedia — نحتاجه لتطبيقات RTL
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// crypto.randomUUID متوفر في معظم بيئات الاختبار لكن نضمنه
if (typeof globalThis.crypto === 'undefined') {
  // @ts-expect-error polyfill for old environments
  globalThis.crypto = {};
}
if (typeof globalThis.crypto.randomUUID !== 'function') {
  // @ts-expect-error polyfill for old environments
  globalThis.crypto.randomUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };
}
