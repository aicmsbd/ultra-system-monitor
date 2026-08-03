import React, { useCallback, useState } from 'react';
import { Settings, ThemeName } from '../../shared/types';
import { TKey } from '../i18n';

interface Props {
  settings: Settings;
  onSettings: (patch: Partial<Settings>) => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  t: (k: TKey) => string;
}

const THEME_ORDER: ThemeName[] = ['dark', 'light', 'neon', 'minimal'];

const QuickActions: React.FC<Props> = ({ settings, onSettings, onOpenSettings, onOpenAbout, t }) => {
  const [toast, setToast] = useState<string | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const screenshot = useCallback(async () => {
    const file = await window.usm.screenshot();
    if (file) flash(`📸 ${t('savedTo')} ${file}`);
  }, [t]);

  const exportH = useCallback(async (fmt: 'csv' | 'json') => {
    const file = await window.usm.exportHistory(fmt);
    if (file) flash(`📈 ${t('savedTo')} ${file}`);
  }, [t]);

  const cycleTheme = useCallback(() => {
    const next = THEME_ORDER[(THEME_ORDER.indexOf(settings.theme) + 1) % THEME_ORDER.length];
    onSettings({ theme: next });
  }, [settings.theme, onSettings]);

  return (
    <footer className="qa glass">
      <div className="qa__row">
        <button title={t('settings')} onClick={onOpenSettings}>⚙️</button>
        <button title={t('theme')} onClick={cycleTheme}>🎨</button>
        <button title={t('exportCsv')} onClick={() => void exportH('csv')}>📊</button>
        <button title={t('exportJson')} onClick={() => void exportH('json')}>📈</button>
        <button
          title={t('alertsEnabled')}
          className={settings.alertsEnabled ? 'qa__on' : ''}
          onClick={() => onSettings({ alertsEnabled: !settings.alertsEnabled })}
        >🔔</button>
        <button title={t('screenshot')} onClick={() => void screenshot()}>📸</button>
        <button title={t('about')} onClick={onOpenAbout}>❓</button>
      </div>
      {toast && <div className="qa__toast">{toast}</div>}
    </footer>
  );
};

export default React.memo(QuickActions);
