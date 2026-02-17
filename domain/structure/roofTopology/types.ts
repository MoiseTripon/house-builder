import { Vec2 } from "../../geometry/vec2";

/**
 * Role of a roof edge. Determines how the solver treats it.
 *
 *  eave   – base edge sitting on top of a wall (z = baseZ)
 *  ridge  – peak edge connecting two slopes (highest line)
 *  hip    – sloping edge from eave corner up to ridge end
 *  valley – sloping edge going down between two slopes (inside corner)
 *  gable  – vertical triangular wall face at roof end
 *  rake   – sloped edge along a gable end (eave-to-ridge on gable side)
 */
export type RoofEdgeRole =
  | "eave"
  | "ridge"
  | "hip"
  | "valley"
  | "gable"
  | "rake";

export interface RoofVertex {
  id: string;
  /** 2D position in plan space (XY) */
  position: Vec2;
  /** Computed Z height. null = not yet solved. */
  z: number | null;
  /** If true, user has locked this vertex's height manually */
  pinned: boolean;
  /** Manual override height when pinned */
  pinnedZ: number;
  /** Whether this vertex sits on the base polygon boundary */
  isBoundary: boolean;
}

export interface RoofEdge {
  id: string;
  startId: string;
  endId: string;
  role: RoofEdgeRole;
}

export interface RoofFacet {
  /** Ordered vertex IDs forming this facet (CCW) */
  id: string;
  vertexIds: string[];
  /** Slope angle in degrees (computed from solved heights) */
  slopeDeg: number;
}

/**
 * The editable roof topology for a single plan face.
 * Starts as a flat polygon (all eave edges) and gets sculpted.
 */
export interface RoofTopology {
  vertices: Record<string, RoofVertex>;
  edges: Record<string, RoofEdge>;
  facets: Record<string, RoofFacet>;
}

export function createEmptyTopology(): RoofTopology {
  return { vertices: {}, edges: {}, facets: {} };
}
