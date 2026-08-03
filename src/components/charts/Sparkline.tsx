import React, { useEffect, useRef } from 'react';

interface Props {
  data: number[];
  /** Fixed scale maximum (e.g. 100 for %); auto when omitted. */
  max?: number;
  color?: string;
}

/** Tiny single-series history line used for CPU/GPU trend display. */
const Sparkline: React.FC<Props> = ({ data, max, color }) => {
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
    if (!ctx || data.length < 2) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const stroke = color || getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00d9ff';
    const scale = max ?? Math.max(1, ...data) * 1.1;
    ctx.beginPath();
    data.forEach((v, i) => {
      const px = (i / (data.length - 1)) * w;
      const py = h - (Math.min(v, scale) / scale) * (h - 2) - 1;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }, [data, max, color]);

  return <canvas ref={ref} className="sparkline" aria-hidden="true" />;
};

export default React.memo(Sparkline);
