"use client";

import React, { useMemo } from "react";
import { useEditorStore } from "@/features/editor/model/editor.store";
import { Html } from "@react-three/drei";
import { distance, midpoint } from "@/domain/geometry/vec2";
import { formatLength } from "@/domain/units/units";

export function Labels() {
  const plan = useEditorStore((s) => s.plan);
  const unitConfig = useEditorStore((s) => s.unitConfig);
  const selection = useEditorStore((s) => s.selection);

  const edgeLabels = useMemo(() => {
    return Object.values(plan.edges)
      .map((edge) => {
        const start = plan.vertices[edge.startId];
        const end = plan.vertices[edge.endId];
        if (!start || !end) return null;

        const len = distance(start.position, end.position);
        const mid = midpoint(start.position, end.position);
        const label = formatLength(len, unitConfig);

        // Only show labels for selected edges, or all if nothing selected
        const showAll = selection.items.length === 0;
        const isEdgeSelected = selection.items.some(
          (i) => i.type === "edge" && i.id === edge.id,
        );
        const isVertexSelected = selection.items.some(
          (i) =>
            i.type === "vertex" &&
            (i.id === edge.startId || i.id === edge.endId),
        );

        if (!showAll && !isEdgeSelected && !isVertexSelected) return null;

        return { id: edge.id, mid, label };
      })
      .filter(Boolean);
  }, [plan, unitConfig, selection]);

  return (
    <group>
      {edgeLabels.map((item) => {
        if (!item) return null;
        return (
          <Html
            key={item.id}
            position={[item.mid.x, item.mid.y, 1]}
            center
            style={{ pointerEvents: "none" }}
          >
            <div className="px-1.5 py-0.5 bg-background/90 backdrop-blur-sm border border-border rounded text-[10px] font-mono text-foreground whitespace-nowrap">
              {item.label}
            </div>
          </Html>
        );
      })}
    </group>
  );
}
