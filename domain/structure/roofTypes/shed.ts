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
 * Shed (mono-pitch) roof: single slope from the high edge to the low edge.
 * "front" edge (minY) is the high side; "back" (maxY) is the low eave.
 * Ridge offset shifts the high-edge left/right.
 */
export function generateShedRoof(params: RoofBuildParams): RoofBuildResult {
  const aabb = computeAABB(params.polygon);
  if (!aabb) return emptyResult();

  const pitchRad = (params.pitchDeg * Math.PI) / 180;
  const alongX = isRidgeAlongX(aabb);
  const { eMinX, eMaxX, eMinY, eMaxY } = expandedAABB(
    aabb,
    params.edgeOverhangs,
  );

  // Rise is full span (not half-span)
  const span = alongX ? aabb.spanY : aabb.spanX;
  const rise = span * Math.tan(pitchRad);
  const highZ = params.baseZ + rise;
  const lowZ = params.baseZ;

  return alongX
    ? buildX(params, eMinX, eMaxX, eMinY, eMaxY, highZ, lowZ, rise)
    : buildY(params, eMinX, eMaxX, eMinY, eMaxY, highZ, lowZ, rise);
}

/* Ridge along X → slope front-to-back */
function buildX(
  p: RoofBuildParams,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  highZ: number,
  lowZ: number,
  rise: number,
): RoofBuildResult {
  const id = p.roofId;

  // Main slope quad
  const slope: V3[] = [
    [minX, minY, highZ],
    [maxX, minY, highZ],
    [maxX, maxY, lowZ],
    [minX, maxY, lowZ],
  ];
  // Left triangle
  const left: V3[] = [
    [minX, maxY, lowZ],
    [minX, minY, highZ],
    [minX, minY, lowZ],
  ];
  // Right triangle
  const right: V3[] = [
    [maxX, minY, highZ],
    [maxX, maxY, lowZ],
    [maxX, maxY, highZ],
  ];

  // Only emit side triangles if rise > 0
  const planes = [
    buildQuadPlane(
      `${id}_slope`,
      "Slope",
      slope,
      slopeFromVectors(slope[3], slope[0]),
      ["front", "back"],
    ),
  ];

  if (rise > 1) {
    planes.push(
      buildTriPlane(
        `${id}_left`,
        "Left Side",
        [
          [minX, maxY, lowZ],
          [minX, minY, lowZ],
          [minX, minY, highZ],
        ],
        90,
        ["left"],
      ),
      buildTriPlane(
        `${id}_right`,
        "Right Side",
        [
          [maxX, minY, lowZ],
          [maxX, maxY, lowZ],
          [maxX, maxY, highZ], // actually we need proper triangle
        ],
        90,
        ["right"],
      ),
    );
    // Correction: right side triangle
    planes[2] = buildTriPlane(
      `${id}_right`,
      "Right Side",
      [
        [maxX, minY, lowZ],
        [maxX, maxY, lowZ],
        [maxX, minY, highZ],
      ],
      90,
      ["right"],
    );
  }

  return { planes, ridgeHeight: rise };
}

/* Ridge along Y → slope left-to-right */
function buildY(
  p: RoofBuildParams,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  highZ: number,
  lowZ: number,
  rise: number,
): RoofBuildResult {
  const id = p.roofId;

  const slope: V3[] = [
    [minX, minY, highZ],
    [minX, maxY, highZ],
    [maxX, maxY, lowZ],
    [maxX, minY, lowZ],
  ];

  const planes = [
    buildQuadPlane(
      `${id}_slope`,
      "Slope",
      slope,
      slopeFromVectors(slope[3], slope[0]),
      ["left", "right"],
    ),
  ];

  if (rise > 1) {
    planes.push(
      buildTriPlane(
        `${id}_front`,
        "Front Side",
        [
          [minX, minY, lowZ],
          [maxX, minY, lowZ],
          [minX, minY, highZ],
        ],
        90,
        ["front"],
      ),
      buildTriPlane(
        `${id}_back`,
        "Back Side",
        [
          [maxX, maxY, lowZ],
          [minX, maxY, lowZ],
          [minX, maxY, highZ],
        ],
        90,
        ["back"],
      ),
    );
  }

  return { planes, ridgeHeight: rise };
}
