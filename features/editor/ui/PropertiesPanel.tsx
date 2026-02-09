"use client";

import React, { useMemo } from "react";
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
  polygonCentroid,
} from "@/domain/geometry/polygon";

function radToDeg(r: number) {
  return (r * 180) / Math.PI;
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}:</span>
      <span>{value}</span>
    </div>
  );
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
     Face bounding box (for resize)
     ================================================================ */
  const faceBounds = useMemo(() => {
    if (selectedFaceIds.length !== 1) return null;
    const face = plan.faces[selectedFaceIds[0]];
    if (!face) return null;

    const positions = face.vertexIds
      .map((vid) => plan.vertices[vid]?.position)
      .filter(Boolean) as Vec2[];
    if (positions.length < 3) return null;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const p of positions) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    return {
      width: maxX - minX,
      height: maxY - minY,
      center: polygonCentroid(positions),
      positions,
    };
  }, [plan, selectedFaceIds]);

  /* ================================================================
     NO SELECTION
     ================================================================ */
  if (!hasSelection) {
    return (
      <div className="p-4 space-y-3">
        <Panel title="Properties">
          <p className="text-xs text-muted-foreground">
            Select a vertex, edge, or face to see its properties.
          </p>
        </Panel>
        <Panel title="Plan Info">
          <div className="space-y-1 text-xs">
            <Row label="Vertices" value={Object.keys(plan.vertices).length} />
            <Row label="Edges" value={Object.keys(plan.edges).length} />
            <Row label="Faces" value={Object.keys(plan.faces).length} />
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {/* ==============================================================
          SINGLE VERTEX
          ============================================================== */}
      {selectedVertexIds.length === 1 &&
        (() => {
          const vertex = plan.vertices[selectedVertexIds[0]];
          if (!vertex) return null;

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
              return {
                faceId: face.id,
                angleDeg: radToDeg(interiorAngleAt(positions, idx)),
              };
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
                <Panel title="Interior Angles at Vertex">
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
          SINGLE EDGE
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
          SINGLE FACE
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
          const expectedSum = (positions.length - 2) * Math.PI;

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
                </div>
              </Panel>

              {/* Scale / Resize */}
              {faceBounds && (
                <Panel title="Resize Face">
                  <div className="space-y-2">
                    <NumberField
                      label="Width"
                      suffix="mm"
                      value={Math.round(faceBounds.width)}
                      min={100}
                      step={100}
                      onChange={(newW) => {
                        if (faceBounds.width < 1) return;
                        const sx = newW / faceBounds.width;
                        executeCommand({
                          type: "SCALE_FACE",
                          faceId: face.id,
                          scaleX: sx,
                          scaleY: 1,
                          center: faceBounds.center,
                        });
                      }}
                    />
                    <NumberField
                      label="Height"
                      suffix="mm"
                      value={Math.round(faceBounds.height)}
                      min={100}
                      step={100}
                      onChange={(newH) => {
                        if (faceBounds.height < 1) return;
                        const sy = newH / faceBounds.height;
                        executeCommand({
                          type: "SCALE_FACE",
                          faceId: face.id,
                          scaleX: 1,
                          scaleY: sy,
                          center: faceBounds.center,
                        });
                      }}
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={() =>
                          executeCommand({
                            type: "SCALE_FACE",
                            faceId: face.id,
                            scaleX: 0.9,
                            scaleY: 0.9,
                            center: faceBounds.center,
                          })
                        }
                        className="flex-1 px-2 py-1.5 text-xs border border-border rounded hover:bg-muted transition-colors"
                        title="Scale down 10%  [ "
                      >
                        − 10%
                      </button>
                      <button
                        onClick={() =>
                          executeCommand({
                            type: "SCALE_FACE",
                            faceId: face.id,
                            scaleX: 1.1,
                            scaleY: 1.1,
                            center: faceBounds.center,
                          })
                        }
                        className="flex-1 px-2 py-1.5 text-xs border border-border rounded hover:bg-muted transition-colors"
                        title="Scale up 10%  ] "
                      >
                        + 10%
                      </button>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Shortcuts:{" "}
                      <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">
                        [
                      </kbd>{" "}
                      shrink ·{" "}
                      <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">
                        ]
                      </kbd>{" "}
                      grow
                    </div>
                  </div>
                </Panel>
              )}

              {/* Interior Angles */}
              <Panel title="Interior Angles" collapsible>
                <div className="space-y-1.5">
                  {angles.map((angleRad, i) => {
                    const deg = radToDeg(angleRad);
                    const isRight = Math.abs(deg - 90) < 0.5;
                    const isStraight = Math.abs(deg - 180) < 0.5;
                    const isReflex = deg > 180.5;

                    let dotColor = "#f59e0b";
                    if (isRight) dotColor = "#22c55e";
                    if (isStraight || isReflex) dotColor = "#ef4444";

                    return (
                      <div
                        key={face.vertexIds[i]}
                        className="flex items-center justify-between text-xs border border-border rounded px-2 py-1"
                      >
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: dotColor }}
                          />
                          V{i + 1}
                        </span>
                        <span className="font-mono font-medium text-amber-500">
                          {deg.toFixed(1)}°
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
                    Expected for {positions.length}-gon:{" "}
                    {radToDeg(expectedSum).toFixed(0)}°
                  </div>
                </div>
              </Panel>

              {/* Delete face */}
              <Panel title="Actions">
                <button
                  onClick={() => {
                    executeCommand({ type: "DELETE_FACE", faceId: face.id });
                    clearSelection();
                  }}
                  className="w-full px-2 py-1.5 text-xs bg-destructive/10 text-destructive rounded hover:bg-destructive/20 transition-colors"
                >
                  Delete Entire Face
                </button>
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
