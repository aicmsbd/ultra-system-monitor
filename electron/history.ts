import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { Snapshot } from '../shared/types';

/**
 * Historical data logging.
 *
 * Snapshots are appended every 10 s as JSON Lines, one file per day
 * (userData/history/YYYY-MM-DD.jsonl). JSONL was chosen over SQLite
 * deliberately: it needs no native module (better-sqlite3 requires an
 * Electron-ABI rebuild toolchain on every user machine), is append-only
 * crash-safe, and trivially exports to CSV/JSON.
 */

const LOG_EVERY_MS = 10_000;
const RETENTION_DAYS = 31;

let lastLog = 0;

function historyDir(): string {
  const dir = path.join(app.getPath('userData'), 'history');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function dayFile(d = new Date()): string {
  return path.join(historyDir(), `${d.toISOString().slice(0, 10)}.jsonl`);
}

interface HistoryRow {
  ts: number;
  cpuLoad: number;
  cpuTemp: number | null;
  cpuGHz: number | null;
  gpuLoad: number | null;
  gpuTemp: number | null;
  ramPct: number;
  netRxBps: number;
  netTxBps: number;
  diskReadBps: number | null;
  diskWriteBps: number | null;
  latencyMs: number | null;
  health: number;
}

function toRow(s: Snapshot): HistoryRow {
  return {
    ts: s.ts,
    cpuLoad: Math.round(s.cpu.load * 10) / 10,
    cpuTemp: s.cpu.packageTempC,
    cpuGHz: s.cpu.currentSpeedGHz,
    gpuLoad: s.gpus[0]?.load ?? null,
    gpuTemp: s.gpus[0]?.tempC ?? null,
    ramPct: Math.round(s.mem.usagePct * 10) / 10,
    netRxBps: Math.round(s.net.rxBps),
    netTxBps: Math.round(s.net.txBps),
    diskReadBps: s.storage.totalReadBps,
    diskWriteBps: s.storage.totalWriteBps,
    latencyMs: s.net.latencyMs,
    health: s.security.healthScore
  };
}

export function maybeLog(snap: Snapshot): void {
  const now = Date.now();
  if (now - lastLog < LOG_EVERY_MS) return;
  lastLog = now;
  try {
    fs.appendFileSync(dayFile(), JSON.stringify(toRow(snap)) + '\n');
  } catch (err) {
    console.error('[history] append failed:', err);
  }
}

export function pruneOldLogs(): void {
  try {
    const cutoff = Date.now() - RETENTION_DAYS * 86_400_000;
    for (const f of fs.readdirSync(historyDir())) {
      const m = f.match(/^(\d{4}-\d{2}-\d{2})\.jsonl$/);
      if (m && new Date(m[1]).getTime() < cutoff) {
        fs.unlinkSync(path.join(historyDir(), f));
      }
    }
  } catch {
    /* non-fatal */
  }
}

function readToday(): HistoryRow[] {
  try {
    return fs
      .readFileSync(dayFile(), 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line) as HistoryRow);
  } catch {
    return [];
  }
}

export function exportData(format: 'csv' | 'json'): string {
  const rows = readToday();
  if (format === 'json') return JSON.stringify(rows, null, 2);
  const cols: (keyof HistoryRow)[] = [
    'ts', 'cpuLoad', 'cpuTemp', 'cpuGHz', 'gpuLoad', 'gpuTemp', 'ramPct',
    'netRxBps', 'netTxBps', 'diskReadBps', 'diskWriteBps', 'latencyMs', 'health'
  ];
  const header = ['time', ...cols.slice(1)].join(',');
  const lines = rows.map(r =>
    [new Date(r.ts).toISOString(), ...cols.slice(1).map(c => r[c] ?? '')].join(',')
  );
  return [header, ...lines].join('\n');
}

/** Persisted daily/monthly network totals (survives restarts). */
interface NetTotals {
  day: string;
  month: string;
  dayRx: number;
  dayTx: number;
  monthRx: number;
  monthTx: number;
}

let totals: NetTotals | null = null;
let totalsDirtySince = 0;

function totalsFile(): string {
  return path.join(app.getPath('userData'), 'net-totals.json');
}

function loadTotals(): NetTotals {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const month = now.toISOString().slice(0, 7);
  try {
    const t = JSON.parse(fs.readFileSync(totalsFile(), 'utf8')) as NetTotals;
    if (t.month !== month) return { day, month, dayRx: 0, dayTx: 0, monthRx: 0, monthTx: 0 };
    if (t.day !== day) return { ...t, day, dayRx: 0, dayTx: 0 };
    return t;
  } catch {
    return { day, month, dayRx: 0, dayTx: 0, monthRx: 0, monthTx: 0 };
  }
}

export function addNetUsage(rxDelta: number, txDelta: number): NetTotals {
  if (!totals) totals = loadTotals();
  const day = new Date().toISOString().slice(0, 10);
  if (totals.day !== day) totals = loadTotals();
  totals.dayRx += rxDelta;
  totals.dayTx += txDelta;
  totals.monthRx += rxDelta;
  totals.monthTx += txDelta;
  const now = Date.now();
  if (now - totalsDirtySince > 30_000) {
    totalsDirtySince = now;
    try {
      fs.writeFileSync(totalsFile(), JSON.stringify(totals));
    } catch {
      /* non-fatal */
    }
  }
  return totals;
}
