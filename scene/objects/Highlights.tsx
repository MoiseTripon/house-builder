"use client";

import React, { useMemo } from "react";
import { useEditorStore } from "@/features/editor/model/editor.store";
import * as THREE from "three";

export function Highlights() {
  const guideLines = useEditorStore((s) => s.guideLines);
  const drawState = useEditorStore((s) => s.drawState);
  const snapConfig = useEditorStore((s) => s.snapConfig);

  // Guide lines from snapping
  const guideGeometry = useMemo(() => {
    if (guideLines.length === 0) return null;

    const points: number[] = [];
    for (const line of guideLines) {
      points.push(line.from.x, line.from.y, 0.5);
      points.push(line.to.x, line.to.y, 0.5);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    return geo;
  }, [guideLines]);

  // Snap indicator
  const snapIndicator = useMemo(() => {
    if (!drawState.previewPosition) return null;
    if (drawState.isClosing) {
      return { position: drawState.previewPosition, color: "#22c55e" };
    }
    return null;
  }, [drawState]);

  return (
    <group>
      {guideGeometry && (
        <lineSegments geometry={guideGeometry}>
          <lineBasicMaterial
            color="#f59e0b"
            opacity={0.6}
            transparent
            linewidth={1}
          />
        </lineSegments>
      )}

      {snapIndicator && (
        <mesh
          position={[snapIndicator.position.x, snapIndicator.position.y, 0.6]}
        >
          <ringGeometry args={[80, 120, 16]} />
          <meshBasicMaterial
            color={snapIndicator.color}
            opacity={0.8}
            transparent
          />
        </mesh>
      )}
    </group>
  );
}
