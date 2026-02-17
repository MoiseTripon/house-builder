import { Vec2 } from "../geometry/vec2";
import { RoofType } from "./roofSystem";
import {
  RoofBuildParams,
  RoofBuildResult,
  RoofPlaneGeometry,
  EdgeOverhangs,
  defaultEdgeOverhangs,
  emptyResult,
  buildPolyPlane,
} from "./roofTypes/common";
import { generateGableRoof } from "./roofTypes/gable";
import { generateHipRoof } from "./roofTypes/hip";
import { generateShedRoof } from "./roofTypes/shed";
import { generateGambrelRoof } from "./roofTypes/gambrel";
import { generateMansardRoof } from "./roofTypes/mansard";
import { RoofTopology } from "./roofTopology/types";
import { solveHeights, SolverParams } from "./roofTopology/solver";
import { meshFromTopology } from "./roofTopology/meshgen";

export type { RoofPlaneGeometry } from "./roofTypes/common";

export interface RoofSolid {
  roofId: string;
  faceId: string;
  roofType: RoofType;
  planes: RoofPlaneGeometry[];
  ridgeHeight: number;
}

/**
 * Generate geometry from preset-based roof type.
 */
export function generateRoofSolid(
  roofId: string,
  faceId: string,
  polygon: Vec2[],
  roofType: RoofType,
  baseZ: number,
  pitchDeg: number,
  lowerPitchDeg: number,
  edgeOverhangs: EdgeOverhangs,
  ridgeOffset: number,
): RoofSolid {
  const params: RoofBuildParams = {
    roofId,
    polygon,
    baseZ,
    pitchDeg,
    lowerPitchDeg,
    edgeOverhangs,
    ridgeOffset,
  };

  let result: RoofBuildResult;

  switch (roofType) {
    case "gable":
      result = generateGableRoof(params);
      break;
    case "hip":
      result = generateHipRoof(params);
      break;
    case "shed":
      result = generateShedRoof(params);
      break;
    case "gambrel":
      result = generateGambrelRoof(params);
      break;
    case "mansard":
      result = generateMansardRoof(params);
      break;
    case "flat":
    default:
      result = generateFlatRoof(params);
      break;
  }

  return {
    roofId,
    faceId,
    roofType,
    planes: result.planes,
    ridgeHeight: result.ridgeHeight,
  };
}

/**
 * Generate geometry from a custom topology (user-edited).
 */
export function generateRoofSolidFromTopology(
  roofId: string,
  faceId: string,
  topology: RoofTopology,
  baseZ: number,
  pitchDeg: number,
): RoofSolid {
  const solverParams: SolverParams = {
    baseZ,
    defaultPitchDeg: pitchDeg,
  };

  const solved = solveHeights(topology, solverParams);
  const planes = meshFromTopology(solved, roofId);

  // Compute ridge height from max vertex Z
  let maxZ = baseZ;
  for (const v of Object.values(solved.vertices)) {
    if (v.z !== null && v.z > maxZ) maxZ = v.z;
  }

  return {
    roofId,
    faceId,
    roofType: "flat", // custom topology doesn't have a preset type
    planes,
    ridgeHeight: maxZ - baseZ,
  };
}

function generateFlatRoof(params: RoofBuildParams): RoofBuildResult {
  const { polygon, baseZ, roofId } = params;
  if (polygon.length < 3) return emptyResult();

  const corners = polygon.map<[number, number, number]>((p) => [
    p.x,
    p.y,
    baseZ,
  ]);

  return {
    planes: [
      buildPolyPlane(`${roofId}_flat`, "Flat Roof", corners, 0, [
        "front",
        "back",
        "left",
        "right",
      ]),
    ],
    ridgeHeight: 0,
  };
}
