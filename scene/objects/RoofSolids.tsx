"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { ThreeEvent } from "@react-three/fiber";
import { useEditorStore } from "@/features/editor/model/editor.store";
import { useRoofStore } from "@/features/roof/model/roof.store";
import {
  useRoofSync,
  useRoofPlanesWithMaterials,
  RoofPlaneRenderData,
} from "@/features/roof/model/roof.selectors";

/* ================================================================
   Single roof plane mesh
   ================================================================ */

interface RoofPlaneMeshProps {
  data: RoofPlaneRenderData;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
}

function RoofPlaneMesh({ data, onClick }: RoofPlaneMeshProps) {
  const { plane, material, isSelected } = data;

  const geometry = useMemo(() => {
    if (plane.vertices.length === 0) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(plane.vertices, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(plane.normals, 3));
    geo.setIndex(new THREE.BufferAttribute(plane.indices, 1));
    return geo;
  }, [plane.vertices, plane.indices, plane.normals]);

  const displayColor = useMemo(
    () => (isSelected ? "#60a5fa" : material.color),
    [material.color, isSelected],
  );

  const emissive = useMemo(
    () => (isSelected ? "#1d4ed8" : "#000000"),
    [isSelected],
  );

  if (!geometry) return null;

  return (
    <mesh
      geometry={geometry}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "default";
      }}
    >
      <meshStandardMaterial
        color={displayColor}
        roughness={material.roughness}
        metalness={0.1}
        emissive={emissive}
        emissiveIntensity={isSelected ? 0.3 : 0}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* ================================================================
   Root component
   ================================================================ */

export function RoofSolids() {
  useRoofSync();

  const viewMode = useEditorStore((s) => s.viewMode);
  const show3DRoofs = useRoofStore((s) => s.show3DRoofs);
  const selectPlane = useRoofStore((s) => s.selectPlane);
  const togglePlaneSelection = useRoofStore((s) => s.togglePlaneSelection);

  const planeData = useRoofPlanesWithMaterials();

  if (viewMode === "plan" || !show3DRoofs || planeData.length === 0) {
    return null;
  }

  return (
    <group name="roofs">
      {planeData.map((data) => (
        <RoofPlaneMesh
          key={data.plane.planeId}
          data={data}
          onClick={(e) => {
            e.stopPropagation();
            if (e.nativeEvent.shiftKey) {
              togglePlaneSelection(data.plane.planeId);
            } else {
              selectPlane(data.plane.planeId);
            }
          }}
        />
      ))}
    </group>
  );
}
