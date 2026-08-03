/** Shared type definitions used by both the Electron main process and the React renderer. */

export type ThemeName = 'dark' | 'light' | 'neon' | 'minimal';
export type Language = 'en' | 'bn';
export type Severity = 'ok' | 'warn' | 'crit';

export interface CoreStat {
  /** Logical thread index */
  index: number;
  load: number;
  tempC: number | null;
  speedGHz: number | null;
}

export interface CpuData {
  model: string;
  vendor: string;
  physicalCores: number;
  threads: number;
  load: number;
  packageTempC: number | null;
  baseSpeedGHz: number;
  currentSpeedGHz: number | null;
  voltage: number | null;
  powerW: number | null;
  fanRpm: number | null;
  cores: CoreStat[];
}

export interface GpuData {
  model: string;
  vendor: string;
  load: number | null;
  tempC: number | null;
  coreClockMHz: number | null;
  memClockMHz: number | null;
  vramUsedMB: number | null;
  vramTotalMB: number | null;
  powerW: number | null;
  powerLimitW: number | null;
  fanPct: number | null;
  fanRpm: number | null;
  voltage: number | null;
}

export interface MemData {
  totalB: number;
  usedB: number;
  availableB: number;
  usagePct: number;
  cachedB: number;
  swapTotalB: number;
  swapUsedB: number;
  speedMHz: number | null;
  type: string | null;
  voltage: number | null;
  tempC: number | null;
  xmpActive: boolean | null;
}

export interface FanReading {
  name: string;
  rpm: number;
}

export interface BoardData {
  model: string;
  vendor: string;
  biosVersion: string;
  biosDate: string | null;
  tempC: number | null;
  vrmTempC: number | null;
  rail12V: number | null;
  rail5V: number | null;
  rail33V: number | null;
  fans: FanReading[];
}

export interface NetAdapterInfo {
  iface: string;
  name: string;
  type: string;
  speedMbps: number | null;
  ip4: string;
}

export interface NetData {
  adapters: NetAdapterInfo[];
  activeIface: string | null;
  rxBps: number;
  txBps: number;
  latencyMs: number | null;
  latencyTarget: string;
  todayRxB: number;
  todayTxB: number;
  monthRxB: number;
  monthTxB: number;
}

export interface DriveData {
  mount: string;
  model: string;
  type: string;
  sizeB: number;
  usedB: number;
  usagePct: number;
  tempC: number | null;
  smartStatus: string | null;
  readBps: number | null;
  writeBps: number | null;
}

export interface StorageData {
  drives: DriveData[];
  totalReadBps: number | null;
  totalWriteBps: number | null;
}

export interface SecurityData {
  defenderEnabled: boolean | null;
  realTimeProtection: boolean | null;
  firewallEnabled: boolean | null;
  lastScan: string | null;
  threatsDetected: number | null;
  uptimeSec: number;
  healthScore: number;
}

export interface AlertItem {
  id: string;
  metric: string;
  severity: Severity;
  message: string;
  value: number;
}

export interface Snapshot {
  ts: number;
  cpu: CpuData;
  gpus: GpuData[];
  mem: MemData;
  board: BoardData;
  net: NetData;
  storage: StorageData;
  security: SecurityData;
  alerts: AlertItem[];
  lhmConnected: boolean;
  osName: string;
}

export type WidgetMode = 'card' | 'speedo';

export interface WidgetState {
  open: boolean;
  mode: WidgetMode;
  x: number | null;
  y: number | null;
  /** Custom user-resized dimensions; null = mode default. */
  w: number | null;
  h: number | null;
}

export interface Settings {
  refreshMs: number;
  theme: ThemeName;
  language: Language;
  opacity: number;
  alwaysOnTop: boolean;
  autoHide: boolean;
  startWithWindows: boolean;
  alertsEnabled: boolean;
  firstRunDone: boolean;
  collapsed: Record<string, boolean>;
  /** Remembered window position; null = dock to the right edge. */
  windowX: number | null;
  windowY: number | null;
  /** Remembered main-window size; null = defaults (400 × full height). */
  windowW: number | null;
  windowH: number | null;
  /** Custom accent color (hex); null = theme default. */
  accentColor: string | null;
  /** Detached mini-widget state per section (gpu, cpu, ram, ...). */
  widgets: Record<string, WidgetState>;
}

export const DEFAULT_SETTINGS: Settings = {
  refreshMs: 1000,
  theme: 'dark',
  language: 'en',
  opacity: 100,
  // Off by default so any other application can overlay the widget.
  alwaysOnTop: false,
  autoHide: false,
  startWithWindows: false,
  alertsEnabled: true,
  firstRunDone: false,
  collapsed: {},
  windowX: null,
  windowY: null,
  windowW: null,
  windowH: null,
  accentColor: null,
  widgets: {}
};

/** Alert thresholds (from the product spec). */
export const THRESHOLDS = {
  cpuTemp: { warn: 75, crit: 85 },
  gpuTemp: { warn: 80, crit: 90 },
  cpuUsage: { warn: 90, crit: 95 },
  ramUsage: { warn: 85, crit: 95 },
  storage: { warn: 90, crit: 95 }
} as const;

/* ------------------- Extended hardware details (on demand) ------------------ */

export interface CpuDetail {
  model: string;
  vendor: string;
  socket: string | null;
  family: string | null;
  modelId: string | null;
  stepping: string | null;
  physicalCores: number;
  threads: number;
  baseGHz: number;
  maxGHz: number | null;
  cacheL1dKB: number | null;
  cacheL1iKB: number | null;
  cacheL2KB: number | null;
  cacheL3KB: number | null;
  virtualization: boolean | null;
}

export interface DisplayDetail {
  model: string;
  main: boolean;
  resX: number | null;
  resY: number | null;
  refreshHz: number | null;
}

export interface GpuDetailInfo {
  model: string;
  vendor: string;
  bus: string | null;
  vramTotalMB: number | null;
  driverVersion: string | null;
  subDeviceId: string | null;
}

export interface DimmDetail {
  bank: string;
  sizeB: number;
  type: string;
  clockMHz: number | null;
  formFactor: string | null;
  manufacturer: string | null;
  partNum: string | null;
  voltage: number | null;
}

export interface NetIfDetail {
  iface: string;
  name: string;
  type: string;
  mac: string;
  ip4: string;
  ip6: string;
  speedMbps: number | null;
  dhcp: boolean | null;
  isDefault: boolean;
}

export interface DiskDetail {
  device: string;
  name: string;
  type: string;
  interfaceType: string | null;
  sizeB: number;
  firmware: string | null;
  smartStatus: string | null;
}

export interface BoardDetail {
  manufacturer: string;
  model: string;
  version: string | null;
  biosVendor: string | null;
  biosVersion: string;
  biosDate: string | null;
  memMaxB: number | null;
  memSlots: number | null;
}

export interface OsDetail {
  distro: string;
  release: string;
  build: string | null;
  arch: string;
  hostname: string | null;
}

export interface HardwareDetails {
  cpu: CpuDetail | null;
  gpus: GpuDetailInfo[];
  displays: DisplayDetail[];
  dimms: DimmDetail[];
  netIfaces: NetIfDetail[];
  disks: DiskDetail[];
  board: BoardDetail | null;
  os: OsDetail | null;
}

/** API exposed to the renderer through the preload bridge. */
export interface UsmApi {
  onSnapshot(cb: (snap: Snapshot) => void): () => void;
  getSettings(): Promise<Settings>;
  setSettings(patch: Partial<Settings>): Promise<Settings>;
  getDetails(): Promise<HardwareDetails>;
  windowAction(action: 'minimize' | 'close' | 'quit'): void;
  openLink(url: string): void;
  openWidget(id: string): void;
  closeWidget(id: string): void;
  setWidgetMode(id: string, mode: WidgetMode): void;
  onSettingsChanged(cb: (s: Settings) => void): () => void;
  screenshot(): Promise<string | null>;
  exportHistory(format: 'csv' | 'json'): Promise<string | null>;
  appVersion(): Promise<string>;
}
