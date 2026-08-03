import { execFile } from 'child_process';

/**
 * Windows security status via PowerShell (Defender + Firewall).
 * Polled on a slow cadence (60 s) — these cmdlets are expensive.
 */

export interface SecuritySnapshot {
  defenderEnabled: boolean | null;
  realTimeProtection: boolean | null;
  firewallEnabled: boolean | null;
  lastScan: string | null;
  threatsDetected: number | null;
}

let cache: SecuritySnapshot = {
  defenderEnabled: null,
  realTimeProtection: null,
  firewallEnabled: null,
  lastScan: null,
  threatsDetected: null
};

function runPs(script: string, timeoutMs = 20_000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { timeout: timeoutMs, windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout) => (err ? reject(err) : resolve(stdout.trim()))
    );
  });
}

async function pollDefender(): Promise<void> {
  try {
    const out = await runPs(
      "Get-MpComputerStatus | Select-Object AntivirusEnabled,RealTimeProtectionEnabled,QuickScanEndTime,FullScanEndTime | ConvertTo-Json -Compress"
    );
    const d = JSON.parse(out);
    cache.defenderEnabled = !!d.AntivirusEnabled;
    cache.realTimeProtection = !!d.RealTimeProtectionEnabled;
    const scans = [d.QuickScanEndTime, d.FullScanEndTime]
      .map(parsePsDate)
      .filter((x): x is Date => x !== null)
      .sort((a, b) => b.getTime() - a.getTime());
    cache.lastScan = scans.length ? scans[0].toISOString() : null;
  } catch {
    cache.defenderEnabled = null;
    cache.realTimeProtection = null;
  }
  try {
    const out = await runPs('(Get-MpThreatDetection -ErrorAction SilentlyContinue | Measure-Object).Count');
    cache.threatsDetected = parseInt(out, 10);
    if (Number.isNaN(cache.threatsDetected)) cache.threatsDetected = null;
  } catch {
    cache.threatsDetected = null;
  }
}

async function pollFirewall(): Promise<void> {
  try {
    const out = await runPs('(Get-NetFirewallProfile | Where-Object { $_.Enabled -eq $true } | Measure-Object).Count');
    const enabledProfiles = parseInt(out, 10);
    cache.firewallEnabled = Number.isNaN(enabledProfiles) ? null : enabledProfiles > 0;
  } catch {
    cache.firewallEnabled = null;
  }
}

/** PowerShell ConvertTo-Json emits dates as "/Date(1690000000000)/" or ISO strings. */
function parsePsDate(v: unknown): Date | null {
  if (!v) return null;
  if (typeof v === 'string') {
    const msMatch = v.match(/\/Date\((\d+)\)\//);
    const d = msMatch ? new Date(parseInt(msMatch[1], 10)) : new Date(v);
    return Number.isNaN(d.getTime()) || d.getFullYear() < 2000 ? null : d;
  }
  return null;
}

export function startSecurityPolling(): void {
  const poll = () => {
    void pollDefender();
    void pollFirewall();
  };
  poll();
  setInterval(poll, 60_000);
}

export function getSecurity(): SecuritySnapshot {
  return { ...cache };
}
