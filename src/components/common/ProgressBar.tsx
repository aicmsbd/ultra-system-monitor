import React from 'react';
import { Severity3 } from '../../utils/format';

interface Props {
  /** 0–100 */
  value: number | null;
  severity?: Severity3;
  /** Slim variant for core-grid cells */
  slim?: boolean;
}

/** Animated horizontal meter with severity coloring and glow. */
const ProgressBar: React.FC<Props> = React.memo(({ value, severity = 'ok', slim = false }) => {
  const pct = value === null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className={`pbar ${slim ? 'pbar--slim' : ''}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`pbar__fill pbar__fill--${severity}`} style={{ width: `${pct}%` }} />
    </div>
  );
});

ProgressBar.displayName = 'ProgressBar';
export default ProgressBar;
