import React, { useEffect, useState } from 'react';
import { HardwareDetails, Snapshot } from '../../shared/types';
import { TKey } from '../i18n';
import {
  DASH, fmtBitRate, fmtBytes, fmtGHz, fmtMHz, fmtPct, fmtRpm, fmtTemp, fmtUptime, fmtVolt, fmtWatt, severityFor
} from '../utils/format';

interface Props {
  section: string;
  snap: Snapshot;
  t: (k: TKey) => string;
  onClose: () => void;
}

const KV: React.FC<{ k: string; v: React.ReactNode }> = ({ k, v }) => (
  <div className="detail__row">
    <span className="detail__key">{k}</span>
    <span className="detail__val">{v}</span>
  </div>
);

const Group: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="detail__group">
    <div className="detail__grouptitle">{title}</div>
    {children}
  </div>
);

const TITLES: Record<string, { icon: string; key: TKey }> = {
  cpu: { icon: '🖥️', key: 'cpu' },
  gpu: { icon: '🎮', key: 'gpu' },
  ram: { icon: '💾', key: 'ram' },
  board: { icon: '🔧', key: 'motherboard' },
  net: { icon: '🌐', key: 'network' },
  storage: { icon: '💽', key: 'storage' },
  security: { icon: '🛡️', key: 'security' }
};

/** Full-detail modal for a hardware section: static inventory + live values. */
const DetailOverlay: React.FC<Props> = ({ section, snap, t, onClose }) => {
  const [det, setDet] = useState<HardwareDetails | null>(null);
  useEffect(() => {
    void window.usm.getDetails().then(setDet);
  }, []);

  const title = TITLES[section] ?? TITLES.cpu;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="overlay__card glass detail" onClick={e => e.stopPropagation()}>
        <div className="overlay__head">
          <h2>{title.icon} {t(title.key)} — {t('details')}</h2>
          <button className="overlay__close" onClick={onClose}>×</button>
        </div>

        {!det && <p className="detail__loading">{t('detecting')}</p>}

        {det && section === 'cpu' && (
          <>
            <Group title={t('general')}>
              <KV k="Model" v={det.cpu?.model ?? DASH} />
              <KV k="Socket" v={det.cpu?.socket ?? DASH} />
              <KV k="Family / Model / Stepping" v={`${det.cpu?.family ?? '—'} / ${det.cpu?.modelId ?? '—'} / ${det.cpu?.stepping ?? '—'}`} />
              <KV k="Cores / Threads" v={`${det.cpu?.physicalCores ?? '—'} / ${det.cpu?.threads ?? '—'}`} />
              <KV k={t('baseClock')} v={fmtGHz(det.cpu?.baseGHz)} />
              <KV k="Max Boost" v={fmtGHz(det.cpu?.maxGHz)} />
              <KV k="L1 Cache (d/i)" v={det.cpu?.cacheL1dKB ? `${det.cpu.cacheL1dKB} / ${det.cpu.cacheL1iKB ?? '—'} KB` : DASH} />
              <KV k="L2 Cache" v={det.cpu?.cacheL2KB ? `${Math.round(det.cpu.cacheL2KB / 1024 * 10) / 10} MB` : DASH} />
              <KV k="L3 Cache" v={det.cpu?.cacheL3KB ? `${Math.round(det.cpu.cacheL3KB / 1024 * 10) / 10} MB` : DASH} />
              <KV k="Virtualization" v={det.cpu?.virtualization === null ? DASH : det.cpu?.virtualization ? '✅' : '—'} />
            </Group>
            <Group title="Live">
              <KV k={t('overallLoad')} v={fmtPct(snap.cpu.load)} />
              <KV k={t('temperature')} v={fmtTemp(snap.cpu.packageTempC)} />
              <KV k={t('currentClock')} v={fmtGHz(snap.cpu.currentSpeedGHz)} />
              <KV k={t('voltage')} v={fmtVolt(snap.cpu.voltage)} />
              <KV k={t('power')} v={fmtWatt(snap.cpu.powerW)} />
              <KV k={t('fanSpeed')} v={fmtRpm(snap.cpu.fanRpm)} />
            </Group>
            <Group title={`${t('coreStatus')} (${snap.cpu.threads})`}>
              <div className="detail__coretable">
                {snap.cpu.cores.map(c => (
                  <div key={c.index} className="detail__corecell">
                    <span>C{c.index}</span>
                    <b className={`metric__value--${severityFor(c.load, 70, 85)}`}>{fmtPct(c.load)}</b>
                    <i>{c.tempC !== null ? fmtTemp(c.tempC) : c.speedGHz !== null ? fmtGHz(c.speedGHz) : ''}</i>
                  </div>
                ))}
              </div>
            </Group>
          </>
        )}

        {det && section === 'gpu' && (
          <>
            {det.gpus.map((g, i) => {
              const live = snap.gpus[i];
              return (
                <Group key={i} title={`${g.vendor} ${g.model}`}>
                  <KV k="Bus" v={g.bus ?? DASH} />
                  <KV k="VRAM" v={g.vramTotalMB ? fmtBytes(g.vramTotalMB * 1024 ** 2, 0) : DASH} />
                  <KV k="Driver" v={g.driverVersion ?? DASH} />
                  <KV k="Sub-device ID" v={g.subDeviceId ?? DASH} />
                  {live && (
                    <>
                      <KV k={t('coreLoad')} v={fmtPct(live.load)} />
                      <KV k={t('temperature')} v={fmtTemp(live.tempC)} />
                      <KV k={t('coreClock')} v={fmtMHz(live.coreClockMHz)} />
                      <KV k={t('memClock')} v={fmtMHz(live.memClockMHz)} />
                      <KV k={t('vramUsed')} v={live.vramUsedMB !== null ? fmtBytes(live.vramUsedMB * 1024 ** 2) : DASH} />
                      <KV k={t('powerDraw')} v={live.powerW !== null ? `${fmtWatt(live.powerW)}${live.powerLimitW ? ` / ${fmtWatt(live.powerLimitW)}` : ''}` : DASH} />
                    </>
                  )}
                </Group>
              );
            })}
            {det.displays.length > 0 && (
              <Group title={t('displays')}>
                {det.displays.map((d, i) => (
                  <KV
                    key={i}
                    k={`${d.model}${d.main ? ' ★' : ''}`}
                    v={d.resX ? `${d.resX}×${d.resY}${d.refreshHz ? ` @ ${Math.round(d.refreshHz)}Hz` : ''}` : DASH}
                  />
                ))}
              </Group>
            )}
          </>
        )}

        {det && section === 'ram' && (
          <>
            <Group title="Live">
              <KV k={t('usage')} v={`${fmtBytes(snap.mem.usedB)} / ${fmtBytes(snap.mem.totalB)} (${fmtPct(snap.mem.usagePct)})`} />
              <KV k={t('cache')} v={fmtBytes(snap.mem.cachedB)} />
              <KV k={t('pageFile')} v={`${fmtBytes(snap.mem.swapUsedB)} / ${fmtBytes(snap.mem.swapTotalB)}`} />
              <KV k={t('temperature')} v={fmtTemp(snap.mem.tempC)} />
            </Group>
            <Group title={`${t('modules')} (${det.dimms.length})`}>
              {det.dimms.map((d, i) => (
                <div key={i} className="detail__sub">
                  <KV k={d.bank} v={`${fmtBytes(d.sizeB, 0)} ${d.type} ${d.clockMHz ? `@ ${d.clockMHz} MHz` : ''}`} />
                  <KV k={t('manufacturer')} v={`${d.manufacturer ?? DASH}${d.partNum ? ` · ${d.partNum}` : ''}`} />
                  <KV k={`${t('formFactor')} / ${t('voltage')}`} v={`${d.formFactor ?? DASH} / ${fmtVolt(d.voltage)}`} />
                </div>
              ))}
            </Group>
            {det.board && (
              <Group title={t('motherboard')}>
                <KV k={t('slots')} v={det.board.memSlots ?? DASH} />
                <KV k={t('maxCapacity')} v={det.board.memMaxB ? fmtBytes(det.board.memMaxB, 0) : DASH} />
              </Group>
            )}
          </>
        )}

        {det && section === 'board' && det.board && (
          <>
            <Group title={t('general')}>
              <KV k={t('manufacturer')} v={det.board.manufacturer} />
              <KV k="Model" v={det.board.model} />
              <KV k="Version" v={det.board.version ?? DASH} />
              <KV k={t('slots')} v={det.board.memSlots ?? DASH} />
              <KV k={t('maxCapacity')} v={det.board.memMaxB ? fmtBytes(det.board.memMaxB, 0) : DASH} />
            </Group>
            <Group title="BIOS">
              <KV k="Vendor" v={det.board.biosVendor ?? DASH} />
              <KV k={t('biosVersion')} v={det.board.biosVersion} />
              <KV k="Date" v={det.board.biosDate ?? DASH} />
            </Group>
            <Group title="Live">
              <KV k={t('temperature')} v={fmtTemp(snap.board.tempC)} />
              <KV k={t('vrmTemp')} v={fmtTemp(snap.board.vrmTempC)} />
              <KV k={t('rail12')} v={fmtVolt(snap.board.rail12V)} />
              <KV k={t('rail5')} v={fmtVolt(snap.board.rail5V)} />
              <KV k={t('rail33')} v={fmtVolt(snap.board.rail33V)} />
              {snap.board.fans.map((f, i) => (
                <KV key={i} k={f.name} v={fmtRpm(f.rpm)} />
              ))}
            </Group>
          </>
        )}

        {det && section === 'net' && (
          <>
            <Group title="Live">
              <KV k={`⬇ ${t('download')}`} v={fmtBitRate(snap.net.rxBps)} />
              <KV k={`⬆ ${t('upload')}`} v={fmtBitRate(snap.net.txBps)} />
              <KV k={t('latency')} v={snap.net.latencyMs !== null ? `${snap.net.latencyMs}ms (${snap.net.latencyTarget})` : DASH} />
              <KV k={t('totalToday')} v={`⬇ ${fmtBytes(snap.net.todayRxB)} · ⬆ ${fmtBytes(snap.net.todayTxB)}`} />
              <KV k={t('totalMonth')} v={`⬇ ${fmtBytes(snap.net.monthRxB)} · ⬆ ${fmtBytes(snap.net.monthTxB)}`} />
            </Group>
            <Group title={`${t('adapters')} (${det.netIfaces.length})`}>
              {det.netIfaces.map((n, i) => (
                <div key={i} className="detail__sub">
                  <KV k={`${n.name}${n.isDefault ? ' ★' : ''}`} v={`${n.type}${n.speedMbps ? ` · ${n.speedMbps} Mbps` : ''}`} />
                  <KV k="IPv4" v={n.ip4} />
                  <KV k="IPv6" v={<span className="detail__mono">{n.ip6}</span>} />
                  <KV k={t('mac')} v={<span className="detail__mono">{n.mac}</span>} />
                  <KV k="DHCP" v={n.dhcp === null ? DASH : n.dhcp ? '✅' : '—'} />
                </div>
              ))}
            </Group>
          </>
        )}

        {det && section === 'storage' && (
          <>
            <Group title={`${t('storage')} (${det.disks.length})`}>
              {det.disks.map((d, i) => (
                <div key={i} className="detail__sub">
                  <KV k={d.name} v={`${d.type}${d.interfaceType ? ` · ${d.interfaceType}` : ''} · ${fmtBytes(d.sizeB, 0)}`} />
                  <KV k="Device" v={<span className="detail__mono">{d.device}</span>} />
                  <KV k={t('firmware')} v={d.firmware ?? DASH} />
                  <KV k="SMART" v={d.smartStatus ? (d.smartStatus.toLowerCase() === 'ok' ? '✅ OK' : `🔥 ${d.smartStatus}`) : DASH} />
                </div>
              ))}
            </Group>
            <Group title="Live">
              {snap.storage.drives.map(d => (
                <KV
                  key={d.mount}
                  k={`${d.mount} (${d.type})`}
                  v={`${fmtBytes(d.usedB)} / ${fmtBytes(d.sizeB)} · ${fmtPct(d.usagePct)}${d.tempC !== null ? ` · ${fmtTemp(d.tempC)}` : ''}`}
                />
              ))}
            </Group>
          </>
        )}

        {det && section === 'security' && (
          <>
            <Group title={t('security')}>
              <KV k={t('defender')} v={snap.security.defenderEnabled === null ? DASH : snap.security.defenderEnabled ? `✅ ${t('active')}` : `🔥 ${t('inactive')}`} />
              <KV k="Real-time protection" v={snap.security.realTimeProtection === null ? DASH : snap.security.realTimeProtection ? '✅' : '🔥'} />
              <KV k={t('firewall')} v={snap.security.firewallEnabled === null ? DASH : snap.security.firewallEnabled ? `✅ ${t('enabled')}` : `🔥 ${t('disabled')}`} />
              <KV k={t('threats')} v={snap.security.threatsDetected ?? DASH} />
              <KV k={t('uptime')} v={fmtUptime(snap.security.uptimeSec)} />
              <KV k={t('healthScore')} v={`${snap.security.healthScore}/100`} />
            </Group>
            {det.os && (
              <Group title={t('os')}>
                <KV k="OS" v={`${det.os.distro} (${det.os.arch})`} />
                <KV k={t('build')} v={`${det.os.release}${det.os.build ? ` · ${det.os.build}` : ''}`} />
                <KV k={t('hostname')} v={det.os.hostname ?? DASH} />
              </Group>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DetailOverlay;
