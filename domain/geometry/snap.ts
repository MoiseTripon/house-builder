import {
  Vec2,
  vec2,
  distance,
  sub,
  normalize,
  scale,
  add,
  angle,
  closestPointOnSegment,
  distanceToSegment,
  length as vecLength,
} from "./vec2";
import { roundToGrid } from "../units/units";

export interface SnapConfig {
  gridEnabled: boolean;
  gridSize: number; // mm
  angleEnabled: boolean;
  angleStep: number; // degrees
  geometryEnabled: boolean;
  snapRadius: number; // pixels (screen space threshold)
}

export const DEFAULT_SNAP_CONFIG: SnapConfig = {
  gridEnabled: true,
  gridSize: 100, // 100mm = 10cm
  angleEnabled: true,
  angleStep: 15,
  geometryEnabled: true,
  snapRadius: 12,
};

export interface SnapResult {
  position: Vec2;
  snapped: boolean;
  snapType: "none" | "grid" | "vertex" | "edge" | "angle" | "midpoint";
  snapTargetId?: string;
  guideLines?: { from: Vec2; to: Vec2 }[];
}

export function snapToGrid(pos: Vec2, gridSize: number): Vec2 {
  return vec2(roundToGrid(pos.x, gridSize), roundToGrid(pos.y, gridSize));
}

export function snapToAngle(
  pos: Vec2,
  anchor: Vec2,
  angleStepDeg: number,
): Vec2 {
  const delta = sub(pos, anchor);
  const dist = vecLength(delta);
  if (dist < 1e-6) return pos;

  const currentAngle = angle(delta);
  const stepRad = (angleStepDeg * Math.PI) / 180;
  const snappedAngle = Math.round(currentAngle / stepRad) * stepRad;

  return add(
    anchor,
    scale(vec2(Math.cos(snappedAngle), Math.sin(snappedAngle)), dist),
  );
}

export interface SnapCandidate {
  position: Vec2;
  snapType: SnapResult["snapType"];
  targetId?: string;
  distance: number;
  guideLines?: { from: Vec2; to: Vec2 }[];
}

export function computeSnap(
  rawPos: Vec2,
  config: SnapConfig,
  vertices: { id: string; position: Vec2 }[],
  edges: { id: string; start: Vec2; end: Vec2 }[],
  anchor?: Vec2, // for angle snapping during drawing
  worldToScreenScale: number = 1, // px per mm
): SnapResult {
  const candidates: SnapCandidate[] = [];
  const screenRadius = config.snapRadius / Math.max(worldToScreenScale, 0.001);

  // 1. Snap to existing vertices
  if (config.geometryEnabled) {
    for (const v of vertices) {
      const d = distance(rawPos, v.position);
      if (d < screenRadius) {
        candidates.push({
          position: v.position,
          snapType: "vertex",
          targetId: v.id,
          distance: d,
        });
      }
    }
  }

  // 2. Snap to edge midpoints
  if (config.geometryEnabled) {
    for (const e of edges) {
      const mid = vec2((e.start.x + e.end.x) / 2, (e.start.y + e.end.y) / 2);
      const d = distance(rawPos, mid);
      if (d < screenRadius) {
        candidates.push({
          position: mid,
          snapType: "midpoint",
          targetId: e.id,
          distance: d,
        });
      }
    }
  }

  // 3. Snap to edges (closest point)
  if (config.geometryEnabled) {
    for (const e of edges) {
      const d = distanceToSegment(rawPos, e.start, e.end);
      if (d < screenRadius) {
        const { point } = closestPointOnSegment(rawPos, e.start, e.end);
        candidates.push({
          position: point,
          snapType: "edge",
          targetId: e.id,
          distance: d,
        });
      }
    }
  }

  // 4. Angle snap
  if (config.angleEnabled && anchor) {
    const snappedAnglePos = snapToAngle(rawPos, anchor, config.angleStep);
    const d = distance(rawPos, snappedAnglePos);
    if (d < screenRadius * 2) {
      candidates.push({
        position: snappedAnglePos,
        snapType: "angle",
        distance: d,
        guideLines: [{ from: anchor, to: snappedAnglePos }],
      });
    }
  }

  // 5. Grid snap
  if (config.gridEnabled) {
    const gridPos = snapToGrid(rawPos, config.gridSize);
    const d = distance(rawPos, gridPos);
    candidates.push({
      position: gridPos,
      snapType: "grid",
      distance: d,
    });
  }

  // Sort by priority: vertex > midpoint > edge > angle > grid, then distance
  const priority: Record<SnapResult["snapType"], number> = {
    vertex: 0,
    midpoint: 1,
    edge: 2,
    angle: 3,
    grid: 4,
    none: 5,
  };

  candidates.sort((a, b) => {
    const pa = priority[a.snapType];
    const pb = priority[b.snapType];
    if (pa !== pb) return pa - pb;
    return a.distance - b.distance;
  });

  if (candidates.length > 0) {
    const best = candidates[0];
    return {
      position: best.position,
      snapped: true,
      snapType: best.snapType,
      snapTargetId: best.targetId,
      guideLines: best.guideLines,
    };
  }

  return {
    position: rawPos,
    snapped: false,
    snapType: "none",
  };
}
