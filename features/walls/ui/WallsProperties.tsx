"use client";

import React from "react";
import { useWallsStore, Wall } from "../model/walls.store";
import { useEditorStore } from "@/features/editor/model/editor.store";
import { Panel } from "@/shared/ui/Panel";
import { NumberField } from "@/shared/ui/NumberField";
import { COMMON_HEIGHTS, COMMON_THICKNESSES } from "../model/walls.defaults";
import { formatLength } from "@/domain/units/units";
import { distance } from "@/domain/geometry/vec2";

function WallPropertyEditor({ wall }: { wall: Wall }) {
  const plan = useEditorStore((s) => s.plan);
  const unitConfig = useEditorStore((s) => s.unitConfig);
  const config = useWallsStore((s) => s.config);
  const materials = useWallsStore((s) => s.materials);
  const updateWall = useWallsStore((s) => s.updateWall);

  const edge = plan.edges[wall.edgeId];
  const startV = edge ? plan.vertices[edge.startId] : null;
  const endV = edge ? plan.vertices[edge.endId] : null;

  const wallLength =
    startV && endV ? distance(startV.position, endV.position) : 0;

  const wallArea = wallLength * wall.height;

  return (
    <div className="space-y-3">
      {/* Wall Info */}
      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>Wall ID:</span>
          <span className="text-foreground font-mono text-[10px]">
            {wall.id.slice(0, 12)}...
          </span>
        </div>
        <div className="flex justify-between">
          <span>Length:</span>
          <span className="text-foreground">
            {formatLength(wallLength, unitConfig)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Area:</span>
          <span className="text-foreground">
            {(wallArea / 1_000_000).toFixed(2)} m²
          </span>
        </div>
      </div>

      <div className="border-t border-border pt-3 space-y-3">
        {/* Height */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Height</label>
          <NumberField
            value={wall.height}
            onChange={(v) => updateWall(wall.id, { height: v })}
            min={config.minHeight}
            max={config.maxHeight}
            step={100}
            suffix="mm"
          />
          <div className="flex flex-wrap gap-1 mt-1">
            {COMMON_HEIGHTS.slice(0, 3).map((h) => (
              <button
                key={h.value}
                onClick={() => updateWall(wall.id, { height: h.value })}
                className={`text-[10px] px-1.5 py-0.5 rounded border ${
                  wall.height === h.value
                    ? "border-blue-500 bg-blue-500/10 text-blue-500"
                    : "border-border hover:bg-muted"
                }`}
              >
                {h.value / 1000}m
              </button>
            ))}
          </div>
        </div>

        {/* Thickness */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Thickness</label>
          <NumberField
            value={wall.thickness}
            onChange={(v) => updateWall(wall.id, { thickness: v })}
            min={config.minThickness}
            max={config.maxThickness}
            step={10}
            suffix="mm"
          />
          <div className="flex flex-wrap gap-1 mt-1">
            {COMMON_THICKNESSES.slice(0, 3).map((t) => (
              <button
                key={t.value}
                onClick={() => updateWall(wall.id, { thickness: t.value })}
                className={`text-[10px] px-1.5 py-0.5 rounded border ${
                  wall.thickness === t.value
                    ? "border-blue-500 bg-blue-500/10 text-blue-500"
                    : "border-border hover:bg-muted"
                }`}
              >
                {t.value}mm
              </button>
            ))}
          </div>
        </div>

        {/* Base Elevation */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            Base Elevation
          </label>
          <NumberField
            value={wall.baseZ}
            onChange={(v) => updateWall(wall.id, { baseZ: v })}
            min={0}
            max={50000}
            step={100}
            suffix="mm"
          />
          <div className="flex flex-wrap gap-1 mt-1">
            {[0, 1000, 2000, 3000].map((z) => (
              <button
                key={z}
                onClick={() => updateWall(wall.id, { baseZ: z })}
                className={`text-[10px] px-1.5 py-0.5 rounded border ${
                  wall.baseZ === z
                    ? "border-blue-500 bg-blue-500/10 text-blue-500"
                    : "border-border hover:bg-muted"
                }`}
              >
                {z / 1000}m
              </button>
            ))}
          </div>
        </div>

        {/* Material */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Material</label>
          <select
            value={wall.materialId}
            onChange={(e) =>
              updateWall(wall.id, { materialId: e.target.value })
            }
            className="w-full text-sm px-2 py-1.5 border border-border rounded bg-background"
          >
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1 mt-1">
            {materials.slice(0, 4).map((m) => (
              <button
                key={m.id}
                onClick={() => updateWall(wall.id, { materialId: m.id })}
                className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                  wall.materialId === m.id
                    ? "border-blue-500 bg-blue-500/10 text-blue-500"
                    : "border-border hover:bg-muted"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: m.color }}
                />
                {m.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function WallsProperties() {
  const selection = useWallsStore((s) => s.selection);
  const walls = useWallsStore((s) => s.walls);
  const config = useWallsStore((s) => s.config);
  const materials = useWallsStore((s) => s.materials);
  const updateWall = useWallsStore((s) => s.updateWall);
  const clearWallSelection = useWallsStore((s) => s.clearWallSelection);

  const selectedWalls = selection.wallIds
    .map((id) => walls[id])
    .filter((w): w is Wall => w !== undefined);

  if (selectedWalls.length === 0) {
    return null;
  }

  // Single wall selected
  if (selectedWalls.length === 1) {
    const wall = selectedWalls[0];
    return (
      <Panel title="Wall Properties">
        <WallPropertyEditor wall={wall} />
        <button
          onClick={clearWallSelection}
          className="w-full mt-3 text-xs px-2 py-1.5 border border-border rounded hover:bg-muted"
        >
          Deselect Wall
        </button>
      </Panel>
    );
  }

  // Multiple walls selected
  return (
    <Panel title={`${selectedWalls.length} Walls Selected`}>
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Edit properties for all selected walls:
        </p>

        {/* Batch Height */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Set Height</label>
          <div className="flex flex-wrap gap-1">
            {COMMON_HEIGHTS.slice(0, 4).map((h) => (
              <button
                key={h.value}
                onClick={() => {
                  for (const w of selectedWalls) {
                    updateWall(w.id, { height: h.value });
                  }
                }}
                className="text-[10px] px-1.5 py-1 rounded border border-border hover:bg-muted"
              >
                {h.value / 1000}m
              </button>
            ))}
          </div>
        </div>

        {/* Batch Thickness */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Set Thickness</label>
          <div className="flex flex-wrap gap-1">
            {COMMON_THICKNESSES.slice(0, 4).map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  for (const w of selectedWalls) {
                    updateWall(w.id, { thickness: t.value });
                  }
                }}
                className="text-[10px] px-1.5 py-1 rounded border border-border hover:bg-muted"
              >
                {t.value}mm
              </button>
            ))}
          </div>
        </div>

        {/* Batch Material */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Set Material</label>
          <div className="flex flex-wrap gap-1">
            {materials.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  for (const w of selectedWalls) {
                    updateWall(w.id, { materialId: m.id });
                  }
                }}
                className="text-[10px] px-1.5 py-1 rounded border border-border hover:bg-muted flex items-center gap-1"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: m.color }}
                />
                {m.name}
              </button>
            ))}
          </div>
        </div>

        {/* Batch Base Elevation */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            Set Base Elevation
          </label>
          <div className="flex flex-wrap gap-1">
            {[0, 1000, 2000, 3000].map((z) => (
              <button
                key={z}
                onClick={() => {
                  for (const w of selectedWalls) {
                    updateWall(w.id, { baseZ: z });
                  }
                }}
                className="text-[10px] px-1.5 py-1 rounded border border-border hover:bg-muted"
              >
                {z / 1000}m
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={clearWallSelection}
          className="w-full text-xs px-2 py-1.5 border border-border rounded hover:bg-muted"
        >
          Clear Selection
        </button>
      </div>
    </Panel>
  );
}
