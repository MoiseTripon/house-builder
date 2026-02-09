"use client";

import React from "react";
import { useEditorStore } from "../model/editor.store";
import { useEditorShortcuts } from "../interaction/shortcuts";
import { Segmented } from "@/shared/ui/Segmented";
import { cn } from "@/lib/utils";

export function TopBar() {
  useEditorShortcuts();

  const {
    mode,
    setMode,
    advancedMode,
    setAdvancedMode,
    snapConfig,
    setSnapConfig,
    unitConfig,
    setUnitConfig,
    undo,
    redo,
    drawState,
    resetDrawState,
  } = useEditorStore();

  const canUndo = useEditorStore((s) => s.undoStack.length > 0);
  const canRedo = useEditorStore((s) => s.redoStack.length > 0);
  const verticesPlaced = drawState.vertexIds.length;

  return (
    <div className="flex flex-col border-b border-border bg-background">
      <div className="flex items-center justify-between px-4 py-2">
        {/* Left: Mode switch (Select + Draw only) + Undo/Redo */}
        <div className="flex items-center gap-3">
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              {
                value: "select" as const,
                label: "Select",
                icon: <span className="text-[10px] opacity-50">V</span>,
              },
              {
                value: "draw" as const,
                label: "Draw",
                icon: <span className="text-[10px] opacity-50">D</span>,
              },
            ]}
          />
          <div className="w-px h-6 bg-border" />
          <div className="flex items-center gap-1">
            <button
              onClick={undo}
              disabled={!canUndo}
              className={cn(
                "px-2 py-1 text-xs rounded hover:bg-muted transition-colors",
                !canUndo && "opacity-30 cursor-not-allowed",
              )}
              title="Undo (Ctrl+Z)"
            >
              ↶ Undo
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className={cn(
                "px-2 py-1 text-xs rounded hover:bg-muted transition-colors",
                !canRedo && "opacity-30 cursor-not-allowed",
              )}
              title="Redo (Ctrl+Shift+Z)"
            >
              ↷ Redo
            </button>
          </div>
        </div>

        {/* Center: snap */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={snapConfig.gridEnabled}
              onChange={(e) => setSnapConfig({ gridEnabled: e.target.checked })}
              className="rounded"
            />
            Grid
          </label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={snapConfig.angleEnabled}
              onChange={(e) =>
                setSnapConfig({ angleEnabled: e.target.checked })
              }
              className="rounded"
            />
            Angle ({snapConfig.angleStep}°)
          </label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={snapConfig.geometryEnabled}
              onChange={(e) =>
                setSnapConfig({ geometryEnabled: e.target.checked })
              }
              className="rounded"
            />
            Geometry
          </label>
        </div>

        {/* Right: Units + Advanced */}
        <div className="flex items-center gap-3">
          <Segmented
            value={unitConfig.system}
            onChange={(system) => setUnitConfig({ system })}
            options={[
              { value: "metric" as const, label: "Metric" },
              { value: "imperial" as const, label: "Imperial" },
            ]}
          />
          <Segmented
            value={advancedMode}
            onChange={setAdvancedMode}
            options={[
              { value: "simple" as const, label: "Simple" },
              { value: "advanced" as const, label: "Advanced" },
            ]}
          />
        </div>
      </div>

      {/* Draw mode status bar */}
      {mode === "draw" && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-amber-500/10 border-t border-amber-500/20">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              {verticesPlaced === 0
                ? "Click to start drawing. Click on edges to split them."
                : `${verticesPlaced} point${verticesPlaced !== 1 ? "s" : ""} — click to extend. Land on existing geometry to split faces.`}
            </span>
          </div>
          <button
            onClick={() => {
              resetDrawState();
              setMode("select");
            }}
            className="px-3 py-0.5 text-xs font-medium border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded hover:bg-amber-500/10 transition-colors"
          >
            Cancel (Esc)
          </button>
        </div>
      )}
    </div>
  );
}
