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
      ) {
        return;
      }

      // Undo / Redo
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

      // Escape
      if (e.key === "Escape") {
        if (mode === "draw") {
          resetDrawState();
          setMode("select");
        } else {
          clearSelection();
        }
        return;
      }

      // Delete
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selection.items.length === 0) return;

        const faceIds = getSelectedIds(selection, "face");
        const vertexIds = getSelectedIds(selection, "vertex");
        const edgeIds = getSelectedIds(selection, "edge");

        const cmds: any[] = [];

        // Delete faces first (removes their exclusive edges/vertices)
        for (const fid of faceIds) {
          cmds.push({ type: "DELETE_FACE", faceId: fid });
        }
        // Then edges
        for (const eid of edgeIds) {
          cmds.push({ type: "REMOVE_EDGE", edgeId: eid });
        }
        // Then vertices
        for (const vid of vertexIds) {
          cmds.push({ type: "REMOVE_VERTEX", vertexId: vid });
        }

        if (cmds.length > 0) {
          executeCommand({
            type: "BATCH",
            label: "Delete selection",
            commands: cmds,
          });
        }
        clearSelection();
        return;
      }

      // Scale face:  [  shrink 10%   ]  grow 10%
      if (e.key === "[" || e.key === "]") {
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

      // Mode shortcuts
      if (e.key === "v" || e.key === "V") {
        if (mode === "draw") resetDrawState();
        setMode("select");
        return;
      }
      if (e.key === "d" || e.key === "D") {
        setMode("draw");
        return;
      }
      if (e.key === "s" && !e.ctrlKey && !e.metaKey) {
        if (mode === "draw") resetDrawState();
        setMode("split");
        return;
      }
    },
    [
      undo,
      redo,
      mode,
      setMode,
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
