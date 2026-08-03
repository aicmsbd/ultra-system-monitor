import React from 'react';
import { SecurityData } from '../../../shared/types';
import { TKey } from '../../i18n';
import { DASH, fmtDateTime, fmtUptime } from '../../utils/format';
import MetricRow from '../common/MetricRow';
import Panel from '../common/Panel';

interface Props {
  sec: SecurityData;
  collapsed: boolean;
  onToggle: (id: string, c: boolean) => void;
  onDetails: (id: string) => void;
  t: (k: TKey) => string;
}

const SecuritySection: React.FC<Props> = ({ sec, collapsed, onToggle, onDetails, t }) => {
  const boolText = (v: boolean | null, on: string, off: string) => (v === null ? DASH : v ? `✅ ${on}` : `🔥 ${off}`);
  const healthSev = sec.healthScore >= 80 ? 'ok' : sec.healthScore >= 60 ? 'warn' : 'crit';
  const alert = sec.defenderEnabled === false || sec.firewallEnabled === false ? 'crit' : null;

  return (
    <Panel
      id="security" icon="🛡️" title={t('security')}
      collapsed={collapsed} onToggle={onToggle} onDetails={onDetails} alert={alert}
      summary={<>{sec.healthScore}/100</>}
    >
      <MetricRow label={t('defender')} value={boolText(sec.defenderEnabled, t('active'), t('inactive'))} severity={sec.defenderEnabled === false ? 'crit' : 'ok'} />
      <MetricRow label={t('firewall')} value={boolText(sec.firewallEnabled, t('enabled'), t('disabled'))} severity={sec.firewallEnabled === false ? 'crit' : 'ok'} />
      <div className="metric__pairgrid">
        <MetricRow label={t('lastScan')} value={fmtDateTime(sec.lastScan)} />
        <MetricRow label={t('threats')} value={sec.threatsDetected === null ? DASH : String(sec.threatsDetected)} severity={sec.threatsDetected ? 'crit' : 'ok'} />
      </div>
      <MetricRow label={t('uptime')} value={fmtUptime(sec.uptimeSec)} />
      <MetricRow
        label={t('healthScore')}
        value={`${sec.healthScore}/100 ${healthSev === 'ok' ? '✅' : healthSev === 'warn' ? '⚠️' : '🔥'}`}
        barValue={sec.healthScore}
        severity={healthSev}
      />
    </Panel>
  );
};

export default React.memo(SecuritySection);
