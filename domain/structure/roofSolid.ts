import { Vec2 } from "../geometry/vec2";
import { RoofType } from "./roofSystem";
import {
  generateGableRoof,
  generateFlatRoofPlanes,
  RoofPlaneGeometry,
  GableRoofResult,
} from "./roofTypes/gable";

export interface RoofSolid {
  roofId: string;
  faceId: string;
  roofType: RoofType;
  planes: RoofPlaneGeometry[];
  ridgeHeight: number;
}

/**
 * Generate the 3-D solid for one roof piece, decomposed into planes.
 */
export function generateRoofSolid(
  roofId: string,
  faceId: string,
  polygon: Vec2[],
  roofType: RoofType,
  baseZ: number,
  pitchDeg: number,
  overhang: number,
): RoofSolid {
  let result: GableRoofResult;
  let ridgeHeight = 0;

  switch (roofType) {
    case "gable": {
      result = generateGableRoof(roofId, polygon, baseZ, pitchDeg, overhang);

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
      const span = Math.min(maxX - minX, maxY - minY);
      ridgeHeight = (span / 2) * Math.tan((pitchDeg * Math.PI) / 180);
      break;
    }
    case "flat":
    default:
      result = generateFlatRoofPlanes(roofId, polygon, baseZ);
      break;
  }

  return {
    roofId,
    faceId,
    roofType,
    planes: result.planes,
    ridgeHeight,
  };
}
