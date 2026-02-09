import { Plan } from "@/domain/plan/types";
import { Command } from "./command.types";
import * as mutations from "@/domain/plan/mutations";

export function applyCommand(plan: Plan, command: Command): Plan {
  switch (command.type) {
    case "ADD_VERTEX": {
      return mutations.addVertex(plan, command.position).plan;
    }
    case "MOVE_VERTEX": {
      return mutations.moveVertex(plan, command.vertexId, command.to);
    }
    case "REMOVE_VERTEX": {
      return mutations.removeVertex(plan, command.vertexId);
    }
    case "ADD_EDGE": {
      return mutations.addEdge(plan, command.startId, command.endId).plan;
    }
    case "REMOVE_EDGE": {
      return mutations.removeEdge(plan, command.edgeId);
    }
    case "SET_EDGE_LENGTH": {
      return mutations.setEdgeLength(
        plan,
        command.edgeId,
        command.length,
        command.anchorVertexId,
      );
    }
    case "ADD_VERTEX_AND_EDGE": {
      return mutations.addVertexAndEdge(
        plan,
        command.fromVertexId,
        command.position,
      ).plan;
    }
    case "CREATE_RECTANGLE": {
      return mutations.createRectangle(
        plan,
        command.center,
        command.width,
        command.height,
      ).plan;
    }
    case "CREATE_L_SHAPE": {
      return mutations.createLShape(plan, command.center, {
        totalWidth: command.totalWidth,
        totalHeight: command.totalHeight,
        cutoutWidth: command.cutoutWidth,
        cutoutHeight: command.cutoutHeight,
      }).plan;
    }
    case "MERGE_VERTICES": {
      return mutations.mergeVertices(plan, command.keepId, command.removeId);
    }
    case "BATCH": {
      let current = plan;
      for (const cmd of command.commands) {
        current = applyCommand(current, cmd);
      }
      return current;
    }
  }
}

export function unapplyCommand(
  plan: Plan,
  command: Command,
  previousPlan: Plan,
): Plan {
  // For undo, we restore the previous plan snapshot
  return previousPlan;
}
