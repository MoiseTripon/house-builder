import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { generateId } from "@/shared/lib/ids";
import {
  RoofType,
  RoofSystemConfig,
  RoofMaterial,
} from "@/domain/structure/roofSystem";
import {
  EdgeOverhangs,
  defaultEdgeOverhangs,
  RoofSide,
} from "@/domain/structure/roofTypes/common";
import {
  RoofTopology,
  RoofEdgeRole,
  createEmptyTopology,
} from "@/domain/structure/roofTopology/types";
import { initializeFromPolygon } from "@/domain/structure/roofTopology/initialize";
import * as topoMut from "@/domain/structure/roofTopology/mutations";
import { ROOF_DEFAULTS } from "./roof.defaults";
import { Vec2 } from "@/domain/geometry/vec2";

export interface Roof {
  id: string;
  faceId: string;
  roofType: RoofType;
  pitchDeg: number;
  lowerPitchDeg: number;
  edgeOverhangs: EdgeOverhangs;
  ridgeOffset: number;
  materialId: string;
  baseZ: number;
  /**
   * When true, geometry is driven by `topology` instead of preset.
   * Activated when user makes any topology edit.
   */
  useCustomTopology: boolean;
  topology: RoofTopology;
}

export interface RoofPlaneSelection {
  planeIds: string[];
  primary: string | null;
}

export interface RoofEdgeSelection {
  edgeIds: string[];
  primary: string | null;
}

interface RoofState {
  roofs: Record<string, Roof>;
  config: RoofSystemConfig;
  materials: RoofMaterial[];
  planeSelection: RoofPlaneSelection;
  edgeSelection: RoofEdgeSelection;
  show3DRoofs: boolean;
  /** Active tool for roof editing */
  roofTool: RoofTool;

  /* toggles */
  setShow3DRoofs: (v: boolean) => void;
  setConfig: (patch: Partial<RoofSystemConfig>) => void;
  setRoofTool: (tool: RoofTool) => void;

  /* CRUD */
  createRoofFromFace: (
    faceId: string,
    wallTopZ: number,
    polygon: Vec2[],
  ) => string;
  removeRoof: (roofId: string) => void;
  removeRoofByFace: (faceId: string) => void;
  updateRoof: (
    roofId: string,
    updates: Partial<Omit<Roof, "id" | "faceId" | "topology">>,
  ) => void;
  setEdgeOverhang: (roofId: string, side: RoofSide, value: number) => void;

  /* topology editing */
  topoSetEdgeRole: (
    roofId: string,
    topoEdgeId: string,
    role: RoofEdgeRole,
  ) => void;
  topoPinVertex: (roofId: string, vertexId: string, z: number) => void;
  topoUnpinVertex: (roofId: string, vertexId: string) => void;
  topoAddInteriorVertex: (
    roofId: string,
    position: Vec2,
    z: number | null,
  ) => string;
  topoAddEdge: (
    roofId: string,
    startId: string,
    endId: string,
    role: RoofEdgeRole,
  ) => string;
  topoRemoveEdge: (roofId: string, topoEdgeId: string) => void;
  topoSplitEdge: (roofId: string, topoEdgeId: string) => string;
  topoAddRidge: (
    roofId: string,
    eaveEdge1: string,
    eaveEdge2: string,
    ridgeZ: number,
  ) => void;
  topoAddHip: (
    roofId: string,
    boundaryVId: string,
    interiorVId: string,
  ) => void;
  topoAddValley: (roofId: string, v1Id: string, v2Id: string) => void;
  topoMarkGable: (roofId: string, topoEdgeId: string) => void;
  topoMoveVertex: (roofId: string, vertexId: string, position: Vec2) => void;
  topoResetToPreset: (roofId: string) => void;
  topoInitialize: (roofId: string, polygon: Vec2[]) => void;

  /* batch */
  setAllRoofsType: (t: RoofType) => void;
  setAllRoofsPitch: (deg: number) => void;
  setAllRoofsLowerPitch: (deg: number) => void;
  setAllRoofsOverhang: (mm: number) => void;
  setAllRoofsMaterial: (id: string) => void;
  setAllRoofsRidgeOffset: (mm: number) => void;

  /* sync */
  syncWithFaces: (
    faceIds: string[],
    wallTopForFace: (faceId: string) => number,
    polygonForFace: (faceId: string) => Vec2[],
  ) => void;

  /* selection */
  selectPlane: (planeId: string | null) => void;
  togglePlaneSelection: (planeId: string) => void;
  clearPlaneSelection: () => void;
  selectTopoEdge: (edgeId: string | null) => void;
  toggleTopoEdgeSelection: (edgeId: string) => void;
  clearTopoEdgeSelection: () => void;

  /* queries */
  getRoofByFace: (faceId: string) => Roof | undefined;
  getRoofByPlaneId: (planeId: string) => Roof | undefined;
  getSelectedRoofs: () => Roof[];
}

export type RoofTool =
  | "select"
  | "add-ridge"
  | "add-hip"
  | "add-valley"
  | "mark-gable"
  | "add-vertex"
  | "pin-height";

export const useRoofStore = create<RoofState>()(
  subscribeWithSelector((set, get) => ({
    roofs: {},
    config: ROOF_DEFAULTS.config,
    materials: ROOF_DEFAULTS.materials,
    planeSelection: { planeIds: [], primary: null },
    edgeSelection: { edgeIds: [], primary: null },
    show3DRoofs: ROOF_DEFAULTS.show3DRoofs,
    roofTool: "select" as RoofTool,

    /* ── toggles ── */

    setShow3DRoofs: (v) => set({ show3DRoofs: v }),
    setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),
    setRoofTool: (tool) => set({ roofTool: tool }),

    /* ── CRUD ── */

    createRoofFromFace: (faceId, wallTopZ, polygon) => {
      const { config, roofs } = get();
      const existing = Object.values(roofs).find((r) => r.faceId === faceId);
      if (existing) return existing.id;

      const id = generateId("roof");
      const topology = initializeFromPolygon(polygon, wallTopZ);

      const roof: Roof = {
        id,
        faceId,
        roofType: config.defaultRoofType,
        pitchDeg: config.defaultPitchDeg,
        lowerPitchDeg: config.defaultLowerPitchDeg,
        edgeOverhangs: defaultEdgeOverhangs(config.defaultOverhang),
        ridgeOffset: 0,
        materialId: config.defaultMaterialId,
        baseZ: wallTopZ,
        useCustomTopology: false,
        topology,
      };
      set({ roofs: { ...roofs, [id]: roof } });
      return id;
    },

    removeRoof: (roofId) => {
      const { roofs, planeSelection, edgeSelection } = get();
      const { [roofId]: _, ...rest } = roofs;
      set({
        roofs: rest,
        planeSelection: {
          planeIds: planeSelection.planeIds.filter(
            (pid) => !pid.startsWith(roofId),
          ),
          primary: planeSelection.primary?.startsWith(roofId)
            ? null
            : planeSelection.primary,
        },
        edgeSelection: { edgeIds: [], primary: null },
      });
    },

    removeRoofByFace: (faceId) => {
      const roof = get().getRoofByFace(faceId);
      if (roof) get().removeRoof(roof.id);
    },

    updateRoof: (roofId, updates) => {
      const { roofs, config } = get();
      const roof = roofs[roofId];
      if (!roof) return;

      const c = { ...updates };
      if (c.pitchDeg !== undefined)
        c.pitchDeg = clamp(c.pitchDeg, config.minPitchDeg, config.maxPitchDeg);
      if (c.lowerPitchDeg !== undefined)
        c.lowerPitchDeg = clamp(
          c.lowerPitchDeg,
          config.minLowerPitchDeg,
          config.maxLowerPitchDeg,
        );
      if (c.ridgeOffset !== undefined)
        c.ridgeOffset = clamp(
          c.ridgeOffset,
          -config.maxRidgeOffset,
          config.maxRidgeOffset,
        );

      // When changing roofType, reset to preset mode
      if (c.roofType !== undefined && c.roofType !== roof.roofType) {
        c.useCustomTopology = false;
      }

      set({ roofs: { ...roofs, [roofId]: { ...roof, ...c } } });
    },

    setEdgeOverhang: (roofId, side, value) => {
      const { roofs, config } = get();
      const roof = roofs[roofId];
      if (!roof) return;
      set({
        roofs: {
          ...roofs,
          [roofId]: {
            ...roof,
            edgeOverhangs: {
              ...roof.edgeOverhangs,
              [side]: clamp(value, config.minOverhang, config.maxOverhang),
            },
          },
        },
      });
    },

    /* ── topology editing ── */

    topoSetEdgeRole: (roofId, topoEdgeId, role) => {
      const roof = get().roofs[roofId];
      if (!roof) return;
      const topo = topoMut.setEdgeRole(roof.topology, topoEdgeId, role);
      set({
        roofs: {
          ...get().roofs,
          [roofId]: { ...roof, topology: topo, useCustomTopology: true },
        },
      });
    },

    topoPinVertex: (roofId, vertexId, z) => {
      const roof = get().roofs[roofId];
      if (!roof) return;
      const topo = topoMut.pinVertex(roof.topology, vertexId, z);
      set({
        roofs: {
          ...get().roofs,
          [roofId]: { ...roof, topology: topo, useCustomTopology: true },
        },
      });
    },

    topoUnpinVertex: (roofId, vertexId) => {
      const roof = get().roofs[roofId];
      if (!roof) return;
      const topo = topoMut.unpinVertex(roof.topology, vertexId);
      set({
        roofs: {
          ...get().roofs,
          [roofId]: { ...roof, topology: topo, useCustomTopology: true },
        },
      });
    },

    topoAddInteriorVertex: (roofId, position, z) => {
      const roof = get().roofs[roofId];
      if (!roof) return "";
      const { topo, vertexId } = topoMut.addInteriorVertex(
        roof.topology,
        position,
        z,
      );
      set({
        roofs: {
          ...get().roofs,
          [roofId]: { ...roof, topology: topo, useCustomTopology: true },
        },
      });
      return vertexId;
    },

    topoAddEdge: (roofId, startId, endId, role) => {
      const roof = get().roofs[roofId];
      if (!roof) return "";
      const { topo, edgeId } = topoMut.addEdge(
        roof.topology,
        startId,
        endId,
        role,
      );
      set({
        roofs: {
          ...get().roofs,
          [roofId]: { ...roof, topology: topo, useCustomTopology: true },
        },
      });
      return edgeId;
    },

    topoRemoveEdge: (roofId, topoEdgeId) => {
      const roof = get().roofs[roofId];
      if (!roof) return;
      const topo = topoMut.removeEdge(roof.topology, topoEdgeId);
      set({
        roofs: {
          ...get().roofs,
          [roofId]: { ...roof, topology: topo, useCustomTopology: true },
        },
      });
    },

    topoSplitEdge: (roofId, topoEdgeId) => {
      const roof = get().roofs[roofId];
      if (!roof) return "";
      const { topo, vertexId } = topoMut.splitEdge(roof.topology, topoEdgeId);
      set({
        roofs: {
          ...get().roofs,
          [roofId]: { ...roof, topology: topo, useCustomTopology: true },
        },
      });
      return vertexId;
    },

    topoAddRidge: (roofId, eaveEdge1, eaveEdge2, ridgeZ) => {
      const roof = get().roofs[roofId];
      if (!roof) return;
      const topo = topoMut.addRidgeBetweenEdges(
        roof.topology,
        eaveEdge1,
        eaveEdge2,
        ridgeZ,
      );
      set({
        roofs: {
          ...get().roofs,
          [roofId]: { ...roof, topology: topo, useCustomTopology: true },
        },
      });
    },

    topoAddHip: (roofId, boundaryVId, interiorVId) => {
      const roof = get().roofs[roofId];
      if (!roof) return;
      const topo = topoMut.addHipEdge(roof.topology, boundaryVId, interiorVId);
      set({
        roofs: {
          ...get().roofs,
          [roofId]: { ...roof, topology: topo, useCustomTopology: true },
        },
      });
    },

    topoAddValley: (roofId, v1Id, v2Id) => {
      const roof = get().roofs[roofId];
      if (!roof) return;
      const topo = topoMut.addValleyEdge(roof.topology, v1Id, v2Id);
      set({
        roofs: {
          ...get().roofs,
          [roofId]: { ...roof, topology: topo, useCustomTopology: true },
        },
      });
    },

    topoMarkGable: (roofId, topoEdgeId) => {
      const roof = get().roofs[roofId];
      if (!roof) return;
      const topo = topoMut.markGable(roof.topology, topoEdgeId);
      set({
        roofs: {
          ...get().roofs,
          [roofId]: { ...roof, topology: topo, useCustomTopology: true },
        },
      });
    },

    topoMoveVertex: (roofId, vertexId, position) => {
      const roof = get().roofs[roofId];
      if (!roof) return;
      const topo = topoMut.moveVertex(roof.topology, vertexId, position);
      set({
        roofs: {
          ...get().roofs,
          [roofId]: { ...roof, topology: topo, useCustomTopology: true },
        },
      });
    },

    topoResetToPreset: (roofId) => {
      const roof = get().roofs[roofId];
      if (!roof) return;
      set({
        roofs: {
          ...get().roofs,
          [roofId]: { ...roof, useCustomTopology: false },
        },
      });
    },

    topoInitialize: (roofId, polygon) => {
      const roof = get().roofs[roofId];
      if (!roof) return;
      const topology = initializeFromPolygon(polygon, roof.baseZ);
      set({
        roofs: {
          ...get().roofs,
          [roofId]: { ...roof, topology, useCustomTopology: true },
        },
      });
    },

    /* ── batch ── */

    setAllRoofsType: (t) => {
      const { roofs, config } = get();
      const updated = { ...roofs };
      for (const id of Object.keys(updated))
        updated[id] = { ...updated[id], roofType: t, useCustomTopology: false };
      set({ roofs: updated, config: { ...config, defaultRoofType: t } });
    },

    setAllRoofsPitch: (deg) => {
      const { config } = get();
      const v = clamp(deg, config.minPitchDeg, config.maxPitchDeg);
      const updated = { ...get().roofs };
      for (const id of Object.keys(updated))
        updated[id] = { ...updated[id], pitchDeg: v };
      set({ roofs: updated, config: { ...config, defaultPitchDeg: v } });
    },

    setAllRoofsLowerPitch: (deg) => {
      const { config } = get();
      const v = clamp(deg, config.minLowerPitchDeg, config.maxLowerPitchDeg);
      const updated = { ...get().roofs };
      for (const id of Object.keys(updated))
        updated[id] = { ...updated[id], lowerPitchDeg: v };
      set({ roofs: updated, config: { ...config, defaultLowerPitchDeg: v } });
    },

    setAllRoofsOverhang: (mm) => {
      const { config } = get();
      const v = clamp(mm, config.minOverhang, config.maxOverhang);
      const updated = { ...get().roofs };
      for (const id of Object.keys(updated))
        updated[id] = {
          ...updated[id],
          edgeOverhangs: defaultEdgeOverhangs(v),
        };
      set({ roofs: updated, config: { ...config, defaultOverhang: v } });
    },

    setAllRoofsMaterial: (materialId) => {
      const updated = { ...get().roofs };
      for (const id of Object.keys(updated))
        updated[id] = { ...updated[id], materialId };
      set({
        roofs: updated,
        config: { ...get().config, defaultMaterialId: materialId },
      });
    },

    setAllRoofsRidgeOffset: (mm) => {
      const { config } = get();
      const v = clamp(mm, -config.maxRidgeOffset, config.maxRidgeOffset);
      const updated = { ...get().roofs };
      for (const id of Object.keys(updated))
        updated[id] = { ...updated[id], ridgeOffset: v };
      set({ roofs: updated });
    },

    /* ── sync ── */

    syncWithFaces: (faceIds, wallTopForFace, polygonForFace) => {
      const { roofs, config, planeSelection } = get();
      const faceSet = new Set(faceIds);
      const next: Record<string, Roof> = {};
      const seenFaces = new Set<string>();

      for (const roof of Object.values(roofs)) {
        if (faceSet.has(roof.faceId)) {
          const newBaseZ = wallTopForFace(roof.faceId);
          next[roof.id] = { ...roof, baseZ: newBaseZ };
          seenFaces.add(roof.faceId);
        }
      }

      for (const faceId of faceIds) {
        if (!seenFaces.has(faceId)) {
          const id = generateId("roof");
          const baseZ = wallTopForFace(faceId);
          const polygon = polygonForFace(faceId);
          const topology = initializeFromPolygon(polygon, baseZ);

          next[id] = {
            id,
            faceId,
            roofType: config.defaultRoofType,
            pitchDeg: config.defaultPitchDeg,
            lowerPitchDeg: config.defaultLowerPitchDeg,
            edgeOverhangs: defaultEdgeOverhangs(config.defaultOverhang),
            ridgeOffset: 0,
            materialId: config.defaultMaterialId,
            baseZ,
            useCustomTopology: false,
            topology,
          };
        }
      }

      const nextIds = new Set(Object.keys(next));
      const validPlaneIds = planeSelection.planeIds.filter(
        (pid) => roofIdFromPlaneId(pid, nextIds) !== null,
      );
      set({
        roofs: next,
        planeSelection: {
          planeIds: validPlaneIds,
          primary:
            planeSelection.primary &&
            roofIdFromPlaneId(planeSelection.primary, nextIds) !== null
              ? planeSelection.primary
              : (validPlaneIds[0] ?? null),
        },
        edgeSelection: { edgeIds: [], primary: null },
      });
    },

    /* ── selection ── */

    selectPlane: (planeId) => {
      if (!planeId) set({ planeSelection: { planeIds: [], primary: null } });
      else set({ planeSelection: { planeIds: [planeId], primary: planeId } });
    },

    togglePlaneSelection: (planeId) => {
      const { planeSelection } = get();
      const has = planeSelection.planeIds.includes(planeId);
      if (has) {
        const ids = planeSelection.planeIds.filter((x) => x !== planeId);
        set({
          planeSelection: {
            planeIds: ids,
            primary:
              planeSelection.primary === planeId
                ? (ids[0] ?? null)
                : planeSelection.primary,
          },
        });
      } else {
        set({
          planeSelection: {
            planeIds: [...planeSelection.planeIds, planeId],
            primary: planeId,
          },
        });
      }
    },

    clearPlaneSelection: () =>
      set({ planeSelection: { planeIds: [], primary: null } }),

    selectTopoEdge: (edgeId) => {
      if (!edgeId) set({ edgeSelection: { edgeIds: [], primary: null } });
      else set({ edgeSelection: { edgeIds: [edgeId], primary: edgeId } });
    },

    toggleTopoEdgeSelection: (edgeId) => {
      const { edgeSelection } = get();
      const has = edgeSelection.edgeIds.includes(edgeId);
      if (has) {
        const ids = edgeSelection.edgeIds.filter((x) => x !== edgeId);
        set({
          edgeSelection: {
            edgeIds: ids,
            primary:
              edgeSelection.primary === edgeId
                ? (ids[0] ?? null)
                : edgeSelection.primary,
          },
        });
      } else {
        set({
          edgeSelection: {
            edgeIds: [...edgeSelection.edgeIds, edgeId],
            primary: edgeId,
          },
        });
      }
    },

    clearTopoEdgeSelection: () =>
      set({ edgeSelection: { edgeIds: [], primary: null } }),

    /* ── queries ── */

    getRoofByFace: (faceId) =>
      Object.values(get().roofs).find((r) => r.faceId === faceId),

    getRoofByPlaneId: (planeId) => {
      const ids = new Set(Object.keys(get().roofs));
      const rid = roofIdFromPlaneId(planeId, ids);
      return rid ? get().roofs[rid] : undefined;
    },

    getSelectedRoofs: () => {
      const { roofs, planeSelection } = get();
      const ids = new Set<string>();
      const allRoofIds = new Set(Object.keys(roofs));
      for (const pid of planeSelection.planeIds) {
        const rid = roofIdFromPlaneId(pid, allRoofIds);
        if (rid) ids.add(rid);
      }
      return [...ids].map((id) => roofs[id]).filter((r): r is Roof => !!r);
    },
  })),
);

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function roofIdFromPlaneId(
  planeId: string,
  knownRoofIds: Set<string>,
): string | null {
  for (const rid of knownRoofIds) {
    if (planeId.startsWith(rid + "_")) return rid;
  }
  return null;
}
