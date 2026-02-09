import { Vec2, sub, cross, distance } from "./vec2";

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
    // Degenerate polygon, return average
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
