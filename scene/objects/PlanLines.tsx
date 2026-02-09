"use client";

import React, { useMemo } from "react";
import { useEditorStore } from "@/features/editor/model/editor.store";
import { isSelected } from "@/features/editor/model/selection.types";
import * as THREE from "three";

export function PlanLines() {
  const plan = useEditorStore((s) => s.plan);
  const selection = useEditorStore((s) => s.selection);
  const hoveredItem = useEditorStore((s) => s.hoveredItem);
  const drawState = useEditorStore((s) => s.drawState);
  const mode = useEditorStore((s) => s.mode);

  // Render edges
  const edgeGeometries = useMemo(() => {
    const result: {
      geometry: THREE.BufferGeometry;
      color: string;
      lineWidth: number;
    }[] = [];

    for (const edge of Object.values(plan.edges)) {
      const start = plan.vertices[edge.startId];
      const end = plan.vertices[edge.endId];
      if (!start || !end) continue;

      const isHovered =
        hoveredItem?.type === "edge" && hoveredItem.id === edge.id;
      const isSel = isSelected(selection, "edge", edge.id);

      const color = isSel ? "#60a5fa" : isHovered ? "#93c5fd" : "#64748b";
      const lineWidth = isSel ? 2 : isHovered ? 1.5 : 1;

      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(
          [
            start.position.x,
            start.position.y,
            0.1,
            end.position.x,
            end.position.y,
            0.1,
          ],
          3,
        ),
      );

      result.push({ geometry: geo, color, lineWidth });
    }

    return result;
  }, [plan, selection, hoveredItem]);

  // Render draw preview
  const drawPreview = useMemo(() => {
    if (mode !== "draw" || drawState.vertexIds.length === 0) return null;

    const points: number[] = [];
    for (const vid of drawState.vertexIds) {
      const v = plan.vertices[vid];
      if (v) {
        points.push(v.position.x, v.position.y, 0.2);
      }
    }

    if (drawState.previewPosition) {
      points.push(
        drawState.previewPosition.x,
        drawState.previewPosition.y,
        0.2,
      );

      // Closing line
      if (drawState.isClosing && drawState.vertexIds.length >= 3) {
        const firstV = plan.vertices[drawState.vertexIds[0]];
        if (firstV) {
          points.push(firstV.position.x, firstV.position.y, 0.2);
        }
      }
    }

    if (points.length < 6) return null;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    return geo;
  }, [mode, drawState, plan]);

  return (
    <group>
      {/* Edges */}
      {edgeGeometries.map((item, i) => (
        <lineSegments key={i} geometry={item.geometry}>
          <lineBasicMaterial color={item.color} linewidth={item.lineWidth} />
        </lineSegments>
      ))}

      {/* Face fills */}
      {Object.values(plan.faces).map((face) => {
        const positions = face.vertexIds
          .map((vid) => plan.vertices[vid]?.position)
          .filter(Boolean);
        if (positions.length < 3) return null;

        const isSel = isSelected(selection, "face", face.id);
        const isHovered =
          hoveredItem?.type === "face" && hoveredItem.id === face.id;

        // Create triangulated face
        const shape = new THREE.Shape();
        shape.moveTo(positions[0]!.x, positions[0]!.y);
        for (let i = 1; i < positions.length; i++) {
          shape.lineTo(positions[i]!.x, positions[i]!.y);
        }
        shape.closePath();

        const geo = new THREE.ShapeGeometry(shape);
        const color = isSel ? "#60a5fa" : isHovered ? "#93c5fd" : "#334155";
        const opacity = isSel ? 0.3 : isHovered ? 0.2 : 0.1;

        return (
          <mesh key={face.id} geometry={geo} position={[0, 0, 0.05]}>
            <meshBasicMaterial
              color={color}
              opacity={opacity}
              transparent
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}

      {/* Draw preview */}
      {drawPreview && (
        <line geometry={drawPreview}>
          <lineBasicMaterial
            color={drawState.isClosing ? "#22c55e" : "#f59e0b"}
            linewidth={2}
          />
        </line>
      )}

      {/* Vertices */}
      {Object.values(plan.vertices).map((vertex) => {
        const isSel = isSelected(selection, "vertex", vertex.id);
        const isHovered =
          hoveredItem?.type === "vertex" && hoveredItem.id === vertex.id;

        const size = isSel ? 80 : isHovered ? 60 : 40;
        const color = isSel ? "#f59e0b" : isHovered ? "#fbbf24" : "#94a3b8";

        return (
          <mesh
            key={vertex.id}
            position={[vertex.position.x, vertex.position.y, 0.3]}
          >
            <circleGeometry args={[size, 16]} />
            <meshBasicMaterial color={color} />
          </mesh>
        );
      })}

      {/* Draw preview cursor */}
      {mode === "draw" && drawState.previewPosition && (
        <mesh
          position={[
            drawState.previewPosition.x,
            drawState.previewPosition.y,
            0.4,
          ]}
        >
          <circleGeometry args={[60, 16]} />
          <meshBasicMaterial
            color={drawState.isClosing ? "#22c55e" : "#f59e0b"}
            opacity={0.7}
            transparent
          />
        </mesh>
      )}
    </group>
  );
}
