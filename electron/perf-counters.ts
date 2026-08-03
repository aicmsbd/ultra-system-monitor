import { spawn, ChildProcess } from 'child_process';

/**
 * Disk throughput via a single long-lived PowerShell Get-Counter stream.
 * systeminformation cannot report disk I/O rates on Windows, so we stream
 * "\PhysicalDisk(_Total)" counters (1 sample/sec) and cache the latest values.
 *
 * Counter paths are English-only; on localized Windows installs the stream
 * fails fast and the UI shows "—" for throughput (LHM can still supply it).
 */

let readBps: number | null = null;
let writeBps: number | null = null;
let proc: ChildProcess | null = null;

const SCRIPT = `
$ErrorActionPreference = 'Stop'
try {
  Get-Counter -Counter '\\PhysicalDisk(_Total)\\Disk Read Bytes/sec','\\PhysicalDisk(_Total)\\Disk Write Bytes/sec' -SampleInterval 1 -MaxSamples 1000000 |
    ForEach-Object {
      $r = 0; $w = 0
      foreach ($s in $_.CounterSamples) {
        if ($s.Path -match 'read')  { $r = [math]::Round($s.CookedValue) }
        if ($s.Path -match 'write') { $w = [math]::Round($s.CookedValue) }
      }
      Write-Output ("DISKIO " + $r + " " + $w)
    }
} catch { Write-Output 'DISKIO_UNAVAILABLE' }
`;

export function startDiskCounters(): void {
  try {
    proc = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', SCRIPT], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore']
    });
    let buf = '';
    proc.stdout!.on('data', (chunk: Buffer) => {
      buf += chunk.toString();
      const lines = buf.split(/\r?\n/);
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (line.startsWith('DISKIO_UNAVAILABLE')) {
          readBps = null;
          writeBps = null;
          proc?.kill();
          proc = null;
          return;
        }
        const m = line.match(/^DISKIO (\d+) (\d+)/);
        if (m) {
          readBps = parseInt(m[1], 10);
          writeBps = parseInt(m[2], 10);
        }
      }
    });
    proc.on('exit', () => {
      proc = null;
    });
  } catch {
    proc = null;
  }
}

export function stopDiskCounters(): void {
  proc?.kill();
  proc = null;
}

export function getDiskIO(): { readBps: number | null; writeBps: number | null } {
  return { readBps, writeBps };
}
