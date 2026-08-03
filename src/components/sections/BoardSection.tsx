import React from 'react';
import { BoardData } from '../../../shared/types';
import { TKey } from '../../i18n';
import { fmtRpm, fmtTemp, fmtVolt, severityFor } from '../../utils/format';
import MetricRow from '../common/MetricRow';
import Panel from '../common/Panel';

interface Props {
  board: BoardData;
  collapsed: boolean;
  onToggle: (id: string, c: boolean) => void;
  onDetails: (id: string) => void;
  t: (k: TKey) => string;
}

const BoardSection: React.FC<Props> = ({ board, collapsed, onToggle, onDetails, t }) => {
  const tempSev = severityFor(board.tempC, 55, 70);
  const vrmSev = severityFor(board.vrmTempC, 70, 90);
  return (
    <Panel
      id="board" icon="🔧" title={t('motherboard')} subtitle={`${board.vendor} ${board.model}`.trim()}
      collapsed={collapsed} onToggle={onToggle} onDetails={onDetails}
      alert={vrmSev === 'crit' || tempSev === 'crit' ? 'crit' : null}
      summary={<>{fmtTemp(board.tempC)}</>}
    >
      <MetricRow label={t('temperature')} value={fmtTemp(board.tempC)} barValue={board.tempC} severity={tempSev} badge={board.tempC !== null ? tempSev : null} />
      <MetricRow label={t('vrmTemp')} value={fmtTemp(board.vrmTempC)} barValue={board.vrmTempC} severity={vrmSev} badge={board.vrmTempC !== null ? vrmSev : null} />
      <div className="metric__pairgrid">
        <MetricRow label={t('biosVersion')} value={board.biosVersion} />
        <MetricRow label={t('rail12')} value={fmtVolt(board.rail12V)} />
        <MetricRow label={t('rail5')} value={fmtVolt(board.rail5V)} />
        <MetricRow label={t('rail33')} value={fmtVolt(board.rail33V)} />
      </div>
      {board.fans.length > 0 && (
        <>
          <div className="subhead">{t('fans')}</div>
          <div className="metric__pairgrid">
            {board.fans.slice(0, 6).map((f, i) => (
              <MetricRow key={i} label={f.name} value={fmtRpm(f.rpm)} />
            ))}
          </div>
        </>
      )}
    </Panel>
  );
};

export default React.memo(BoardSection);
