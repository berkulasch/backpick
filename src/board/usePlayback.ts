import { useEffect, useRef, useState } from 'react';

// A clock running from 0 to `duration` seconds at an adjustable speed.
export function usePlayback(duration: number) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timeRef = useRef(0);

  const seek = (t: number) => {
    if (!Number.isFinite(t)) return;
    timeRef.current = Math.min(duration, Math.max(0, t));
    setTime(timeRef.current);
  };

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last: number | null = null;
    const tick = (now: number) => {
      const dt = last === null ? 0 : ((now - last) / 1000) * speed;
      last = now;
      const next = Math.min(duration, timeRef.current + dt);
      timeRef.current = next;
      setTime(next);
      if (next >= duration) setPlaying(false);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, duration]);

  return {
    time,
    duration,
    playing,
    speed,
    setSpeed,
    seek,
    play: () => {
      if (timeRef.current >= duration) seek(0);
      setPlaying(true);
    },
    pause: () => setPlaying(false),
    restart: () => {
      seek(0);
      setPlaying(true);
    },
  };
}

export type PlaybackClock = ReturnType<typeof usePlayback>;
