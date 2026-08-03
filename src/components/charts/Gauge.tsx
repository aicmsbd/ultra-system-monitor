import React, { useEffect, useRef } from 'react';
import { Severity3 } from '../../utils/format';

interface Props {
  /** Current value in [0, max]. */
  value: number | null;
  max: number;
  unit: string;
  label: string;
  severity?: Severity3;
  /** Secondary line under the value (e.g. temperature). */
  sub?: string;
  size?: number;
}

/**
 * Speedometer-style gauge on <canvas>: 270° sweep, tick marks, severity-tinted
 * arc, glowing needle and an embossed hub. Theme-aware via CSS variables.
 */
const Gauge: React.FC<Props> = ({ value, max, unit, label, severity = 'ok', sub, size = 190 }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const styles = getComputedStyle(document.documentElement);
    const cvar = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
    const accent = cvar('--accent', '#00d9ff');
    const warning = cvar('--warning', '#ffaa00');
    const critical = cvar('--critical', '#ff0055');
    const dim = cvar('--text-dim', '#a0a0a0');
    const track = cvar('--bar-track', 'rgba(0,0,0,0.35)');
    const needleColor = severity === 'crit' ? critical : severity === 'warn' ? warning : accent;

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 14;
    const start = Math.PI * 0.75; // 135°
    const sweep = Math.PI * 1.5; // 270°
    const frac = value === null ? 0 : Math.max(0, Math.min(1, value / max));

    // Track (pressed-in groove)
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, start + sweep);
    ctx.strokeStyle = track;
    ctx.lineWidth = 12;
    ctx.stroke();

    // Colored zones (ok → warn → crit hints along the dial)
    const zone = (from: number, to: number, color: string, alpha: number) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, start + sweep * from, start + sweep * to);
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.globalAlpha = 1;
    };
    zone(0, 0.7, accent, 0.25);
    zone(0.7, 0.88, warning, 0.35);
    zone(0.88, 1, critical, 0.4);

    // Value arc with glow
    if (frac > 0) {
      ctx.save();
      ctx.shadowColor = needleColor;
      ctx.shadowBlur = 10;
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, accent);
      grad.addColorStop(1, needleColor);
      ctx.beginPath();
      ctx.arc(cx, cy, r, start, start + sweep * frac);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.restore();
    }

    // Tick marks every 10%
    for (let i = 0; i <= 10; i++) {
      const a = start + (sweep * i) / 10;
      const inner = r - 13;
      const outer = r - (i % 5 === 0 ? 20 : 17);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
      ctx.strokeStyle = dim;
      ctx.globalAlpha = i % 5 === 0 ? 0.8 : 0.4;
      ctx.lineWidth = i % 5 === 0 ? 2 : 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Needle
    const na = start + sweep * frac;
    ctx.save();
    ctx.shadowColor = needleColor;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(na + Math.PI / 2) * 4, cy + Math.sin(na + Math.PI / 2) * 4);
    ctx.lineTo(cx + Math.cos(na) * (r - 22), cy + Math.sin(na) * (r - 22));
    ctx.lineTo(cx + Math.cos(na - Math.PI / 2) * 4, cy + Math.sin(na - Math.PI / 2) * 4);
    ctx.closePath();
    ctx.fillStyle = needleColor;
    ctx.fill();
    ctx.restore();

    // Embossed hub
    const hub = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, 9);
    hub.addColorStop(0, 'rgba(255,255,255,0.65)');
    hub.addColorStop(0.4, needleColor);
    hub.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fillStyle = hub;
    ctx.fill();
  }, [value, max, unit, severity, size]);

  return (
    <div className="gauge" style={{ width: size }}>
      <canvas ref={ref} style={{ width: size, height: size }} aria-label={`${label} gauge`} />
      <div className="gauge__readout">
        <span className={`gauge__value gauge__value--${severity}`}>
          {value === null ? '—' : Math.round(value)}
          <small>{unit}</small>
        </span>
        {sub && <span className="gauge__sub">{sub}</span>}
        <span className="gauge__label">{label}</span>
      </div>
    </div>
  );
};

export default React.memo(Gauge);
