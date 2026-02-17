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

export type { RoofPlaneGeometry } from "./roofTypes/common";

export interface RoofSolid {
  roofId: string;
  faceId: string;
  roofType: RoofType;
  planes: RoofPlaneGeometry[];
  ridgeHeight: number;
}

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
