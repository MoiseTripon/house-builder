import {
  RoofBuildParams,
  RoofBuildResult,
  V3,
  computeAABB,
  expandedAABB,
  buildQuadPlane,
  buildTriPlane,
  slopeFromVectors,
  emptyResult,
} from "./common";

/**
 * Mansard roof: hip-style with a steep lower portion and shallow upper.
 * Essentially a hip-gambrel hybrid — all four sides break into lower+upper.
 */
export function generateMansardRoof(params: RoofBuildParams): RoofBuildResult {
  const aabb = computeAABB(params.polygon);
  if (!aabb) return emptyResult();

  const upperRad = (params.pitchDeg * Math.PI) / 180;
  const lowerRad = (params.lowerPitchDeg * Math.PI) / 180;
  const { eMinX, eMaxX, eMinY, eMaxY } = expandedAABB(
    aabb,
    params.edgeOverhangs,
  );

  // Use the shorter span to compute proportions
  const halfSpanX = aabb.spanX / 2;
  const halfSpanY = aabb.spanY / 2;
  const halfSpan = Math.min(halfSpanX, halfSpanY);

  const lowerRun = halfSpan * 0.45;
  const lowerRise = lowerRun * Math.tan(lowerRad);
  const upperRun = halfSpan - lowerRun;
  const upperRise = upperRun * Math.tan(upperRad);

  const totalRise = lowerRise + upperRise;
  const breakZ = params.baseZ + lowerRise;
  const ridgeZ = params.baseZ + totalRise;

  const bz = params.baseZ;
  const id = params.roofId;
  const ro = params.ridgeOffset;

  // Break lines — inset the footprint by lowerRun
  const bMinX = eMinX + lowerRun;
  const bMaxX = eMaxX - lowerRun;
  const bMinY = eMinY + lowerRun;
  const bMaxY = eMaxY - lowerRun;

  // Upper hip inset
  const upperInset = Math.min(
    upperRun,
    Math.min(bMaxX - bMinX, bMaxY - bMinY) / 2,
  );
  const midX = (bMinX + bMaxX) / 2 + ro;
  const midY = (bMinY + bMaxY) / 2 + ro;

  // Ridge endpoints (hip-style on upper portion)
  const isWideX = bMaxX - bMinX >= bMaxY - bMinY;
  const rMinX = isWideX ? bMinX + upperInset : midX;
  const rMaxX = isWideX ? bMaxX - upperInset : midX;
  const rMinY = isWideX ? midY : bMinY + upperInset;
  const rMaxY = isWideX ? midY : bMaxY - upperInset;

  const planes = [
    /* ---- lower steep portion (4 trapezoids) ---- */
    buildQuadPlane(
      `${id}_front_lower`,
      "Front Lower",
      [
        [eMinX, eMinY, bz],
        [eMaxX, eMinY, bz],
        [bMaxX, bMinY, breakZ],
        [bMinX, bMinY, breakZ],
      ],
      params.lowerPitchDeg,
      ["front"],
    ),
    buildQuadPlane(
      `${id}_back_lower`,
      "Back Lower",
      [
        [eMaxX, eMaxY, bz],
        [eMinX, eMaxY, bz],
        [bMinX, bMaxY, breakZ],
        [bMaxX, bMaxY, breakZ],
      ],
      params.lowerPitchDeg,
      ["back"],
    ),
    buildQuadPlane(
      `${id}_left_lower`,
      "Left Lower",
      [
        [eMinX, eMaxY, bz],
        [eMinX, eMinY, bz],
        [bMinX, bMinY, breakZ],
        [bMinX, bMaxY, breakZ],
      ],
      params.lowerPitchDeg,
      ["left"],
    ),
    buildQuadPlane(
      `${id}_right_lower`,
      "Right Lower",
      [
        [eMaxX, eMinY, bz],
        [eMaxX, eMaxY, bz],
        [bMaxX, bMaxY, breakZ],
        [bMaxX, bMinY, breakZ],
      ],
      params.lowerPitchDeg,
      ["right"],
    ),

    /* ---- upper shallow portion (hip arrangement) ---- */
    // Front upper
    buildQuadPlane(
      `${id}_front_upper`,
      "Front Upper",
      [
        [bMinX, bMinY, breakZ],
        [bMaxX, bMinY, breakZ],
        [rMaxX, rMinY, ridgeZ],
        [rMinX, rMinY, ridgeZ],
      ],
      params.pitchDeg,
      [],
    ),
    // Back upper
    buildQuadPlane(
      `${id}_back_upper`,
      "Back Upper",
      [
        [bMaxX, bMaxY, breakZ],
        [bMinX, bMaxY, breakZ],
        [rMinX, rMaxY, ridgeZ],
        [rMaxX, rMaxY, ridgeZ],
      ],
      params.pitchDeg,
      [],
    ),
    // Left upper
    ...(isWideX
      ? [
          buildTriPlane(
            `${id}_left_upper`,
            "Left Upper",
            [
              [bMinX, bMaxY, breakZ],
              [bMinX, bMinY, breakZ],
              [rMinX, rMinY, ridgeZ],
            ],
            params.pitchDeg,
            [],
          ),
        ]
      : [
          buildQuadPlane(
            `${id}_left_upper`,
            "Left Upper",
            [
              [bMinX, bMaxY, breakZ],
              [bMinX, bMinY, breakZ],
              [rMinX, rMinY, ridgeZ],
              [rMinX, rMaxY, ridgeZ],
            ],
            params.pitchDeg,
            [],
          ),
        ]),
    // Right upper
    ...(isWideX
      ? [
          buildTriPlane(
            `${id}_right_upper`,
            "Right Upper",
            [
              [bMaxX, bMinY, breakZ],
              [bMaxX, bMaxY, breakZ],
              [rMaxX, rMaxY, ridgeZ],
            ],
            params.pitchDeg,
            [],
          ),
        ]
      : [
          buildQuadPlane(
            `${id}_right_upper`,
            "Right Upper",
            [
              [bMaxX, bMinY, breakZ],
              [bMaxX, bMaxY, breakZ],
              [rMaxX, rMaxY, ridgeZ],
              [rMaxX, rMinY, ridgeZ],
            ],
            params.pitchDeg,
            [],
          ),
        ]),
  ];

  return { planes, ridgeHeight: totalRise };
}
