import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_SETTINGS, Settings, Snapshot, THRESHOLDS, WidgetMode } from '../../shared/types';
import { makeT } from '../i18n';
import {
  DASH, fmtBitRate, fmtBytes, fmtGHz, fmtMHz, fmtPct, fmtTemp, fmtUptime, fmtWatt,
  Severity3, severityFor
} from '../utils/format';
import MetricRow from './common/MetricRow';
import Gauge from './charts/Gauge';
import { applyTheme } from '../utils/theme';

interface Props {
  section: string;
}

const META: Record<string, { icon: string; titleKey: Parameters<ReturnType<typeof makeT>>[0] }> = {
  cpu: { icon: '🖥️', titleKey: 'cpu' },
  gpu: { icon: '🎮', titleKey: 'gpu' },
  ram: { icon: '💾', titleKey: 'ram' },
  board: { icon: '🔧', titleKey: 'motherboard' },
  net: { icon: '🌐', titleKey: 'network' },
  storage: { icon: '💽', titleKey: 'storage' },
  security: { icon: '🛡️', titleKey: 'security' }
};

interface GaugeSpec {
  value: number | null;
  max: number;
  unit: string;
  sub?: string;
  severity: Severity3;
}

/** A detached, draggable mini-widget window for one hardware section. */
const WidgetApp: React.FC<Props> = ({ section }) => {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    void window.usm.getSettings().then(setSettings);
    const offSnap = window.usm.onSnapshot(setSnap);
    const offSettings = window.usm.onSettingsChanged(setSettings);
    return () => {
      offSnap();
      offSettings();
    };
  }, []);

  useEffect(() => {
    applyTheme(settings);
    document.body.classList.add('widget-mode');
  }, [settings.theme, settings.accentColor]);

  // Scale the speedometer to the (resizable) window.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [gaugeSize, setGaugeSize] = useState(190);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setGaugeSize(Math.max(130, Math.min(360, Math.min(el.clientWidth - 16, el.clientHeight - 6))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  });

  const t = useMemo(() => makeT(settings.language), [settings.language]);
  const mode: WidgetMode = settings.widgets[section]?.mode ?? 'card';
  const meta = META[section] ?? META.cpu;
  const gpu = snap?.gpus[0] ?? null;

  const gauge: GaugeSpec | null = useMemo(() => {
    if (!snap) return null;
    switch (section) {
      case 'cpu':
        return {
          value: snap.cpu.load, max: 100, unit: '%',
          sub: `${fmtTemp(snap.cpu.packageTempC)} · ${fmtGHz(snap.cpu.currentSpeedGHz)}`,
          severity: severityFor(snap.cpu.load, 70, THRESHOLDS.cpuUsage.warn)
        };
      case 'gpu':
        return {
          value: gpu?.load ?? null, max: 100, unit: '%',
          sub: `${fmtTemp(gpu?.tempC ?? null)} · ${fmtWatt(gpu?.powerW ?? null)}`,
          severity: severityFor(gpu?.tempC, THRESHOLDS.gpuTemp.warn, THRESHOLDS.gpuTemp.crit)
        };
      case 'ram':
        return {
          value: snap.mem.usagePct, max: 100, unit: '%',
          sub: `${fmtBytes(snap.mem.usedB)} / ${fmtBytes(snap.mem.totalB)}`,
          severity: severityFor(snap.mem.usagePct, THRESHOLDS.ramUsage.warn, THRESHOLDS.ramUsage.crit)
        };
      case 'net': {
        const link = snap.net.adapters.find(a => a.iface === snap.net.activeIface)?.speedMbps ?? 1000;
        return {
          value: (snap.net.rxBps * 8) / 1e6, max: Math.max(10, link), unit: 'Mbps',
          sub: `⬆ ${fmtBitRate(snap.net.txBps)} · ${snap.net.latencyMs !== null ? `${snap.net.latencyMs}ms` : DASH}`,
          severity: 'ok'
        };
      }
      case 'storage': {
        const worst = Math.max(0, ...snap.storage.drives.map(d => d.usagePct));
        return {
          value: worst, max: 100, unit: '%',
          sub: `${snap.storage.drives.length} drive(s)`,
          severity: severityFor(worst, THRESHOLDS.storage.warn, THRESHOLDS.storage.crit)
        };
      }
      case 'board':
        return {
          value: snap.board.tempC, max: 100, unit: '°C',
          sub: `VRM ${fmtTemp(snap.board.vrmTempC)}`,
          severity: severityFor(snap.board.tempC, 55, 70)
        };
      case 'security':
        return {
          value: snap.security.healthScore, max: 100, unit: '',
          sub: fmtUptime(snap.security.uptimeSec),
          severity: snap.security.healthScore >= 80 ? 'ok' : snap.security.healthScore >= 60 ? 'warn' : 'crit'
        };
      default:
        return null;
    }
  }, [snap, section, gpu]);

  const rows = useMemo(() => {
    if (!snap) return [];
    switch (section) {
      case 'cpu':
        return [
          { l: t('overallLoad'), v: fmtPct(snap.cpu.load), b: snap.cpu.load, s: severityFor(snap.cpu.load, 70, THRESHOLDS.cpuUsage.warn) },
          { l: t('temperature'), v: fmtTemp(snap.cpu.packageTempC), b: snap.cpu.packageTempC, s: severityFor(snap.cpu.packageTempC, THRESHOLDS.cpuTemp.warn, THRESHOLDS.cpuTemp.crit) },
          { l: t('currentClock'), v: fmtGHz(snap.cpu.currentSpeedGHz) },
          { l: t('power'), v: fmtWatt(snap.cpu.powerW) }
        ];
      case 'gpu':
        return gpu
          ? [
              { l: t('coreLoad'), v: fmtPct(gpu.load), b: gpu.load, s: severityFor(gpu.load, 90, 97) },
              { l: t('temperature'), v: fmtTemp(gpu.tempC), b: gpu.tempC, s: severityFor(gpu.tempC, THRESHOLDS.gpuTemp.warn, THRESHOLDS.gpuTemp.crit) },
              { l: t('coreClock'), v: fmtMHz(gpu.coreClockMHz) },
              { l: t('vramUsed'), v: gpu.vramUsedMB !== null ? `${fmtBytes(gpu.vramUsedMB * 1024 ** 2)} / ${fmtBytes((gpu.vramTotalMB ?? 0) * 1024 ** 2)}` : DASH },
              { l: t('powerDraw'), v: gpu.powerW !== null ? `${fmtWatt(gpu.powerW)}${gpu.powerLimitW ? ` / ${fmtWatt(gpu.powerLimitW)}` : ''}` : DASH }
            ]
          : [];
      case 'ram':
        return [
          { l: t('usage'), v: fmtPct(snap.mem.usagePct), b: snap.mem.usagePct, s: severityFor(snap.mem.usagePct, THRESHOLDS.ramUsage.warn, THRESHOLDS.ramUsage.crit) },
          { l: t('used'), v: `${fmtBytes(snap.mem.usedB)} / ${fmtBytes(snap.mem.totalB)}` },
          { l: t('speed'), v: snap.mem.speedMHz ? `${snap.mem.speedMHz} MHz` : DASH },
          { l: t('cache'), v: fmtBytes(snap.mem.cachedB) }
        ];
      case 'board':
        return [
          { l: t('temperature'), v: fmtTemp(snap.board.tempC), b: snap.board.tempC, s: severityFor(snap.board.tempC, 55, 70) },
          { l: t('vrmTemp'), v: fmtTemp(snap.board.vrmTempC) },
          { l: t('biosVersion'), v: snap.board.biosVersion },
          { l: t('rail12'), v: snap.board.rail12V !== null ? `${snap.board.rail12V.toFixed(2)}V` : DASH }
        ];
      case 'net':
        return [
          { l: `⬇ ${t('download')}`, v: fmtBitRate(snap.net.rxBps) },
          { l: `⬆ ${t('upload')}`, v: fmtBitRate(snap.net.txBps) },
          { l: t('latency'), v: snap.net.latencyMs !== null ? `${snap.net.latencyMs}ms` : DASH },
          { l: t('totalToday'), v: `⬇ ${fmtBytes(snap.net.todayRxB)} ⬆ ${fmtBytes(snap.net.todayTxB)}` }
        ];
      case 'storage':
        return snap.storage.drives.slice(0, 4).map(d => ({
          l: `${d.mount} ${d.type}`,
          v: `${fmtPct(d.usagePct)}${d.tempC !== null ? ` · ${fmtTemp(d.tempC)}` : ''}`,
          b: d.usagePct,
          s: severityFor(d.usagePct, THRESHOLDS.storage.warn, THRESHOLDS.storage.crit)
        }));
      case 'security':
        return [
          { l: t('defender'), v: snap.security.defenderEnabled === null ? DASH : snap.security.defenderEnabled ? `✅ ${t('active')}` : `🔥 ${t('inactive')}` },
          { l: t('firewall'), v: snap.security.firewallEnabled === null ? DASH : snap.security.firewallEnabled ? `✅ ${t('enabled')}` : `🔥 ${t('disabled')}` },
          { l: t('uptime'), v: fmtUptime(snap.security.uptimeSec) },
          { l: t('healthScore'), v: `${snap.security.healthScore}/100`, b: snap.security.healthScore, s: (snap.security.healthScore >= 80 ? 'ok' : snap.security.healthScore >= 60 ? 'warn' : 'crit') as Severity3 }
        ];
      default:
        return [];
    }
  }, [snap, section, gpu, t]);

  const title = section === 'gpu' && gpu ? gpu.model : t(meta.titleKey);
  const toggleMode = () => window.usm.setWidgetMode(section, mode === 'card' ? 'speedo' : 'card');

  // GPU widget with no GPU detected: show nothing but an explanatory shell.
  if (snap && section === 'gpu' && !gpu) {
    return (
      <div className="widget glass">
        <div className="widget__bar">
          <span className="widget__icon">🎮</span>
          <span className="widget__title">{t('gpu')}</span>
          <div className="widget__controls">
            <button title={t('close')} onClick={() => window.usm.closeWidget(section)}>×</button>
          </div>
        </div>
        <div className="widget__empty">{DASH}</div>
      </div>
    );
  }

  return (
    <div className="widget glass">
      <div className="widget__bar">
        <span className="widget__icon">{meta.icon}</span>
        <span className="widget__title" title={title}>{title}</span>
        <div className="widget__controls">
          <button title={mode === 'card' ? 'Speedometer view' : 'Card view'} onClick={toggleMode}>
            {mode === 'card' ? '🧭' : '📋'}
          </button>
          <button title={t('close')} onClick={() => window.usm.closeWidget(section)}>×</button>
        </div>
      </div>

      {!snap && <div className="widget__empty"><div className="splash__spinner" /></div>}

      {snap && mode === 'speedo' && gauge && (
        <div className="widget__gaugewrap" ref={wrapRef}>
          <Gauge
            value={gauge.value} max={gauge.max} unit={gauge.unit}
            label={title} severity={gauge.severity} sub={gauge.sub} size={gaugeSize}
          />
        </div>
      )}

      {snap && mode === 'card' && (
        <div className="widget__body">
          {rows.map((r, i) => (
            <MetricRow
              key={i} label={r.l} value={r.v}
              barValue={'b' in r ? (r as { b?: number | null }).b ?? undefined : undefined}
              severity={('s' in r ? (r as { s?: Severity3 }).s : 'ok') ?? 'ok'}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default WidgetApp;
