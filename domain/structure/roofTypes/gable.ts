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

export type { RoofPlaneGeometry, RoofBuildResult } from "./common";

export function generateGableRoof(params: RoofBuildParams): RoofBuildResult {
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

  return alongX
    ? buildX(params, eMinX, eMaxX, eMinY, eMaxY, ridgeZ, rise)
    : buildY(params, eMinX, eMaxX, eMinY, eMaxY, ridgeZ, rise);
}

function buildX(
  p: RoofBuildParams,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  ridgeZ: number,
  rise: number,
): RoofBuildResult {
  const midY = (minY + maxY) / 2 + p.ridgeOffset;
  const id = p.roofId;
  const bz = p.baseZ;

  const frontSlope: V3[] = [
    [minX, minY, bz],
    [maxX, minY, bz],
    [maxX, midY, ridgeZ],
    [minX, midY, ridgeZ],
  ];
  const backSlope: V3[] = [
    [maxX, maxY, bz],
    [minX, maxY, bz],
    [minX, midY, ridgeZ],
    [maxX, midY, ridgeZ],
  ];
  const leftGable: V3[] = [
    [minX, maxY, bz],
    [minX, minY, bz],
    [minX, midY, ridgeZ],
  ];
  const rightGable: V3[] = [
    [maxX, minY, bz],
    [maxX, maxY, bz],
    [maxX, midY, ridgeZ],
  ];

  return {
    planes: [
      buildQuadPlane(
        `${id}_front`,
        "Front Slope",
        frontSlope,
        slopeFromVectors(frontSlope[0], frontSlope[3]),
        ["front"],
      ),
      buildQuadPlane(
        `${id}_back`,
        "Back Slope",
        backSlope,
        slopeFromVectors(backSlope[0], backSlope[3]),
        ["back"],
      ),
      buildTriPlane(`${id}_left`, "Left Gable", leftGable, 90, ["left"]),
      buildTriPlane(`${id}_right`, "Right Gable", rightGable, 90, ["right"]),
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
): RoofBuildResult {
  const midX = (minX + maxX) / 2 + p.ridgeOffset;
  const id = p.roofId;
  const bz = p.baseZ;

  const leftSlope: V3[] = [
    [minX, maxY, bz],
    [minX, minY, bz],
    [midX, minY, ridgeZ],
    [midX, maxY, ridgeZ],
  ];
  const rightSlope: V3[] = [
    [maxX, minY, bz],
    [maxX, maxY, bz],
    [midX, maxY, ridgeZ],
    [midX, minY, ridgeZ],
  ];
  const frontGable: V3[] = [
    [minX, minY, bz],
    [maxX, minY, bz],
    [midX, minY, ridgeZ],
  ];
  const backGable: V3[] = [
    [maxX, maxY, bz],
    [minX, maxY, bz],
    [midX, maxY, ridgeZ],
  ];

  return {
    planes: [
      buildQuadPlane(
        `${id}_left`,
        "Left Slope",
        leftSlope,
        slopeFromVectors(leftSlope[0], leftSlope[3]),
        ["left"],
      ),
      buildQuadPlane(
        `${id}_right`,
        "Right Slope",
        rightSlope,
        slopeFromVectors(rightSlope[0], rightSlope[3]),
        ["right"],
      ),
      buildTriPlane(`${id}_front`, "Front Gable", frontGable, 90, ["front"]),
      buildTriPlane(`${id}_back`, "Back Gable", backGable, 90, ["back"]),
    ],
    ridgeHeight: rise,
  };
}
