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
  gridSize: number;
  angleEnabled: boolean;
  angleStep: number;
  geometryEnabled: boolean;
  snapRadius: number;
}

export const DEFAULT_SNAP_CONFIG: SnapConfig = {
  gridEnabled: true,
  gridSize: 100,
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

interface SnapCandidate {
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
  anchor?: Vec2,
  cameraZoom: number = 1,
): SnapResult {
  const candidates: SnapCandidate[] = [];
  // Convert screen-pixel radius to plan-unit radius
  const screenRadius = config.snapRadius / Math.max(cameraZoom * 0.1, 0.001);

  // 1. Vertices
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

  // 2. Edge midpoints
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

  // 3. Edges (closest point on segment)
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

  // 4. Angle snap (only when drawing from an anchor)
  if (config.angleEnabled && anchor) {
    const snappedAnglePos = snapToAngle(rawPos, anchor, config.angleStep);
    const d = distance(rawPos, snappedAnglePos);
    if (d < screenRadius * 3) {
      candidates.push({
        position: snappedAnglePos,
        snapType: "angle",
        distance: d,
        guideLines: [{ from: anchor, to: snappedAnglePos }],
      });
    }
  }

  // 5. Grid snap (always a candidate, lowest priority)
  if (config.gridEnabled) {
    const gridPos = snapToGrid(rawPos, config.gridSize);
    candidates.push({
      position: gridPos,
      snapType: "grid",
      distance: distance(rawPos, gridPos),
    });
  }

  // Priority: vertex > midpoint > edge > angle > grid
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

  return { position: rawPos, snapped: false, snapType: "none" };
}
