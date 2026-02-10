"use client";

import React, { useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/features/editor/model/editor.store";
import { useWallsStore } from "../model/walls.store";
import { COMMON_HEIGHTS, COMMON_THICKNESSES } from "../model/walls.defaults";
import { NumberField } from "@/shared/ui/NumberField";
import { cn } from "@/lib/utils";

export function WallsPanel() {
  const plan = useEditorStore((s) => s.plan);
  const viewMode = useEditorStore((s) => s.viewMode);

  const walls = useWallsStore((s) => s.walls);
  const config = useWallsStore((s) => s.config);
  const materials = useWallsStore((s) => s.materials);
  const show3DWalls = useWallsStore((s) => s.show3DWalls);
  const selection = useWallsStore((s) => s.selection);

  const setShow3DWalls = useWallsStore((s) => s.setShow3DWalls);
  const setConfig = useWallsStore((s) => s.setConfig);
  const setAllWallsHeight = useWallsStore((s) => s.setAllWallsHeight);
  const setAllWallsThickness = useWallsStore((s) => s.setAllWallsThickness);
  const setAllWallsMaterial = useWallsStore((s) => s.setAllWallsMaterial);
  const setAllWallsBaseZ = useWallsStore((s) => s.setAllWallsBaseZ);
  const syncWithEdges = useWallsStore((s) => s.syncWithEdges);
  const clearWallSelection = useWallsStore((s) => s.clearWallSelection);

  const [isOpen, setIsOpen] = useState(true);

  const prevEdgeIdsRef = useRef<string>("");

  useEffect(() => {
    const edgeIds = Object.keys(plan.edges);
    const edgeIdsKey = edgeIds.sort().join(",");

    if (edgeIdsKey !== prevEdgeIdsRef.current) {
      prevEdgeIdsRef.current = edgeIdsKey;
      syncWithEdges(edgeIds);
    }
  }, [plan.edges, syncWithEdges]);

  const wallCount = Object.keys(walls).length;
  const selectedCount = selection.wallIds.length;
  const is3DView = viewMode === "3d";

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span>Walls</span>
          <span className="text-[10px] text-muted-foreground">
            ({wallCount})
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {isOpen ? "▼" : "▶"}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-border p-3 space-y-3">
          {/* 3D Walls Toggle - only in 3D view */}
          {is3DView && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={show3DWalls}
                onChange={(e) => setShow3DWalls(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-xs">Show 3D Walls</span>
            </label>
          )}

          {/* Selection info */}
          {selectedCount > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-blue-500">{selectedCount} selected</span>
              <button
                onClick={clearWallSelection}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
          )}

          {/* Height */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Height</label>
            <NumberField
              value={config.defaultHeight}
              onChange={(v) => setConfig({ defaultHeight: v })}
              min={config.minHeight}
              max={config.maxHeight}
              step={100}
              suffix="mm"
            />
            <div className="flex flex-wrap gap-1">
              {COMMON_HEIGHTS.slice(0, 4).map((h) => (
                <button
                  key={h.value}
                  onClick={() => setConfig({ defaultHeight: h.value })}
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded border transition-colors",
                    config.defaultHeight === h.value
                      ? "border-blue-500 bg-blue-500/10 text-blue-500"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {h.value / 1000}m
                </button>
              ))}
            </div>
          </div>

          {/* Base Elevation */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">
              Base Elevation
            </label>
            <NumberField
              value={0}
              onChange={(v) => setAllWallsBaseZ(v)}
              min={0}
              max={50000}
              step={100}
              suffix="mm"
            />
            <div className="flex flex-wrap gap-1">
              {[0, 2700, 5400, 8100].map((z) => (
                <button
                  key={z}
                  onClick={() => setAllWallsBaseZ(z)}
                  className="text-[10px] px-1.5 py-0.5 rounded border border-border hover:bg-muted transition-colors"
                >
                  {z / 1000}m
                </button>
              ))}
            </div>
          </div>

          {/* Thickness & Material - only when 3D view and walls visible */}
          {is3DView && show3DWalls && (
            <>
              {/* Thickness */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">
                  Thickness
                </label>
                <NumberField
                  value={config.defaultThickness}
                  onChange={(v) => setConfig({ defaultThickness: v })}
                  min={config.minThickness}
                  max={config.maxThickness}
                  step={10}
                  suffix="mm"
                />
                <div className="flex flex-wrap gap-1">
                  {COMMON_THICKNESSES.slice(0, 4).map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setConfig({ defaultThickness: t.value })}
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded border transition-colors",
                        config.defaultThickness === t.value
                          ? "border-blue-500 bg-blue-500/10 text-blue-500"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      {t.value}mm
                    </button>
                  ))}
                </div>
              </div>

              {/* Material */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">
                  Material
                </label>
                <div className="flex flex-wrap gap-1">
                  {materials.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setConfig({ defaultMaterialId: m.id })}
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 transition-colors",
                        config.defaultMaterialId === m.id
                          ? "border-blue-500 bg-blue-500/10 text-blue-500"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: m.color }}
                      />
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Apply to All */}
          {wallCount > 0 && (
            <div className="pt-2 border-t border-border space-y-2">
              <p className="text-[10px] text-muted-foreground">
                Apply to all walls:
              </p>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => setAllWallsHeight(config.defaultHeight)}
                  className="text-[10px] px-2 py-1.5 bg-muted rounded hover:bg-muted/80 transition-colors"
                >
                  Set Heights
                </button>
                {is3DView && show3DWalls && (
                  <>
                    <button
                      onClick={() =>
                        setAllWallsThickness(config.defaultThickness)
                      }
                      className="text-[10px] px-2 py-1.5 bg-muted rounded hover:bg-muted/80 transition-colors"
                    >
                      Set Thickness
                    </button>
                    <button
                      onClick={() =>
                        setAllWallsMaterial(config.defaultMaterialId)
                      }
                      className="col-span-2 text-[10px] px-2 py-1.5 bg-muted rounded hover:bg-muted/80 transition-colors"
                    >
                      Set Material
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
