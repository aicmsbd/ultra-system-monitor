import React from 'react';
import ProgressBar from './ProgressBar';
import { Severity3 } from '../../utils/format';

interface Props {
  label: string;
  value: string;
  /** When provided, renders a meter under the row. */
  barValue?: number | null;
  severity?: Severity3;
  badge?: 'ok' | 'warn' | 'crit' | null;
}

const ICONS = { ok: '✅', warn: '⚠️', crit: '🔥' } as const;

/** A label/value line, optionally with a meter and a status badge. */
const MetricRow: React.FC<Props> = React.memo(({ label, value, barValue, severity = 'ok', badge = null }) => (
  <div className="metric">
    <div className="metric__line">
      <span className="metric__label">{label}</span>
      <span className={`metric__value metric__value--${severity}`}>
        {value}
        {badge && <span className={`metric__badge ${badge === 'crit' ? 'pulse' : ''}`}> {ICONS[badge]}</span>}
      </span>
    </div>
    {barValue !== undefined && <ProgressBar value={barValue} severity={severity} />}
  </div>
));

MetricRow.displayName = 'MetricRow';
export default MetricRow;
