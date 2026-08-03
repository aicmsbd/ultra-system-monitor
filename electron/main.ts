import {
  app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, screen, shell, Tray
} from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { Settings, Snapshot, WidgetMode, WidgetState } from '../shared/types';
import { collectDetails, collectSnapshot, initStatic } from './monitor';
import { exportData, pruneOldLogs } from './history';
import { startDiskCounters, stopDiskCounters } from './perf-counters';
import { startPinger } from './pinger';
import { startSecurityPolling } from './security';
import { settings } from './settings';

const SIDEBAR_WIDTH = 400;
const AUTOHIDE_PEEK_PX = 6;

let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let lastSnapshot: Snapshot | null = null;
let pollTimer: NodeJS.Timeout | null = null;
let autoHideTimer: NodeJS.Timeout | null = null;
let hidden = false;
let quitting = false;

const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      win.show();
      win.focus();
    }
  });
}

function dockRect(): { x: number; y: number; width: number; height: number } {
  const { workArea } = screen.getPrimaryDisplay();
  const s = settings().get();
  const width = Math.min(workArea.width, s.windowW ?? SIDEBAR_WIDTH);
  return {
    x: workArea.x + workArea.width - width,
    y: workArea.y,
    width,
    height: s.windowH ?? workArea.height
  };
}

/** Clamp a remembered position so the window is never lost off-screen. */
function clampToDisplays(x: number, y: number, w: number, h: number): { x: number; y: number } {
  const d = screen.getDisplayMatching({ x, y, width: w, height: h });
  return {
    x: Math.max(d.workArea.x - w + 60, Math.min(x, d.workArea.x + d.workArea.width - 60)),
    y: Math.max(d.workArea.y, Math.min(y, d.workArea.y + d.workArea.height - 60))
  };
}

function createWindow(): void {
  const s = settings().get();
  const dock = dockRect();
  const rect =
    s.windowX !== null && s.windowY !== null
      ? { ...dock, ...clampToDisplays(s.windowX, s.windowY, dock.width, dock.height) }
      : dock;
  win = new BrowserWindow({
    ...rect,
    frame: false,
    transparent: true,
    resizable: true,
    minWidth: 330,
    minHeight: 480,
    movable: true,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: s.alwaysOnTop,
    skipTaskbar: true,
    title: 'Ultra System Monitor',
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  win.setMenu(null);
  win.setOpacity(Math.max(0.5, Math.min(1, s.opacity / 100)));
  void win.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));

  win.on('close', e => {
    if (!quitting) {
      e.preventDefault();
      win?.hide();
    }
  });

  // Remember where the user drags the widget, and its size (debounced).
  let moveTimer: NodeJS.Timeout | null = null;
  const persistBounds = () => {
    if (hidden || !win) return;
    if (moveTimer) clearTimeout(moveTimer);
    moveTimer = setTimeout(() => {
      if (!win || hidden || win.isDestroyed()) return;
      const b = win.getBounds();
      settings().set({ windowX: b.x, windowY: b.y, windowW: b.width, windowH: b.height });
    }, 400);
  };
  win.on('moved', persistBounds);
  win.on('resized', persistBounds);

  // Re-dock on display changes only when the user hasn't picked a custom spot.
  screen.on('display-metrics-changed', () => {
    if (win && !hidden && settings().get().windowX === null) win.setBounds(dockRect());
  });

  if (process.env.USM_SCREENSHOT) {
    setTimeout(async () => {
      try {
        if (process.env.USM_DEBUG_CLICK) {
          await win!.webContents.executeJavaScript(
            `document.querySelector(${JSON.stringify(process.env.USM_DEBUG_CLICK)})?.click()`
          );
          await new Promise(r => setTimeout(r, 1200));
        }
        const img = await win!.webContents.capturePage();
        fs.writeFileSync(process.env.USM_SCREENSHOT!, img.toPNG());
        console.log('[debug] screenshot saved to', process.env.USM_SCREENSHOT);
      } catch (err) {
        console.error('[debug] screenshot failed', err);
      }
    }, 6000);
  }
}

/* ---------------- Auto-hide (slide out when mouse leaves) ---------------- */

function setAutoHide(enabled: boolean): void {
  if (autoHideTimer) {
    clearInterval(autoHideTimer);
    autoHideTimer = null;
  }
  if (!enabled) {
    slideIn();
    return;
  }
  autoHideTimer = setInterval(() => {
    if (!win || !win.isVisible()) return;
    const b = win.getBounds();
    const work = screen.getDisplayMatching(b).workArea;
    // Auto-hide only engages while the widget sits at the right edge of its
    // display; a freely-dragged widget stays where the user put it.
    const dockedRight = Math.abs(b.x + b.width - (work.x + work.width)) < 16;
    if (!hidden && !dockedRight) return;
    const cursor = screen.getCursorScreenPoint();
    const overSidebar =
      cursor.x >= b.x - 8 && cursor.y >= b.y && cursor.y <= b.y + b.height;
    const atEdge = cursor.x >= work.x + work.width - AUTOHIDE_PEEK_PX - 2;
    if (hidden && atEdge) slideIn();
    else if (!hidden && !overSidebar) slideOut();
  }, 250);
}

function slideOut(): void {
  if (!win || hidden) return;
  const b = win.getBounds();
  const work = screen.getDisplayMatching(b).workArea;
  hidden = true;
  win.setBounds({ ...b, x: work.x + work.width - AUTOHIDE_PEEK_PX });
}

function slideIn(): void {
  if (!win) return;
  hidden = false;
  const s = settings().get();
  const dock = dockRect();
  win.setBounds(
    s.windowX !== null && s.windowY !== null
      ? { ...dock, ...clampToDisplays(s.windowX, s.windowY, dock.width, dock.height) }
      : dock
  );
}

/* --------------------- Detached mini-widgets (pop-out) ------------------- */

const WIDGET_SECTIONS = ['cpu', 'gpu', 'ram', 'board', 'net', 'storage', 'security'];
const WIDGET_LABELS: Record<string, string> = {
  cpu: '🖥️ CPU', gpu: '🎮 GPU', ram: '💾 RAM', board: '🔧 Motherboard',
  net: '🌐 Network', storage: '💽 Storage', security: '🛡️ Security'
};
const WIDGET_SIZES: Record<WidgetMode, { w: number; h: number }> = {
  card: { w: 300, h: 320 },
  speedo: { w: 250, h: 290 }
};
const widgetWins = new Map<string, BrowserWindow>();

function widgetState(id: string): WidgetState {
  const base: WidgetState = { open: false, mode: 'card', x: null, y: null, w: null, h: null };
  return { ...base, ...(settings().get().widgets[id] ?? {}) };
}

function saveWidgetState(id: string, patch: Partial<WidgetState>): void {
  const widgets = { ...settings().get().widgets, [id]: { ...widgetState(id), ...patch } };
  settings().set({ widgets });
}

function broadcastSettings(): void {
  const s = settings().get();
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send('settings:changed', s);
  }
}

function openWidget(id: string): void {
  const existing = widgetWins.get(id);
  if (existing) {
    existing.show();
    existing.focus();
    return;
  }
  const st = widgetState(id);
  const size = { w: st.w ?? WIDGET_SIZES[st.mode].w, h: st.h ?? WIDGET_SIZES[st.mode].h };
  const work = screen.getPrimaryDisplay().workArea;
  const idx = Math.max(0, WIDGET_SECTIONS.indexOf(id));
  const pos =
    st.x !== null && st.y !== null
      ? clampToDisplays(st.x, st.y, size.w, size.h)
      : { x: work.x + 70 + idx * 40, y: work.y + 70 + idx * 40 };
  const s = settings().get();
  const w = new BrowserWindow({
    ...pos,
    width: size.w,
    height: size.h,
    frame: false,
    transparent: true,
    resizable: true,
    minWidth: 190,
    minHeight: 170,
    movable: true,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: s.alwaysOnTop,
    skipTaskbar: true,
    title: `USM ${id}`,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  w.setMenu(null);
  w.setOpacity(Math.max(0.5, Math.min(1, s.opacity / 100)));
  void w.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'), { query: { widget: id } });

  let moveTimer: NodeJS.Timeout | null = null;
  const persist = () => {
    if (moveTimer) clearTimeout(moveTimer);
    moveTimer = setTimeout(() => {
      if (w.isDestroyed()) return;
      const b = w.getBounds();
      saveWidgetState(id, { x: b.x, y: b.y, w: b.width, h: b.height });
    }, 400);
  };
  w.on('moved', persist);
  w.on('resized', persist);
  w.on('closed', () => {
    widgetWins.delete(id);
    if (!quitting) saveWidgetState(id, { open: false });
  });

  widgetWins.set(id, w);
  saveWidgetState(id, { open: true });
}

function closeWidget(id: string): void {
  widgetWins.get(id)?.close();
}

function setWidgetMode(id: string, mode: WidgetMode): void {
  // Switching modes resets to that mode's default size (custom size cleared).
  saveWidgetState(id, { mode, w: null, h: null });
  const w = widgetWins.get(id);
  if (w && !w.isDestroyed()) {
    const size = WIDGET_SIZES[mode];
    w.setSize(size.w, size.h);
  }
  broadcastSettings();
}

function restoreWidgets(): void {
  for (const id of WIDGET_SECTIONS) {
    if (widgetState(id).open) openWidget(id);
  }
}

/* ------------------------------- Tray ----------------------------------- */

function trayIcon(): Electron.NativeImage {
  // 16x16 cyan "pulse" glyph drawn as raw RGBA — avoids shipping a binary asset.
  const size = 16;
  const buf = Buffer.alloc(size * size * 4);
  const set = (x: number, y: number, r: number, g: number, b: number, a: number) => {
    const i = (y * size + x) * 4;
    buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
  };
  const bars = [[3, 9, 13], [6, 5, 13], [9, 2, 13], [12, 7, 13]];
  for (const [x, top, bottom] of bars) {
    for (let y = top; y <= bottom; y++) {
      set(x, y, 0, 217, 255, 255);
      set(x + 1, y, 0, 217, 255, 255);
    }
  }
  return nativeImage.createFromBuffer(buf, { width: size, height: size });
}

function createTray(): void {
  tray = new Tray(trayIcon());
  tray.setToolTip('Ultra System Monitor');
  const rebuild = () => {
    const s = settings().get();
    // GPU widget is offered only when real graphics hardware was detected.
    const sections = WIDGET_SECTIONS.filter(id => id !== 'gpu' || (lastSnapshot?.gpus.length ?? 0) > 0);
    const menu = Menu.buildFromTemplate([
      { label: 'Show sidebar', click: () => { win?.show(); slideIn(); } },
      { label: 'Hide sidebar', click: () => win?.hide() },
      {
        label: 'Widgets (drag anywhere)',
        submenu: sections.map(id => ({
          label: WIDGET_LABELS[id] ?? id,
          type: 'checkbox' as const,
          checked: widgetWins.has(id),
          click: (item: Electron.MenuItem) => (item.checked ? openWidget(id) : closeWidget(id))
        }))
      },
      {
        label: 'Dock to right edge',
        click: () => {
          settings().set({ windowX: null, windowY: null });
          win?.show();
          hidden = false;
          win?.setBounds(dockRect());
        }
      },
      { type: 'separator' },
      {
        label: 'Always on top',
        type: 'checkbox',
        checked: s.alwaysOnTop,
        click: item => applySettings({ alwaysOnTop: item.checked })
      },
      {
        label: 'Auto-hide',
        type: 'checkbox',
        checked: s.autoHide,
        click: item => applySettings({ autoHide: item.checked })
      },
      { type: 'separator' },
      { label: 'Quit Ultra System Monitor', click: () => { quitting = true; app.quit(); } }
    ]);
    tray?.setContextMenu(menu);
  };
  rebuild();
  tray.on('click', () => {
    if (win?.isVisible()) win.hide();
    else { win?.show(); slideIn(); }
  });
  tray.on('right-click', rebuild);
}

/* ----------------------------- Settings --------------------------------- */

function applySettings(patch: Partial<Settings>): Settings {
  const next = settings().set(patch);
  const allWins = [win, ...widgetWins.values()].filter((w): w is BrowserWindow => !!w && !w.isDestroyed());
  for (const w of allWins) {
    if (patch.alwaysOnTop !== undefined) w.setAlwaysOnTop(next.alwaysOnTop, 'screen-saver');
    if (patch.opacity !== undefined) w.setOpacity(Math.max(0.5, Math.min(1, next.opacity / 100)));
  }
  if (
    patch.theme !== undefined || patch.language !== undefined ||
    patch.alertsEnabled !== undefined || patch.accentColor !== undefined
  ) {
    broadcastSettings();
  }
  if (patch.autoHide !== undefined) setAutoHide(next.autoHide);
  if (patch.startWithWindows !== undefined) {
    app.setLoginItemSettings({ openAtLogin: next.startWithWindows, path: process.execPath });
  }
  if (patch.refreshMs !== undefined) startPolling();
  return next;
}

/* ------------------------------ Polling ---------------------------------- */

function startPolling(): void {
  if (pollTimer) clearInterval(pollTimer);
  const interval = Math.max(500, Math.min(10_000, settings().get().refreshMs));
  let busy = false;
  pollTimer = setInterval(async () => {
    if (busy || !win) return;
    busy = true;
    try {
      const snap = await collectSnapshot(interval, settings().get().alertsEnabled);
      lastSnapshot = snap;
      for (const w of BrowserWindow.getAllWindows()) {
        if (!w.isDestroyed()) w.webContents.send('monitor:snapshot', snap);
      }
    } catch (err) {
      console.error('[monitor] tick failed:', err);
    } finally {
      busy = false;
    }
  }, interval);
}

/* -------------------------------- IPC ------------------------------------ */

function registerIpc(): void {
  ipcMain.handle('settings:get', () => settings().get());
  ipcMain.handle('settings:set', (_e, patch: Partial<Settings>) => applySettings(patch));
  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.handle('details:get', () => collectDetails());

  ipcMain.on('widget:open', (_e, id: string) => {
    if (WIDGET_SECTIONS.includes(id)) openWidget(id);
  });
  ipcMain.on('widget:close', (_e, id: string) => closeWidget(id));
  ipcMain.on('widget:mode', (_e, id: string, mode: WidgetMode) => {
    if (WIDGET_SECTIONS.includes(id) && (mode === 'card' || mode === 'speedo')) setWidgetMode(id, mode);
  });

  ipcMain.on('open:link', (_e, url: string) => {
    // Only allow https links out of the sandboxed renderer.
    if (typeof url === 'string' && /^https:\/\//i.test(url)) void shell.openExternal(url);
  });

  ipcMain.on('window:action', (_e, action: string) => {
    if (action === 'minimize') win?.hide();
    else if (action === 'close') win?.hide();
    else if (action === 'quit') { quitting = true; app.quit(); }
  });

  ipcMain.handle('action:screenshot', async () => {
    if (!win) return null;
    const img = await win.webContents.capturePage();
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Save stats screenshot',
      defaultPath: path.join(app.getPath('pictures'), `usm-${Date.now()}.png`),
      filters: [{ name: 'PNG image', extensions: ['png'] }]
    });
    if (canceled || !filePath) return null;
    fs.writeFileSync(filePath, img.toPNG());
    return filePath;
  });

  ipcMain.handle('action:export', async (_e, format: 'csv' | 'json') => {
    if (!win) return null;
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: `Export today's history (${format.toUpperCase()})`,
      defaultPath: path.join(app.getPath('documents'), `usm-history-${new Date().toISOString().slice(0, 10)}.${format}`),
      filters: [{ name: format.toUpperCase(), extensions: [format] }]
    });
    if (canceled || !filePath) return null;
    fs.writeFileSync(filePath, exportData(format));
    return filePath;
  });
}

/* ------------------------------ Lifecycle -------------------------------- */

app.setAppUserModelId('com.ultrasystemmonitor.app');

app.whenReady().then(async () => {
  registerIpc();
  createWindow();
  createTray();
  startSecurityPolling();
  startPinger();
  startDiskCounters();
  pruneOldLogs();
  restoreWidgets();
  await initStatic();
  startPolling();
  setAutoHide(settings().get().autoHide);
  const s = settings().get();
  app.setLoginItemSettings({ openAtLogin: s.startWithWindows, path: process.execPath });
  console.log('[main] Ultra System Monitor started');
});

app.on('before-quit', () => {
  quitting = true;
  stopDiskCounters();
});

app.on('window-all-closed', () => {
  // Keep running in the tray; explicit Quit is required to exit.
});
