import type { UsmApi } from '../shared/types';

declare global {
  interface Window {
    usm: UsmApi;
  }
}

export {};
