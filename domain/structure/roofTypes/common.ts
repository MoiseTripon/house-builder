import { Vec2 } from "../../geometry/vec2";

/* ────────────────  Shared types  ──────────────── */

export type RoofSide = "front" | "back" | "left" | "right";

export const ALL_SIDES: RoofSide[] = ["front", "back", "left", "right"];

export interface EdgeOverhangs {
  front: number; // mm – minY side
  back: number; // mm – maxY side
  left: number; // mm – minX side
  right: number; // mm – maxX side
}

export function defaultEdgeOverhangs(value: number = 0): EdgeOverhangs {
  return { front: value, back: value, left: value, right: value };
}

export interface RoofBuildParams {
  roofId: string;
  polygon: Vec2[];
  baseZ: number;
  pitchDeg: number;
  lowerPitchDeg: number; // gambrel / mansard only
  edgeOverhangs: EdgeOverhangs;
  ridgeOffset: number; // mm – perpendicular shift from centre
}

export interface RoofPlaneGeometry {
  planeId: string;
  label: string;
  vertices: Float32Array;
  indices: Uint16Array;
  normals: Float32Array;
  area: number;
  slopeAngleDeg: number;
  /** Which AABB sides this plane's eave (base) edges correspond to */
  baseEdgeSides: RoofSide[];
}

export interface RoofBuildResult {
  planes: RoofPlaneGeometry[];
  ridgeHeight: number;
}

/* ────────────────  AABB  ──────────────── */

export interface AABB {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  spanX: number;
  spanY: number;
}

export function computeAABB(polygon: Vec2[]): AABB | null {
  if (polygon.length < 3) return null;
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const p of polygon) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  if (spanX < 1 || spanY < 1) return null;
  return { minX, maxX, minY, maxY, spanX, spanY };
}

/** Expand AABB by per-edge overhangs. */
export function expandedAABB(
  aabb: AABB,
  oh: EdgeOverhangs,
): { eMinX: number; eMaxX: number; eMinY: number; eMaxY: number } {
  return {
    eMinX: aabb.minX - oh.left,
    eMaxX: aabb.maxX + oh.right,
    eMinY: aabb.minY - oh.front,
    eMaxY: aabb.maxY + oh.back,
  };
}

/** Whether the ridge should run along X (true) or Y (false). */
export function ridgeAlongX(aabb: AABB): boolean {
  return aabb.spanX >= aabb.spanY;
}

/* ────────────────  Geometry helpers  ──────────────── */

export type V3 = [number, number, number];

export function faceNormal(a: V3, b: V3, c: V3): V3 {
  const e1x = b[0] - a[0],
    e1y = b[1] - a[1],
    e1z = b[2] - a[2];
  const e2x = c[0] - a[0],
    e2y = c[1] - a[1],
    e2z = c[2] - a[2];
  let nx = e1y * e2z - e1z * e2y;
  let ny = e1z * e2x - e1x * e2z;
  let nz = e1x * e2y - e1y * e2x;
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (len < 1e-10) return [0, 0, 1];
  return [nx / len, ny / len, nz / len];
}

export function triangleArea3D(a: V3, b: V3, c: V3): number {
  const e1x = b[0] - a[0],
    e1y = b[1] - a[1],
    e1z = b[2] - a[2];
  const e2x = c[0] - a[0],
    e2y = c[1] - a[1],
    e2z = c[2] - a[2];
  const cx = e1y * e2z - e1z * e2y;
  const cy = e1z * e2x - e1x * e2z;
  const cz = e1x * e2y - e1y * e2x;
  return Math.sqrt(cx * cx + cy * cy + cz * cz) / 2;
}

export function slopeFromVectors(a: V3, b: V3): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const horiz = Math.sqrt(dx * dx + dy * dy);
  return horiz > 1e-6 ? (Math.atan2(Math.abs(dz), horiz) * 180) / Math.PI : 90;
}

/* ────────────────  Plane builders  ──────────────── */

export function buildQuadPlane(
  planeId: string,
  label: string,
  corners: V3[],
  slopeAngleDeg: number,
  baseEdgeSides: RoofSide[],
): RoofPlaneGeometry {
  const normal = faceNormal(corners[0], corners[1], corners[2]);
  const verts: number[] = [];
  const norms: number[] = [];
  for (const c of corners) verts.push(...c);
  for (let i = 0; i < 4; i++) norms.push(...normal);
  const area =
    triangleArea3D(corners[0], corners[1], corners[2]) +
    triangleArea3D(corners[0], corners[2], corners[3]);
  return {
    planeId,
    label,
    vertices: new Float32Array(verts),
    indices: new Uint16Array([0, 1, 2, 0, 2, 3]),
    normals: new Float32Array(norms),
    area,
    slopeAngleDeg,
    baseEdgeSides,
  };
}

export function buildTriPlane(
  planeId: string,
  label: string,
  corners: V3[],
  slopeAngleDeg: number,
  baseEdgeSides: RoofSide[],
): RoofPlaneGeometry {
  const normal = faceNormal(corners[0], corners[1], corners[2]);
  const verts: number[] = [];
  const norms: number[] = [];
  for (const c of corners) verts.push(...c);
  for (let i = 0; i < 3; i++) norms.push(...normal);
  const area = triangleArea3D(corners[0], corners[1], corners[2]);
  return {
    planeId,
    label,
    vertices: new Float32Array(verts),
    indices: new Uint16Array([0, 1, 2]),
    normals: new Float32Array(norms),
    area,
    slopeAngleDeg,
    baseEdgeSides,
  };
}

export function buildPolyPlane(
  planeId: string,
  label: string,
  corners: V3[],
  slopeAngleDeg: number,
  baseEdgeSides: RoofSide[],
): RoofPlaneGeometry {
  if (corners.length < 3)
    return emptyPlane(planeId, label, slopeAngleDeg, baseEdgeSides);
  const normal = faceNormal(corners[0], corners[1], corners[2]);
  const verts: number[] = [];
  const norms: number[] = [];
  for (const c of corners) {
    verts.push(...c);
    norms.push(...normal);
  }
  const idxs: number[] = [];
  for (let i = 1; i < corners.length - 1; i++) idxs.push(0, i, i + 1);
  let area = 0;
  for (let i = 1; i < corners.length - 1; i++)
    area += triangleArea3D(corners[0], corners[i], corners[i + 1]);
  return {
    planeId,
    label,
    vertices: new Float32Array(verts),
    indices: new Uint16Array(idxs),
    normals: new Float32Array(norms),
    area,
    slopeAngleDeg,
    baseEdgeSides,
  };
}

export function emptyPlane(
  planeId: string,
  label: string,
  slopeAngleDeg: number,
  baseEdgeSides: RoofSide[],
): RoofPlaneGeometry {
  return {
    planeId,
    label,
    vertices: new Float32Array(0),
    indices: new Uint16Array(0),
    normals: new Float32Array(0),
    area: 0,
    slopeAngleDeg,
    baseEdgeSides,
  };
}

export function emptyResult(): RoofBuildResult {
  return { planes: [], ridgeHeight: 0 };
}
