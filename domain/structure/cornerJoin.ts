import {
  Vec2,
  sub,
  add,
  normalize,
  dot,
  scale,
  perpCW,
} from "../geometry/vec2";
import { lineIntersection } from "../geometry/intersect";

/**
 * Corner join types for walls
 */
export type CornerJoinType = "butt" | "miter" | "overlap";

/**
 * For butted joints, walls simply extend to their full length
 * with perpendicular ends. This is the simplest approach and
 * works well for most cases.
 *
 * Future enhancement: miter joints would require computing the
 * intersection of wall edges at corners.
 */

export interface CornerInfo {
  vertexId: string;
  position: Vec2;
  connectedEdgeIds: string[];
  wallThickness: number;
}

/**
 * Compute the offset points for a butted wall end
 * Returns the two corner points perpendicular to the wall direction
 */
export function computeButtedWallEnd(
  wallStart: Vec2,
  wallEnd: Vec2,
  thickness: number,
  atStart: boolean,
): [Vec2, Vec2] {
  const dir = normalize(sub(wallEnd, wallStart));
  const perp = perpCW(dir);
  const halfThick = thickness / 2;

  const centerPoint = atStart ? wallStart : wallEnd;

  return [
    add(centerPoint, scale(perp, -halfThick)),
    add(centerPoint, scale(perp, halfThick)),
  ];
}

/**
 * Compute miter point at a corner where two walls meet
 * This is for future use when miter joints are implemented
 */
export function computeMiterPoint(
  corner: Vec2,
  dir1: Vec2, // normalized direction of first wall (pointing away from corner)
  dir2: Vec2, // normalized direction of second wall (pointing away from corner)
  thickness: number,
  side: "left" | "right",
): Vec2 | null {
  const halfThick = thickness / 2;

  // Perpendiculars
  const perp1 = side === "left" ? perpCW(dir1) : scale(perpCW(dir1), -1);
  const perp2 = side === "left" ? perpCW(dir2) : scale(perpCW(dir2), -1);

  // Offset lines
  const line1Start = add(corner, scale(perp1, halfThick));
  const line2Start = add(corner, scale(perp2, halfThick));

  // Find intersection
  const result = lineIntersection(line1Start, dir1, line2Start, dir2);

  if (result.intersects && result.point) {
    return result.point;
  }

  // Fallback: just offset the corner
  return add(corner, scale(perp1, halfThick));
}

/**
 * Determine if a corner should use miter or butt joint
 * based on the angle between walls
 */
export function shouldMiterCorner(
  dir1: Vec2,
  dir2: Vec2,
  maxMiterAngle: number = Math.PI * 0.75, // 135 degrees
): boolean {
  const dotProduct = dot(dir1, dir2);
  const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct)));

  // Use miter for angles less than maxMiterAngle
  // For very acute or very obtuse angles, butt is better
  return angle > Math.PI * 0.25 && angle < maxMiterAngle;
}
