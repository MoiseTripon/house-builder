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
  const dragState = useEditorStore((s) => s.dragState);

  /* ----------------------------------------------------------------
     Which edges belong to at least one face?
     ---------------------------------------------------------------- */
  const edgesInFaces = useMemo(() => {
    const set = new Set<string>();
    for (const face of Object.values(plan.faces)) {
      for (const eid of face.edgeIds) set.add(eid);
    }
    return set;
  }, [plan.faces]);

  /* ----------------------------------------------------------------
     Dragged vertex set
     ---------------------------------------------------------------- */
  const draggedVertexSet = useMemo(() => {
    if (!dragState) return new Set<string>();
    return new Set(dragState.vertexIds);
  }, [dragState]);

  /* ----------------------------------------------------------------
     FACE fills
     ---------------------------------------------------------------- */
  const faceElements = useMemo(() => {
    return Object.values(plan.faces).map((face) => {
      const positions = face.vertexIds
        .map((vid) => plan.vertices[vid]?.position)
        .filter(Boolean) as { x: number; y: number }[];
      if (positions.length < 3) return null;

      const isSel = isSelected(selection, "face", face.id);
      const isHovered =
        hoveredItem?.type === "face" && hoveredItem.id === face.id;
      const isDragged =
        dragState?.type === "face" && dragState.entityId === face.id;

      const shape = new THREE.Shape();
      shape.moveTo(positions[0].x, positions[0].y);
      for (let i = 1; i < positions.length; i++) {
        shape.lineTo(positions[i].x, positions[i].y);
      }
      shape.closePath();
      const geo = new THREE.ShapeGeometry(shape);

      const color =
        isSel || isDragged ? "#60a5fa" : isHovered ? "#93c5fd" : "#334155";
      const opacity = isSel || isDragged ? 0.3 : isHovered ? 0.2 : 0.1;

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
    });
  }, [plan.faces, plan.vertices, selection, hoveredItem, dragState]);

  /* ----------------------------------------------------------------
     EDGES — separate orphan (not in any face) from normal
     ---------------------------------------------------------------- */
  const edgeElements = useMemo(() => {
    return Object.values(plan.edges).map((edge) => {
      const start = plan.vertices[edge.startId];
      const end = plan.vertices[edge.endId];
      if (!start || !end) return null;

      const isHovered =
        hoveredItem?.type === "edge" && hoveredItem.id === edge.id;
      const isSel = isSelected(selection, "edge", edge.id);
      const isDragged =
        dragState?.type === "edge" && dragState.entityId === edge.id;
      const isOrphan = !edgesInFaces.has(edge.id);

      let color: string;
      if (isSel || isDragged) {
        color = "#60a5fa";
      } else if (isHovered) {
        color = "#93c5fd";
      } else if (isOrphan) {
        color = "#f97316"; // orange for edges not in any face
      } else {
        color = "#64748b";
      }

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

      return (
        <lineSegments key={edge.id} geometry={geo}>
          <lineBasicMaterial
            color={color}
            linewidth={isSel || isDragged ? 2 : 1}
          />
        </lineSegments>
      );
    });
  }, [
    plan.edges,
    plan.vertices,
    selection,
    hoveredItem,
    dragState,
    edgesInFaces,
  ]);

  /* ----------------------------------------------------------------
     VERTEX circles
     ---------------------------------------------------------------- */
  const vertexElements = useMemo(() => {
    return Object.values(plan.vertices).map((vertex) => {
      const isSel = isSelected(selection, "vertex", vertex.id);
      const isHovered =
        hoveredItem?.type === "vertex" && hoveredItem.id === vertex.id;
      const isInDrawChain =
        mode === "draw" && drawState.vertexIds.includes(vertex.id);
      const isDragged = draggedVertexSet.has(vertex.id);

      const size =
        isSel || isDragged ? 80 : isHovered || isInDrawChain ? 65 : 40;
      const color = isSel
        ? "#f59e0b"
        : isDragged
          ? "#60a5fa"
          : isInDrawChain
            ? "#f59e0b"
            : isHovered
              ? "#fbbf24"
              : "#94a3b8";

      return (
        <mesh
          key={vertex.id}
          position={[vertex.position.x, vertex.position.y, 0.3]}
        >
          <circleGeometry args={[size, 16]} />
          <meshBasicMaterial color={color} />
        </mesh>
      );
    });
  }, [
    plan.vertices,
    selection,
    hoveredItem,
    mode,
    drawState.vertexIds,
    draggedVertexSet,
  ]);

  /* ----------------------------------------------------------------
     DRAW preview line
     ---------------------------------------------------------------- */
  const drawPreviewGeo = useMemo(() => {
    if (mode !== "draw") return null;
    if (drawState.vertexIds.length === 0 || !drawState.previewPosition)
      return null;

    const lastId = drawState.vertexIds[drawState.vertexIds.length - 1];
    const lastV = plan.vertices[lastId];
    if (!lastV) return null;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [
          lastV.position.x,
          lastV.position.y,
          0.2,
          drawState.previewPosition.x,
          drawState.previewPosition.y,
          0.2,
        ],
        3,
      ),
    );
    return geo;
  }, [mode, drawState, plan.vertices]);

  const closingTarget =
    mode === "draw" && drawState.isClosing && drawState.previewPosition
      ? drawState.previewPosition
      : null;

  const cursorDot =
    mode === "draw" && drawState.previewPosition
      ? drawState.previewPosition
      : null;

  return (
    <group>
      {faceElements}
      {edgeElements}

      {drawPreviewGeo && (
        <lineSegments geometry={drawPreviewGeo}>
          <lineBasicMaterial
            color={drawState.isClosing ? "#22c55e" : "#f59e0b"}
            opacity={0.8}
            transparent
          />
        </lineSegments>
      )}

      {closingTarget && (
        <mesh position={[closingTarget.x, closingTarget.y, 0.35]}>
          <ringGeometry args={[70, 110, 24]} />
          <meshBasicMaterial color="#22c55e" opacity={0.7} transparent />
        </mesh>
      )}

      {vertexElements}

      {cursorDot && (
        <mesh position={[cursorDot.x, cursorDot.y, 0.4]}>
          <circleGeometry args={[55, 16]} />
          <meshBasicMaterial
            color={drawState.isClosing ? "#22c55e" : "#f59e0b"}
            opacity={0.6}
            transparent
          />
        </mesh>
      )}
    </group>
  );
}
