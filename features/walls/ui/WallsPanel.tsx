"use client";

import React, { useEffect } from "react";
import { useEditorStore } from "@/features/editor/model/editor.store";
import { useWallsStore } from "../model/walls.store";
import { useWallStats, useWallsSyncStatus } from "../model/walls.selectors";
import { COMMON_HEIGHTS, COMMON_THICKNESSES } from "../model/walls.defaults";
import { Panel } from "@/shared/ui/Panel";
import { NumberField } from "@/shared/ui/NumberField";
import { formatLength } from "@/domain/units/units";

export function WallsPanel() {
  const plan = useEditorStore((s) => s.plan);
  const unitConfig = useEditorStore((s) => s.unitConfig);

  const walls = useWallsStore((s) => s.walls);
  const config = useWallsStore((s) => s.config);
  const wallsVisible = useWallsStore((s) => s.wallsVisible);
  const selection = useWallsStore((s) => s.selection);

  const setWallsVisible = useWallsStore((s) => s.setWallsVisible);
  const setConfig = useWallsStore((s) => s.setConfig);
  const setAllWallsHeight = useWallsStore((s) => s.setAllWallsHeight);
  const setAllWallsThickness = useWallsStore((s) => s.setAllWallsThickness);
  const syncWithEdges = useWallsStore((s) => s.syncWithEdges);
  const clearWallSelection = useWallsStore((s) => s.clearWallSelection);

  const stats = useWallStats();
  const syncStatus = useWallsSyncStatus();

  // Auto-sync walls with plan edges
  useEffect(() => {
    const edgeIds = Object.keys(plan.edges);
    syncWithEdges(edgeIds);
  }, [plan.edges, syncWithEdges]);

  const wallCount = Object.keys(walls).length;
  const selectedCount = selection.wallIds.length;

  return (
    <div className="space-y-3">
      {/* Visibility Toggle */}
      <Panel title="Walls">
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={wallsVisible}
              onChange={(e) => setWallsVisible(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-sm">Show 3D Walls</span>
          </label>

          {!syncStatus.isSynced && (
            <div className="text-xs text-amber-500 bg-amber-500/10 rounded px-2 py-1">
              ⚠ Walls out of sync with plan
              <button
                onClick={() => syncWithEdges(Object.keys(plan.edges))}
                className="ml-2 underline hover:no-underline"
              >
                Sync now
              </button>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Walls:</span>
              <span>{wallCount}</span>
            </div>
            {selectedCount > 0 && (
              <div className="flex justify-between text-blue-500">
                <span>Selected:</span>
                <span>{selectedCount}</span>
              </div>
            )}
          </div>
        </div>
      </Panel>

      {/* Global Settings */}
      <Panel title="Global Wall Settings">
        <div className="space-y-3">
          {/* Default Height */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              Default Height
            </label>
            <NumberField
              value={config.defaultHeight}
              onChange={(v) => setConfig({ defaultHeight: v })}
              min={config.minHeight}
              max={config.maxHeight}
              step={100}
              suffix="mm"
            />
            <div className="flex flex-wrap gap-1 mt-1">
              {COMMON_HEIGHTS.slice(0, 4).map((h) => (
                <button
                  key={h.value}
                  onClick={() => setConfig({ defaultHeight: h.value })}
                  className={`text-[10px] px-1.5 py-0.5 rounded border ${
                    config.defaultHeight === h.value
                      ? "border-blue-500 bg-blue-500/10 text-blue-500"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {h.value / 1000}m
                </button>
              ))}
            </div>
          </div>

          {/* Default Thickness */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              Default Thickness
            </label>
            <NumberField
              value={config.defaultThickness}
              onChange={(v) => setConfig({ defaultThickness: v })}
              min={config.minThickness}
              max={config.maxThickness}
              step={10}
              suffix="mm"
            />
            <div className="flex flex-wrap gap-1 mt-1">
              {COMMON_THICKNESSES.slice(0, 4).map((t) => (
                <button
                  key={t.value}
                  onClick={() => setConfig({ defaultThickness: t.value })}
                  className={`text-[10px] px-1.5 py-0.5 rounded border ${
                    config.defaultThickness === t.value
                      ? "border-blue-500 bg-blue-500/10 text-blue-500"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {t.value}mm
                </button>
              ))}
            </div>
          </div>

          {/* Apply to All */}
          <div className="pt-2 border-t border-border space-y-2">
            <p className="text-xs text-muted-foreground">Apply to all walls:</p>
            <div className="flex gap-2">
              <button
                onClick={() => setAllWallsHeight(config.defaultHeight)}
                disabled={wallCount === 0}
                className="flex-1 text-xs px-2 py-1.5 bg-muted rounded hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Set All Heights
              </button>
              <button
                onClick={() => setAllWallsThickness(config.defaultThickness)}
                disabled={wallCount === 0}
                className="flex-1 text-xs px-2 py-1.5 bg-muted rounded hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Set All Thickness
              </button>
            </div>
          </div>
        </div>
      </Panel>

      {/* Statistics */}
      {wallCount > 0 && (
        <Panel title="Statistics" collapsible>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Length:</span>
              <span>{formatLength(stats.totalLength, unitConfig)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Area:</span>
              <span>{(stats.totalArea / 1_000_000).toFixed(2)} m²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Height:</span>
              <span>{formatLength(stats.averageHeight, unitConfig)}</span>
            </div>
          </div>
        </Panel>
      )}

      {/* Selection Actions */}
      {selectedCount > 0 && (
        <Panel title={`Selected (${selectedCount})`}>
          <div className="space-y-2">
            <button
              onClick={clearWallSelection}
              className="w-full text-xs px-2 py-1.5 border border-border rounded hover:bg-muted"
            >
              Clear Selection
            </button>
          </div>
        </Panel>
      )}
    </div>
  );
}
