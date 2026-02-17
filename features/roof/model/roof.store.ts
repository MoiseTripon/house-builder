import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { generateId } from "@/shared/lib/ids";
import {
  RoofType,
  RoofSystemConfig,
  RoofMaterial,
} from "@/domain/structure/roofSystem";
import { ROOF_DEFAULTS } from "./roof.defaults";

export interface Roof {
  id: string;
  faceId: string;
  roofType: RoofType;
  pitchDeg: number;
  overhang: number;
  materialId: string;
  baseZ: number;
}

export interface RoofPlaneSelection {
  /** Currently selected plane ids (e.g. "roof_xxx_front") */
  planeIds: string[];
  primary: string | null;
}

interface RoofState {
  roofs: Record<string, Roof>;
  config: RoofSystemConfig;
  materials: RoofMaterial[];
  planeSelection: RoofPlaneSelection;
  show3DRoofs: boolean;

  /* global toggles */
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

  /* batch */
  setAllRoofsType: (t: RoofType) => void;
  setAllRoofsPitch: (deg: number) => void;
  setAllRoofsOverhang: (mm: number) => void;
  setAllRoofsMaterial: (id: string) => void;

  /* sync with plan faces */
  syncWithFaces: (
    faceIds: string[],
    wallTopForFace: (faceId: string) => number,
  ) => void;

  /* plane selection */
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

    /* ---------- toggles ---------- */

    setShow3DRoofs: (v) => set({ show3DRoofs: v }),

    setConfig: (patch) =>
      set((s) => ({
        config: { ...s.config, ...patch },
      })),

    /* ---------- CRUD ---------- */

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
        overhang: config.defaultOverhang,
        materialId: config.defaultMaterialId,
        baseZ: wallTopZ,
      };

      set({ roofs: { ...roofs, [id]: roof } });
      return id;
    },

    removeRoof: (roofId) => {
      const { roofs, planeSelection } = get();
      const { [roofId]: _, ...rest } = roofs;

      // Clean up plane selection — remove any planes belonging to this roof
      const newPlaneIds = planeSelection.planeIds.filter(
        (pid) => !pid.startsWith(roofId),
      );
      set({
        roofs: rest,
        planeSelection: {
          planeIds: newPlaneIds,
          primary:
            planeSelection.primary && planeSelection.primary.startsWith(roofId)
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

      const clamped = { ...updates };
      if (clamped.pitchDeg !== undefined)
        clamped.pitchDeg = Math.max(
          config.minPitchDeg,
          Math.min(config.maxPitchDeg, clamped.pitchDeg),
        );
      if (clamped.overhang !== undefined)
        clamped.overhang = Math.max(
          config.minOverhang,
          Math.min(config.maxOverhang, clamped.overhang),
        );

      set({ roofs: { ...roofs, [roofId]: { ...roof, ...clamped } } });
    },

    /* ---------- batch ---------- */

    setAllRoofsType: (t) => {
      const { roofs, config } = get();
      const updated = { ...roofs };
      for (const id of Object.keys(updated))
        updated[id] = { ...updated[id], roofType: t };
      set({ roofs: updated, config: { ...config, defaultRoofType: t } });
    },

    setAllRoofsPitch: (deg) => {
      const { config } = get();
      const clamped = Math.max(
        config.minPitchDeg,
        Math.min(config.maxPitchDeg, deg),
      );
      const updated = { ...get().roofs };
      for (const id of Object.keys(updated))
        updated[id] = { ...updated[id], pitchDeg: clamped };
      set({ roofs: updated, config: { ...config, defaultPitchDeg: clamped } });
    },

    setAllRoofsOverhang: (mm) => {
      const { config } = get();
      const clamped = Math.max(
        config.minOverhang,
        Math.min(config.maxOverhang, mm),
      );
      const updated = { ...get().roofs };
      for (const id of Object.keys(updated))
        updated[id] = { ...updated[id], overhang: clamped };
      set({
        roofs: updated,
        config: { ...config, defaultOverhang: clamped },
      });
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

    /* ---------- sync ---------- */

    syncWithFaces: (faceIds, wallTopForFace) => {
      const { roofs, config, planeSelection } = get();
      const faceSet = new Set(faceIds);

      const next: Record<string, Roof> = {};
      const seenFaces = new Set<string>();

      for (const roof of Object.values(roofs)) {
        if (faceSet.has(roof.faceId)) {
          next[roof.id] = {
            ...roof,
            baseZ: wallTopForFace(roof.faceId),
          };
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
            overhang: config.defaultOverhang,
            materialId: config.defaultMaterialId,
            baseZ: wallTopForFace(faceId),
          };
        }
      }

      // Prune plane selection for removed roofs
      const nextRoofIds = new Set(Object.keys(next));
      const validPlaneIds = planeSelection.planeIds.filter((pid) => {
        // planeId format: "roofId_suffix" - extract roofId
        const roofId = roofIdFromPlaneId(pid, nextRoofIds);
        return roofId !== null;
      });

      set({
        roofs: next,
        planeSelection: {
          planeIds: validPlaneIds,
          primary:
            planeSelection.primary &&
            roofIdFromPlaneId(planeSelection.primary, nextRoofIds) !== null
              ? planeSelection.primary
              : (validPlaneIds[0] ?? null),
        },
      });
    },

    /* ---------- plane selection ---------- */

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
        const newIds = planeSelection.planeIds.filter((x) => x !== planeId);
        set({
          planeSelection: {
            planeIds: newIds,
            primary:
              planeSelection.primary === planeId
                ? (newIds[0] ?? null)
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

    /* ---------- queries ---------- */

    getRoofByFace: (faceId) =>
      Object.values(get().roofs).find((r) => r.faceId === faceId),

    getRoofByPlaneId: (planeId) => {
      const roofIds = new Set(Object.keys(get().roofs));
      const roofId = roofIdFromPlaneId(planeId, roofIds);
      return roofId ? get().roofs[roofId] : undefined;
    },

    getSelectedRoofs: () => {
      const { roofs, planeSelection } = get();
      const roofIds = new Set<string>();
      const allRoofIds = new Set(Object.keys(roofs));

      for (const pid of planeSelection.planeIds) {
        const rid = roofIdFromPlaneId(pid, allRoofIds);
        if (rid) roofIds.add(rid);
      }

      return [...roofIds]
        .map((id) => roofs[id])
        .filter((r): r is Roof => r !== undefined);
    },
  })),
);

/**
 * Given a planeId like "roof_abc123_front", extract the roofId "roof_abc123".
 * We check against known roofIds to handle ids that contain underscores.
 */
function roofIdFromPlaneId(
  planeId: string,
  knownRoofIds: Set<string>,
): string | null {
  for (const rid of knownRoofIds) {
    if (planeId.startsWith(rid + "_")) return rid;
  }
  return null;
}
