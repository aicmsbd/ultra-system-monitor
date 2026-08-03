import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_SETTINGS, Settings, Snapshot } from '../shared/types';
import { makeT } from './i18n';
import Header from './components/Header';
import CpuSection from './components/sections/CpuSection';
import GpuSection from './components/sections/GpuSection';
import RamSection from './components/sections/RamSection';
import BoardSection from './components/sections/BoardSection';
import NetworkSection from './components/sections/NetworkSection';
import StorageSection from './components/sections/StorageSection';
import SecuritySection from './components/sections/SecuritySection';
import QuickActions from './components/QuickActions';
import SettingsPanel from './components/SettingsPanel';
import DetailOverlay from './components/DetailOverlay';
import { applyTheme } from './utils/theme';

const HISTORY_LEN = 60;

function usePush(setter: React.Dispatch<React.SetStateAction<number[]>>) {
  return useCallback(
    (v: number | null) => {
      if (v === null) return;
      setter(prev => {
        const next = prev.length >= HISTORY_LEN ? prev.slice(1) : prev.slice();
        next.push(v);
        return next;
      });
    },
    [setter]
  );
}

const App: React.FC = () => {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [version, setVersion] = useState('1.0.0');

  const [downHist, setDownHist] = useState<number[]>([]);
  const [upHist, setUpHist] = useState<number[]>([]);
  const [cpuLoadHist, setCpuLoadHist] = useState<number[]>([]);
  const [cpuTempHist, setCpuTempHist] = useState<number[]>([]);
  const pushDown = usePush(setDownHist);
  const pushUp = usePush(setUpHist);
  const pushCpuLoad = usePush(setCpuLoadHist);
  const pushCpuTemp = usePush(setCpuTempHist);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    void window.usm.getSettings().then(setSettings);
    void window.usm.appVersion().then(setVersion);
    const offSettings = window.usm.onSettingsChanged(setSettings);
    const off = window.usm.onSnapshot(s => {
      setSnap(s);
      pushDown(s.net.rxBps);
      pushUp(s.net.txBps);
      pushCpuLoad(s.cpu.load);
      pushCpuTemp(s.cpu.packageTempC);
      if (!settingsRef.current.firstRunDone) {
        void window.usm.setSettings({ firstRunDone: true }).then(setSettings);
      }
    });
    return () => {
      off();
      offSettings();
    };
  }, [pushDown, pushUp, pushCpuLoad, pushCpuTemp]);

  useEffect(() => {
    applyTheme(settings);
  }, [settings.theme, settings.accentColor]);

  const applySettings = useCallback((patch: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...patch })); // optimistic
    void window.usm.setSettings(patch).then(setSettings);
  }, []);

  const onToggle = useCallback(
    (id: string, collapsed: boolean) => {
      applySettings({ collapsed: { ...settingsRef.current.collapsed, [id]: collapsed } });
    },
    [applySettings]
  );

  const onDetails = useCallback((id: string) => setShowDetail(id), []);
  const t = useMemo(() => makeT(settings.language), [settings.language]);
  const hasCritical = (snap?.alerts ?? []).some(a => a.severity === 'crit');
  const isCollapsed = (id: string) => Boolean(settings.collapsed[id]);

  if (!snap) {
    return (
      <div className="sidebar">
        <Header t={t} lhmConnected={false} hasCritical={false} />
        <div className="splash glass">
          <div className="splash__spinner" />
          <h2>{t('welcome')}</h2>
          <p>{t('detecting')}</p>
          <p className="splash__hint">{t('welcomeBody')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sidebar">
      <Header t={t} lhmConnected={snap.lhmConnected} hasCritical={hasCritical} />

      {snap.alerts.length > 0 && (
        <div className="alertstrip">
          {snap.alerts.map(a => (
            <div key={a.id} className={`alertstrip__item alertstrip__item--${a.severity} ${a.severity === 'crit' ? 'pulse' : ''}`}>
              {a.severity === 'crit' ? '🔥' : '⚠️'} {a.message}
            </div>
          ))}
        </div>
      )}

      <main className="sections">
        <CpuSection
          cpu={snap.cpu} loadHistory={cpuLoadHist} tempHistory={cpuTempHist}
          collapsed={isCollapsed('cpu')} onToggle={onToggle} onDetails={onDetails} t={t}
        />
        <GpuSection gpus={snap.gpus} collapsed={isCollapsed('gpu')} onToggle={onToggle} onDetails={onDetails} t={t} />
        <RamSection mem={snap.mem} collapsed={isCollapsed('ram')} onToggle={onToggle} onDetails={onDetails} t={t} />
        <BoardSection board={snap.board} collapsed={isCollapsed('board')} onToggle={onToggle} onDetails={onDetails} t={t} />
        <NetworkSection
          net={snap.net} downHistory={downHist} upHistory={upHist}
          collapsed={isCollapsed('net')} onToggle={onToggle} onDetails={onDetails} t={t}
        />
        <StorageSection storage={snap.storage} collapsed={isCollapsed('storage')} onToggle={onToggle} onDetails={onDetails} t={t} />
        <SecuritySection sec={snap.security} collapsed={isCollapsed('security')} onToggle={onToggle} onDetails={onDetails} t={t} />
      </main>

      <QuickActions
        settings={settings}
        onSettings={applySettings}
        onOpenSettings={() => setShowSettings(true)}
        onOpenAbout={() => setShowAbout(true)}
        t={t}
      />

      {showDetail && (
        <DetailOverlay section={showDetail} snap={snap} t={t} onClose={() => setShowDetail(null)} />
      )}

      {showSettings && (
        <SettingsPanel settings={settings} onChange={applySettings} onClose={() => setShowSettings(false)} t={t} />
      )}

      {showAbout && (
        <div className="overlay" onClick={() => setShowAbout(false)}>
          <div className="overlay__card glass" onClick={e => e.stopPropagation()}>
            <div className="overlay__head">
              <h2>⚡ Ultra System Monitor</h2>
              <button className="overlay__close" onClick={() => setShowAbout(false)}>×</button>
            </div>
            <p className="about__line">Version {version} · {snap.osName}</p>
            <p className="about__line">{snap.lhmConnected ? t('lhmOn') : t('lhmOff')}</p>
            <p className="about__hint">{t('welcomeBody')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
