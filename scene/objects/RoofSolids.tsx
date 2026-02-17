"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { ThreeEvent } from "@react-three/fiber";
import { useEditorStore } from "@/features/editor/model/editor.store";
import { useRoofStore } from "@/features/roof/model/roof.store";
import {
  useRoofSync,
  useRoofSolidsWithMaterials,
} from "@/features/roof/model/roof.selectors";

/* ================================================================
   Single roof mesh
   ================================================================ */

interface RoofMeshProps {
  vertices: Float32Array;
  indices: Uint16Array;
  normals: Float32Array;
  color: string;
  roughness: number;
  isSelected: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;
}

function RoofMesh({
  vertices,
  indices,
  normals,
  color,
  roughness,
  isSelected,
  onClick,
  onPointerOver,
  onPointerOut,
}: RoofMeshProps) {
  const geometry = useMemo(() => {
    if (vertices.length === 0) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    return geo;
  }, [vertices, indices, normals]);

  const displayColor = useMemo(
    () => (isSelected ? "#60a5fa" : color),
    [color, isSelected],
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
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <meshStandardMaterial
        color={displayColor}
        roughness={roughness}
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
  /* keep roofs in sync with plan faces + wall heights */
  useRoofSync();

  const viewMode = useEditorStore((s) => s.viewMode);
  const show3DRoofs = useRoofStore((s) => s.show3DRoofs);
  const selectRoof = useRoofStore((s) => s.selectRoof);
  const toggleRoofSelection = useRoofStore((s) => s.toggleRoofSelection);

  const roofData = useRoofSolidsWithMaterials();

  // Nothing to render in plan view or when hidden
  if (viewMode === "plan" || !show3DRoofs || roofData.length === 0) {
    return null;
  }

  return (
    <group name="roofs">
      {roofData.map(({ solid, roof, material, isSelected }) => (
        <RoofMesh
          key={solid.roofId}
          vertices={solid.vertices}
          indices={solid.indices}
          normals={solid.normals}
          color={material.color}
          roughness={material.roughness}
          isSelected={isSelected}
          onClick={(e) => {
            e.stopPropagation();
            if (e.nativeEvent.shiftKey) {
              toggleRoofSelection(roof.id);
            } else {
              selectRoof(roof.id);
            }
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "default";
          }}
        />
      ))}
    </group>
  );
}
