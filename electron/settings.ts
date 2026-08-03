import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_SETTINGS, Settings } from '../shared/types';

/**
 * Minimal JSON-file settings persistence (stored in the Electron userData dir).
 * Deliberately dependency-free: electron-store v10+ is ESM-only which conflicts
 * with the CJS main-process build.
 */
class SettingsStore {
  private file: string;
  private data: Settings;

  constructor() {
    this.file = path.join(app.getPath('userData'), 'settings.json');
    this.data = this.load();
  }

  private load(): Settings {
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      return { ...DEFAULT_SETTINGS, ...raw };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  get(): Settings {
    return { ...this.data };
  }

  set(patch: Partial<Settings>): Settings {
    this.data = { ...this.data, ...patch };
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
    } catch (err) {
      console.error('[settings] failed to persist:', err);
    }
    return this.get();
  }
}

let store: SettingsStore | null = null;

export function settings(): SettingsStore {
  if (!store) store = new SettingsStore();
  return store;
}
