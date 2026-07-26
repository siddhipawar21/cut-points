import { useEffect, useRef } from "react";

export type WaveMarker = {
  start: number;
  end: number;
  color: string; // css var reference
  accepted: boolean;
};

export function Waveform({
  peaks,
  duration,
  currentTime,
  markers,
  onSeek,
  height = 96,
}: {
  peaks: number[];
  duration: number;
  currentTime: number;
  markers: WaveMarker[];
  onSeek: (t: number) => void;
  height?: number;
}) {
  const wrap = useRef<HTMLDivElement>(null);

  function seek(e: React.MouseEvent) {
    const el = wrap.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    onSeek((x / r.width) * duration);
  }

  useEffect(() => {}, [currentTime]);

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="relative rounded-2xl bg-muted p-3" ref={wrap} onClick={seek} style={{ cursor: "pointer" }}>
      <div className="flex items-end gap-[1px]" style={{ height }}>
        {peaks.map((p, i) => (
          <div key={i} className="flex-1 rounded-full bg-gradient-primary" style={{ height: `${Math.max(2, p * 100)}%` }} />
        ))}
      </div>
      {/* Marker overlay */}
      <div className="pointer-events-none absolute inset-3">
        {markers.map((m, i) => {
          const left = (m.start / duration) * 100;
          const w = Math.max(0.3, ((m.end - m.start) / duration) * 100);
          return (
            <div key={i}
              className="absolute top-0 h-full rounded-md"
              style={{
                left: `${left}%`,
                width: `${w}%`,
                background: m.color,
                opacity: m.accepted ? 0.55 : 0.18,
                border: `1px solid ${m.color}`,
              }} />
          );
        })}
        {/* Playhead */}
        <div className="absolute top-0 h-full w-[2px] bg-foreground" style={{ left: `${pct}%` }} />
      </div>
    </div>
  );
}
