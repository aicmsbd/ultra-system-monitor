import { Notification } from 'electron';
import { AlertItem, Severity, Snapshot, THRESHOLDS } from '../shared/types';

/**
 * Threshold engine: evaluates every snapshot against the spec thresholds,
 * returns in-app alert badges, and fires a desktop notification when a metric
 * *transitions* into warning/critical (with a per-metric 2-minute cooldown so
 * a hot CPU doesn't spam the Action Center every second).
 */

const NOTIFY_COOLDOWN_MS = 120_000;
const lastNotified = new Map<string, number>();
const lastSeverity = new Map<string, Severity>();

function sev(value: number, warn: number, crit: number): Severity {
  if (value >= crit) return 'crit';
  if (value >= warn) return 'warn';
  return 'ok';
}

function notify(title: string, body: string): void {
  try {
    if (Notification.isSupported()) {
      new Notification({ title, body, urgency: 'critical' }).show();
    }
  } catch {
    /* notifications unavailable */
  }
}

export function evaluateAlerts(snap: Snapshot, notificationsEnabled: boolean): AlertItem[] {
  const checks: { id: string; label: string; value: number | null; warn: number; crit: number; unit: string }[] = [
    { id: 'cpu-temp', label: 'CPU temperature', value: snap.cpu.packageTempC, ...THRESHOLDS.cpuTemp, unit: '°C' },
    { id: 'cpu-load', label: 'CPU usage', value: snap.cpu.load, ...THRESHOLDS.cpuUsage, unit: '%' },
    { id: 'ram', label: 'RAM usage', value: snap.mem.usagePct, ...THRESHOLDS.ramUsage, unit: '%' }
  ];
  snap.gpus.forEach((g, i) => {
    checks.push({ id: `gpu${i}-temp`, label: `GPU temperature (${g.model})`, value: g.tempC, ...THRESHOLDS.gpuTemp, unit: '°C' });
  });
  snap.storage.drives.forEach(d => {
    checks.push({ id: `disk-${d.mount}`, label: `Drive ${d.mount} space used`, value: d.usagePct, ...THRESHOLDS.storage, unit: '%' });
  });

  const alerts: AlertItem[] = [];
  const now = Date.now();

  for (const c of checks) {
    if (c.value === null || c.value === undefined) continue;
    const severity = sev(c.value, c.warn, c.crit);
    const prev = lastSeverity.get(c.id) ?? 'ok';
    lastSeverity.set(c.id, severity);
    if (severity === 'ok') continue;

    const message = `${c.label}: ${Math.round(c.value)}${c.unit}`;
    alerts.push({ id: c.id, metric: c.label, severity, message, value: c.value });

    const escalated = severity === 'crit' && prev !== 'crit';
    const entered = prev === 'ok';
    const last = lastNotified.get(c.id) ?? 0;
    if (notificationsEnabled && (entered || escalated) && now - last > NOTIFY_COOLDOWN_MS) {
      lastNotified.set(c.id, now);
      notify(
        severity === 'crit' ? '🔥 Critical — Ultra System Monitor' : '⚠️ Warning — Ultra System Monitor',
        message
      );
    }
  }
  return alerts;
}

/** Composite 0–100 health score derived from temps, load, disk fullness and security posture. */
export function healthScore(snap: Snapshot): number {
  let score = 100;
  const t = snap.cpu.packageTempC;
  if (t !== null) {
    if (t >= THRESHOLDS.cpuTemp.crit) score -= 20;
    else if (t >= THRESHOLDS.cpuTemp.warn) score -= 8;
  }
  for (const g of snap.gpus) {
    if (g.tempC !== null) {
      if (g.tempC >= THRESHOLDS.gpuTemp.crit) score -= 15;
      else if (g.tempC >= THRESHOLDS.gpuTemp.warn) score -= 6;
    }
  }
  if (snap.cpu.load >= THRESHOLDS.cpuUsage.crit) score -= 8;
  else if (snap.cpu.load >= THRESHOLDS.cpuUsage.warn) score -= 3;
  if (snap.mem.usagePct >= THRESHOLDS.ramUsage.crit) score -= 10;
  else if (snap.mem.usagePct >= THRESHOLDS.ramUsage.warn) score -= 4;
  for (const d of snap.storage.drives) {
    if (d.usagePct >= THRESHOLDS.storage.crit) score -= 8;
    else if (d.usagePct >= THRESHOLDS.storage.warn) score -= 3;
    if (d.smartStatus && d.smartStatus.toLowerCase() !== 'ok') score -= 15;
  }
  if (snap.security.defenderEnabled === false) score -= 10;
  if (snap.security.firewallEnabled === false) score -= 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}
