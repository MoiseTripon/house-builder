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

interface EditorState {
  plan: Plan;
  mode: EditorMode;
  advancedMode: AdvancedMode;
  selection: Selection;
  drawState: DrawState;
  dragState: DragState | null;
  snapConfig: SnapConfig;
  unitConfig: UnitConfig;
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  camera: { x: number; y: number; zoom: number };
  hoveredItem: { type: SelectionType; id: string } | null;
  guideLines: { from: Vec2; to: Vec2 }[];

  executeCommand: (command: Command) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  setMode: (mode: EditorMode) => void;
  setAdvancedMode: (mode: AdvancedMode) => void;

  setSelection: (selection: Selection) => void;
  clearSelection: () => void;

  setDrawState: (state: Partial<DrawState>) => void;
  resetDrawState: () => void;

  setDragState: (state: DragState | null) => void;

  setSnapConfig: (config: Partial<SnapConfig>) => void;
  setUnitConfig: (config: Partial<UnitConfig>) => void;

  setCamera: (camera: Partial<EditorState["camera"]>) => void;
  setHoveredItem: (item: EditorState["hoveredItem"]) => void;
  setGuideLines: (lines: EditorState["guideLines"]) => void;

  updatePlanDirect: (plan: Plan) => void;
}

const INITIAL_DRAW_STATE: DrawState = {
  vertexIds: [],
  previewPosition: null,
  isClosing: false,
};

const MAX_HISTORY = 100;

export const useEditorStore = create<EditorState>()(
  subscribeWithSelector((set, get) => ({
    plan: createEmptyPlan(),
    mode: "select",
    advancedMode: "simple",
    selection: emptySelection(),
    drawState: INITIAL_DRAW_STATE,
    dragState: null,
    snapConfig: DEFAULT_SNAP_CONFIG,
    unitConfig: { system: "metric", precision: 1 },
    undoStack: [],
    redoStack: [],
    camera: { x: 0, y: 0, zoom: 1 },
    hoveredItem: null,
    guideLines: [],

    executeCommand: (command: Command) => {
      const { plan, undoStack } = get();
      const newPlan = applyCommand(plan, command);
      const newEntry: HistoryEntry = { plan, command };
      const newUndoStack = [...undoStack, newEntry].slice(-MAX_HISTORY);
      set({ plan: newPlan, undoStack: newUndoStack, redoStack: [] });
    },

    undo: () => {
      const { undoStack, plan, redoStack } = get();
      if (undoStack.length === 0) return;
      const lastEntry = undoStack[undoStack.length - 1];
      set({
        plan: lastEntry.plan,
        undoStack: undoStack.slice(0, -1),
        redoStack: [...redoStack, { plan, command: lastEntry.command }],
      });
    },

    redo: () => {
      const { redoStack, plan, undoStack } = get();
      if (redoStack.length === 0) return;
      const lastEntry = redoStack[redoStack.length - 1];
      const restoredPlan = applyCommand(plan, lastEntry.command);
      set({
        plan: restoredPlan,
        undoStack: [...undoStack, { plan, command: lastEntry.command }],
        redoStack: redoStack.slice(0, -1),
      });
    },

    canUndo: () => get().undoStack.length > 0,
    canRedo: () => get().redoStack.length > 0,

    setMode: (mode) =>
      set({ mode, drawState: INITIAL_DRAW_STATE, dragState: null }),
    setAdvancedMode: (advancedMode) => set({ advancedMode }),

    setSelection: (selection) => set({ selection }),
    clearSelection: () => set({ selection: emptySelection() }),

    setDrawState: (partial) =>
      set((state) => ({ drawState: { ...state.drawState, ...partial } })),
    resetDrawState: () => set({ drawState: INITIAL_DRAW_STATE }),

    setDragState: (dragState) => set({ dragState }),

    setSnapConfig: (partial) =>
      set((state) => ({ snapConfig: { ...state.snapConfig, ...partial } })),
    setUnitConfig: (partial) =>
      set((state) => ({ unitConfig: { ...state.unitConfig, ...partial } })),

    setCamera: (partial) =>
      set((state) => ({ camera: { ...state.camera, ...partial } })),
    setHoveredItem: (hoveredItem) => set({ hoveredItem }),
    setGuideLines: (guideLines) => set({ guideLines }),

    updatePlanDirect: (plan) => set({ plan }),
  })),
);
