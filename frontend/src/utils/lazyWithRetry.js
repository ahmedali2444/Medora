import { lazy } from 'react';

const CHUNK_RELOAD_KEY = 'medora-chunk-reload';

export function lazyWithRetry(importFn, maxRetries = 2) {
  return lazy(async () => {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        return await importFn();
      } catch (error) {
        lastError = error;
        const isChunkError = /Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
          String(error?.message || error),
        );

        if (!isChunkError || attempt >= maxRetries) break;

        const alreadyReloaded = sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1';
        if (!alreadyReloaded) {
          sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
          window.location.reload();
          return new Promise(() => {});
        }
      }
    }

    throw lastError ?? new Error('Failed to load page module');
  });
}
