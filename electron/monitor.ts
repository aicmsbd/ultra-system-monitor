import * as si from 'systeminformation';
import * as os from 'os';
import {
  BoardData, CpuData, DriveData, GpuData, HardwareDetails, MemData, NetData, Snapshot, StorageData
} from '../shared/types';
import * as lhm from './lhm';
import { getDiskIO } from './perf-counters';
import { getLatency } from './pinger';
import { getSecurity } from './security';
import { evaluateAlerts, healthScore } from './alerts';
import { addNetUsage, maybeLog } from './history';

/**
 * Sensor aggregation. Primary source: systeminformation (cross-platform,
 * pure JS). Deep sensors (per-core temps, voltages, VRM, fans, rails) are
 * layered in from the LibreHardwareMonitor bridge when its web server is
 * reachable. Every probe is individually fault-isolated: a failing sensor
 * renders as "—" instead of breaking the tick.
 */

interface StaticInfo {
  cpu: si.Systeminformation.CpuData | null;
  memLayout: si.Systeminformation.MemLayoutData[];
  baseboard: si.Systeminformation.BaseboardData | null;
  bios: si.Systeminformation.BiosData | null;
  diskLayout: si.Systeminformation.DiskLayoutData[];
  osInfo: si.Systeminformation.OsData | null;
}

const staticInfo: StaticInfo = {
  cpu: null,
  memLayout: [],
  baseboard: null,
  bios: null,
  diskLayout: [],
  osInfo: null
};

async function safe<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch {
    return null;
  }
}

export async function initStatic(): Promise<void> {
  const [cpu, memLayout, baseboard, bios, diskLayout, osInfo] = await Promise.all([
    safe(si.cpu()),
    safe(si.memLayout()),
    safe(si.baseboard()),
    safe(si.bios()),
    safe(si.diskLayout()),
    safe(si.osInfo())
  ]);
  staticInfo.cpu = cpu;
  staticInfo.memLayout = memLayout ?? [];
  staticInfo.baseboard = baseboard;
  staticInfo.bios = bios;
  staticInfo.diskLayout = diskLayout ?? [];
  staticInfo.osInfo = osInfo;
}

// Slow-changing data is polled on its own cadence and cached between ticks.
let fsSizeCache: si.Systeminformation.FsSizeData[] = [];
let graphicsCache: si.Systeminformation.GraphicsData | null = null;
let cpuTempCache: si.Systeminformation.CpuTemperatureData | null = null;
let lastFsPoll = 0;
let lastGfxPoll = 0;
let lastTempPoll = 0;

async function pollSlow(now: number): Promise<void> {
  const jobs: Promise<unknown>[] = [];
  if (now - lastFsPoll > 15_000) {
    lastFsPoll = now;
    jobs.push(safe(si.fsSize()).then(v => { if (v) fsSizeCache = v; }));
  }
  if (now - lastGfxPoll > 2_000) {
    lastGfxPoll = now;
    jobs.push(safe(si.graphics()).then(v => { if (v) graphicsCache = v; }));
  }
  if (now - lastTempPoll > 2_000) {
    lastTempPoll = now;
    jobs.push(safe(si.cpuTemperature()).then(v => { if (v) cpuTempCache = v; }));
  }
  await Promise.all(jobs);
}

function buildCpu(
  load: si.Systeminformation.CurrentLoadData | null,
  speed: si.Systeminformation.CpuCurrentSpeedData | null
): CpuData {
  const stat = staticInfo.cpu;
  const threads = load?.cpus?.length ?? stat?.cores ?? 0;
  const lhmOn = lhm.isConnected();

  const siCoreTemps = cpuTempCache?.cores ?? [];
  const cores = (load?.cpus ?? []).map((c, i) => {
    let tempC: number | null = null;
    if (lhmOn) {
      // LHM reports one temp per physical core; map logical -> physical (SMT pairs).
      const physical = stat?.physicalCores ? Math.floor(i / Math.max(1, threads / stat.physicalCores)) : i;
      tempC = lhm.lhmQuery.cpuCoreTemp(physical);
    }
    if (tempC === null && siCoreTemps[i] !== undefined && siCoreTemps[i] > 0) tempC = siCoreTemps[i];
    return {
      index: i,
      load: Math.round(c.load * 10) / 10,
      tempC,
      speedGHz: speed?.cores?.[i] ?? null
    };
  });

  let packageTempC = lhmOn ? lhm.lhmQuery.cpuPackageTemp() : null;
  if (packageTempC === null && cpuTempCache?.main && cpuTempCache.main > 0) packageTempC = cpuTempCache.main;

  return {
    model: stat ? `${stat.manufacturer} ${stat.brand}`.trim() : 'Unknown CPU',
    vendor: stat?.vendor ?? '',
    physicalCores: stat?.physicalCores ?? 0,
    threads,
    load: load ? Math.round(load.currentLoad * 10) / 10 : 0,
    packageTempC,
    baseSpeedGHz: stat?.speed ?? 0,
    currentSpeedGHz: speed?.avg ?? null,
    voltage: lhmOn ? lhm.lhmQuery.cpuVoltage() : null,
    powerW: lhmOn ? lhm.lhmQuery.cpuPower() : null,
    fanRpm: lhmOn ? lhm.lhmQuery.cpuFan() : null,
    cores
  };
}

function buildGpus(): GpuData[] {
  const controllers = graphicsCache?.controllers ?? [];
  return controllers
    // Only real GPUs: skip phantom/software adapters so the GPU section and
    // widget appear solely when actual graphics hardware is detected.
    .filter(c => c.model && !/basic (display|render)|microsoft remote|virtual|vnc|teamviewer|parsec/i.test(c.model))
    .map(c => {
      const vendor = (c.vendor ?? '').toLowerCase();
      const vendorName = vendor.includes('nvidia') ? 'NVIDIA' : vendor.includes('amd') || vendor.includes('advanced micro') ? 'AMD' : vendor.includes('intel') ? 'Intel' : c.vendor ?? 'Unknown';
      return {
        model: c.model,
        vendor: vendorName,
        load: c.utilizationGpu ?? null,
        tempC: c.temperatureGpu ?? null,
        coreClockMHz: c.clockCore ?? null,
        memClockMHz: c.clockMemory ?? null,
        vramUsedMB: c.memoryUsed ?? null,
        vramTotalMB: c.memoryTotal ?? (c.vram && c.vram > 0 ? c.vram : null),
        powerW: c.powerDraw ?? null,
        powerLimitW: c.powerLimit ?? null,
        fanPct: c.fanSpeed ?? null,
        fanRpm: lhm.isConnected() ? lhm.lhmQuery.gpuFanRpm() : null,
        voltage: lhm.isConnected() ? lhm.lhmQuery.gpuVoltage(c.model) : null
      };
    });
}

function buildMem(mem: si.Systeminformation.MemData | null): MemData {
  const layout = staticInfo.memLayout;
  const speed = layout.length ? Math.max(...layout.map(m => m.clockSpeed ?? 0)) : 0;
  const total = mem?.total ?? os.totalmem();
  const available = mem?.available ?? os.freemem();
  const used = total - available;
  return {
    totalB: total,
    usedB: used,
    availableB: available,
    usagePct: total > 0 ? Math.round((used / total) * 1000) / 10 : 0,
    cachedB: mem?.cached ?? 0,
    swapTotalB: mem?.swaptotal ?? 0,
    swapUsedB: mem?.swapused ?? 0,
    speedMHz: speed > 0 ? speed : null,
    type: layout[0]?.type || null,
    voltage: layout[0]?.voltageConfigured ?? null,
    tempC: lhm.isConnected() ? lhm.lhmQuery.ramTemp() : null,
    // Heuristic: DDR4 above JEDEC 2400 / DDR5 above 4800 implies an XMP/DOCP profile.
    xmpActive: speed > 0 ? speed > (layout[0]?.type === 'DDR5' ? 4800 : 2400) : null
  };
}

function buildBoard(): BoardData {
  const lhmOn = lhm.isConnected();
  return {
    model: staticInfo.baseboard?.model ?? 'Unknown',
    vendor: staticInfo.baseboard?.manufacturer ?? '',
    biosVersion: staticInfo.bios?.version ?? '—',
    biosDate: staticInfo.bios?.releaseDate ?? null,
    tempC: lhmOn ? lhm.lhmQuery.boardTemp() : null,
    vrmTempC: lhmOn ? lhm.lhmQuery.vrmTemp() : null,
    rail12V: lhmOn ? lhm.lhmQuery.rail(12) : null,
    rail5V: lhmOn ? lhm.lhmQuery.rail(5) : null,
    rail33V: lhmOn ? lhm.lhmQuery.rail(3.3) : null,
    fans: lhmOn ? lhm.lhmQuery.fans() : []
  };
}

function buildNet(
  ifaces: si.Systeminformation.NetworkInterfacesData[] | null,
  stats: si.Systeminformation.NetworkStatsData[] | null,
  tickMs: number
): NetData {
  const list = (ifaces ?? []).filter(i => !i.internal && !i.virtual);
  const statList = stats ?? [];
  // Active adapter: the one moving the most traffic, else the default interface.
  let active: si.Systeminformation.NetworkStatsData | null = null;
  for (const s of statList) {
    if (!active || (s.rx_sec ?? 0) + (s.tx_sec ?? 0) > (active.rx_sec ?? 0) + (active.tx_sec ?? 0)) {
      active = s;
    }
  }
  const rxBps = Math.max(0, active?.rx_sec ?? 0);
  const txBps = Math.max(0, active?.tx_sec ?? 0);
  const totals = addNetUsage(rxBps * (tickMs / 1000), txBps * (tickMs / 1000));
  const { latencyMs, target } = getLatency();
  return {
    adapters: list.map(i => ({
      iface: i.iface,
      name: i.ifaceName || i.iface,
      type: i.type === 'wireless' ? 'WiFi' : i.type === 'wired' ? 'Ethernet' : i.type || 'Unknown',
      speedMbps: i.speed && i.speed > 0 ? i.speed : null,
      ip4: i.ip4 || '—'
    })),
    activeIface: active?.iface ?? null,
    rxBps,
    txBps,
    latencyMs,
    latencyTarget: target,
    todayRxB: totals.dayRx,
    todayTxB: totals.dayTx,
    monthRxB: totals.monthRx,
    monthTxB: totals.monthTx
  };
}

function buildStorage(): StorageData {
  const io = getDiskIO();
  const lhmOn = lhm.isConnected();
  const drives: DriveData[] = fsSizeCache
    .filter(f => f.size > 0)
    .map(f => {
      const layout = staticInfo.diskLayout.find(d =>
        d.device && f.fs && d.device.toLowerCase().includes(f.fs.replace(':', '').toLowerCase())
      ) ?? staticInfo.diskLayout[0];
      const model = layout?.name ?? 'Drive';
      const type = layout?.interfaceType === 'NVMe' || /nvme/i.test(model) ? 'NVMe'
        : layout?.type === 'SSD' ? 'SSD'
        : layout?.type === 'HD' ? 'HDD'
        : layout?.type ?? 'Disk';
      let tempC = layout && typeof (layout as { temperature?: number }).temperature === 'number'
        ? (layout as { temperature?: number }).temperature ?? null
        : null;
      if (tempC === null && lhmOn) tempC = lhm.lhmQuery.driveTemp(model);
      return {
        mount: f.mount ?? f.fs,
        model,
        type,
        sizeB: f.size,
        usedB: f.used,
        usagePct: Math.round((f.use ?? (f.used / f.size) * 100) * 10) / 10,
        tempC,
        smartStatus: layout?.smartStatus && layout.smartStatus !== 'unknown' ? layout.smartStatus : null,
        readBps: lhmOn ? lhm.lhmQuery.driveThroughput(model, 'read') : null,
        writeBps: lhmOn ? lhm.lhmQuery.driveThroughput(model, 'write') : null
      };
    });
  return { drives, totalReadBps: io.readBps, totalWriteBps: io.writeBps };
}

/** Extended hardware inventory for the per-section detail views (on demand). */
export async function collectDetails(): Promise<HardwareDetails> {
  const stat = staticInfo.cpu;
  const gfx = graphicsCache ?? (await safe(si.graphics()));
  const ifaces = (await safe(si.networkInterfaces())) as si.Systeminformation.NetworkInterfacesData[] | null;
  const str = (v: unknown): string | null => (v === undefined || v === null || v === '' ? null : String(v));

  return {
    cpu: stat
      ? {
          model: `${stat.manufacturer} ${stat.brand}`.trim(),
          vendor: stat.vendor ?? '',
          socket: str(stat.socket),
          family: str(stat.family),
          modelId: str(stat.model),
          stepping: str(stat.stepping),
          physicalCores: stat.physicalCores,
          threads: stat.cores,
          baseGHz: stat.speed,
          maxGHz: stat.speedMax ?? null,
          cacheL1dKB: stat.cache?.l1d ? Math.round(stat.cache.l1d / 1024) : null,
          cacheL1iKB: stat.cache?.l1i ? Math.round(stat.cache.l1i / 1024) : null,
          cacheL2KB: stat.cache?.l2 ? Math.round(stat.cache.l2 / 1024) : null,
          cacheL3KB: stat.cache?.l3 ? Math.round(stat.cache.l3 / 1024) : null,
          virtualization: stat.virtualization ?? null
        }
      : null,
    gpus: (gfx?.controllers ?? [])
      .filter(c => c.model)
      .map(c => ({
        model: c.model,
        vendor: c.vendor ?? '',
        bus: str(c.bus),
        vramTotalMB: c.memoryTotal ?? (c.vram && c.vram > 0 ? c.vram : null),
        driverVersion: str((c as { driverVersion?: string }).driverVersion),
        subDeviceId: str(c.subDeviceId)
      })),
    displays: (gfx?.displays ?? []).map(d => ({
      model: d.model || d.deviceName || 'Display',
      main: !!d.main,
      resX: d.resolutionX ?? null,
      resY: d.resolutionY ?? null,
      refreshHz: d.currentRefreshRate ?? null
    })),
    dimms: staticInfo.memLayout.map((m, i) => ({
      bank: m.bank || `DIMM ${i}`,
      sizeB: m.size,
      type: m.type || '—',
      clockMHz: m.clockSpeed ?? null,
      formFactor: str(m.formFactor),
      manufacturer: str(m.manufacturer),
      partNum: str(m.partNum),
      voltage: m.voltageConfigured ?? null
    })),
    netIfaces: (ifaces ?? [])
      .filter(i => !i.internal)
      .map(i => ({
        iface: i.iface,
        name: i.ifaceName || i.iface,
        type: i.type === 'wireless' ? 'WiFi' : i.type === 'wired' ? 'Ethernet' : i.type || 'Unknown',
        mac: i.mac || '—',
        ip4: i.ip4 || '—',
        ip6: i.ip6 || '—',
        speedMbps: i.speed && i.speed > 0 ? i.speed : null,
        dhcp: i.dhcp ?? null,
        isDefault: !!i.default
      })),
    disks: staticInfo.diskLayout.map(d => ({
      device: d.device || '—',
      name: d.name || 'Drive',
      type: d.type || '—',
      interfaceType: str(d.interfaceType),
      sizeB: d.size,
      firmware: str(d.firmwareRevision),
      smartStatus: d.smartStatus && d.smartStatus !== 'unknown' ? d.smartStatus : null
    })),
    board: staticInfo.baseboard
      ? {
          manufacturer: staticInfo.baseboard.manufacturer ?? '',
          model: staticInfo.baseboard.model ?? '—',
          version: str(staticInfo.baseboard.version),
          biosVendor: str(staticInfo.bios?.vendor),
          biosVersion: staticInfo.bios?.version ?? '—',
          biosDate: str(staticInfo.bios?.releaseDate),
          memMaxB: staticInfo.baseboard.memMax ?? null,
          memSlots: staticInfo.baseboard.memSlots ?? null
        }
      : null,
    os: staticInfo.osInfo
      ? {
          distro: staticInfo.osInfo.distro,
          release: staticInfo.osInfo.release,
          build: str(staticInfo.osInfo.build),
          arch: staticInfo.osInfo.arch,
          hostname: str(staticInfo.osInfo.hostname)
        }
      : null
  };
}

export async function collectSnapshot(tickMs: number, alertsEnabled: boolean): Promise<Snapshot> {
  const now = Date.now();
  await lhm.refresh();
  const [load, speed, mem, ifaces, stats] = await Promise.all([
    safe(si.currentLoad()),
    safe(si.cpuCurrentSpeed()),
    safe(si.mem()),
    safe(si.networkInterfaces()) as Promise<si.Systeminformation.NetworkInterfacesData[] | null>,
    safe(si.networkStats('*')),
    pollSlow(now)
  ]);

  const sec = getSecurity();
  const snap: Snapshot = {
    ts: now,
    cpu: buildCpu(load, speed),
    gpus: buildGpus(),
    mem: buildMem(mem),
    board: buildBoard(),
    net: buildNet(ifaces, stats, tickMs),
    storage: buildStorage(),
    security: {
      ...sec,
      uptimeSec: os.uptime(),
      healthScore: 100 // filled below once the full snapshot exists
    },
    alerts: [],
    lhmConnected: lhm.isConnected(),
    osName: staticInfo.osInfo ? `${staticInfo.osInfo.distro} ${staticInfo.osInfo.arch}` : 'Windows'
  };
  snap.security.healthScore = healthScore(snap);
  snap.alerts = evaluateAlerts(snap, alertsEnabled);
  maybeLog(snap);
  return snap;
}
