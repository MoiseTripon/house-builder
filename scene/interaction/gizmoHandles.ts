export interface GizmoHandle {
  id: string;
  type: "translate" | "rotate";
  position: { x: number; y: number };
}

export function getHandlesForSelection(
  _selectedVertexIds: string[],
  _plan: unknown,
): GizmoHandle[] {
  // Future: return handles for selected items
  return [];
}
