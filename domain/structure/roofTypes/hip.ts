import {
  RoofBuildParams,
  RoofBuildResult,
  V3,
  computeAABB,
  expandedAABB,
  ridgeAlongX as isRidgeAlongX,
  buildQuadPlane,
  buildTriPlane,
  slopeFromVectors,
  emptyResult,
} from "./common";

/**
 * Hip roof: four sloped faces meeting at a shorter ridge.
 * Ridge length = longer_span − shorter_span (standard 45 ° hips).
 */
export function generateHipRoof(params: RoofBuildParams): RoofBuildResult {
  const aabb = computeAABB(params.polygon);
  if (!aabb) return emptyResult();

  const pitchRad = (params.pitchDeg * Math.PI) / 180;
  const alongX = isRidgeAlongX(aabb);
  const { eMinX, eMaxX, eMinY, eMaxY } = expandedAABB(
    aabb,
    params.edgeOverhangs,
  );

  const halfSpan = alongX ? aabb.spanY / 2 : aabb.spanX / 2;
  const rise = halfSpan * Math.tan(pitchRad);
  const ridgeZ = params.baseZ + rise;

  // Hip inset = half of the shorter span (creates 45° hip rafters)
  const inset = halfSpan;

  return alongX
    ? buildX(params, eMinX, eMaxX, eMinY, eMaxY, ridgeZ, rise, inset)
    : buildY(params, eMinX, eMaxX, eMinY, eMaxY, ridgeZ, rise, inset);
}

function buildX(
  p: RoofBuildParams,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  ridgeZ: number,
  rise: number,
  inset: number,
): RoofBuildResult {
  const midY = (minY + maxY) / 2 + p.ridgeOffset;
  const id = p.roofId;
  const bz = p.baseZ;

  // Ridge endpoints pulled inward by `inset`
  const rL = Math.min(minX + inset, (minX + maxX) / 2);
  const rR = Math.max(maxX - inset, (minX + maxX) / 2);

  // Front slope – trapezoid
  const front: V3[] = [
    [minX, minY, bz],
    [maxX, minY, bz],
    [rR, midY, ridgeZ],
    [rL, midY, ridgeZ],
  ];
  // Back slope – trapezoid
  const back: V3[] = [
    [maxX, maxY, bz],
    [minX, maxY, bz],
    [rL, midY, ridgeZ],
    [rR, midY, ridgeZ],
  ];
  // Left hip – triangle
  const left: V3[] = [
    [minX, maxY, bz],
    [minX, minY, bz],
    [rL, midY, ridgeZ],
  ];
  // Right hip – triangle
  const right: V3[] = [
    [maxX, minY, bz],
    [maxX, maxY, bz],
    [rR, midY, ridgeZ],
  ];

  return {
    planes: [
      buildQuadPlane(
        `${id}_front`,
        "Front Slope",
        front,
        slopeFromVectors(front[0], front[3]),
        ["front"],
      ),
      buildQuadPlane(
        `${id}_back`,
        "Back Slope",
        back,
        slopeFromVectors(back[0], back[3]),
        ["back"],
      ),
      buildTriPlane(
        `${id}_left`,
        "Left Hip",
        left,
        slopeFromVectors(left[0], left[2]),
        ["left"],
      ),
      buildTriPlane(
        `${id}_right`,
        "Right Hip",
        right,
        slopeFromVectors(right[0], right[2]),
        ["right"],
      ),
    ],
    ridgeHeight: rise,
  };
}

function buildY(
  p: RoofBuildParams,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  ridgeZ: number,
  rise: number,
  inset: number,
): RoofBuildResult {
  const midX = (minX + maxX) / 2 + p.ridgeOffset;
  const id = p.roofId;
  const bz = p.baseZ;

  const rF = Math.min(minY + inset, (minY + maxY) / 2);
  const rB = Math.max(maxY - inset, (minY + maxY) / 2);

  const left: V3[] = [
    [minX, maxY, bz],
    [minX, minY, bz],
    [midX, rF, ridgeZ],
    [midX, rB, ridgeZ],
  ];
  const right: V3[] = [
    [maxX, minY, bz],
    [maxX, maxY, bz],
    [midX, rB, ridgeZ],
    [midX, rF, ridgeZ],
  ];
  const front: V3[] = [
    [minX, minY, bz],
    [maxX, minY, bz],
    [midX, rF, ridgeZ],
  ];
  const back: V3[] = [
    [maxX, maxY, bz],
    [minX, maxY, bz],
    [midX, rB, ridgeZ],
  ];

  return {
    planes: [
      buildQuadPlane(
        `${id}_left`,
        "Left Slope",
        left,
        slopeFromVectors(left[0], left[3]),
        ["left"],
      ),
      buildQuadPlane(
        `${id}_right`,
        "Right Slope",
        right,
        slopeFromVectors(right[0], right[3]),
        ["right"],
      ),
      buildTriPlane(
        `${id}_front`,
        "Front Hip",
        front,
        slopeFromVectors(front[0], front[2]),
        ["front"],
      ),
      buildTriPlane(
        `${id}_back`,
        "Back Hip",
        back,
        slopeFromVectors(back[0], back[2]),
        ["back"],
      ),
    ],
    ridgeHeight: rise,
  };
}
