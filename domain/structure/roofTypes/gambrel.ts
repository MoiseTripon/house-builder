import {
  RoofBuildParams,
  RoofBuildResult,
  V3,
  computeAABB,
  expandedAABB,
  ridgeAlongX as isRidgeAlongX,
  buildQuadPlane,
  buildPolyPlane,
  slopeFromVectors,
  emptyResult,
} from "./common";

/**
 * Gambrel roof: two-slope gable.
 * Lower portion is steep (`lowerPitchDeg`), upper portion uses `pitchDeg`.
 * Break point is at 50 % of the rise.
 */
export function generateGambrelRoof(params: RoofBuildParams): RoofBuildResult {
  const aabb = computeAABB(params.polygon);
  if (!aabb) return emptyResult();

  const upperRad = (params.pitchDeg * Math.PI) / 180;
  const lowerRad = (params.lowerPitchDeg * Math.PI) / 180;
  const alongX = isRidgeAlongX(aabb);
  const { eMinX, eMaxX, eMinY, eMaxY } = expandedAABB(
    aabb,
    params.edgeOverhangs,
  );

  const halfSpan = alongX ? aabb.spanY / 2 : aabb.spanX / 2;

  // Lower portion covers half the horizontal half-span
  const lowerRun = halfSpan * 0.5;
  const lowerRise = lowerRun * Math.tan(lowerRad);

  // Upper portion covers the remaining half
  const upperRun = halfSpan - lowerRun;
  const upperRise = upperRun * Math.tan(upperRad);

  const totalRise = lowerRise + upperRise;
  const breakZ = params.baseZ + lowerRise;
  const ridgeZ = params.baseZ + totalRise;

  return alongX
    ? buildX(
        params,
        eMinX,
        eMaxX,
        eMinY,
        eMaxY,
        breakZ,
        ridgeZ,
        totalRise,
        lowerRun,
      )
    : buildY(
        params,
        eMinX,
        eMaxX,
        eMinY,
        eMaxY,
        breakZ,
        ridgeZ,
        totalRise,
        lowerRun,
      );
}

function buildX(
  p: RoofBuildParams,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  breakZ: number,
  ridgeZ: number,
  totalRise: number,
  lowerRun: number,
): RoofBuildResult {
  const midY = (minY + maxY) / 2 + p.ridgeOffset;
  const bz = p.baseZ;
  const id = p.roofId;

  // Break lines
  const breakFrontY = minY + lowerRun;
  const breakBackY = maxY - lowerRun;

  const planes = [
    // Front lower (steep)
    buildQuadPlane(
      `${id}_front_lower`,
      "Front Lower",
      [
        [minX, minY, bz],
        [maxX, minY, bz],
        [maxX, breakFrontY, breakZ],
        [minX, breakFrontY, breakZ],
      ],
      p.lowerPitchDeg,
      ["front"],
    ),
    // Front upper (shallow)
    buildQuadPlane(
      `${id}_front_upper`,
      "Front Upper",
      [
        [minX, breakFrontY, breakZ],
        [maxX, breakFrontY, breakZ],
        [maxX, midY, ridgeZ],
        [minX, midY, ridgeZ],
      ],
      p.pitchDeg,
      [],
    ),
    // Back lower (steep)
    buildQuadPlane(
      `${id}_back_lower`,
      "Back Lower",
      [
        [maxX, maxY, bz],
        [minX, maxY, bz],
        [minX, breakBackY, breakZ],
        [maxX, breakBackY, breakZ],
      ],
      p.lowerPitchDeg,
      ["back"],
    ),
    // Back upper (shallow)
    buildQuadPlane(
      `${id}_back_upper`,
      "Back Upper",
      [
        [maxX, breakBackY, breakZ],
        [minX, breakBackY, breakZ],
        [minX, midY, ridgeZ],
        [maxX, midY, ridgeZ],
      ],
      p.pitchDeg,
      [],
    ),
    // Left gable (pentagon)
    buildPolyPlane(
      `${id}_left`,
      "Left Gable",
      [
        [minX, maxY, bz],
        [minX, minY, bz],
        [minX, breakFrontY, breakZ],
        [minX, midY, ridgeZ],
        [minX, breakBackY, breakZ],
      ],
      90,
      ["left"],
    ),
    // Right gable (pentagon)
    buildPolyPlane(
      `${id}_right`,
      "Right Gable",
      [
        [maxX, minY, bz],
        [maxX, maxY, bz],
        [maxX, breakBackY, breakZ],
        [maxX, midY, ridgeZ],
        [maxX, breakFrontY, breakZ],
      ],
      90,
      ["right"],
    ),
  ];

  return { planes, ridgeHeight: totalRise };
}

function buildY(
  p: RoofBuildParams,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  breakZ: number,
  ridgeZ: number,
  totalRise: number,
  lowerRun: number,
): RoofBuildResult {
  const midX = (minX + maxX) / 2 + p.ridgeOffset;
  const bz = p.baseZ;
  const id = p.roofId;

  const breakLeftX = minX + lowerRun;
  const breakRightX = maxX - lowerRun;

  const planes = [
    buildQuadPlane(
      `${id}_left_lower`,
      "Left Lower",
      [
        [minX, maxY, bz],
        [minX, minY, bz],
        [breakLeftX, minY, breakZ],
        [breakLeftX, maxY, breakZ],
      ],
      p.lowerPitchDeg,
      ["left"],
    ),
    buildQuadPlane(
      `${id}_left_upper`,
      "Left Upper",
      [
        [breakLeftX, maxY, breakZ],
        [breakLeftX, minY, breakZ],
        [midX, minY, ridgeZ],
        [midX, maxY, ridgeZ],
      ],
      p.pitchDeg,
      [],
    ),
    buildQuadPlane(
      `${id}_right_lower`,
      "Right Lower",
      [
        [maxX, minY, bz],
        [maxX, maxY, bz],
        [breakRightX, maxY, breakZ],
        [breakRightX, minY, breakZ],
      ],
      p.lowerPitchDeg,
      ["right"],
    ),
    buildQuadPlane(
      `${id}_right_upper`,
      "Right Upper",
      [
        [breakRightX, minY, breakZ],
        [breakRightX, maxY, breakZ],
        [midX, maxY, ridgeZ],
        [midX, minY, ridgeZ],
      ],
      p.pitchDeg,
      [],
    ),
    buildPolyPlane(
      `${id}_front`,
      "Front Gable",
      [
        [minX, minY, bz],
        [maxX, minY, bz],
        [breakRightX, minY, breakZ],
        [midX, minY, ridgeZ],
        [breakLeftX, minY, breakZ],
      ],
      90,
      ["front"],
    ),
    buildPolyPlane(
      `${id}_back`,
      "Back Gable",
      [
        [maxX, maxY, bz],
        [minX, maxY, bz],
        [breakLeftX, maxY, breakZ],
        [midX, maxY, ridgeZ],
        [breakRightX, maxY, breakZ],
      ],
      90,
      ["back"],
    ),
  ];

  return { planes, ridgeHeight: totalRise };
}
