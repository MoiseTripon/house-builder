import { useEffect, useCallback } from "react";
import { useEditorStore } from "../model/editor.store";
import { getSelectedIds } from "../model/selection.types";
import { polygonCentroid } from "@/domain/geometry/polygon";
import { Vec2 } from "@/domain/geometry/vec2";

export function useEditorShortcuts() {
  const {
    undo,
    redo,
    mode,
    setMode,
    viewMode,
    setViewMode,
    clearSelection,
    selection,
    executeCommand,
    resetDrawState,
    plan,
  } = useEditorStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;

      // Undo/Redo
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        redo();
        return;
      }

      // View mode shortcuts: 1 = Plan, 2 = 3D
      if (e.key === "1" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setViewMode("plan");
        return;
      }
      if (e.key === "2" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setViewMode("3d");
        return;
      }

      // Escape
      if (e.key === "Escape") {
        if (mode === "draw") {
          resetDrawState();
          setMode("select");
        } else clearSelection();
        return;
      }

      // Delete - only in plan view
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        viewMode === "plan"
      ) {
        if (selection.items.length === 0) return;

        const faceIds = getSelectedIds(selection, "face");
        const vertexIds = getSelectedIds(selection, "vertex");
        const edgeIds = getSelectedIds(selection, "edge");

        const cmds: any[] = [];
        for (const fid of faceIds)
          cmds.push({ type: "DELETE_FACE", faceId: fid });
        for (const eid of edgeIds)
          cmds.push({ type: "REMOVE_EDGE", edgeId: eid });
        for (const vid of vertexIds)
          cmds.push({ type: "REMOVE_VERTEX", vertexId: vid });

        if (cmds.length > 0)
          executeCommand({
            type: "BATCH",
            label: "Delete selection",
            commands: cmds,
          });
        clearSelection();
        return;
      }

      // Scale face: [ shrink ] grow - only in plan view
      if ((e.key === "[" || e.key === "]") && viewMode === "plan") {
        const faceIds = getSelectedIds(selection, "face");
        if (faceIds.length !== 1) return;
        const face = plan.faces[faceIds[0]];
        if (!face) return;

        const positions = face.vertexIds
          .map((vid) => plan.vertices[vid]?.position)
          .filter(Boolean) as Vec2[];
        if (positions.length < 3) return;

        const center = polygonCentroid(positions);
        const factor = e.key === "]" ? 1.1 : 0.9;

        executeCommand({
          type: "SCALE_FACE",
          faceId: face.id,
          scaleX: factor,
          scaleY: factor,
          center,
        });
        return;
      }

      // Mode shortcuts - only in plan view
      if (viewMode === "plan") {
        if (e.key === "v" || e.key === "V") {
          if (mode === "draw") resetDrawState();
          setMode("select");
          return;
        }
        if (e.key === "d" || e.key === "D") {
          setMode("draw");
          return;
        }
      }
    },
    [
      undo,
      redo,
      mode,
      setMode,
      viewMode,
      setViewMode,
      clearSelection,
      selection,
      executeCommand,
      resetDrawState,
      plan,
    ],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
