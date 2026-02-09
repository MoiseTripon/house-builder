import { Plan } from "./types";
import {
  Vec2,
  sub,
  normalize,
  scale,
  add,
  distance,
  angle,
} from "../geometry/vec2";
import { moveVertex } from "./mutations";

export function constrainEdgeLength(
  plan: Plan,
  edgeId: string,
  targetLength: number,
  fixedVertexId?: string,
): Plan {
  const edge = plan.edges[edgeId];
  if (!edge) return plan;

  const startV = plan.vertices[edge.startId];
  const endV = plan.vertices[edge.endId];
  if (!startV || !endV) return plan;

  const currentLength = distance(startV.position, endV.position);
  if (currentLength < 1e-6) return plan;

  const dir = normalize(sub(endV.position, startV.position));

  if (fixedVertexId === edge.endId) {
    const newStart = sub(endV.position, scale(dir, targetLength));
    return moveVertex(plan, edge.startId, newStart);
  } else {
    const newEnd = add(startV.position, scale(dir, targetLength));
    return moveVertex(plan, edge.endId, newEnd);
  }
}

export function constrainEdgeAngle(
  plan: Plan,
  edgeId: string,
  targetAngleDeg: number,
  fixedVertexId?: string,
): Plan {
  const edge = plan.edges[edgeId];
  if (!edge) return plan;

  const startV = plan.vertices[edge.startId];
  const endV = plan.vertices[edge.endId];
  if (!startV || !endV) return plan;

  const len = distance(startV.position, endV.position);
  const targetRad = (targetAngleDeg * Math.PI) / 180;

  if (fixedVertexId === edge.endId) {
    const newStart: Vec2 = {
      x: endV.position.x - Math.cos(targetRad) * len,
      y: endV.position.y - Math.sin(targetRad) * len,
    };
    return moveVertex(plan, edge.startId, newStart);
  } else {
    const newEnd: Vec2 = {
      x: startV.position.x + Math.cos(targetRad) * len,
      y: startV.position.y + Math.sin(targetRad) * len,
    };
    return moveVertex(plan, edge.endId, newEnd);
  }
}

export function constrainParallel(
  plan: Plan,
  edgeId: string,
  referenceEdgeId: string,
  fixedVertexId: string,
): Plan {
  const edge = plan.edges[edgeId];
  const refEdge = plan.edges[referenceEdgeId];
  if (!edge || !refEdge) return plan;

  const refStart = plan.vertices[refEdge.startId];
  const refEnd = plan.vertices[refEdge.endId];
  if (!refStart || !refEnd) return plan;

  const refAngle = angle(sub(refEnd.position, refStart.position));
  return constrainEdgeAngle(
    plan,
    edgeId,
    (refAngle * 180) / Math.PI,
    fixedVertexId,
  );
}
