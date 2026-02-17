"use client";

import React from "react";
import { useEditorStore } from "../model/editor.store";
import { Selection, getSelectedIds } from "../model/selection.types";
import { Panel } from "@/shared/ui/Panel";
import { NumberField } from "@/shared/ui/NumberField";
import { formatLength } from "@/domain/units/units";
import { distance } from "@/domain/geometry/vec2";
import { polygonArea } from "@/domain/geometry/polygon";
import { Vec2 } from "@/domain/geometry/vec2";
import { WallsProperties } from "@/features/walls/ui/WallsProperties";
import { RoofProperties } from "@/features/roof/ui/RoofProperties";

/* ------------------------------------------------------------------ */
/*  Geometry properties (plan view vertex/edge/face info)              */
/* ------------------------------------------------------------------ */

function VertexProperties({ vertexId }: { vertexId: string }) {
  const plan = useEditorStore((s) => s.plan);
  const unitConfig = useEditorStore((s) => s.unitConfig);
  const executeCommand = useEditorStore((s) => s.executeCommand);
  const vertex = plan.vertices[vertexId];

  if (!vertex) return null;

  return (
    <Panel title="Vertex">
      <div className="space-y-2 text-xs">
        <div className="flex justify-between text-muted-foreground">
          <span>ID:</span>
          <span className="text-foreground font-mono text-[10px]">
            {vertexId.slice(0, 8)}
          </span>
        </div>
        <NumberField
          label="X"
          suffix="mm"
          value={Math.round(vertex.position.x)}
          onChange={(v) =>
            executeCommand({
              type: "MOVE_VERTEX",
              vertexId,
              from: vertex.position,
              to: { x: v, y: vertex.position.y },
            })
          }
          step={100}
        />
        <NumberField
          label="Y"
          suffix="mm"
          value={Math.round(vertex.position.y)}
          onChange={(v) =>
            executeCommand({
              type: "MOVE_VERTEX",
              vertexId,
              from: vertex.position,
              to: { x: vertex.position.x, y: v },
            })
          }
          step={100}
        />
      </div>
    </Panel>
  );
}

function EdgeProperties({ edgeId }: { edgeId: string }) {
  const plan = useEditorStore((s) => s.plan);
  const unitConfig = useEditorStore((s) => s.unitConfig);
  const executeCommand = useEditorStore((s) => s.executeCommand);
  const edge = plan.edges[edgeId];

  if (!edge) return null;

  const startV = plan.vertices[edge.startId];
  const endV = plan.vertices[edge.endId];

  if (!startV || !endV) return null;

  const len = distance(startV.position, endV.position);

  return (
    <Panel title="Edge">
      <div className="space-y-2 text-xs">
        <div className="flex justify-between text-muted-foreground">
          <span>Length:</span>
          <span className="text-foreground">
            {formatLength(len, unitConfig)}
          </span>
        </div>
        <NumberField
          label="Length"
          suffix="mm"
          value={Math.round(len)}
          onChange={(v) =>
            executeCommand({
              type: "SET_EDGE_LENGTH",
              edgeId,
              length: v,
            })
          }
          min={1}
          step={100}
        />
      </div>
    </Panel>
  );
}

function FaceProperties({ faceId }: { faceId: string }) {
  const plan = useEditorStore((s) => s.plan);
  const unitConfig = useEditorStore((s) => s.unitConfig);
  const face = plan.faces[faceId];

  if (!face) return null;

  const positions = face.vertexIds
    .map((vid) => plan.vertices[vid]?.position)
    .filter(Boolean) as Vec2[];

  const area = positions.length >= 3 ? Math.abs(polygonArea(positions)) : 0;

  let perimeter = 0;
  for (let i = 0; i < positions.length; i++) {
    perimeter += distance(positions[i], positions[(i + 1) % positions.length]);
  }

  return (
    <Panel title="Face">
      <div className="space-y-1 text-xs">
        <div className="flex justify-between text-muted-foreground">
          <span>Vertices:</span>
          <span className="text-foreground">{face.vertexIds.length}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Edges:</span>
          <span className="text-foreground">{face.edgeIds.length}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Perimeter:</span>
          <span className="text-foreground">
            {formatLength(perimeter, unitConfig)}
          </span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Area:</span>
          <span className="text-foreground">
            {(area / 1_000_000).toFixed(2)} m²
          </span>
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Panel                                                         */
/* ------------------------------------------------------------------ */

export function PropertiesPanel() {
  const viewMode = useEditorStore((s) => s.viewMode);
  const selection = useEditorStore((s) => s.selection);

  const selectedVertexIds = getSelectedIds(selection, "vertex");
  const selectedEdgeIds = getSelectedIds(selection, "edge");
  const selectedFaceIds = getSelectedIds(selection, "face");

  const isPlanView = viewMode === "plan";
  const hasGeometrySelection =
    selectedVertexIds.length > 0 ||
    selectedEdgeIds.length > 0 ||
    selectedFaceIds.length > 0;

  return (
    <div className="p-3 space-y-3">
      {/* Plan-view geometry properties */}
      {isPlanView && hasGeometrySelection && (
        <>
          {selectedVertexIds.map((id) => (
            <VertexProperties key={id} vertexId={id} />
          ))}
          {selectedEdgeIds.map((id) => (
            <EdgeProperties key={id} edgeId={id} />
          ))}
          {selectedFaceIds.map((id) => (
            <FaceProperties key={id} faceId={id} />
          ))}
        </>
      )}

      {/* 3D view: wall properties / statistics */}
      <WallsProperties />

      {/* 3D view: roof plane properties / statistics */}
      <RoofProperties />

      {/* Empty state */}
      {isPlanView && !hasGeometrySelection && (
        <div className="text-xs text-muted-foreground text-center py-8">
          Select a vertex, edge, or face to see properties
        </div>
      )}
    </div>
  );
}
