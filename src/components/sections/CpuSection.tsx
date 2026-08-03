import React, { useState } from 'react';
import { CpuData, THRESHOLDS } from '../../../shared/types';
import { TKey } from '../../i18n';
import { fmtGHz, fmtPct, fmtRpm, fmtTemp, fmtVolt, fmtWatt, severityFor } from '../../utils/format';
import MetricRow from '../common/MetricRow';
import ProgressBar from '../common/ProgressBar';
import Panel from '../common/Panel';
import Sparkline from '../charts/Sparkline';

interface Props {
  cpu: CpuData;
  loadHistory: number[];
  tempHistory: number[];
  collapsed: boolean;
  onToggle: (id: string, c: boolean) => void;
  onDetails: (id: string) => void;
  t: (k: TKey) => string;
}

const CpuSection: React.FC<Props> = ({ cpu, loadHistory, tempHistory, collapsed, onToggle, onDetails, t }) => {
  const [showAllCores, setShowAllCores] = useState(false);
  const loadSev = severityFor(cpu.load, 70, THRESHOLDS.cpuUsage.warn);
  const tempSev = severityFor(cpu.packageTempC, THRESHOLDS.cpuTemp.warn, THRESHOLDS.cpuTemp.crit);
  const alert = loadSev === 'crit' || tempSev === 'crit' ? 'crit' : loadSev === 'warn' || tempSev === 'warn' ? 'warn' : null;
  const visibleCores = showAllCores ? cpu.cores : cpu.cores.slice(0, 8);

  return (
    <Panel
      id="cpu" icon="🖥️" title={t('cpu')} subtitle={cpu.model}
      collapsed={collapsed} onToggle={onToggle} onDetails={onDetails} alert={alert}
      summary={<>{fmtPct(cpu.load)} · {fmtTemp(cpu.packageTempC)}</>}
    >
      <MetricRow label={t('overallLoad')} value={fmtPct(cpu.load)} barValue={cpu.load} severity={loadSev} badge={loadSev === 'ok' ? null : loadSev} />
      <MetricRow label={t('temperature')} value={fmtTemp(cpu.packageTempC)} barValue={cpu.packageTempC} severity={tempSev} badge={tempSev === 'ok' ? null : tempSev} />
      <div className="metric__pairgrid">
        <MetricRow label={t('baseClock')} value={fmtGHz(cpu.baseSpeedGHz)} />
        <MetricRow label={t('currentClock')} value={fmtGHz(cpu.currentSpeedGHz)} />
        <MetricRow label={t('voltage')} value={fmtVolt(cpu.voltage)} />
        <MetricRow label={t('power')} value={fmtWatt(cpu.powerW)} />
      </div>
      <MetricRow label={t('fanSpeed')} value={fmtRpm(cpu.fanRpm)} />
      {loadHistory.length > 2 && (
        <div className="trend">
          <Sparkline data={loadHistory} max={100} />
          {tempHistory.length > 2 && <Sparkline data={tempHistory} max={100} color="#ffaa00" />}
        </div>
      )}
      <div className="subhead">
        {t('coreStatus')} ({cpu.threads} {t('threads')})
        {cpu.cores.length > 8 && (
          <button className="linkbtn" onClick={() => setShowAllCores(v => !v)}>
            {showAllCores ? '▲ less' : `▼ all ${cpu.cores.length}`}
          </button>
        )}
      </div>
      <div className="coregrid">
        {visibleCores.map(c => {
          const sev = severityFor(c.load, 70, 85);
          return (
            <div key={c.index} className="core" title={`Thread ${c.index}: ${fmtPct(c.load)} ${c.tempC !== null ? fmtTemp(c.tempC) : ''}`}>
              <span className="core__name">C{c.index}</span>
              <ProgressBar value={c.load} severity={sev} slim />
              <span className="core__load">{fmtPct(c.load)}</span>
              {c.tempC !== null && <span className="core__temp">{fmtTemp(c.tempC)}</span>}
            </div>
          );
        })}
      </div>
    </Panel>
  );
};

export default React.memo(CpuSection);
