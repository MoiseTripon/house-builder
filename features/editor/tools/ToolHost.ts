import { EditorMode } from "../model/editor.store";

export interface ToolEvent {
  type: "pointerdown" | "pointermove" | "pointerup" | "keydown";
  planPosition: { x: number; y: number };
  screenPosition: { x: number; y: number };
  shiftKey: boolean;
  ctrlKey: boolean;
  button?: number;
  key?: string;
}

export interface Tool {
  name: EditorMode;
  onPointerDown?: (event: ToolEvent) => void;
  onPointerMove?: (event: ToolEvent) => void;
  onPointerUp?: (event: ToolEvent) => void;
  onKeyDown?: (event: ToolEvent) => void;
  onActivate?: () => void;
  onDeactivate?: () => void;
}
