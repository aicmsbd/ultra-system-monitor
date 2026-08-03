import React, { useEffect, useRef } from 'react';

interface Props {
  /** Ring buffers of bytes/sec, newest last, ~60 entries. */
  down: number[];
  up: number[];
}

/**
 * 60-second dual-series area chart on <canvas>, HiDPI-aware.
 * Colors are pulled from CSS custom properties so all four themes work.
 */
const NetworkGraph: React.FC<Props> = ({ down, up }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr) canvas.width = w * dpr;
    if (canvas.height !== h * dpr) canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const styles = getComputedStyle(document.documentElement);
    const cAccent = styles.getPropertyValue('--accent').trim() || '#00d9ff';
    const cSuccess = styles.getPropertyValue('--success').trim() || '#00ff88';
    const cGrid = styles.getPropertyValue('--grid-line').trim() || 'rgba(255,255,255,0.06)';

    // Grid
    ctx.strokeStyle = cGrid;
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const max = Math.max(1024, ...down, ...up) * 1.15;
    const n = Math.max(down.length, up.length, 2);
    const x = (i: number) => (i / (n - 1)) * w;
    const y = (v: number) => h - (v / max) * (h - 4) - 2;

    const drawSeries = (data: number[], color: string, fill: boolean) => {
      if (data.length < 2) return;
      ctx.beginPath();
      data.forEach((v, i) => (i === 0 ? ctx.moveTo(x(i), y(v)) : ctx.lineTo(x(i), y(v))));
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (fill) {
        ctx.lineTo(x(data.length - 1), h);
        ctx.lineTo(0, h);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, color + '55');
        grad.addColorStop(1, color + '00');
        ctx.fillStyle = grad;
        ctx.fill();
      }
    };

    drawSeries(down, cAccent, true);
    drawSeries(up, cSuccess, true);
  }, [down, up]);

  return <canvas ref={ref} className="netgraph" aria-label="Network traffic graph" />;
};

export default React.memo(NetworkGraph);
