"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { ThreeEvent } from "@react-three/fiber";
import { useRoofStore, Roof } from "@/features/roof/model/roof.store";
import { useEditorStore } from "@/features/editor/model/editor.store";
import { solveHeights } from "@/domain/structure/roofTopology/solver";
import {
  RoofTopology,
  RoofEdge,
  RoofVertex,
} from "@/domain/structure/roofTopology/types";

const ROLE_COLORS: Record<string, string> = {
  eave: "#94a3b8",
  ridge: "#ef4444",
  hip: "#f97316",
  valley: "#3b82f6",
  gable: "#a855f7",
  rake: "#22c55e",
};

interface SolvedTopo {
  roof: Roof;
  topo: RoofTopology;
}

function useSolvedTopologies(): SolvedTopo[] {
  const roofs = useRoofStore((s) => s.roofs);
  return useMemo(() => {
    const result: SolvedTopo[] = [];
    for (const roof of Object.values(roofs)) {
      if (!roof.useCustomTopology) continue;
      const solved = solveHeights(roof.topology, {
        baseZ: roof.baseZ,
        defaultPitchDeg: roof.pitchDeg,
      });
      result.push({ roof, topo: solved });
    }
    return result;
  }, [roofs]);
}

/* ── Edge lines ── */

function TopoEdgeLine({
  edge,
  topo,
  isSelected,
  onClick,
}: {
  edge: RoofEdge;
  topo: RoofTopology;
  isSelected: boolean;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const sv = topo.vertices[edge.startId];
  const ev = topo.vertices[edge.endId];
  if (!sv || !ev || sv.z === null || ev.z === null) return null;

  const color = isSelected ? "#facc15" : (ROLE_COLORS[edge.role] ?? "#64748b");

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [
          sv.position.x,
          sv.position.y,
          sv.z! + 10,
          ev.position.x,
          ev.position.y,
          ev.z! + 10,
        ],
        3,
      ),
    );
    return g;
  }, [sv, ev]);

  // Clickable tube around the line for easier picking
  const tubeGeo = useMemo(() => {
    const path = new THREE.LineCurve3(
      new THREE.Vector3(sv.position.x, sv.position.y, sv.z! + 10),
      new THREE.Vector3(ev.position.x, ev.position.y, ev.z! + 10),
    );
    return new THREE.TubeGeometry(path, 1, 80, 4, false);
  }, [sv, ev]);

  return (
    <group>
      <lineSegments geometry={geo}>
        <lineBasicMaterial
          color={color}
          linewidth={isSelected ? 3 : 2}
          depthTest={false}
        />
      </lineSegments>
      <mesh geometry={tubeGeo} onClick={onClick} visible={false}>
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}

/* ── Vertex dots ── */

function TopoVertexDot({
  vertex,
  isPinned,
}: {
  vertex: RoofVertex;
  isPinned: boolean;
}) {
  if (vertex.z === null) return null;
  return (
    <mesh position={[vertex.position.x, vertex.position.y, vertex.z + 15]}>
      <sphereGeometry args={[isPinned ? 100 : 60, 8, 8]} />
      <meshBasicMaterial
        color={isPinned ? "#ef4444" : "#94a3b8"}
        depthTest={false}
      />
    </mesh>
  );
}

/* ── Main overlay ── */

export function RoofTopologyOverlay() {
  const viewMode = useEditorStore((s) => s.viewMode);
  const show3DRoofs = useRoofStore((s) => s.show3DRoofs);
  const edgeSelection = useRoofStore((s) => s.edgeSelection);
  const selectTopoEdge = useRoofStore((s) => s.selectTopoEdge);
  const toggleTopoEdgeSelection = useRoofStore(
    (s) => s.toggleTopoEdgeSelection,
  );
  const roofTool = useRoofStore((s) => s.roofTool);

  const solved = useSolvedTopologies();

  if (viewMode !== "3d" || !show3DRoofs) return null;
  // Only show overlay when there are custom topologies
  if (solved.length === 0) return null;

  return (
    <group name="roof-topology-overlay">
      {solved.map(({ roof, topo }) => (
        <group key={roof.id}>
          {Object.values(topo.edges).map((edge) => (
            <TopoEdgeLine
              key={edge.id}
              edge={edge}
              topo={topo}
              isSelected={edgeSelection.edgeIds.includes(edge.id)}
              onClick={(e) => {
                e.stopPropagation();
                if (roofTool === "mark-gable") {
                  useRoofStore.getState().topoMarkGable(roof.id, edge.id);
                } else if (e.nativeEvent.shiftKey) {
                  toggleTopoEdgeSelection(edge.id);
                } else {
                  selectTopoEdge(edge.id);
                }
              }}
            />
          ))}
          {Object.values(topo.vertices).map((v) => (
            <TopoVertexDot key={v.id} vertex={v} isPinned={v.pinned} />
          ))}
        </group>
      ))}
    </group>
  );
}
