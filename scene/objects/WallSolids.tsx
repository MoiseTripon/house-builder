"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { ThreeEvent } from "@react-three/fiber";
import { useWallsStore } from "@/features/walls/model/walls.store";
import { useWallSolidsWithMaterials } from "@/features/walls/model/walls.selectors";

interface WallMeshProps {
  vertices: Float32Array;
  indices: Uint16Array;
  normals: Float32Array;
  color: string;
  isSelected: boolean;
  isHovered: boolean;
  roughness: number;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;
}

function WallMesh({
  vertices,
  indices,
  normals,
  color,
  isSelected,
  isHovered,
  roughness,
  onClick,
  onPointerOver,
  onPointerOut,
}: WallMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    return geo;
  }, [vertices, indices, normals]);

  // Determine display color
  const displayColor = useMemo(() => {
    if (isSelected) return "#60a5fa"; // blue
    if (isHovered) return "#93c5fd"; // light blue
    return color;
  }, [color, isSelected, isHovered]);

  const emissive = useMemo(() => {
    if (isSelected) return "#1d4ed8";
    if (isHovered) return "#3b82f6";
    return "#000000";
  }, [isSelected, isHovered]);

  return (
    <mesh
      ref={meshRef}
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
        emissiveIntensity={isSelected ? 0.3 : isHovered ? 0.15 : 0}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export function WallSolids() {
  const wallsVisible = useWallsStore((s) => s.wallsVisible);
  const selectWall = useWallsStore((s) => s.selectWall);
  const toggleWallSelection = useWallsStore((s) => s.toggleWallSelection);

  const wallData = useWallSolidsWithMaterials();

  if (!wallsVisible || wallData.length === 0) {
    return null;
  }

  return (
    <group name="walls">
      {wallData.map(({ solid, wall, material, isSelected, isHovered }) => (
        <WallMesh
          key={solid.wallId}
          vertices={solid.vertices}
          indices={solid.indices}
          normals={solid.normals}
          color={material.color}
          isSelected={isSelected}
          isHovered={isHovered}
          roughness={material.roughness}
          onClick={(e) => {
            e.stopPropagation();
            if (e.nativeEvent.shiftKey) {
              toggleWallSelection(wall.id);
            } else {
              selectWall(wall.id);
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
