export interface Vec2 {
  x: number;
  y: number;
}

export function vec2(x: number, y: number): Vec2 {
  return { x, y };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

export function length(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function lengthSq(v: Vec2): number {
  return v.x * v.x + v.y * v.y;
}

export function distance(a: Vec2, b: Vec2): number {
  return length(sub(b, a));
}

export function distanceSq(a: Vec2, b: Vec2): number {
  return lengthSq(sub(b, a));
}

export function normalize(v: Vec2): Vec2 {
  const len = length(v);
  if (len < 1e-10) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function perpCCW(v: Vec2): Vec2 {
  return { x: -v.y, y: v.x };
}

export function perpCW(v: Vec2): Vec2 {
  return { x: v.y, y: -v.x };
}

export function lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function equals(a: Vec2, b: Vec2, epsilon: number = 1e-6): boolean {
  return Math.abs(a.x - b.x) < epsilon && Math.abs(a.y - b.y) < epsilon;
}

export function angle(v: Vec2): number {
  return Math.atan2(v.y, v.x);
}

export function angleBetween(a: Vec2, b: Vec2): number {
  return Math.atan2(cross(a, b), dot(a, b));
}

export function rotate(v: Vec2, rad: number): Vec2 {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

export function midpoint(a: Vec2, b: Vec2): Vec2 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function closestPointOnSegment(
  p: Vec2,
  a: Vec2,
  b: Vec2,
): { point: Vec2; t: number } {
  const ab = sub(b, a);
  const ap = sub(p, a);
  const abLenSq = lengthSq(ab);
  if (abLenSq < 1e-10) return { point: a, t: 0 };
  let t = dot(ap, ab) / abLenSq;
  t = Math.max(0, Math.min(1, t));
  return { point: add(a, scale(ab, t)), t };
}

export function distanceToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const { point } = closestPointOnSegment(p, a, b);
  return distance(p, point);
}
