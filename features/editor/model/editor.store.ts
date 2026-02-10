import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { Plan, createEmptyPlan } from "@/domain/plan/types";
import { Selection, emptySelection, SelectionType } from "./selection.types";
import { Command } from "../commands/command.types";
import { applyCommand } from "../commands/apply";
import { SnapConfig, DEFAULT_SNAP_CONFIG } from "@/domain/geometry/snap";
import { UnitConfig } from "@/domain/units/units";
import { Vec2 } from "@/domain/geometry/vec2";

export type EditorMode = "select" | "draw";
export type AdvancedMode = "simple" | "advanced";
export type ViewMode = "plan" | "3d";

export interface DrawState {
  vertexIds: string[];
  previewPosition: Vec2 | null;
  isClosing: boolean;
}

export interface DragState {
  type: "vertex" | "edge" | "face";
  entityId: string;
  vertexIds: string[];
  startPositions: Record<string, Vec2>;
  anchorVertexId: string;
  dragOrigin: Vec2;
}

interface HistoryEntry {
  plan: Plan;
  command: Command;
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  // For 3D view
  polarAngle: number;
  azimuthAngle: number;
  distance: number;
}

interface EditorState {
  plan: Plan;
  mode: EditorMode;
  advancedMode: AdvancedMode;
  viewMode: ViewMode;
  selection: Selection;
  drawState: DrawState;
  dragState: DragState | null;
  snapConfig: SnapConfig;
  unitConfig: UnitConfig;
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  camera: CameraState;
  hoveredItem: { type: SelectionType; id: string } | null;
  guideLines: { from: Vec2; to: Vec2 }[];

  executeCommand: (command: Command) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  setMode: (mode: EditorMode) => void;
  setAdvancedMode: (mode: AdvancedMode) => void;
  setViewMode: (viewMode: ViewMode) => void;
  setSelection: (selection: Selection) => void;
  clearSelection: () => void;
  setDrawState: (state: Partial<DrawState>) => void;
  resetDrawState: () => void;
  setDragState: (state: DragState | null) => void;
  setSnapConfig: (config: Partial<SnapConfig>) => void;
  setUnitConfig: (config: Partial<UnitConfig>) => void;
  setCamera: (camera: Partial<CameraState>) => void;
  resetCameraForPlanView: () => void;
  setHoveredItem: (item: EditorState["hoveredItem"]) => void;
  setGuideLines: (lines: EditorState["guideLines"]) => void;
  updatePlanDirect: (plan: Plan) => void;
}

const INITIAL_DRAW_STATE: DrawState = {
  vertexIds: [],
  previewPosition: null,
  isClosing: false,
};

const INITIAL_CAMERA: CameraState = {
  x: 0,
  y: 0,
  zoom: 1,
  polarAngle: Math.PI / 4,
  azimuthAngle: Math.PI / 4,
  distance: 15000,
};

const MAX_HISTORY = 100;

export const useEditorStore = create<EditorState>()(
  subscribeWithSelector((set, get) => ({
    plan: createEmptyPlan(),
    mode: "select",
    advancedMode: "simple",
    viewMode: "plan",
    selection: emptySelection(),
    drawState: INITIAL_DRAW_STATE,
    dragState: null,
    snapConfig: DEFAULT_SNAP_CONFIG,
    unitConfig: { system: "metric", precision: 1 },
    undoStack: [],
    redoStack: [],
    camera: INITIAL_CAMERA,
    hoveredItem: null,
    guideLines: [],

    executeCommand: (command) => {
      const { plan, undoStack } = get();
      const newPlan = applyCommand(plan, command);
      set({
        plan: newPlan,
        undoStack: [...undoStack, { plan, command }].slice(-MAX_HISTORY),
        redoStack: [],
      });
    },

    undo: () => {
      const { undoStack, plan, redoStack } = get();
      if (undoStack.length === 0) return;
      const last = undoStack[undoStack.length - 1];
      set({
        plan: last.plan,
        undoStack: undoStack.slice(0, -1),
        redoStack: [...redoStack, { plan, command: last.command }],
      });
    },

    redo: () => {
      const { redoStack, plan, undoStack } = get();
      if (redoStack.length === 0) return;
      const last = redoStack[redoStack.length - 1];
      set({
        plan: applyCommand(plan, last.command),
        undoStack: [...undoStack, { plan, command: last.command }],
        redoStack: redoStack.slice(0, -1),
      });
    },

    canUndo: () => get().undoStack.length > 0,
    canRedo: () => get().redoStack.length > 0,

    setMode: (mode) =>
      set({ mode, drawState: INITIAL_DRAW_STATE, dragState: null }),
    setAdvancedMode: (advancedMode) => set({ advancedMode }),

    setViewMode: (viewMode) => {
      const current = get();
      if (viewMode === "plan") {
        // When switching to plan view, reset camera and clear 3D-specific state
        set({
          viewMode,
          mode: "select",
          drawState: INITIAL_DRAW_STATE,
          dragState: null,
          hoveredItem: null,
        });
      } else {
        // When switching to 3D, exit draw mode and clear geometry selection
        set({
          viewMode,
          mode: "select",
          selection: emptySelection(),
          drawState: INITIAL_DRAW_STATE,
          dragState: null,
          hoveredItem: null,
        });
      }
    },

    setSelection: (selection) => set({ selection }),
    clearSelection: () => set({ selection: emptySelection() }),
    setDrawState: (partial) =>
      set((s) => ({ drawState: { ...s.drawState, ...partial } })),
    resetDrawState: () => set({ drawState: INITIAL_DRAW_STATE }),
    setDragState: (dragState) => set({ dragState }),
    setSnapConfig: (partial) =>
      set((s) => ({ snapConfig: { ...s.snapConfig, ...partial } })),
    setUnitConfig: (partial) =>
      set((s) => ({ unitConfig: { ...s.unitConfig, ...partial } })),
    setCamera: (partial) =>
      set((s) => ({ camera: { ...s.camera, ...partial } })),

    resetCameraForPlanView: () => {
      const current = get();
      set({
        camera: {
          ...current.camera,
          // Keep x, y, zoom but ensure proper orientation will be applied
        },
      });
    },

    setHoveredItem: (hoveredItem) => set({ hoveredItem }),
    setGuideLines: (guideLines) => set({ guideLines }),
    updatePlanDirect: (plan) => set({ plan }),
  })),
);
