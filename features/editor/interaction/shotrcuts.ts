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
    plan,
    executeCommand,
    resetDrawState,
  } = useEditorStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
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
        for (const item of selection.items) {
          if (item.type === "vertex") {
            executeCommand({ type: "REMOVE_VERTEX", vertexId: item.id });
          } else if (item.type === "edge") {
            executeCommand({ type: "REMOVE_EDGE", edgeId: item.id });
          }
        }
        clearSelection();
        return;
      }

      // Mode shortcuts
      if (e.key === "v" || e.key === "V") {
        setMode("select");
        return;
      }
      if (e.key === "d" || e.key === "D") {
        setMode("draw");
        return;
      }
      if (e.key === "s" && !e.ctrlKey && !e.metaKey) {
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
      plan,
      executeCommand,
      resetDrawState,
    ],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
