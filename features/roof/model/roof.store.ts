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
  overhang: number; // mm
  materialId: string;
  baseZ: number; // z where the roof starts (= wall-top height)
}

export interface RoofSelection {
  roofIds: string[];
  primary: string | null;
}

interface RoofState {
  roofs: Record<string, Roof>;
  config: RoofSystemConfig;
  materials: RoofMaterial[];
  selection: RoofSelection;
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

  /* selection */
  selectRoof: (id: string | null) => void;
  toggleRoofSelection: (id: string) => void;
  clearRoofSelection: () => void;
  selectRoofByFace: (faceId: string) => void;

  /* queries */
  getRoofByFace: (faceId: string) => Roof | undefined;
  getSelectedRoofs: () => Roof[];
}

export const useRoofStore = create<RoofState>()(
  subscribeWithSelector((set, get) => ({
    roofs: {},
    config: ROOF_DEFAULTS.config,
    materials: ROOF_DEFAULTS.materials,
    selection: { roofIds: [], primary: null },
    show3DRoofs: ROOF_DEFAULTS.show3DRoofs,

    /* ---------- toggles ---------- */

    setShow3DRoofs: (v) => set({ show3DRoofs: v }),

    setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),

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
      const { roofs, selection } = get();
      const { [roofId]: _, ...rest } = roofs;

      const newIds = selection.roofIds.filter((id) => id !== roofId);
      set({
        roofs: rest,
        selection: {
          roofIds: newIds,
          primary:
            selection.primary === roofId
              ? (newIds[0] ?? null)
              : selection.primary,
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
      const updated = { ...get().roofs };
      for (const id of Object.keys(updated))
        updated[id] = { ...updated[id], roofType: t };
      set({ roofs: updated });
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
      set({ roofs: updated });
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
      set({ roofs: updated });
    },

    setAllRoofsMaterial: (materialId) => {
      const updated = { ...get().roofs };
      for (const id of Object.keys(updated))
        updated[id] = { ...updated[id], materialId };
      set({ roofs: updated });
    },

    /* ---------- sync ---------- */

    syncWithFaces: (faceIds, wallTopForFace) => {
      const { roofs, config, selection } = get();
      const faceSet = new Set(faceIds);

      const next: Record<string, Roof> = {};
      const seenFaces = new Set<string>();

      // Keep existing roofs whose face still exists
      for (const roof of Object.values(roofs)) {
        if (faceSet.has(roof.faceId)) {
          // Update baseZ in case wall heights changed
          next[roof.id] = {
            ...roof,
            baseZ: wallTopForFace(roof.faceId),
          };
          seenFaces.add(roof.faceId);
        }
      }

      // Create roofs for new faces
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

      const nextIds = new Set(Object.keys(next));
      const newSel = selection.roofIds.filter((id) => nextIds.has(id));

      set({
        roofs: next,
        selection: {
          roofIds: newSel,
          primary:
            selection.primary && nextIds.has(selection.primary)
              ? selection.primary
              : (newSel[0] ?? null),
        },
      });
    },

    /* ---------- selection ---------- */

    selectRoof: (id) => {
      if (!id) {
        set({ selection: { roofIds: [], primary: null } });
      } else {
        set({ selection: { roofIds: [id], primary: id } });
      }
    },

    toggleRoofSelection: (id) => {
      const { selection } = get();
      const has = selection.roofIds.includes(id);
      if (has) {
        const newIds = selection.roofIds.filter((x) => x !== id);
        set({
          selection: {
            roofIds: newIds,
            primary:
              selection.primary === id
                ? (newIds[0] ?? null)
                : selection.primary,
          },
        });
      } else {
        set({
          selection: {
            roofIds: [...selection.roofIds, id],
            primary: id,
          },
        });
      }
    },

    clearRoofSelection: () =>
      set({ selection: { roofIds: [], primary: null } }),

    selectRoofByFace: (faceId) => {
      const roof = get().getRoofByFace(faceId);
      if (roof) get().selectRoof(roof.id);
    },

    /* ---------- queries ---------- */

    getRoofByFace: (faceId) =>
      Object.values(get().roofs).find((r) => r.faceId === faceId),

    getSelectedRoofs: () => {
      const { roofs, selection } = get();
      return selection.roofIds
        .map((id) => roofs[id])
        .filter((r): r is Roof => r !== undefined);
    },
  })),
);
