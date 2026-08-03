import React from 'react';
import { NetData } from '../../../shared/types';
import { TKey } from '../../i18n';
import { DASH, fmtBitRate, fmtBytes, fmtMs } from '../../utils/format';
import MetricRow from '../common/MetricRow';
import Panel from '../common/Panel';
import NetworkGraph from '../charts/NetworkGraph';

interface Props {
  net: NetData;
  downHistory: number[];
  upHistory: number[];
  collapsed: boolean;
  onToggle: (id: string, c: boolean) => void;
  onDetails: (id: string) => void;
  t: (k: TKey) => string;
}

const NetworkSection: React.FC<Props> = ({ net, downHistory, upHistory, collapsed, onToggle, onDetails, t }) => {
  const active = net.adapters.find(a => a.iface === net.activeIface) ?? net.adapters[0];
  // Scale meters against link speed when known, else against 1 Gbps.
  const linkBps = ((active?.speedMbps ?? 1000) * 1e6) / 8;
  const downPct = Math.min(100, (net.rxBps / linkBps) * 100);
  const upPct = Math.min(100, (net.txBps / linkBps) * 100);

  return (
    <Panel
      id="net" icon="🌐" title={t('network')} subtitle={active ? `${active.name} (${active.type})` : undefined}
      collapsed={collapsed} onToggle={onToggle} onDetails={onDetails}
      summary={<>⬇ {fmtBitRate(net.rxBps)}</>}
    >
      <MetricRow label={t('adapter')} value={active ? `${active.type} · ${active.ip4}` : DASH} />
      <MetricRow label={`⬇ ${t('download')}`} value={fmtBitRate(net.rxBps)} barValue={downPct} severity="ok" />
      <MetricRow label={`⬆ ${t('upload')}`} value={fmtBitRate(net.txBps)} barValue={upPct} severity="ok" />
      <div className="metric__pairgrid">
        <MetricRow label={t('latency')} value={net.latencyMs !== null ? `${fmtMs(net.latencyMs)} (${net.latencyTarget})` : DASH} />
        <MetricRow label={t('totalToday')} value={`⬇ ${fmtBytes(net.todayRxB)} ⬆ ${fmtBytes(net.todayTxB)}`} />
      </div>
      <MetricRow label={t('totalMonth')} value={`⬇ ${fmtBytes(net.monthRxB)} ⬆ ${fmtBytes(net.monthTxB)}`} />
      <div className="subhead">{t('liveGraph')}</div>
      <NetworkGraph down={downHistory} up={upHistory} />
      <div className="netgraph__legend">
        <span className="legend legend--down">■ {t('download')}</span>
        <span className="legend legend--up">■ {t('upload')}</span>
      </div>
    </Panel>
  );
};

export default React.memo(NetworkSection);
