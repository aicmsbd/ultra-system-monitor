import React from 'react';
import { Language, Settings, ThemeName } from '../../shared/types';
import { TKey } from '../i18n';

interface Props {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onClose: () => void;
  t: (k: TKey) => string;
}

const SettingsPanel: React.FC<Props> = ({ settings, onChange, onClose, t }) => (
  <div className="overlay" onClick={onClose}>
    <div className="overlay__card glass" onClick={e => e.stopPropagation()}>
      <div className="overlay__head">
        <h2>⚙️ {t('settings')}</h2>
        <button className="overlay__close" onClick={onClose}>×</button>
      </div>

      <label className="field">
        <span>{t('refreshInterval')}: {settings.refreshMs / 1000}s</span>
        <input
          type="range" min={500} max={5000} step={250} value={settings.refreshMs}
          onChange={e => onChange({ refreshMs: Number(e.target.value) })}
        />
      </label>

      <label className="field">
        <span>{t('opacity')}: {settings.opacity}%</span>
        <input
          type="range" min={50} max={100} step={5} value={settings.opacity}
          onChange={e => onChange({ opacity: Number(e.target.value) })}
        />
      </label>

      <label className="field">
        <span>{t('theme')}</span>
        <select value={settings.theme} onChange={e => onChange({ theme: e.target.value as ThemeName })}>
          <option value="dark">{t('themeDark')}</option>
          <option value="light">{t('themeLight')}</option>
          <option value="neon">{t('themeNeon')}</option>
          <option value="minimal">{t('themeMinimal')}</option>
        </select>
      </label>

      <label className="field">
        <span>{t('accentColor')}</span>
        <div className="field__colorrow">
          <input
            type="color"
            value={settings.accentColor ?? '#00d9ff'}
            onChange={e => onChange({ accentColor: e.target.value })}
          />
          <button className="linkbtn" onClick={() => onChange({ accentColor: null })}>
            {t('reset')}
          </button>
        </div>
      </label>

      <label className="field">
        <span>{t('language')}</span>
        <select value={settings.language} onChange={e => onChange({ language: e.target.value as Language })}>
          <option value="en">English</option>
          <option value="bn">বাংলা (Bengali)</option>
        </select>
      </label>

      {([
        ['alwaysOnTop', 'alwaysOnTop'],
        ['autoHide', 'autoHide'],
        ['startWithWindows', 'startWithWindows'],
        ['alertsEnabled', 'alertsEnabled']
      ] as [keyof Settings, TKey][]).map(([key, labelKey]) => (
        <label key={key} className="field field--check">
          <input
            type="checkbox"
            checked={Boolean(settings[key])}
            onChange={e => onChange({ [key]: e.target.checked } as Partial<Settings>)}
          />
          <span>{t(labelKey)}</span>
        </label>
      ))}
    </div>
  </div>
);

export default SettingsPanel;
