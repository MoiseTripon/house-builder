import { Plan } from "@/domain/plan/types";
import { Command } from "./command.types";
import * as mutations from "@/domain/plan/mutations";

export function applyCommand(plan: Plan, command: Command): Plan {
  switch (command.type) {
    case "ADD_VERTEX":
      return mutations.addVertex(plan, command.position).plan;
    case "MOVE_VERTEX":
      return mutations.moveVertex(plan, command.vertexId, command.to);
    case "REMOVE_VERTEX":
      return mutations.removeVertex(plan, command.vertexId);
    case "ADD_EDGE":
      return mutations.addEdge(plan, command.startId, command.endId).plan;
    case "REMOVE_EDGE":
      return mutations.removeEdge(plan, command.edgeId);
    case "SET_EDGE_LENGTH":
      return mutations.setEdgeLength(
        plan,
        command.edgeId,
        command.length,
        command.anchorVertexId,
      );
    case "ADD_VERTEX_AND_EDGE":
      return mutations.addVertexAndEdge(
        plan,
        command.fromVertexId,
        command.position,
      ).plan;
    case "CREATE_RECTANGLE":
      return mutations.createRectangle(
        plan,
        command.center,
        command.width,
        command.height,
      ).plan;
    case "CREATE_L_SHAPE":
      return mutations.createLShape(plan, command.center, {
        totalWidth: command.totalWidth,
        totalHeight: command.totalHeight,
        cutoutWidth: command.cutoutWidth,
        cutoutHeight: command.cutoutHeight,
      }).plan;
    case "CREATE_U_SHAPE":
      return mutations.createUShape(plan, command.center, {
        totalWidth: command.totalWidth,
        totalHeight: command.totalHeight,
        cutoutWidth: command.cutoutWidth,
        cutoutHeight: command.cutoutHeight,
      }).plan;
    case "MERGE_VERTICES":
      return mutations.mergeVertices(plan, command.keepId, command.removeId);
    case "SPLIT_EDGE":
      return mutations.splitEdgeAtPoint(plan, command.edgeId, command.position)
        .plan;
    case "SCALE_FACE":
      return mutations.scaleFace(
        plan,
        command.faceId,
        command.scaleX,
        command.scaleY,
        command.center,
      );
    case "DELETE_FACE":
      return mutations.deleteFace(plan, command.faceId);
    case "BATCH": {
      let current = plan;
      for (const cmd of command.commands) current = applyCommand(current, cmd);
      return current;
    }
  }
}
