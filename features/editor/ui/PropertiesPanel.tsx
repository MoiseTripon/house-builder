"use client";

import React from "react";
import { useEditorStore } from "../model/editor.store";
import { getSelectedIds } from "../model/selection.types";
import { Panel } from "@/shared/ui/Panel";
import { NumberField } from "@/shared/ui/NumberField";
import { Vec2, distance } from "@/domain/geometry/vec2";
import { formatLength } from "@/domain/units/units";
import {
  polygonArea,
  polygonPerimeter,
  polygonInteriorAngles,
  interiorAngleAt,
  polygonSignedArea,
} from "@/domain/geometry/polygon";

function radToDeg(r: number) {
  return (r * 180) / Math.PI;
}

export function PropertiesPanel() {
  const plan = useEditorStore((s) => s.plan);
  const selection = useEditorStore((s) => s.selection);
  const unitConfig = useEditorStore((s) => s.unitConfig);
  const executeCommand = useEditorStore((s) => s.executeCommand);
  const clearSelection = useEditorStore((s) => s.clearSelection);

  const selectedVertexIds = getSelectedIds(selection, "vertex");
  const selectedEdgeIds = getSelectedIds(selection, "edge");
  const selectedFaceIds = getSelectedIds(selection, "face");

  const hasSelection = selection.items.length > 0;

  /* ================================================================
     NO SELECTION — show plan overview
     ================================================================ */
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
              <Row label="Vertices" value={Object.keys(plan.vertices).length} />
              <Row label="Edges" value={Object.keys(plan.edges).length} />
              <Row label="Faces" value={Object.keys(plan.faces).length} />
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {/* ==============================================================
          VERTEX SELECTED
          ============================================================== */}
      {selectedVertexIds.length === 1 &&
        (() => {
          const vertex = plan.vertices[selectedVertexIds[0]];
          if (!vertex) return null;

          // Find all faces containing this vertex and the angle at each
          const containingFaces = Object.values(plan.faces).filter((f) =>
            f.vertexIds.includes(vertex.id),
          );

          const faceAngles = containingFaces
            .map((face) => {
              const positions = face.vertexIds
                .map((vid) => plan.vertices[vid]?.position)
                .filter(Boolean) as Vec2[];
              if (positions.length < 3) return null;
              const idx = face.vertexIds.indexOf(vertex.id);
              if (idx === -1) return null;
              const angleDeg = radToDeg(interiorAngleAt(positions, idx));
              return { faceId: face.id, angleDeg };
            })
            .filter(Boolean) as { faceId: string; angleDeg: number }[];

          return (
            <>
              <Panel title="Vertex">
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
                      clearSelection();
                    }}
                    className="w-full px-2 py-1.5 text-xs bg-destructive/10 text-destructive rounded hover:bg-destructive/20 transition-colors"
                  >
                    Delete Vertex
                  </button>
                </div>
              </Panel>

              {faceAngles.length > 0 && (
                <Panel title="Angles at Vertex" collapsible>
                  <div className="space-y-1.5">
                    {faceAngles.map((fa, i) => (
                      <div
                        key={fa.faceId}
                        className="flex items-center justify-between text-xs border border-border rounded px-2 py-1"
                      >
                        <span className="text-muted-foreground">
                          Face {i + 1}
                        </span>
                        <span className="font-mono font-medium text-purple-500">
                          {fa.angleDeg.toFixed(1)}°
                        </span>
                      </div>
                    ))}
                    {faceAngles.length > 1 && (
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
                        <span className="text-muted-foreground font-medium">
                          Total
                        </span>
                        <span className="font-mono font-medium">
                          {faceAngles
                            .reduce((s, f) => s + f.angleDeg, 0)
                            .toFixed(1)}
                          °
                        </span>
                      </div>
                    )}
                  </div>
                </Panel>
              )}
            </>
          );
        })()}

      {/* ==============================================================
          EDGE SELECTED
          ============================================================== */}
      {selectedEdgeIds.length === 1 &&
        (() => {
          const edge = plan.edges[selectedEdgeIds[0]];
          if (!edge) return null;
          const startV = plan.vertices[edge.startId];
          const endV = plan.vertices[edge.endId];
          if (!startV || !endV) return null;
          const len = distance(startV.position, endV.position);

          return (
            <Panel title="Edge">
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  Length: {formatLength(len, unitConfig)}
                </div>
                <NumberField
                  label="Length"
                  suffix="mm"
                  value={Math.round(len)}
                  min={1}
                  onChange={(newLen) =>
                    executeCommand({
                      type: "SET_EDGE_LENGTH",
                      edgeId: edge.id,
                      length: newLen,
                    })
                  }
                />
                <div className="text-[10px] text-muted-foreground">
                  Tip: drag the edge to translate it, or drag a vertex to
                  reshape.
                </div>
                <button
                  onClick={() => {
                    executeCommand({ type: "REMOVE_EDGE", edgeId: edge.id });
                    clearSelection();
                  }}
                  className="w-full px-2 py-1.5 text-xs bg-destructive/10 text-destructive rounded hover:bg-destructive/20 transition-colors"
                >
                  Delete Edge
                </button>
              </div>
            </Panel>
          );
        })()}

      {/* ==============================================================
          FACE SELECTED
          ============================================================== */}
      {selectedFaceIds.length === 1 &&
        (() => {
          const face = plan.faces[selectedFaceIds[0]];
          if (!face) return null;

          const positions = face.vertexIds
            .map((vid) => plan.vertices[vid]?.position)
            .filter(Boolean) as Vec2[];
          if (positions.length < 3) return null;

          const area = Math.abs(polygonArea(positions));
          const perim = polygonPerimeter(positions);
          const angles = polygonInteriorAngles(positions);
          const angleSum = angles.reduce((s, a) => s + a, 0);

          return (
            <>
              <Panel title="Face">
                <div className="space-y-2 text-xs">
                  <Row label="Vertices" value={face.vertexIds.length} />
                  <Row label="Edges" value={face.edgeIds.length} />
                  <Row
                    label="Area"
                    value={`${(area / 1_000_000).toFixed(2)} m²`}
                  />
                  <Row
                    label="Perimeter"
                    value={formatLength(perim, unitConfig)}
                  />
                  <div className="text-[10px] text-muted-foreground pt-1">
                    Tip: drag inside the face to move the entire shape.
                  </div>
                </div>
              </Panel>

              <Panel title="Interior Angles" collapsible>
                <div className="space-y-1.5">
                  {angles.map((angleRad, i) => {
                    const angleDeg = radToDeg(angleRad);
                    const vid = face.vertexIds[i];
                    const isRight = Math.abs(angleDeg - 90) < 0.5;
                    const is180 = Math.abs(angleDeg - 180) < 0.5;

                    return (
                      <div
                        key={vid}
                        className="flex items-center justify-between text-xs border border-border rounded px-2 py-1"
                      >
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: isRight
                                ? "#22c55e"
                                : is180
                                  ? "#ef4444"
                                  : "#f59e0b",
                            }}
                          />
                          V{i + 1}
                        </span>
                        <span className="font-mono font-medium text-amber-500">
                          {angleDeg.toFixed(1)}°
                        </span>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
                    <span className="text-muted-foreground font-medium">
                      Sum
                    </span>
                    <span className="font-mono font-medium">
                      {radToDeg(angleSum).toFixed(1)}°
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Expected: {((positions.length - 2) * 180).toFixed(0)}° for a
                    simple polygon
                  </div>
                </div>
              </Panel>
            </>
          );
        })()}

      {/* ==============================================================
          MULTI-SELECTION
          ============================================================== */}
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

/* ---------- tiny helper ---------- */
function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}:</span>
      <span>{value}</span>
    </div>
  );
}
