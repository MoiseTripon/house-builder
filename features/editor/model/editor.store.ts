import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { Plan, createEmptyPlan } from "@/domain/plan/types";
import { Selection, emptySelection, SelectionType } from "./selection.types";
import { Command } from "../commands/command.types";
import { applyCommand } from "../commands/apply";
import { SnapConfig, DEFAULT_SNAP_CONFIG } from "@/domain/geometry/snap";
import { UnitConfig } from "@/domain/units/units";

export type EditorMode = "select" | "draw" | "split";
export type AdvancedMode = "simple" | "advanced";

export interface DrawState {
  vertexIds: string[]; // vertices placed so far
  previewPosition: {
    // current cursor snapped position
    x: number;
    y: number;
  } | null;
  isClosing: boolean; // true when hovering first vertex (about to close polygon)
}

export interface DragState {
  vertexId: string;
  startPosition: { x: number; y: number };
  currentPosition: { x: number; y: number };
}

interface HistoryEntry {
  plan: Plan;
  command: Command;
}

interface EditorState {
  // Plan
  plan: Plan;

  // Mode
  mode: EditorMode;
  advancedMode: AdvancedMode;

  // Selection
  selection: Selection;

  // Drawing state
  drawState: DrawState;

  // Drag state
  dragState: DragState | null;

  // Snap
  snapConfig: SnapConfig;

  // Units
  unitConfig: UnitConfig;

  // History
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];

  // Camera / viewport
  camera: {
    x: number;
    y: number;
    zoom: number;
  };

  // Hover
  hoveredItem: { type: SelectionType; id: string } | null;

  // Guide lines from snap
  guideLines: {
    from: { x: number; y: number };
    to: { x: number; y: number };
  }[];

  // Actions
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

  // Direct plan manipulation for drag operations (no history entry)
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

      set({
        plan: newPlan,
        undoStack: newUndoStack,
        redoStack: [], // clear redo on new action
      });
    },

    undo: () => {
      const { undoStack, plan, redoStack } = get();
      if (undoStack.length === 0) return;

      const lastEntry = undoStack[undoStack.length - 1];
      const newUndoStack = undoStack.slice(0, -1);
      const newRedoEntry: HistoryEntry = { plan, command: lastEntry.command };

      set({
        plan: lastEntry.plan,
        undoStack: newUndoStack,
        redoStack: [...redoStack, newRedoEntry],
      });
    },

    redo: () => {
      const { redoStack, plan, undoStack } = get();
      if (redoStack.length === 0) return;

      const lastEntry = redoStack[redoStack.length - 1];
      const newRedoStack = redoStack.slice(0, -1);
      const restoredPlan = applyCommand(plan, lastEntry.command);

      set({
        plan: restoredPlan,
        undoStack: [...undoStack, { plan, command: lastEntry.command }],
        redoStack: newRedoStack,
      });
    },

    canUndo: () => get().undoStack.length > 0,
    canRedo: () => get().redoStack.length > 0,

    setMode: (mode) => {
      set({
        mode,
        drawState: INITIAL_DRAW_STATE,
        dragState: null,
      });
    },

    setAdvancedMode: (advancedMode) => set({ advancedMode }),

    setSelection: (selection) => set({ selection }),
    clearSelection: () => set({ selection: emptySelection() }),

    setDrawState: (partial) =>
      set((state) => ({
        drawState: { ...state.drawState, ...partial },
      })),

    resetDrawState: () => set({ drawState: INITIAL_DRAW_STATE }),

    setDragState: (dragState) => set({ dragState }),

    setSnapConfig: (partial) =>
      set((state) => ({
        snapConfig: { ...state.snapConfig, ...partial },
      })),

    setUnitConfig: (partial) =>
      set((state) => ({
        unitConfig: { ...state.unitConfig, ...partial },
      })),

    setCamera: (partial) =>
      set((state) => ({
        camera: { ...state.camera, ...partial },
      })),

    setHoveredItem: (hoveredItem) => set({ hoveredItem }),
    setGuideLines: (guideLines) => set({ guideLines }),

    updatePlanDirect: (plan) => set({ plan }),
  })),
);
