import React from 'react';
import { StorageData, THRESHOLDS } from '../../../shared/types';
import { TKey } from '../../i18n';
import { fmtByteRate, fmtBytes, fmtPct, fmtTemp, severityFor } from '../../utils/format';
import MetricRow from '../common/MetricRow';
import Panel from '../common/Panel';

interface Props {
  storage: StorageData;
  collapsed: boolean;
  onToggle: (id: string, c: boolean) => void;
  onDetails: (id: string) => void;
  t: (k: TKey) => string;
}

const StorageSection: React.FC<Props> = ({ storage, collapsed, onToggle, onDetails, t }) => {
  const worst = Math.max(0, ...storage.drives.map(d => d.usagePct));
  const worstSev = severityFor(worst, THRESHOLDS.storage.warn, THRESHOLDS.storage.crit);

  return (
    <Panel
      id="storage" icon="💽" title={t('storage')}
      subtitle={`${storage.drives.length} drive${storage.drives.length === 1 ? '' : 's'}`}
      collapsed={collapsed} onToggle={onToggle} onDetails={onDetails}
      alert={worstSev === 'ok' ? null : worstSev}
      summary={<>{fmtPct(worst)}</>}
    >
      {storage.drives.map(d => {
        const sev = severityFor(d.usagePct, THRESHOLDS.storage.warn, THRESHOLDS.storage.crit);
        return (
          <div key={d.mount} className="drive">
            <div className="metric__line">
              <span className="metric__label drive__name" title={d.model}>
                {d.mount} <span className="drive__type">{d.type}</span> {fmtBytes(d.sizeB, 0)}
              </span>
              <span className={`metric__value metric__value--${sev}`}>
                {fmtPct(d.usagePct)}{d.tempC !== null && ` · ${fmtTemp(d.tempC)}`}
                {d.smartStatus && d.smartStatus.toLowerCase() !== 'ok' && <span className="pulse"> 🔥</span>}
              </span>
            </div>
            <MetricRow label="" value="" barValue={d.usagePct} severity={sev} />
            {(d.readBps !== null || d.writeBps !== null) && (
              <div className="drive__io">
                {t('read')}: {fmtByteRate(d.readBps)} · {t('write')}: {fmtByteRate(d.writeBps)}
              </div>
            )}
          </div>
        );
      })}
      {(storage.totalReadBps !== null || storage.totalWriteBps !== null) && (
        <MetricRow
          label={t('diskIO')}
          value={`${t('read')} ${fmtByteRate(storage.totalReadBps)} · ${t('write')} ${fmtByteRate(storage.totalWriteBps)}`}
        />
      )}
    </Panel>
  );
};

export default React.memo(StorageSection);
