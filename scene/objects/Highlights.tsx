"use client";

import React, { useMemo } from "react";
import { useEditorStore } from "@/features/editor/model/editor.store";
import * as THREE from "three";

export function Highlights() {
  const guideLines = useEditorStore((s) => s.guideLines);
  const drawState = useEditorStore((s) => s.drawState);

  const guideGeometry = useMemo(() => {
    if (guideLines.length === 0) return null;
    const points: number[] = [];
    for (const gl of guideLines) {
      points.push(gl.from.x, gl.from.y, 0.5);
      points.push(gl.to.x, gl.to.y, 0.5);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    return geo;
  }, [guideLines]);

  const snapIndicator = useMemo(() => {
    if (!drawState.previewPosition || !drawState.isClosing) return null;
    return drawState.previewPosition;
  }, [drawState]);

  return (
    <group>
      {guideGeometry && (
        <lineSegments geometry={guideGeometry}>
          <lineBasicMaterial color="#f59e0b" opacity={0.6} transparent />
        </lineSegments>
      )}

      {snapIndicator && (
        <mesh position={[snapIndicator.x, snapIndicator.y, 0.6]}>
          <ringGeometry args={[80, 120, 16]} />
          <meshBasicMaterial color="#22c55e" opacity={0.8} transparent />
        </mesh>
      )}
    </group>
  );
}
