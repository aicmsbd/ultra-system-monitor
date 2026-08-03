import { execFile } from 'child_process';

/**
 * Latency monitor: pings 8.8.8.8 (fallback 1.1.1.1) every 5 seconds using the
 * native Windows ping binary — no npm dependency, no raw-socket privileges.
 */

const TARGETS = ['8.8.8.8', '1.1.1.1'];
let latencyMs: number | null = null;
let targetIdx = 0;

function pingOnce(host: string): Promise<number | null> {
  return new Promise(resolve => {
    execFile(
      'ping',
      ['-n', '1', '-w', '1500', host],
      { timeout: 4000, windowsHide: true },
      (err, stdout) => {
        if (err) return resolve(null);
        // Matches "time=12ms" / "time<1ms" and localized variants like "Zeit=12ms".
        const m = stdout.match(/[=<](\d+)\s?ms/i);
        resolve(m ? parseInt(m[1], 10) : null);
      }
    );
  });
}

export function startPinger(): void {
  const tick = async () => {
    const result = await pingOnce(TARGETS[targetIdx]);
    if (result === null) targetIdx = (targetIdx + 1) % TARGETS.length;
    latencyMs = result;
  };
  void tick();
  setInterval(() => void tick(), 5000);
}

export function getLatency(): { latencyMs: number | null; target: string } {
  return { latencyMs, target: TARGETS[targetIdx] };
}
