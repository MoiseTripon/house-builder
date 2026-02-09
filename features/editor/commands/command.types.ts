import { Vec2 } from "@/domain/geometry/vec2";

export type Command =
  | { type: "ADD_VERTEX"; position: Vec2 }
  | { type: "MOVE_VERTEX"; vertexId: string; from: Vec2; to: Vec2 }
  | { type: "REMOVE_VERTEX"; vertexId: string }
  | { type: "ADD_EDGE"; startId: string; endId: string }
  | { type: "REMOVE_EDGE"; edgeId: string }
  | {
      type: "SET_EDGE_LENGTH";
      edgeId: string;
      length: number;
      anchorVertexId?: string;
    }
  | { type: "ADD_VERTEX_AND_EDGE"; fromVertexId: string; position: Vec2 }
  | { type: "CREATE_RECTANGLE"; center: Vec2; width: number; height: number }
  | {
      type: "CREATE_L_SHAPE";
      center: Vec2;
      totalWidth: number;
      totalHeight: number;
      cutoutWidth: number;
      cutoutHeight: number;
    }
  | {
      type: "CREATE_U_SHAPE";
      center: Vec2;
      totalWidth: number;
      totalHeight: number;
      cutoutWidth: number;
      cutoutHeight: number;
    }
  | { type: "MERGE_VERTICES"; keepId: string; removeId: string }
  | {
      type: "SCALE_FACE";
      faceId: string;
      scaleX: number;
      scaleY: number;
      center?: Vec2;
    }
  | { type: "DELETE_FACE"; faceId: string }
  | { type: "BATCH"; commands: Command[]; label: string };
