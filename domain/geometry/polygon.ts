import { Vec2, sub, cross, distance, dot, length as vecLength } from "./vec2";

export function polygonArea(vertices: Vec2[]): number {
  let area = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return area / 2;
}

export function polygonSignedArea(vertices: Vec2[]): number {
  return polygonArea(vertices);
}

export function isClockwise(vertices: Vec2[]): boolean {
  return polygonSignedArea(vertices) < 0;
}

export function ensureCCW(vertices: Vec2[]): Vec2[] {
  if (isClockwise(vertices)) {
    return [...vertices].reverse();
  }
  return vertices;
}

export function polygonPerimeter(vertices: Vec2[]): number {
  let perimeter = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    perimeter += distance(vertices[i], vertices[j]);
  }
  return perimeter;
}

export function pointInPolygon(point: Vec2, polygon: Vec2[]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x,
      yi = polygon[i].y;
    const xj = polygon[j].x,
      yj = polygon[j].y;
    if (
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

export function polygonCentroid(vertices: Vec2[]): Vec2 {
  let cx = 0,
    cy = 0;
  let area = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const f = vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
    cx += (vertices[i].x + vertices[j].x) * f;
    cy += (vertices[i].y + vertices[j].y) * f;
    area += f;
  }
  area /= 2;
  if (Math.abs(area) < 1e-10) {
    const avg = vertices.reduce(
      (acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y }),
      { x: 0, y: 0 },
    );
    return { x: avg.x / n, y: avg.y / n };
  }
  cx /= 6 * area;
  cy /= 6 * area;
  return { x: cx, y: cy };
}

export function isConvex(vertices: Vec2[]): boolean {
  const n = vertices.length;
  if (n < 3) return false;
  let sign: number | null = null;
  for (let i = 0; i < n; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % n];
    const c = vertices[(i + 2) % n];
    const cp = cross(sub(b, a), sub(c, b));
    if (Math.abs(cp) < 1e-10) continue;
    if (sign === null) {
      sign = cp > 0 ? 1 : -1;
    } else if ((cp > 0 ? 1 : -1) !== sign) {
      return false;
    }
  }
  return true;
}

/**
 * Compute interior angle at one vertex of a polygon.
 * Returns radians in (0, 2π).
 */
export function interiorAngleAt(vertices: Vec2[], index: number): number {
  const n = vertices.length;
  if (n < 3) return 0;

  const prev = vertices[(index - 1 + n) % n];
  const curr = vertices[index];
  const next = vertices[(index + 1) % n];

  const a = sub(prev, curr);
  const b = sub(next, curr);

  const lenA = vecLength(a);
  const lenB = vecLength(b);
  if (lenA < 1e-10 || lenB < 1e-10) return 0;

  const cosAngle = dot(a, b) / (lenA * lenB);
  const baseAngle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
  const crossVal = cross(a, b);

  // Determine polygon winding
  const isCCW = polygonSignedArea(vertices) > 0;

  // For CCW: cross > 0 at vertex ⇒ convex (interior < π)
  // For CW:  cross < 0 at vertex ⇒ convex (interior < π)
  const isConvexVertex = isCCW ? crossVal > 0 : crossVal < 0;

  if (isConvexVertex || Math.abs(crossVal) < 1e-10) {
    return baseAngle;
  }
  return 2 * Math.PI - baseAngle;
}

/**
 * All interior angles for a polygon, one per vertex, in radians.
 */
export function polygonInteriorAngles(vertices: Vec2[]): number[] {
  return vertices.map((_, i) => interiorAngleAt(vertices, i));
}

/**
 * Build arc points for visualising the interior angle at a vertex.
 * Returns an array of positions along the arc.
 */
export function interiorArcPoints(
  center: Vec2,
  prevPos: Vec2,
  nextPos: Vec2,
  isCCW: boolean,
  radius: number,
  segments: number = 24,
): Vec2[] {
  const v1 = sub(prevPos, center);
  const v2 = sub(nextPos, center);

  const len1 = vecLength(v1);
  const len2 = vecLength(v2);
  if (len1 < 1e-10 || len2 < 1e-10) return [];

  const startAngle = Math.atan2(v1.y / len1, v1.x / len1);
  const endAngle = Math.atan2(v2.y / len2, v2.x / len2);

  let sweep = endAngle - startAngle;

  if (isCCW) {
    // Interior arc goes CW (negative sweep)
    if (sweep > 0) sweep -= 2 * Math.PI;
    if (Math.abs(sweep) < 1e-10) sweep = -2 * Math.PI;
  } else {
    // Interior arc goes CCW (positive sweep)
    if (sweep < 0) sweep += 2 * Math.PI;
    if (Math.abs(sweep) < 1e-10) sweep = 2 * Math.PI;
  }

  const points: Vec2[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = startAngle + sweep * t;
    points.push({
      x: center.x + Math.cos(a) * radius,
      y: center.y + Math.sin(a) * radius,
    });
  }
  return points;
}
