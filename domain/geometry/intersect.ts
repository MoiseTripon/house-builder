import { Vec2, vec2, sub, cross, add, scale } from "./vec2";

export interface IntersectionResult {
  intersects: boolean;
  point?: Vec2;
  t?: number; // parameter on first segment
  u?: number; // parameter on second segment
}

export function segmentIntersection(
  p1: Vec2,
  p2: Vec2,
  p3: Vec2,
  p4: Vec2,
  epsilon: number = 1e-10,
): IntersectionResult {
  const d1 = sub(p2, p1);
  const d2 = sub(p4, p3);
  const denom = cross(d1, d2);

  if (Math.abs(denom) < epsilon) {
    return { intersects: false };
  }

  const d3 = sub(p3, p1);
  const t = cross(d3, d2) / denom;
  const u = cross(d3, d1) / denom;

  if (t >= -epsilon && t <= 1 + epsilon && u >= -epsilon && u <= 1 + epsilon) {
    return {
      intersects: true,
      point: add(p1, scale(d1, t)),
      t,
      u,
    };
  }

  return { intersects: false };
}

export function lineIntersection(
  p1: Vec2,
  d1: Vec2,
  p2: Vec2,
  d2: Vec2,
): IntersectionResult {
  const denom = cross(d1, d2);
  if (Math.abs(denom) < 1e-10) {
    return { intersects: false };
  }
  const d = sub(p2, p1);
  const t = cross(d, d2) / denom;
  return {
    intersects: true,
    point: add(p1, scale(d1, t)),
    t,
  };
}

export function segmentsSelfIntersect(
  segments: { start: Vec2; end: Vec2 }[],
  excludeAdjacent: boolean = true,
): boolean {
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      if (
        excludeAdjacent &&
        (j === i + 1 || (i === 0 && j === segments.length - 1))
      ) {
        continue;
      }
      const result = segmentIntersection(
        segments[i].start,
        segments[i].end,
        segments[j].start,
        segments[j].end,
      );
      if (result.intersects) {
        if (
          result.t! > 1e-6 &&
          result.t! < 1 - 1e-6 &&
          result.u! > 1e-6 &&
          result.u! < 1 - 1e-6
        ) {
          return true;
        }
      }
    }
  }
  return false;
}
