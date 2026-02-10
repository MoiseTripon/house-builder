import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { generateId } from "@/shared/lib/ids";
import {
  WallSystemConfig,
  DEFAULT_WALL_SYSTEM_CONFIG,
  WallMaterial,
  DEFAULT_WALL_MATERIALS,
} from "@/domain/structure/wallSystem";

export interface Wall {
  id: string;
  edgeId: string;
  height: number;
  thickness: number;
  materialId: string;
  baseZ: number;
}

export interface WallSelection {
  wallIds: string[];
  primary: string | null;
}

interface WallsState {
  walls: Record<string, Wall>;
  config: WallSystemConfig;
  materials: WallMaterial[];
  selection: WallSelection;
  show3DWalls: boolean;

  setShow3DWalls: (show: boolean) => void;
  setConfig: (config: Partial<WallSystemConfig>) => void;

  createWallFromEdge: (edgeId: string) => string;
  removeWall: (wallId: string) => void;
  removeWallByEdge: (edgeId: string) => void;
  updateWall: (
    wallId: string,
    updates: Partial<Omit<Wall, "id" | "edgeId">>,
  ) => void;
  setWallHeight: (wallId: string, height: number) => void;
  setAllWallsHeight: (height: number) => void;
  setWallThickness: (wallId: string, thickness: number) => void;
  setAllWallsThickness: (thickness: number) => void;
  setAllWallsMaterial: (materialId: string) => void;
  setAllWallsBaseZ: (baseZ: number) => void;

  syncWithEdges: (edgeIds: string[]) => void;

  selectWall: (wallId: string | null) => void;
  toggleWallSelection: (wallId: string) => void;
  clearWallSelection: () => void;
  selectWallByEdge: (edgeId: string) => void;

  getWallByEdge: (edgeId: string) => Wall | undefined;
  getSelectedWalls: () => Wall[];
}

export const useWallsStore = create<WallsState>()(
  subscribeWithSelector((set, get) => ({
    walls: {},
    config: DEFAULT_WALL_SYSTEM_CONFIG,
    materials: DEFAULT_WALL_MATERIALS,
    selection: { wallIds: [], primary: null },
    show3DWalls: true,

    setShow3DWalls: (show) => set({ show3DWalls: show }),

    setConfig: (partial) =>
      set((s) => ({ config: { ...s.config, ...partial } })),

    createWallFromEdge: (edgeId) => {
      const { config, walls } = get();
      const existing = Object.values(walls).find((w) => w.edgeId === edgeId);
      if (existing) return existing.id;

      const id = generateId("wall");
      const wall: Wall = {
        id,
        edgeId,
        height: config.defaultHeight,
        thickness: config.defaultThickness,
        materialId: config.defaultMaterialId,
        baseZ: 0,
      };

      set({ walls: { ...walls, [id]: wall } });
      return id;
    },

    removeWall: (wallId) => {
      const { walls, selection } = get();
      const { [wallId]: removed, ...remaining } = walls;

      if (!removed) return;

      const newSelection = {
        wallIds: selection.wallIds.filter((id) => id !== wallId),
        primary:
          selection.primary === wallId
            ? (selection.wallIds.filter((id) => id !== wallId)[0] ?? null)
            : selection.primary,
      };

      set({ walls: remaining, selection: newSelection });
    },

    removeWallByEdge: (edgeId) => {
      const { walls, selection } = get();
      const wallToRemove = Object.values(walls).find(
        (w) => w.edgeId === edgeId,
      );

      if (!wallToRemove) return;

      const { [wallToRemove.id]: removed, ...remaining } = walls;

      const newSelection = {
        wallIds: selection.wallIds.filter((id) => id !== wallToRemove.id),
        primary:
          selection.primary === wallToRemove.id
            ? (selection.wallIds.filter((id) => id !== wallToRemove.id)[0] ??
              null)
            : selection.primary,
      };

      set({ walls: remaining, selection: newSelection });
    },

    updateWall: (wallId, updates) => {
      const { walls, config } = get();
      const wall = walls[wallId];
      if (!wall) return;

      const clampedUpdates = { ...updates };
      if (updates.height !== undefined) {
        clampedUpdates.height = Math.max(
          config.minHeight,
          Math.min(config.maxHeight, updates.height),
        );
      }
      if (updates.thickness !== undefined) {
        clampedUpdates.thickness = Math.max(
          config.minThickness,
          Math.min(config.maxThickness, updates.thickness),
        );
      }
      if (updates.baseZ !== undefined) {
        clampedUpdates.baseZ = Math.max(0, Math.min(50000, updates.baseZ));
      }

      set({
        walls: {
          ...walls,
          [wallId]: { ...wall, ...clampedUpdates },
        },
      });
    },

    setWallHeight: (wallId, height) => {
      get().updateWall(wallId, { height });
    },

    setAllWallsHeight: (height) => {
      const { walls, config } = get();
      const clampedHeight = Math.max(
        config.minHeight,
        Math.min(config.maxHeight, height),
      );

      const updated: Record<string, Wall> = {};
      for (const [id, wall] of Object.entries(walls)) {
        updated[id] = { ...wall, height: clampedHeight };
      }

      set({ walls: updated });
    },

    setWallThickness: (wallId, thickness) => {
      get().updateWall(wallId, { thickness });
    },

    setAllWallsThickness: (thickness) => {
      const { walls, config } = get();
      const clampedThickness = Math.max(
        config.minThickness,
        Math.min(config.maxThickness, thickness),
      );

      const updated: Record<string, Wall> = {};
      for (const [id, wall] of Object.entries(walls)) {
        updated[id] = { ...wall, thickness: clampedThickness };
      }

      set({ walls: updated });
    },

    setAllWallsMaterial: (materialId) => {
      const { walls } = get();

      const updated: Record<string, Wall> = {};
      for (const [id, wall] of Object.entries(walls)) {
        updated[id] = { ...wall, materialId };
      }

      set({ walls: updated });
    },

    setAllWallsBaseZ: (baseZ) => {
      const { walls } = get();
      const clampedBaseZ = Math.max(0, Math.min(50000, baseZ));

      const updated: Record<string, Wall> = {};
      for (const [id, wall] of Object.entries(walls)) {
        updated[id] = { ...wall, baseZ: clampedBaseZ };
      }

      set({ walls: updated });
    },

    syncWithEdges: (edgeIds) => {
      const { walls, config } = get();
      const edgeIdSet = new Set(edgeIds);

      const newWalls: Record<string, Wall> = {};
      const existingEdgeIds = new Set<string>();

      for (const wall of Object.values(walls)) {
        if (edgeIdSet.has(wall.edgeId)) {
          newWalls[wall.id] = wall;
          existingEdgeIds.add(wall.edgeId);
        }
      }

      for (const edgeId of edgeIds) {
        if (!existingEdgeIds.has(edgeId)) {
          const id = generateId("wall");
          newWalls[id] = {
            id,
            edgeId,
            height: config.defaultHeight,
            thickness: config.defaultThickness,
            materialId: config.defaultMaterialId,
            baseZ: 0,
          };
        }
      }

      const { selection } = get();
      const newWallIds = new Set(Object.keys(newWalls));
      const newSelectedIds = selection.wallIds.filter((id) =>
        newWallIds.has(id),
      );
      const newPrimary =
        selection.primary && newWallIds.has(selection.primary)
          ? selection.primary
          : (newSelectedIds[0] ?? null);

      set({
        walls: newWalls,
        selection: {
          wallIds: newSelectedIds,
          primary: newPrimary,
        },
      });
    },

    selectWall: (wallId) => {
      if (wallId === null) {
        set({ selection: { wallIds: [], primary: null } });
      } else {
        set({ selection: { wallIds: [wallId], primary: wallId } });
      }
    },

    toggleWallSelection: (wallId) => {
      const { selection } = get();
      const isSelected = selection.wallIds.includes(wallId);

      if (isSelected) {
        const newIds = selection.wallIds.filter((id) => id !== wallId);
        set({
          selection: {
            wallIds: newIds,
            primary:
              selection.primary === wallId
                ? (newIds[newIds.length - 1] ?? null)
                : selection.primary,
          },
        });
      } else {
        set({
          selection: {
            wallIds: [...selection.wallIds, wallId],
            primary: wallId,
          },
        });
      }
    },

    clearWallSelection: () => {
      set({ selection: { wallIds: [], primary: null } });
    },

    selectWallByEdge: (edgeId) => {
      const wall = get().getWallByEdge(edgeId);
      if (wall) get().selectWall(wall.id);
    },

    getWallByEdge: (edgeId) => {
      return Object.values(get().walls).find((w) => w.edgeId === edgeId);
    },

    getSelectedWalls: () => {
      const { walls, selection } = get();
      return selection.wallIds
        .map((id) => walls[id])
        .filter((w): w is Wall => w !== undefined);
    },
  })),
);
