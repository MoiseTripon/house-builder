import { Vec2 } from "../../geometry/vec2";

export interface RoofPlaneGeometry {
  planeId: string;
  label: string;
  vertices: Float32Array;
  indices: Uint16Array;
  normals: Float32Array;
  area: number; // in mm²
  slopeAngleDeg: number;
}

export interface GableRoofResult {
  planes: RoofPlaneGeometry[];
}

/**
 * Generates a simple gable roof over the bounding box of a polygon.
 *
 * The ridge runs along the longer axis of the AABB.
 * Returns individual planes (2 slopes + 2 gable ends) for per-plane selection.
 */
export function generateGableRoof(
  roofId: string,
  polygon: Vec2[],
  baseZ: number,
  pitchDeg: number,
  overhang: number,
): GableRoofResult {
  if (polygon.length < 3) {
    return { planes: [] };
  }

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
  if (spanX < 1 || spanY < 1) return { planes: [] };

  const pitchRad = (pitchDeg * Math.PI) / 180;
  const ridgeAlongX = spanX >= spanY;

  const eMinX = minX - overhang;
  const eMaxX = maxX + overhang;
  const eMinY = minY - overhang;
  const eMaxY = maxY + overhang;

  const originalHalfSpan = ridgeAlongX ? spanY / 2 : spanX / 2;
  const rise = originalHalfSpan * Math.tan(pitchRad);
  const ridgeZ = baseZ + rise;

  return ridgeAlongX
    ? buildAlongX(roofId, eMinX, eMaxX, eMinY, eMaxY, baseZ, ridgeZ, pitchDeg)
    : buildAlongY(roofId, eMinX, eMaxX, eMinY, eMaxY, baseZ, ridgeZ, pitchDeg);
}

/* ---- Ridge along X ---- */

function buildAlongX(
  roofId: string,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  baseZ: number,
  ridgeZ: number,
  pitchDeg: number,
): GableRoofResult {
  const midY = (minY + maxY) / 2;
  const planes: RoofPlaneGeometry[] = [];

  // Front slope (minY side)
  const frontVerts: V3[] = [
    [minX, minY, baseZ],
    [maxX, minY, baseZ],
    [maxX, midY, ridgeZ],
    [minX, midY, ridgeZ],
  ];
  const fnorm = faceNormal(frontVerts[0], frontVerts[1], frontVerts[2]);
  planes.push(
    buildQuadPlane(
      `${roofId}_front`,
      "Front Slope",
      frontVerts,
      fnorm,
      pitchDeg,
    ),
  );

  // Back slope (maxY side)
  const backVerts: V3[] = [
    [maxX, maxY, baseZ],
    [minX, maxY, baseZ],
    [minX, midY, ridgeZ],
    [maxX, midY, ridgeZ],
  ];
  const bnorm = faceNormal(backVerts[0], backVerts[1], backVerts[2]);
  planes.push(
    buildQuadPlane(`${roofId}_back`, "Back Slope", backVerts, bnorm, pitchDeg),
  );

  // Left gable triangle (x = minX)
  const leftVerts: V3[] = [
    [minX, maxY, baseZ],
    [minX, minY, baseZ],
    [minX, midY, ridgeZ],
  ];
  const lnorm = faceNormal(leftVerts[0], leftVerts[1], leftVerts[2]);
  planes.push(
    buildTriPlane(`${roofId}_left`, "Left Gable", leftVerts, lnorm, 90),
  );

  // Right gable triangle (x = maxX)
  const rightVerts: V3[] = [
    [maxX, minY, baseZ],
    [maxX, maxY, baseZ],
    [maxX, midY, ridgeZ],
  ];
  const rnorm = faceNormal(rightVerts[0], rightVerts[1], rightVerts[2]);
  planes.push(
    buildTriPlane(`${roofId}_right`, "Right Gable", rightVerts, rnorm, 90),
  );

  return { planes };
}

/* ---- Ridge along Y ---- */

function buildAlongY(
  roofId: string,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  baseZ: number,
  ridgeZ: number,
  pitchDeg: number,
): GableRoofResult {
  const midX = (minX + maxX) / 2;
  const planes: RoofPlaneGeometry[] = [];

  // Left slope (minX side)
  const leftVerts: V3[] = [
    [minX, maxY, baseZ],
    [minX, minY, baseZ],
    [midX, minY, ridgeZ],
    [midX, maxY, ridgeZ],
  ];
  const lnorm = faceNormal(leftVerts[0], leftVerts[1], leftVerts[2]);
  planes.push(
    buildQuadPlane(`${roofId}_left`, "Left Slope", leftVerts, lnorm, pitchDeg),
  );

  // Right slope (maxX side)
  const rightVerts: V3[] = [
    [maxX, minY, baseZ],
    [maxX, maxY, baseZ],
    [midX, maxY, ridgeZ],
    [midX, minY, ridgeZ],
  ];
  const rnorm = faceNormal(rightVerts[0], rightVerts[1], rightVerts[2]);
  planes.push(
    buildQuadPlane(
      `${roofId}_right`,
      "Right Slope",
      rightVerts,
      rnorm,
      pitchDeg,
    ),
  );

  // Front gable triangle (y = minY)
  const frontVerts: V3[] = [
    [minX, minY, baseZ],
    [maxX, minY, baseZ],
    [midX, minY, ridgeZ],
  ];
  const fnorm = faceNormal(frontVerts[0], frontVerts[1], frontVerts[2]);
  planes.push(
    buildTriPlane(`${roofId}_front`, "Front Gable", frontVerts, fnorm, 90),
  );

  // Back gable triangle (y = maxY)
  const backVerts: V3[] = [
    [maxX, maxY, baseZ],
    [minX, maxY, baseZ],
    [midX, maxY, ridgeZ],
  ];
  const bnorm = faceNormal(backVerts[0], backVerts[1], backVerts[2]);
  planes.push(
    buildTriPlane(`${roofId}_back`, "Back Gable", backVerts, bnorm, 90),
  );

  return { planes };
}

/* ---- helpers ---- */

type V3 = [number, number, number];

function faceNormal(a: V3, b: V3, c: V3): V3 {
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

function triangleArea3D(a: V3, b: V3, c: V3): number {
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

function buildQuadPlane(
  planeId: string,
  label: string,
  corners: V3[],
  normal: V3,
  slopeAngleDeg: number,
): RoofPlaneGeometry {
  const verts: number[] = [];
  const norms: number[] = [];
  const idxs: number[] = [];

  for (const c of corners) verts.push(...c);
  for (let i = 0; i < 4; i++) norms.push(...normal);
  idxs.push(0, 1, 2, 0, 2, 3);

  const area =
    triangleArea3D(corners[0], corners[1], corners[2]) +
    triangleArea3D(corners[0], corners[2], corners[3]);

  return {
    planeId,
    label,
    vertices: new Float32Array(verts),
    indices: new Uint16Array(idxs),
    normals: new Float32Array(norms),
    area,
    slopeAngleDeg,
  };
}

function buildTriPlane(
  planeId: string,
  label: string,
  corners: V3[],
  normal: V3,
  slopeAngleDeg: number,
): RoofPlaneGeometry {
  const verts: number[] = [];
  const norms: number[] = [];
  const idxs: number[] = [];

  for (const c of corners) verts.push(...c);
  for (let i = 0; i < 3; i++) norms.push(...normal);
  idxs.push(0, 1, 2);

  const area = triangleArea3D(corners[0], corners[1], corners[2]);

  return {
    planeId,
    label,
    vertices: new Float32Array(verts),
    indices: new Uint16Array(idxs),
    normals: new Float32Array(norms),
    area,
    slopeAngleDeg,
  };
}

/**
 * Generate a flat roof as a single plane.
 */
export function generateFlatRoofPlanes(
  roofId: string,
  polygon: Vec2[],
  baseZ: number,
): GableRoofResult {
  if (polygon.length < 3) return { planes: [] };

  const verts: number[] = [];
  const norms: number[] = [];
  const idxs: number[] = [];

  for (const p of polygon) {
    verts.push(p.x, p.y, baseZ);
    norms.push(0, 0, 1);
  }

  for (let i = 1; i < polygon.length - 1; i++) {
    idxs.push(0, i, i + 1);
  }

  // Calculate area using shoelace in 2D (flat roof so same as 3D area)
  let area = 0;
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += polygon[i].x * polygon[j].y;
    area -= polygon[j].x * polygon[i].y;
  }
  area = Math.abs(area) / 2;

  return {
    planes: [
      {
        planeId: `${roofId}_flat`,
        label: "Flat Roof",
        vertices: new Float32Array(verts),
        indices: new Uint16Array(idxs),
        normals: new Float32Array(norms),
        area,
        slopeAngleDeg: 0,
      },
    ],
  };
}
