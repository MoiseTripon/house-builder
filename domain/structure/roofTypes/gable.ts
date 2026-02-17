import { Vec2 } from "../../geometry/vec2";

export interface RoofGeometry {
  vertices: Float32Array;
  indices: Uint16Array;
  normals: Float32Array;
}

/**
 * Generates a simple gable roof over the bounding box of a polygon.
 *
 * The ridge runs along the longer axis of the AABB.
 * Two sloped quads + two triangular gable ends.
 */
export function generateGableRoof(
  polygon: Vec2[],
  baseZ: number,
  pitchDeg: number,
  overhang: number,
): RoofGeometry {
  if (polygon.length < 3) {
    return emptyGeometry();
  }

  // Bounding box of the face polygon
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
  if (spanX < 1 || spanY < 1) return emptyGeometry();

  const pitchRad = (pitchDeg * Math.PI) / 180;
  const ridgeAlongX = spanX >= spanY;

  // Expand footprint by overhang
  const eMinX = minX - overhang;
  const eMaxX = maxX + overhang;
  const eMinY = minY - overhang;
  const eMaxY = maxY + overhang;

  // Rise is computed from the ORIGINAL span (not the overhang-extended one)
  const originalHalfSpan = ridgeAlongX ? spanY / 2 : spanX / 2;
  const rise = originalHalfSpan * Math.tan(pitchRad);
  const ridgeZ = baseZ + rise;

  return ridgeAlongX
    ? buildAlongX(eMinX, eMaxX, eMinY, eMaxY, baseZ, ridgeZ)
    : buildAlongY(eMinX, eMaxX, eMinY, eMaxY, baseZ, ridgeZ);
}

/* ---- Ridge along X ---- */

function buildAlongX(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  baseZ: number,
  ridgeZ: number,
): RoofGeometry {
  const midY = (minY + maxY) / 2;
  const verts: number[] = [];
  const norms: number[] = [];
  const idxs: number[] = [];
  let bi = 0;

  /* --- front slope (minY side, normal faces −Y / +Z) --- */
  const fnorm = faceNormal(
    [minX, minY, baseZ],
    [maxX, minY, baseZ],
    [maxX, midY, ridgeZ],
  );
  pushQuad(
    verts,
    norms,
    idxs,
    [minX, minY, baseZ],
    [maxX, minY, baseZ],
    [maxX, midY, ridgeZ],
    [minX, midY, ridgeZ],
    fnorm,
    bi,
  );
  bi += 4;

  /* --- back slope (maxY side, normal faces +Y / +Z) --- */
  const bnorm = faceNormal(
    [maxX, maxY, baseZ],
    [minX, maxY, baseZ],
    [minX, midY, ridgeZ],
  );
  pushQuad(
    verts,
    norms,
    idxs,
    [maxX, maxY, baseZ],
    [minX, maxY, baseZ],
    [minX, midY, ridgeZ],
    [maxX, midY, ridgeZ],
    bnorm,
    bi,
  );
  bi += 4;

  /* --- left gable triangle (x = minX, normal faces −X) --- */
  const lnorm = faceNormal(
    [minX, maxY, baseZ],
    [minX, minY, baseZ],
    [minX, midY, ridgeZ],
  );
  pushTri(
    verts,
    norms,
    idxs,
    [minX, maxY, baseZ],
    [minX, minY, baseZ],
    [minX, midY, ridgeZ],
    lnorm,
    bi,
  );
  bi += 3;

  /* --- right gable triangle (x = maxX, normal faces +X) --- */
  const rnorm = faceNormal(
    [maxX, minY, baseZ],
    [maxX, maxY, baseZ],
    [maxX, midY, ridgeZ],
  );
  pushTri(
    verts,
    norms,
    idxs,
    [maxX, minY, baseZ],
    [maxX, maxY, baseZ],
    [maxX, midY, ridgeZ],
    rnorm,
    bi,
  );

  return {
    vertices: new Float32Array(verts),
    indices: new Uint16Array(idxs),
    normals: new Float32Array(norms),
  };
}

/* ---- Ridge along Y ---- */

function buildAlongY(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  baseZ: number,
  ridgeZ: number,
): RoofGeometry {
  const midX = (minX + maxX) / 2;
  const verts: number[] = [];
  const norms: number[] = [];
  const idxs: number[] = [];
  let bi = 0;

  /* --- left slope (minX side, normal faces −X / +Z) --- */
  const lnorm = faceNormal(
    [minX, maxY, baseZ],
    [minX, minY, baseZ],
    [midX, minY, ridgeZ],
  );
  pushQuad(
    verts,
    norms,
    idxs,
    [minX, maxY, baseZ],
    [minX, minY, baseZ],
    [midX, minY, ridgeZ],
    [midX, maxY, ridgeZ],
    lnorm,
    bi,
  );
  bi += 4;

  /* --- right slope (maxX side, normal faces +X / +Z) --- */
  const rnorm = faceNormal(
    [maxX, minY, baseZ],
    [maxX, maxY, baseZ],
    [midX, maxY, ridgeZ],
  );
  pushQuad(
    verts,
    norms,
    idxs,
    [maxX, minY, baseZ],
    [maxX, maxY, baseZ],
    [midX, maxY, ridgeZ],
    [midX, minY, ridgeZ],
    rnorm,
    bi,
  );
  bi += 4;

  /* --- front gable triangle (y = minY, normal faces −Y) --- */
  const fnorm = faceNormal(
    [minX, minY, baseZ],
    [maxX, minY, baseZ],
    [midX, minY, ridgeZ],
  );
  pushTri(
    verts,
    norms,
    idxs,
    [minX, minY, baseZ],
    [maxX, minY, baseZ],
    [midX, minY, ridgeZ],
    fnorm,
    bi,
  );
  bi += 3;

  /* --- back gable triangle (y = maxY, normal faces +Y) --- */
  const bnorm = faceNormal(
    [maxX, maxY, baseZ],
    [minX, maxY, baseZ],
    [midX, maxY, ridgeZ],
  );
  pushTri(
    verts,
    norms,
    idxs,
    [maxX, maxY, baseZ],
    [minX, maxY, baseZ],
    [midX, maxY, ridgeZ],
    bnorm,
    bi,
  );

  return {
    vertices: new Float32Array(verts),
    indices: new Uint16Array(idxs),
    normals: new Float32Array(norms),
  };
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

function pushQuad(
  verts: number[],
  norms: number[],
  idxs: number[],
  a: V3,
  b: V3,
  c: V3,
  d: V3,
  n: V3,
  base: number,
) {
  verts.push(...a, ...b, ...c, ...d);
  for (let i = 0; i < 4; i++) norms.push(...n);
  idxs.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

function pushTri(
  verts: number[],
  norms: number[],
  idxs: number[],
  a: V3,
  b: V3,
  c: V3,
  n: V3,
  base: number,
) {
  verts.push(...a, ...b, ...c);
  for (let i = 0; i < 3; i++) norms.push(...n);
  idxs.push(base, base + 1, base + 2);
}

function emptyGeometry(): RoofGeometry {
  return {
    vertices: new Float32Array(0),
    indices: new Uint16Array(0),
    normals: new Float32Array(0),
  };
}
