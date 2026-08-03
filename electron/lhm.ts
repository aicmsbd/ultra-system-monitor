/**
 * LibreHardwareMonitor bridge.
 *
 * If the user runs LibreHardwareMonitor with its built-in web server enabled
 * (Options -> Remote Web Server, default port 8085), we read its JSON sensor
 * tree and enrich the systeminformation data with deep sensors that Windows
 * does not expose to unprivileged processes: per-core temperatures, CPU/SoC
 * voltages and package power, VRM & motherboard temperatures, voltage rails,
 * fan/pump RPM, RAM temperature and per-drive throughput.
 *
 * Entirely optional — the app degrades gracefully when LHM is not running.
 */

export interface LhmSensor {
  hardware: string;
  hardwareType: string;
  group: string;
  name: string;
  value: number;
}

interface LhmNode {
  Text?: string;
  ImageURL?: string;
  Value?: string;
  Children?: LhmNode[];
}

const LHM_URL = 'http://localhost:8085/data.json';

let connected = false;
let sensors: LhmSensor[] = [];
let lastAttempt = 0;

function parseValue(v: string | undefined): number | null {
  if (!v) return null;
  const m = v.replace(',', '.').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function hardwareTypeFromImage(url: string | undefined): string {
  if (!url) return 'unknown';
  const m = url.match(/([a-z_]+)\.png/i);
  return m ? m[1].toLowerCase() : 'unknown';
}

function walk(node: LhmNode, hw: string, hwType: string, group: string, out: LhmSensor[]): void {
  const kids = node.Children ?? [];
  const text = node.Text ?? '';
  if (kids.length === 0) {
    const value = parseValue(node.Value);
    if (value !== null && hw && group) {
      out.push({ hardware: hw, hardwareType: hwType, group, name: text, value });
    }
    return;
  }
  for (const child of kids) {
    const childText = child.Text ?? '';
    if (!hw && childText && childText !== 'Sensor') {
      // Hardware level (mainboard, cpu, gpu, ram, hdd, nic...)
      walk(child, childText, hardwareTypeFromImage(child.ImageURL), '', out);
    } else if (hw && !group && (child.Children?.length ?? 0) > 0 && (child.Children![0].Children?.length ?? 0) === 0) {
      // Group level (Temperatures, Voltages, Fans, Powers, Clocks, Load, Throughput...)
      walk(child, hw, hwType, childText, out);
    } else if (hw && !group) {
      // Sub-hardware level (e.g. SuperIO chip under mainboard)
      walk(child, `${hw} / ${childText}`, hwType, '', out);
    } else {
      walk(child, hw, hwType, group, out);
    }
  }
}

/** Poll the LHM web server; refreshes the sensor cache. Cheap no-op when offline. */
export async function refresh(): Promise<void> {
  const now = Date.now();
  // When offline, only retry every 15 s to avoid useless socket churn.
  if (!connected && now - lastAttempt < 15_000) return;
  lastAttempt = now;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(LHM_URL, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const root = (await res.json()) as LhmNode;
    const out: LhmSensor[] = [];
    walk(root, '', 'unknown', '', out);
    sensors = out;
    if (!connected) console.log('[lhm] connected to LibreHardwareMonitor web server');
    connected = true;
  } catch {
    if (connected) console.log('[lhm] lost connection to LibreHardwareMonitor');
    connected = false;
    sensors = [];
  }
}

export function isConnected(): boolean {
  return connected;
}

function find(pred: (s: LhmSensor) => boolean): number | null {
  const s = sensors.find(pred);
  return s ? s.value : null;
}

const has = (str: string, sub: string) => str.toLowerCase().includes(sub.toLowerCase());

export const lhmQuery = {
  cpuPackageTemp: () =>
    find(s => s.hardwareType.includes('cpu') && s.group === 'Temperatures' && (has(s.name, 'package') || has(s.name, 'tctl') || has(s.name, 'average'))) ??
    find(s => s.hardwareType.includes('cpu') && s.group === 'Temperatures'),
  cpuCoreTemp: (idx: number) =>
    find(s => s.hardwareType.includes('cpu') && s.group === 'Temperatures' && new RegExp(`core #?${idx + 1}\\b`, 'i').test(s.name)),
  cpuVoltage: () =>
    find(s => s.hardwareType.includes('cpu') && s.group === 'Voltages' && (has(s.name, 'core') || has(s.name, 'vid'))),
  cpuPower: () =>
    find(s => s.hardwareType.includes('cpu') && s.group === 'Powers' && (has(s.name, 'package') || has(s.name, 'cpu'))),
  cpuFan: () =>
    find(s => s.group === 'Fans' && has(s.name, 'cpu')) ??
    find(s => s.hardware.toLowerCase().includes('mainboard') && s.group === 'Fans' && s.name === 'Fan #1'),
  boardTemp: () =>
    find(s => (s.hardwareType.includes('mainboard') || has(s.hardware, 'mainboard') || has(s.hardware, 'motherboard')) && s.group === 'Temperatures' && (has(s.name, 'system') || has(s.name, 'motherboard') || has(s.name, 'temperature #1'))) ??
    find(s => s.hardwareType.includes('mainboard') && s.group === 'Temperatures'),
  vrmTemp: () =>
    find(s => s.group === 'Temperatures' && (has(s.name, 'vrm') || has(s.name, 'vr mos'))),
  rail: (volts: 12 | 5 | 3.3) => {
    const label = volts === 3.3 ? '3.3v' : `${volts}v`;
    return find(s => s.group === 'Voltages' && (has(s.name, `+${label}`) || s.name.toLowerCase() === label));
  },
  fans: (): { name: string; rpm: number }[] =>
    sensors
      .filter(s => (s.group === 'Fans' || has(s.group, 'fan')) && s.value > 0)
      .map(s => ({ name: s.name, rpm: Math.round(s.value) })),
  ramTemp: () =>
    find(s => (s.hardwareType.includes('ram') || has(s.hardware, 'memory')) && s.group === 'Temperatures'),
  gpuVoltage: (model: string) =>
    find(s => has(s.hardware, model.split(' ').pop() ?? '') && s.hardwareType.includes('gpu') && s.group === 'Voltages'),
  gpuFanRpm: () =>
    find(s => s.hardwareType.includes('gpu') && s.group === 'Fans'),
  driveTemp: (model: string) =>
    find(s => (s.hardwareType.includes('hdd') || s.hardwareType.includes('ssd') || s.hardwareType.includes('nvme')) && has(s.hardware, model.slice(0, 12)) && s.group === 'Temperatures'),
  driveThroughput: (model: string, kind: 'read' | 'write') =>
    find(s => (s.hardwareType.includes('hdd') || s.hardwareType.includes('ssd') || s.hardwareType.includes('nvme')) && has(s.hardware, model.slice(0, 12)) && has(s.group, 'throughput') && has(s.name, kind))
};
