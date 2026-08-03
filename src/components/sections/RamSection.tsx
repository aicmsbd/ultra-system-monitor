import React from 'react';
import { MemData, THRESHOLDS } from '../../../shared/types';
import { TKey } from '../../i18n';
import { DASH, fmtBytes, fmtPct, fmtTemp, fmtVolt, severityFor } from '../../utils/format';
import MetricRow from '../common/MetricRow';
import Panel from '../common/Panel';

interface Props {
  mem: MemData;
  collapsed: boolean;
  onToggle: (id: string, c: boolean) => void;
  onDetails: (id: string) => void;
  t: (k: TKey) => string;
}

const RamSection: React.FC<Props> = ({ mem, collapsed, onToggle, onDetails, t }) => {
  const sev = severityFor(mem.usagePct, THRESHOLDS.ramUsage.warn, THRESHOLDS.ramUsage.crit);
  const swapPct = mem.swapTotalB > 0 ? (mem.swapUsedB / mem.swapTotalB) * 100 : null;
  const subtitle = `${mem.type ?? 'RAM'}${mem.speedMHz ? `-${mem.speedMHz}` : ''} ${fmtBytes(mem.totalB, 0)}`;

  return (
    <Panel
      id="ram" icon="💾" title={t('ram')} subtitle={subtitle}
      collapsed={collapsed} onToggle={onToggle} onDetails={onDetails}
      alert={sev === 'ok' ? null : sev}
      summary={<>{fmtPct(mem.usagePct)}</>}
    >
      <MetricRow label={t('usage')} value={fmtPct(mem.usagePct)} barValue={mem.usagePct} severity={sev} badge={sev === 'ok' ? null : sev} />
      <MetricRow label={t('used')} value={`${fmtBytes(mem.usedB)} / ${fmtBytes(mem.totalB)}`} />
      <div className="metric__pairgrid">
        <MetricRow
          label={t('speed')}
          value={mem.speedMHz ? `${mem.speedMHz} MHz${mem.xmpActive ? ` · ${t('xmpActive')}` : mem.xmpActive === false ? ` · ${t('xmpInactive')}` : ''}` : DASH}
        />
        <MetricRow label={t('voltage')} value={fmtVolt(mem.voltage)} />
        <MetricRow label={t('cache')} value={fmtBytes(mem.cachedB)} />
        <MetricRow label={t('pageFile')} value={swapPct !== null ? `${fmtBytes(mem.swapUsedB)} (${fmtPct(swapPct)})` : DASH} />
      </div>
      {mem.tempC !== null && (
        <MetricRow label={t('temperature')} value={fmtTemp(mem.tempC)} barValue={mem.tempC} severity={severityFor(mem.tempC, 55, 70)} badge="ok" />
      )}
    </Panel>
  );
};

export default React.memo(RamSection);
