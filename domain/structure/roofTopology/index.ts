export * from "./types";
export { initializeFromPolygon } from "./initialize";
export {
  setEdgeRole,
  pinVertex,
  unpinVertex,
  addInteriorVertex,
  addEdge,
  removeEdge,
  splitEdge,
  addRidgeBetweenEdges,
  addHipEdge,
  addValleyEdge,
  markGable,
  moveVertex,
  rebuildFacets,
} from "./mutations";
export { solveHeights } from "./solver";
export type { SolverParams } from "./solver";
export { meshFromTopology } from "./meshgen";
