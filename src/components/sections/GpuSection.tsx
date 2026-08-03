import React from 'react';
import { GpuData, THRESHOLDS } from '../../../shared/types';
import { TKey } from '../../i18n';
import { DASH, fmtBytes, fmtMHz, fmtPct, fmtTemp, fmtVolt, fmtWatt, severityFor } from '../../utils/format';
import MetricRow from '../common/MetricRow';
import Panel from '../common/Panel';

interface Props {
  gpus: GpuData[];
  collapsed: boolean;
  onToggle: (id: string, c: boolean) => void;
  onDetails: (id: string) => void;
  t: (k: TKey) => string;
}

const GpuSection: React.FC<Props> = ({ gpus, collapsed, onToggle, onDetails, t }) => {
  if (gpus.length === 0) return null;
  const worstTemp = Math.max(...gpus.map(g => g.tempC ?? 0));
  const tempSev = severityFor(worstTemp, THRESHOLDS.gpuTemp.warn, THRESHOLDS.gpuTemp.crit);
  const first = gpus[0];

  return (
    <Panel
      id="gpu" icon="🎮" title={t('gpu')} subtitle={first.model}
      collapsed={collapsed} onToggle={onToggle} onDetails={onDetails}
      alert={tempSev === 'ok' ? null : tempSev}
      summary={<>{fmtPct(first.load)} · {fmtTemp(first.tempC)}</>}
    >
      {gpus.map((g, i) => {
        const loadSev = severityFor(g.load, 90, 97);
        const gTempSev = severityFor(g.tempC, THRESHOLDS.gpuTemp.warn, THRESHOLDS.gpuTemp.crit);
        const vramPct = g.vramUsedMB !== null && g.vramTotalMB ? (g.vramUsedMB / g.vramTotalMB) * 100 : null;
        return (
          <div key={i} className={i > 0 ? 'gpu-extra' : ''}>
            {gpus.length > 1 && <div className="subhead">{g.vendor} · {g.model}</div>}
            <MetricRow label={t('coreLoad')} value={fmtPct(g.load)} barValue={g.load} severity={loadSev} badge={loadSev === 'ok' ? null : loadSev} />
            <MetricRow label={t('temperature')} value={fmtTemp(g.tempC)} barValue={g.tempC} severity={gTempSev} badge={gTempSev === 'ok' ? null : gTempSev} />
            <div className="metric__pairgrid">
              <MetricRow label={t('coreClock')} value={fmtMHz(g.coreClockMHz)} />
              <MetricRow label={t('memClock')} value={fmtMHz(g.memClockMHz)} />
              <MetricRow label={t('voltage')} value={fmtVolt(g.voltage)} />
              <MetricRow
                label={t('fanSpeed')}
                value={g.fanPct !== null ? `${Math.round(g.fanPct)}%${g.fanRpm ? ` (${Math.round(g.fanRpm)} RPM)` : ''}` : g.fanRpm ? `${Math.round(g.fanRpm)} RPM` : DASH}
              />
            </div>
            <MetricRow
              label={t('vramUsed')}
              value={g.vramUsedMB !== null ? `${fmtBytes(g.vramUsedMB * 1024 ** 2)} / ${fmtBytes((g.vramTotalMB ?? 0) * 1024 ** 2)}` : DASH}
              barValue={vramPct}
              severity={severityFor(vramPct, 85, 95)}
            />
            <MetricRow
              label={t('powerDraw')}
              value={g.powerW !== null ? `${fmtWatt(g.powerW)}${g.powerLimitW ? ` / ${fmtWatt(g.powerLimitW)}` : ''}` : DASH}
            />
          </div>
        );
      })}
    </Panel>
  );
};

export default React.memo(GpuSection);
