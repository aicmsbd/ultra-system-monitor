/** Formatting helpers — every sensor may be null, rendered as an em-dash. */

export const DASH = '—';

export function fmtPct(v: number | null | undefined, digits = 0): string {
  return v === null || v === undefined ? DASH : `${v.toFixed(digits)}%`;
}

export function fmtTemp(v: number | null | undefined): string {
  return v === null || v === undefined ? DASH : `${Math.round(v)}°C`;
}

export function fmtGHz(v: number | null | undefined): string {
  return v === null || v === undefined ? DASH : `${v.toFixed(2)} GHz`;
}

export function fmtMHz(v: number | null | undefined): string {
  if (v === null || v === undefined) return DASH;
  return v >= 1000 ? `${(v / 1000).toFixed(2)} GHz` : `${Math.round(v)} MHz`;
}

export function fmtVolt(v: number | null | undefined): string {
  return v === null || v === undefined ? DASH : `${v.toFixed(2)}V`;
}

export function fmtWatt(v: number | null | undefined): string {
  return v === null || v === undefined ? DASH : `${Math.round(v)}W`;
}

export function fmtRpm(v: number | null | undefined): string {
  return v === null || v === undefined ? DASH : `${Math.round(v)} RPM`;
}

export function fmtBytes(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined) return DASH;
  if (v >= 1024 ** 4) return `${(v / 1024 ** 4).toFixed(digits)} TB`;
  if (v >= 1024 ** 3) return `${(v / 1024 ** 3).toFixed(digits)} GB`;
  if (v >= 1024 ** 2) return `${(v / 1024 ** 2).toFixed(digits)} MB`;
  if (v >= 1024) return `${(v / 1024).toFixed(digits)} KB`;
  return `${Math.round(v)} B`;
}

/** Network rate in bits/s from bytes/s. */
export function fmtBitRate(bytesPerSec: number | null | undefined): string {
  if (bytesPerSec === null || bytesPerSec === undefined) return DASH;
  const bits = bytesPerSec * 8;
  if (bits >= 1e9) return `${(bits / 1e9).toFixed(2)} Gbps`;
  if (bits >= 1e6) return `${(bits / 1e6).toFixed(1)} Mbps`;
  if (bits >= 1e3) return `${(bits / 1e3).toFixed(0)} Kbps`;
  return `${Math.round(bits)} bps`;
}

/** Disk throughput in bytes/s. */
export function fmtByteRate(v: number | null | undefined): string {
  if (v === null || v === undefined) return DASH;
  if (v >= 1024 ** 3) return `${(v / 1024 ** 3).toFixed(2)} GB/s`;
  if (v >= 1024 ** 2) return `${(v / 1024 ** 2).toFixed(1)} MB/s`;
  return `${(v / 1024).toFixed(0)} KB/s`;
}

export function fmtUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
}

export function fmtMs(v: number | null | undefined): string {
  return v === null || v === undefined ? DASH : `${v}ms`;
}

export function fmtDateTime(iso: string | null): string {
  if (!iso) return DASH;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return DASH;
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  });
}

export type Severity3 = 'ok' | 'warn' | 'crit';

export function severityFor(value: number | null | undefined, warn: number, crit: number): Severity3 {
  if (value === null || value === undefined) return 'ok';
  if (value >= crit) return 'crit';
  if (value >= warn) return 'warn';
  return 'ok';
}
