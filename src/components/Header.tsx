import React, { useEffect, useState } from 'react';
import { TKey } from '../i18n';
import aicmsLogo from '../assets/aicms.png';

interface Props {
  t: (k: TKey) => string;
  lhmConnected: boolean;
  hasCritical: boolean;
}

const Header: React.FC<Props> = ({ t, lhmConnected, hasCritical }) => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="header">
      <div className="header__bar">
        <span className={`header__logo ${hasCritical ? 'pulse' : ''}`}>⚡</span>
        <span className="header__title">{t('appTitle')}</span>
        <span className="header__version">v1.0</span>
        <div className="header__controls">
          <button title="Minimize to tray" onClick={() => window.usm.windowAction('minimize')}>─</button>
          <button title="Hide to tray" onClick={() => window.usm.windowAction('close')}>□</button>
          <button className="header__close" title="Quit" onClick={() => window.usm.windowAction('quit')}>×</button>
        </div>
      </div>
      <button
        className="header__credit"
        title="https://aicms.bd"
        onClick={() => window.usm.openLink('https://aicms.bd')}
      >
        <img src={aicmsLogo} alt="AiCMS.BD" className="header__creditlogo" />
        <span>Powered By: <b>AiCMS.BD</b></span>
      </button>
      <div className="header__clock glass">
        <span className="header__time">
          🕐 {now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
        </span>
        <span className="header__date">
          📅 {now.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })}
        </span>
      </div>
      <div className={`header__lhm ${lhmConnected ? 'header__lhm--on' : ''}`}>
        {lhmConnected ? `● ${t('lhmOn')}` : `○ ${t('lhmOff')}`}
      </div>
    </header>
  );
};

export default React.memo(Header);
