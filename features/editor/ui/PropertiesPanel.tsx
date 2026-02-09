"use client";

import React from "react";
import { useEditorStore } from "../model/editor.store";
import { getSelectedIds } from "../model/selection.types";
import { Panel } from "@/shared/ui/Panel";
import { NumberField } from "@/shared/ui/NumberField";
import { distance } from "@/domain/geometry/vec2";
import { formatLength } from "@/domain/units/units";

export function PropertiesPanel() {
  const plan = useEditorStore((s) => s.plan);
  const selection = useEditorStore((s) => s.selection);
  const unitConfig = useEditorStore((s) => s.unitConfig);
  const executeCommand = useEditorStore((s) => s.executeCommand);

  const selectedVertexIds = getSelectedIds(selection, "vertex");
  const selectedEdgeIds = getSelectedIds(selection, "edge");
  const selectedFaceIds = getSelectedIds(selection, "face");

  const hasSelection = selection.items.length > 0;

  if (!hasSelection) {
    return (
      <div className="p-4">
        <Panel title="Properties">
          <p className="text-xs text-muted-foreground">
            Select a vertex, edge, or face to see its properties.
          </p>
        </Panel>
        <div className="mt-3">
          <Panel title="Plan Info">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vertices:</span>
                <span>{Object.keys(plan.vertices).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Edges:</span>
                <span>{Object.keys(plan.edges).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Faces:</span>
                <span>{Object.keys(plan.faces).length}</span>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {/* Vertex properties */}
      {selectedVertexIds.length === 1 && (
        <Panel title="Vertex">
          {(() => {
            const vertex = plan.vertices[selectedVertexIds[0]];
            if (!vertex) return null;
            return (
              <div className="space-y-2">
                <NumberField
                  label="X"
                  suffix="mm"
                  value={Math.round(vertex.position.x)}
                  onChange={(x) =>
                    executeCommand({
                      type: "MOVE_VERTEX",
                      vertexId: vertex.id,
                      from: vertex.position,
                      to: { x, y: vertex.position.y },
                    })
                  }
                />
                <NumberField
                  label="Y"
                  suffix="mm"
                  value={Math.round(vertex.position.y)}
                  onChange={(y) =>
                    executeCommand({
                      type: "MOVE_VERTEX",
                      vertexId: vertex.id,
                      from: vertex.position,
                      to: { x: vertex.position.x, y },
                    })
                  }
                />
                <button
                  onClick={() => {
                    executeCommand({
                      type: "REMOVE_VERTEX",
                      vertexId: vertex.id,
                    });
                    useEditorStore.getState().clearSelection();
                  }}
                  className="w-full px-2 py-1 text-xs bg-destructive/10 text-destructive rounded hover:bg-destructive/20 transition-colors"
                >
                  Delete Vertex
                </button>
              </div>
            );
          })()}
        </Panel>
      )}

      {/* Edge properties */}
      {selectedEdgeIds.length === 1 && (
        <Panel title="Edge">
          {(() => {
            const edge = plan.edges[selectedEdgeIds[0]];
            if (!edge) return null;
            const startV = plan.vertices[edge.startId];
            const endV = plan.vertices[edge.endId];
            if (!startV || !endV) return null;
            const len = distance(startV.position, endV.position);

            return (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  Length: {formatLength(len, unitConfig)}
                </div>
                <NumberField
                  label="Length"
                  suffix="mm"
                  value={Math.round(len)}
                  min={1}
                  onChange={(newLen) => {
                    executeCommand({
                      type: "SET_EDGE_LENGTH",
                      edgeId: edge.id,
                      length: newLen,
                    });
                  }}
                />
                <button
                  onClick={() => {
                    executeCommand({ type: "REMOVE_EDGE", edgeId: edge.id });
                    useEditorStore.getState().clearSelection();
                  }}
                  className="w-full px-2 py-1 text-xs bg-destructive/10 text-destructive rounded hover:bg-destructive/20 transition-colors"
                >
                  Delete Edge
                </button>
              </div>
            );
          })()}
        </Panel>
      )}

      {/* Face properties */}
      {selectedFaceIds.length === 1 && (
        <Panel title="Face">
          {(() => {
            const face = plan.faces[selectedFaceIds[0]];
            if (!face) return null;
            const {
              polygonArea,
              polygonPerimeter,
            } = require("@/domain/geometry/polygon");
            const positions = face.vertexIds
              .map((vid: string) => plan.vertices[vid]?.position)
              .filter(Boolean);
            const area = Math.abs(polygonArea(positions));
            const perimeter = polygonPerimeter(positions);

            return (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vertices:</span>
                  <span>{face.vertexIds.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Edges:</span>
                  <span>{face.edgeIds.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Area:</span>
                  <span>{(area / 1_000_000).toFixed(2)} m²</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Perimeter:</span>
                  <span>{formatLength(perimeter, unitConfig)}</span>
                </div>
              </div>
            );
          })()}
        </Panel>
      )}

      {/* Multi-selection */}
      {selection.items.length > 1 && (
        <Panel title="Multi-Selection">
          <div className="space-y-1 text-xs">
            <div>Selected: {selection.items.length} items</div>
            {selectedVertexIds.length > 0 && (
              <div className="text-muted-foreground">
                {selectedVertexIds.length} vertices
              </div>
            )}
            {selectedEdgeIds.length > 0 && (
              <div className="text-muted-foreground">
                {selectedEdgeIds.length} edges
              </div>
            )}
            {selectedFaceIds.length > 0 && (
              <div className="text-muted-foreground">
                {selectedFaceIds.length} faces
              </div>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}
