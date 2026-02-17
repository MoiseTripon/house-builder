"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { ThreeEvent } from "@react-three/fiber";
import { useEditorStore } from "@/features/editor/model/editor.store";
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
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    return geo;
  }, [vertices, indices, normals]);

  const displayColor = useMemo(() => {
    if (isSelected) return "#60a5fa";
    if (isHovered) return "#93c5fd";
    return color;
  }, [color, isSelected, isHovered]);

  const emissive = useMemo(() => {
    if (isSelected) return "#1d4ed8";
    if (isHovered) return "#3b82f6";
    return "#000000";
  }, [isSelected, isHovered]);

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
        emissiveIntensity={isSelected ? 0.3 : isHovered ? 0.15 : 0}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* ================================================================
   Wall Planes - flat 2D representation for 3D view without 3D walls
   ================================================================ */
function WallPlanes() {
  const plan = useEditorStore((s) => s.plan);
  const walls = useWallsStore((s) => s.walls);
  const selection = useWallsStore((s) => s.selection);
  const selectWall = useWallsStore((s) => s.selectWall);
  const toggleWallSelection = useWallsStore((s) => s.toggleWallSelection);

  const wallPlanes = useMemo(() => {
    return Object.values(walls)
      .map((wall) => {
        const edge = plan.edges[wall.edgeId];
        if (!edge) return null;

        const startV = plan.vertices[edge.startId];
        const endV = plan.vertices[edge.endId];
        if (!startV || !endV) return null;

        const isSelected = selection.wallIds.includes(wall.id);

        const start = startV.position;
        const end = endV.position;
        const height = wall.height;
        const baseZ = wall.baseZ;

        const vertices = new Float32Array([
          start.x,
          start.y,
          baseZ,
          end.x,
          end.y,
          baseZ,
          end.x,
          end.y,
          baseZ + height,
          start.x,
          start.y,
          baseZ + height,
        ]);

        const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;

        const normals = new Float32Array([
          nx,
          ny,
          0,
          nx,
          ny,
          0,
          nx,
          ny,
          0,
          nx,
          ny,
          0,
        ]);

        return { wall, vertices, indices, normals, isSelected };
      })
      .filter(Boolean) as {
      wall: (typeof walls)[string];
      vertices: Float32Array;
      indices: Uint16Array;
      normals: Float32Array;
      isSelected: boolean;
    }[];
  }, [walls, plan.edges, plan.vertices, selection]);

  return (
    <group name="wall-planes">
      {wallPlanes.map(({ wall, vertices, indices, normals, isSelected }) => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(vertices, 3),
        );
        geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));

        return (
          <mesh
            key={wall.id}
            geometry={geometry}
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
          >
            <meshStandardMaterial
              color={isSelected ? "#60a5fa" : "#64748b"}
              roughness={0.8}
              metalness={0.1}
              emissive={isSelected ? "#1d4ed8" : "#000000"}
              emissiveIntensity={isSelected ? 0.3 : 0}
              side={THREE.DoubleSide}
              transparent
              opacity={0.8}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export function WallSolids() {
  const viewMode = useEditorStore((s) => s.viewMode);
  const show3DWalls = useWallsStore((s) => s.show3DWalls);
  const selectWall = useWallsStore((s) => s.selectWall);
  const toggleWallSelection = useWallsStore((s) => s.toggleWallSelection);

  const wallData = useWallSolidsWithMaterials();

  if (viewMode === "plan") {
    return null;
  }

  if (!show3DWalls) {
    return <WallPlanes />;
  }

  if (wallData.length === 0) {
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
