import { Vec } from './types';

export const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

const lerp = (a: Vec, b: Vec, t: number): Vec => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

const normalize = (v: Vec): Vec => {
  const len = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
};

export function pathLength(pts: Vec[]) {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += dist(pts[i - 1], pts[i]);
  return total;
}

// The part of the polyline between arc-lengths `from` and `to`.
function slice(pts: Vec[], from: number, to: number): Vec[] {
  const out: Vec[] = [];
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const seg = dist(a, b);
    const s0 = acc;
    const s1 = acc + seg;
    acc = s1;
    if (seg === 0 || s1 < from || s0 > to) continue;
    if (out.length === 0) out.push(lerp(a, b, Math.max(0, (from - s0) / seg)));
    if (s1 <= to) {
      out.push(b);
    } else {
      out.push(lerp(a, b, (to - s0) / seg));
      break;
    }
  }
  return out;
}

// Shorten a polyline at both ends, e.g. so lines stop at a player's edge.
export function trim(pts: Vec[], startLen: number, endLen: number): Vec[] {
  if (pts.length < 2) return [];
  const total = pathLength(pts);
  if (startLen + endLen >= total - 0.05) return [];
  return slice(pts, startLen, total - endLen);
}

// The point at arc-length `s` along the polyline.
export function pointAt(pts: Vec[], s: number): Vec {
  if (s <= 0) return pts[0];
  return slice(pts, s, s + 0.0001)[0] ?? pts[pts.length - 1];
}

// Evenly spaced points along the polyline, always including both ends.
export function resample(pts: Vec[], spacing: number): Vec[] {
  const total = pathLength(pts);
  const count = Math.max(1, Math.round(total / spacing));
  const out: Vec[] = [];
  for (let i = 0; i <= count; i++) {
    out.push(pointAt(pts, (total * i) / count));
  }
  return out;
}

// Direction of travel at the end of the path.
export function endDirection(pts: Vec[]): Vec {
  const tip = pts[pts.length - 1];
  for (let i = pts.length - 2; i >= 0; i--) {
    if (dist(pts[i], tip) > 0.4) return normalize({ x: tip.x - pts[i].x, y: tip.y - pts[i].y });
  }
  return normalize({ x: tip.x - pts[0].x, y: tip.y - pts[0].y });
}

// Smooth SVG path through the points (quadratic curves via segment midpoints).
export function smoothPath(pts: Vec[]): string {
  if (pts.length === 0) return '';
  const f = (n: number) => n.toFixed(2);
  let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
  if (pts.length < 3) {
    for (let i = 1; i < pts.length; i++) d += ` L${f(pts[i].x)} ${f(pts[i].y)}`;
    return d;
  }
  for (let i = 1; i < pts.length - 1; i++) {
    const mid = lerp(pts[i], pts[i + 1], 0.5);
    d += ` Q${f(pts[i].x)} ${f(pts[i].y)} ${f(mid.x)} ${f(mid.y)}`;
  }
  const last = pts[pts.length - 1];
  return d + ` L${f(last.x)} ${f(last.y)}`;
}

// Points that wiggle side to side along the path — the classic dribble line.
export function zigzag(pts: Vec[], amplitude: number, wavelength: number): Vec[] {
  const rs = resample(pts, wavelength / 2);
  return rs.map((p, i) => {
    if (i === 0 || i === rs.length - 1) return p;
    const dir = normalize({ x: rs[i + 1].x - rs[i - 1].x, y: rs[i + 1].y - rs[i - 1].y });
    const side = i % 2 === 0 ? -amplitude : amplitude;
    return { x: p.x - dir.y * side, y: p.y + dir.x * side };
  });
}

export function arrowHead(pts: Vec[], size: number): string {
  const tip = pts[pts.length - 1];
  const d = endDirection(pts);
  const n = { x: -d.y, y: d.x };
  const base = { x: tip.x - d.x * size, y: tip.y - d.y * size };
  const w = size * 0.55;
  return [tip, { x: base.x + n.x * w, y: base.y + n.y * w }, { x: base.x - n.x * w, y: base.y - n.y * w }]
    .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ');
}

export function distanceToPolyline(p: Vec, pts: Vec[]): number {
  if (pts.length === 1) return dist(p, pts[0]);
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const len2 = abx * abx + aby * aby;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2));
    best = Math.min(best, dist(p, { x: a.x + abx * t, y: a.y + aby * t }));
  }
  return best;
}
