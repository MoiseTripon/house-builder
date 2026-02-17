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
import { ROOF_DEFAULTS } from "./roof.defaults";

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
}

export interface RoofPlaneSelection {
  planeIds: string[];
  primary: string | null;
}

interface RoofState {
  roofs: Record<string, Roof>;
  config: RoofSystemConfig;
  materials: RoofMaterial[];
  planeSelection: RoofPlaneSelection;
  show3DRoofs: boolean;

  /* toggles */
  setShow3DRoofs: (v: boolean) => void;
  setConfig: (patch: Partial<RoofSystemConfig>) => void;

  /* CRUD */
  createRoofFromFace: (faceId: string, wallTopZ: number) => string;
  removeRoof: (roofId: string) => void;
  removeRoofByFace: (faceId: string) => void;
  updateRoof: (
    roofId: string,
    updates: Partial<Omit<Roof, "id" | "faceId">>,
  ) => void;
  setEdgeOverhang: (roofId: string, side: RoofSide, value: number) => void;

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
  ) => void;

  /* selection */
  selectPlane: (planeId: string | null) => void;
  togglePlaneSelection: (planeId: string) => void;
  clearPlaneSelection: () => void;

  /* queries */
  getRoofByFace: (faceId: string) => Roof | undefined;
  getRoofByPlaneId: (planeId: string) => Roof | undefined;
  getSelectedRoofs: () => Roof[];
}

export const useRoofStore = create<RoofState>()(
  subscribeWithSelector((set, get) => ({
    roofs: {},
    config: ROOF_DEFAULTS.config,
    materials: ROOF_DEFAULTS.materials,
    planeSelection: { planeIds: [], primary: null },
    show3DRoofs: ROOF_DEFAULTS.show3DRoofs,

    /* ───── toggles ───── */

    setShow3DRoofs: (v) => set({ show3DRoofs: v }),

    setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),

    /* ───── CRUD ───── */

    createRoofFromFace: (faceId, wallTopZ) => {
      const { config, roofs } = get();
      const existing = Object.values(roofs).find((r) => r.faceId === faceId);
      if (existing) return existing.id;

      const id = generateId("roof");
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
      };
      set({ roofs: { ...roofs, [id]: roof } });
      return id;
    },

    removeRoof: (roofId) => {
      const { roofs, planeSelection } = get();
      const { [roofId]: _, ...rest } = roofs;
      const newPlaneIds = planeSelection.planeIds.filter(
        (pid) => !pid.startsWith(roofId),
      );
      set({
        roofs: rest,
        planeSelection: {
          planeIds: newPlaneIds,
          primary: planeSelection.primary?.startsWith(roofId)
            ? (newPlaneIds[0] ?? null)
            : planeSelection.primary,
        },
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
      if (c.edgeOverhangs) {
        c.edgeOverhangs = {
          front: clamp(
            c.edgeOverhangs.front,
            config.minOverhang,
            config.maxOverhang,
          ),
          back: clamp(
            c.edgeOverhangs.back,
            config.minOverhang,
            config.maxOverhang,
          ),
          left: clamp(
            c.edgeOverhangs.left,
            config.minOverhang,
            config.maxOverhang,
          ),
          right: clamp(
            c.edgeOverhangs.right,
            config.minOverhang,
            config.maxOverhang,
          ),
        };
      }

      set({ roofs: { ...roofs, [roofId]: { ...roof, ...c } } });
    },

    setEdgeOverhang: (roofId, side, value) => {
      const { roofs, config } = get();
      const roof = roofs[roofId];
      if (!roof) return;
      const clamped = clamp(value, config.minOverhang, config.maxOverhang);
      set({
        roofs: {
          ...roofs,
          [roofId]: {
            ...roof,
            edgeOverhangs: { ...roof.edgeOverhangs, [side]: clamped },
          },
        },
      });
    },

    /* ───── batch ───── */

    setAllRoofsType: (t) => {
      const { roofs, config } = get();
      const updated = { ...roofs };
      for (const id of Object.keys(updated))
        updated[id] = { ...updated[id], roofType: t };
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

    /* ───── sync ───── */

    syncWithFaces: (faceIds, wallTopForFace) => {
      const { roofs, config, planeSelection } = get();
      const faceSet = new Set(faceIds);
      const next: Record<string, Roof> = {};
      const seenFaces = new Set<string>();

      for (const roof of Object.values(roofs)) {
        if (faceSet.has(roof.faceId)) {
          next[roof.id] = { ...roof, baseZ: wallTopForFace(roof.faceId) };
          seenFaces.add(roof.faceId);
        }
      }

      for (const faceId of faceIds) {
        if (!seenFaces.has(faceId)) {
          const id = generateId("roof");
          next[id] = {
            id,
            faceId,
            roofType: config.defaultRoofType,
            pitchDeg: config.defaultPitchDeg,
            lowerPitchDeg: config.defaultLowerPitchDeg,
            edgeOverhangs: defaultEdgeOverhangs(config.defaultOverhang),
            ridgeOffset: 0,
            materialId: config.defaultMaterialId,
            baseZ: wallTopForFace(faceId),
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
      });
    },

    /* ───── selection ───── */

    selectPlane: (planeId) => {
      if (!planeId) {
        set({ planeSelection: { planeIds: [], primary: null } });
      } else {
        set({ planeSelection: { planeIds: [planeId], primary: planeId } });
      }
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

    /* ───── queries ───── */

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

/* ─── helpers ─── */

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
