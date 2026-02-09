import { useEffect, useCallback } from "react";
import { useEditorStore } from "../model/editor.store";

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

      // Undo/Redo
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        redo();
        return;
      }

      // Escape — cancel draw or clear selection
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
        // Collect all commands first, then execute
        const cmds = selection.items
          .map((item) => {
            if (item.type === "vertex")
              return { type: "REMOVE_VERTEX" as const, vertexId: item.id };
            if (item.type === "edge")
              return { type: "REMOVE_EDGE" as const, edgeId: item.id };
            return null;
          })
          .filter(Boolean);

        if (cmds.length > 0) {
          executeCommand({
            type: "BATCH",
            label: "Delete selection",
            commands: cmds as any,
          });
        }
        clearSelection();
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
    ],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
