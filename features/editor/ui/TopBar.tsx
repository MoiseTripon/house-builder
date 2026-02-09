"use client";

import React from "react";
import { useEditorStore } from "../model/editor.store";
import { useEditorShortcuts } from "../interaction/shotrcuts";
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
  } = useEditorStore();

  const canUndo = useEditorStore((s) => s.undoStack.length > 0);
  const canRedo = useEditorStore((s) => s.redoStack.length > 0);

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background">
      {/* Left: Mode switch */}
      <div className="flex items-center gap-3">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            {
              value: "select",
              label: "Select",
              icon: <span className="text-xs">V</span>,
            },
            {
              value: "draw",
              label: "Draw",
              icon: <span className="text-xs">D</span>,
            },
            {
              value: "split",
              label: "Split",
              icon: <span className="text-xs">S</span>,
            },
          ]}
        />

        <div className="w-px h-6 bg-border" />

        {/* Undo/Redo */}
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

      {/* Center: snap options */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={snapConfig.gridEnabled}
            onChange={(e) => setSnapConfig({ gridEnabled: e.target.checked })}
            className="rounded"
          />
          Grid
        </label>
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={snapConfig.angleEnabled}
            onChange={(e) => setSnapConfig({ angleEnabled: e.target.checked })}
            className="rounded"
          />
          Angle ({snapConfig.angleStep}°)
        </label>
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={snapConfig.geometryEnabled}
            onChange={(e) =>
              setSnapConfig({ geometryEnabled: e.target.checked })
            }
            className="rounded"
          />
          Snap to Geometry
        </label>
      </div>

      {/* Right: Advanced toggle + Units */}
      <div className="flex items-center gap-3">
        <Segmented
          value={unitConfig.system}
          onChange={(system) => setUnitConfig({ system })}
          options={[
            { value: "metric", label: "Metric" },
            { value: "imperial", label: "Imperial" },
          ]}
        />
        <Segmented
          value={advancedMode}
          onChange={setAdvancedMode}
          options={[
            { value: "simple", label: "Simple" },
            { value: "advanced", label: "Advanced" },
          ]}
        />
      </div>
    </div>
  );
}
