"use client";

import React from "react";
import { useRoofStore, Roof } from "../model/roof.store";
import { useRoofStats, useSelectedPlaneData } from "../model/roof.selectors";
import { useEditorStore } from "@/features/editor/model/editor.store";
import { COMMON_PITCHES, COMMON_OVERHANGS } from "../model/roof.defaults";
import { Panel } from "@/shared/ui/Panel";
import { NumberField } from "@/shared/ui/NumberField";
import { RoofType } from "@/domain/structure/roofSystem";
import { RoofPlaneGeometry } from "@/domain/structure/roofTypes/gable";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Single roof plane property editor                                  */
/* ------------------------------------------------------------------ */

function RoofPlanePropertyEditor({
  plane,
  roof,
}: {
  plane: RoofPlaneGeometry & { roofId: string };
  roof: Roof;
}) {
  const config = useRoofStore((s) => s.config);
  const materials = useRoofStore((s) => s.materials);
  const show3DRoofs = useRoofStore((s) => s.show3DRoofs);
  const updateRoof = useRoofStore((s) => s.updateRoof);

  return (
    <div className="space-y-3">
      {/* Plane Info */}
      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>Plane:</span>
          <span className="text-foreground">{plane.label}</span>
        </div>
        <div className="flex justify-between">
          <span>Area:</span>
          <span className="text-foreground">
            {(plane.area / 1_000_000).toFixed(2)} m²
          </span>
        </div>
        <div className="flex justify-between">
          <span>Slope:</span>
          <span className="text-foreground">
            {plane.slopeAngleDeg.toFixed(1)}°
          </span>
        </div>
        <div className="flex justify-between">
          <span>Base Z:</span>
          <span className="text-foreground">{roof.baseZ.toFixed(0)} mm</span>
        </div>
      </div>

      <div className="border-t border-border pt-3 space-y-3">
        {/* Roof Type */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Type</label>
          <div className="flex flex-wrap gap-1">
            {(["flat", "gable"] as RoofType[]).map((t) => (
              <button
                key={t}
                onClick={() => updateRoof(roof.id, { roofType: t })}
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded border transition-colors capitalize",
                  roof.roofType === t
                    ? "border-blue-500 bg-blue-500/10 text-blue-500"
                    : "border-border hover:bg-muted",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Pitch */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Pitch</label>
          <NumberField
            value={roof.pitchDeg}
            onChange={(v) => updateRoof(roof.id, { pitchDeg: v })}
            min={config.minPitchDeg}
            max={config.maxPitchDeg}
            step={1}
            suffix="°"
          />
          <div className="flex flex-wrap gap-1">
            {COMMON_PITCHES.map((p) => (
              <button
                key={p.value}
                onClick={() => updateRoof(roof.id, { pitchDeg: p.value })}
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded border transition-colors",
                  roof.pitchDeg === p.value
                    ? "border-blue-500 bg-blue-500/10 text-blue-500"
                    : "border-border hover:bg-muted",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Overhang & Material - only when 3D roofs visible */}
        {show3DRoofs && (
          <>
            {/* Overhang */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Overhang</label>
              <NumberField
                value={roof.overhang}
                onChange={(v) => updateRoof(roof.id, { overhang: v })}
                min={config.minOverhang}
                max={config.maxOverhang}
                step={50}
                suffix="mm"
              />
              <div className="flex flex-wrap gap-1">
                {COMMON_OVERHANGS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => updateRoof(roof.id, { overhang: o.value })}
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded border transition-colors",
                      roof.overhang === o.value
                        ? "border-blue-500 bg-blue-500/10 text-blue-500"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Material */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Material</label>
              <div className="flex flex-wrap gap-1">
                {materials.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => updateRoof(roof.id, { materialId: m.id })}
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 transition-colors",
                      roof.materialId === m.id
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
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Roof Statistics                                                    */
/* ------------------------------------------------------------------ */

function RoofStatistics() {
  const stats = useRoofStats();

  if (stats.roofCount === 0) return null;

  return (
    <Panel title="Roof Statistics" collapsible>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Roofs:</span>
          <span>{stats.roofCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Planes:</span>
          <span>{stats.planeCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Area:</span>
          <span>{(stats.totalArea / 1_000_000).toFixed(2)} m²</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Avg Pitch:</span>
          <span>{stats.averagePitch.toFixed(1)}°</span>
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */

export function RoofProperties() {
  const viewMode = useEditorStore((s) => s.viewMode);
  const roofs = useRoofStore((s) => s.roofs);
  const config = useRoofStore((s) => s.config);
  const materials = useRoofStore((s) => s.materials);
  const show3DRoofs = useRoofStore((s) => s.show3DRoofs);
  const planeSelection = useRoofStore((s) => s.planeSelection);
  const updateRoof = useRoofStore((s) => s.updateRoof);
  const clearPlaneSelection = useRoofStore((s) => s.clearPlaneSelection);

  const { planes, roof: primaryRoof } = useSelectedPlaneData();

  // Only show in 3D view
  if (viewMode !== "3d") {
    return null;
  }

  // No selection → show statistics only
  if (planes.length === 0) {
    return <RoofStatistics />;
  }

  // Single plane selected
  if (planes.length === 1 && primaryRoof) {
    return (
      <>
        <Panel title="Roof Plane Properties">
          <RoofPlanePropertyEditor plane={planes[0]} roof={primaryRoof} />
          <button
            onClick={clearPlaneSelection}
            className="w-full mt-3 text-xs px-2 py-1.5 border border-border rounded hover:bg-muted transition-colors"
          >
            Deselect
          </button>
        </Panel>
        <RoofStatistics />
      </>
    );
  }

  // Multiple planes selected
  const uniqueRoofIds = [...new Set(planes.map((p) => p.roofId))];
  const totalArea = planes.reduce((sum, p) => sum + p.area, 0);

  return (
    <>
      <Panel title={`${planes.length} Roof Planes Selected`}>
        <div className="space-y-3">
          {/* Selected planes summary */}
          <div className="space-y-1 text-xs text-muted-foreground">
            {planes.map((p) => (
              <div key={p.planeId} className="flex justify-between">
                <span className="text-foreground">{p.label}</span>
                <span>{(p.area / 1_000_000).toFixed(2)} m²</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-1 mt-1">
              <span className="text-foreground font-medium">Total</span>
              <span>{(totalArea / 1_000_000).toFixed(2)} m²</span>
            </div>
          </div>

          {/* Batch Roof Type */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Set Type</label>
            <div className="flex flex-wrap gap-1">
              {(["flat", "gable"] as RoofType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    for (const rid of uniqueRoofIds) {
                      updateRoof(rid, { roofType: t });
                    }
                  }}
                  className="text-[10px] px-1.5 py-0.5 rounded border border-border hover:bg-muted transition-colors capitalize"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Batch Pitch */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Set Pitch</label>
            <div className="flex flex-wrap gap-1">
              {COMMON_PITCHES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => {
                    for (const rid of uniqueRoofIds) {
                      updateRoof(rid, { pitchDeg: p.value });
                    }
                  }}
                  className="text-[10px] px-1.5 py-0.5 rounded border border-border hover:bg-muted transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Batch Overhang & Material - only when 3D roofs visible */}
          {show3DRoofs && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">
                  Set Overhang
                </label>
                <div className="flex flex-wrap gap-1">
                  {COMMON_OVERHANGS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => {
                        for (const rid of uniqueRoofIds) {
                          updateRoof(rid, { overhang: o.value });
                        }
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-border hover:bg-muted transition-colors"
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">
                  Set Material
                </label>
                <div className="flex flex-wrap gap-1">
                  {materials.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        for (const rid of uniqueRoofIds) {
                          updateRoof(rid, { materialId: m.id });
                        }
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-border hover:bg-muted flex items-center gap-1 transition-colors"
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

          <button
            onClick={clearPlaneSelection}
            className="w-full text-xs px-2 py-1.5 border border-border rounded hover:bg-muted transition-colors"
          >
            Clear Selection
          </button>
        </div>
      </Panel>
      <RoofStatistics />
    </>
  );
}
