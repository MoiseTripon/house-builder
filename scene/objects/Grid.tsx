"use client";

import React, { useMemo } from "react";
import { useEditorStore } from "@/features/editor/model/editor.store";
import * as THREE from "three";

export function Grid() {
  const gridSize = useEditorStore((s) => s.snapConfig.gridSize);
  const gridEnabled = useEditorStore((s) => s.snapConfig.gridEnabled);

  const gridGeometry = useMemo(() => {
    if (!gridEnabled) return null;

    const size = 50000; // 50m extent
    const divisions = Math.floor(size / gridSize) * 2;
    const halfSize = size;

    const points: number[] = [];

    for (let i = -divisions / 2; i <= divisions / 2; i++) {
      const pos = i * gridSize;
      // Horizontal line
      points.push(-halfSize, pos, 0);
      points.push(halfSize, pos, 0);
      // Vertical line
      points.push(pos, -halfSize, 0);
      points.push(pos, halfSize, 0);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    return geo;
  }, [gridSize, gridEnabled]);

  if (!gridEnabled || !gridGeometry) return null;

  return (
    <lineSegments geometry={gridGeometry}>
      <lineBasicMaterial color="#1a1a2e" opacity={0.5} transparent />
    </lineSegments>
  );
}
