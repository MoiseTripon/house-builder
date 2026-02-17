"use client";

import React, { useState, useMemo } from "react";
import { useEditorStore } from "@/features/editor/model/editor.store";
import { useRoofStore } from "../model/roof.store";
import { useRoofStats } from "../model/roof.selectors";
import {
  COMMON_PITCHES,
  COMMON_LOWER_PITCHES,
  COMMON_OVERHANGS,
} from "../model/roof.defaults";
import { NumberField } from "@/shared/ui/NumberField";
import { RoofType } from "@/domain/structure/roofSystem";
import { cn } from "@/lib/utils";

/* ────────── Roof type thumbnails ────────── */

interface RoofTypeDef {
  type: RoofType;
  label: string;
  pathFn: (s: number) => string;
}

const ROOF_TYPES: RoofTypeDef[] = [
  {
    type: "flat",
    label: "Flat",
    pathFn: (s) =>
      `M${s * 0.1},${s * 0.42} L${s * 0.9},${s * 0.42} L${s * 0.9},${s * 0.52} L${s * 0.1},${s * 0.52} Z`,
  },
  {
    type: "shed",
    label: "Shed",
    pathFn: (s) =>
      `M${s * 0.1},${s * 0.2} L${s * 0.9},${s * 0.5} L${s * 0.9},${s * 0.55} L${s * 0.1},${s * 0.55} Z`,
  },
  {
    type: "gable",
    label: "Gable",
    pathFn: (s) =>
      `M${s * 0.1},${s * 0.55} L${s * 0.5},${s * 0.15} L${s * 0.9},${s * 0.55} Z`,
  },
  {
    type: "hip",
    label: "Hip",
    pathFn: (s) =>
      `M${s * 0.1},${s * 0.55} L${s * 0.3},${s * 0.2} L${s * 0.7},${s * 0.2} L${s * 0.9},${s * 0.55} Z`,
  },
  {
    type: "gambrel",
    label: "Gambrel",
    pathFn: (s) =>
      `M${s * 0.1},${s * 0.55} L${s * 0.25},${s * 0.3} L${s * 0.5},${s * 0.15} L${s * 0.75},${s * 0.3} L${s * 0.9},${s * 0.55} Z`,
  },
  {
    type: "mansard",
    label: "Mansard",
    pathFn: (s) =>
      `M${s * 0.1},${s * 0.55} L${s * 0.2},${s * 0.28} L${s * 0.35},${s * 0.2} L${s * 0.65},${s * 0.2} L${s * 0.8},${s * 0.28} L${s * 0.9},${s * 0.55} Z`,
  },
];

const NEEDS_LOWER_PITCH: RoofType[] = ["gambrel", "mansard"];

function RoofTypeThumbnail({
  def,
  selected,
  onClick,
}: {
  def: RoofTypeDef;
  selected: boolean;
  onClick: () => void;
}) {
  const s = 48;
  const pathD = useMemo(() => def.pathFn(s), [def, s]);

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 p-1.5 rounded-md border transition-all cursor-pointer",
        selected
          ? "border-primary bg-primary/10 ring-1 ring-primary/30"
          : "border-border hover:border-primary/40 hover:bg-muted/50",
      )}
    >
      <svg width={s} height={s} className="flex-shrink-0">
        <rect
          x={s * 0.1}
          y={s * 0.55}
          width={s * 0.8}
          height={s * 0.35}
          fill="none"
          stroke="hsl(var(--muted-foreground) / 0.3)"
          strokeWidth={1}
          rx={1}
        />
        <path
          d={pathD}
          fill={
            selected
              ? "hsl(var(--primary) / 0.15)"
              : "hsl(var(--muted-foreground) / 0.08)"
          }
          stroke={
            selected
              ? "hsl(var(--primary))"
              : "hsl(var(--muted-foreground) / 0.5)"
          }
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-[9px] font-medium leading-none">{def.label}</span>
    </button>
  );
}

/* ────────── Panel ────────── */

export function RoofPanel() {
  const viewMode = useEditorStore((s) => s.viewMode);

  const roofs = useRoofStore((s) => s.roofs);
  const config = useRoofStore((s) => s.config);
  const materials = useRoofStore((s) => s.materials);
  const show3DRoofs = useRoofStore((s) => s.show3DRoofs);
  const planeSelection = useRoofStore((s) => s.planeSelection);

  const setShow3DRoofs = useRoofStore((s) => s.setShow3DRoofs);
  const setConfig = useRoofStore((s) => s.setConfig);
  const setAllRoofsType = useRoofStore((s) => s.setAllRoofsType);
  const setAllRoofsPitch = useRoofStore((s) => s.setAllRoofsPitch);
  const setAllRoofsLowerPitch = useRoofStore((s) => s.setAllRoofsLowerPitch);
  const setAllRoofsOverhang = useRoofStore((s) => s.setAllRoofsOverhang);
  const setAllRoofsMaterial = useRoofStore((s) => s.setAllRoofsMaterial);
  const setAllRoofsRidgeOffset = useRoofStore((s) => s.setAllRoofsRidgeOffset);
  const clearPlaneSelection = useRoofStore((s) => s.clearPlaneSelection);

  const stats = useRoofStats();
  const [isOpen, setIsOpen] = useState(true);

  const roofCount = Object.keys(roofs).length;
  const selectedCount = planeSelection.planeIds.length;
  const is3DView = viewMode === "3d";
  const showLower = NEEDS_LOWER_PITCH.includes(config.defaultRoofType);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span>Roof</span>
          <span className="text-[10px] text-muted-foreground">
            ({roofCount})
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {isOpen ? "▼" : "▶"}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-border p-3 space-y-3">
          {/* 3D toggle */}
          {is3DView && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={show3DRoofs}
                onChange={(e) => setShow3DRoofs(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-xs">Show 3D Roofs</span>
            </label>
          )}

          {/* Anchor to walls */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.anchorToWalls}
              onChange={(e) => setConfig({ anchorToWalls: e.target.checked })}
              className="rounded border-border"
            />
            <span className="text-xs">Anchor to wall tops</span>
          </label>

          {/* Selection info */}
          {selectedCount > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-blue-500">
                {selectedCount} plane{selectedCount !== 1 ? "s" : ""} selected
              </span>
              <button
                onClick={clearPlaneSelection}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
          )}

          {/* Roof Type */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Roof Type</label>
            <div className="flex gap-1.5 justify-center flex-wrap">
              {ROOF_TYPES.map((def) => (
                <RoofTypeThumbnail
                  key={def.type}
                  def={def}
                  selected={config.defaultRoofType === def.type}
                  onClick={() => setAllRoofsType(def.type)}
                />
              ))}
            </div>
          </div>

          {/* Pitch */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">
              {showLower ? "Upper Pitch" : "Pitch"}
            </label>
            <NumberField
              value={config.defaultPitchDeg}
              onChange={(v) => {
                setConfig({ defaultPitchDeg: v });
                setAllRoofsPitch(v);
              }}
              min={config.minPitchDeg}
              max={config.maxPitchDeg}
              step={1}
              suffix="°"
            />
            <div className="flex flex-wrap gap-1">
              {COMMON_PITCHES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => {
                    setConfig({ defaultPitchDeg: p.value });
                    setAllRoofsPitch(p.value);
                  }}
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded border transition-colors",
                    config.defaultPitchDeg === p.value
                      ? "border-blue-500 bg-blue-500/10 text-blue-500"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lower Pitch (gambrel / mansard) */}
          {showLower && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                Lower Pitch
              </label>
              <NumberField
                value={config.defaultLowerPitchDeg}
                onChange={(v) => {
                  setConfig({ defaultLowerPitchDeg: v });
                  setAllRoofsLowerPitch(v);
                }}
                min={config.minLowerPitchDeg}
                max={config.maxLowerPitchDeg}
                step={1}
                suffix="°"
              />
              <div className="flex flex-wrap gap-1">
                {COMMON_LOWER_PITCHES.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => {
                      setConfig({ defaultLowerPitchDeg: p.value });
                      setAllRoofsLowerPitch(p.value);
                    }}
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded border transition-colors",
                      config.defaultLowerPitchDeg === p.value
                        ? "border-blue-500 bg-blue-500/10 text-blue-500"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Overhang & Material & Ridge – only 3D */}
          {is3DView && show3DRoofs && (
            <>
              {/* Overhang */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">
                  Overhang
                </label>
                <NumberField
                  value={config.defaultOverhang}
                  onChange={(v) => {
                    setConfig({ defaultOverhang: v });
                    setAllRoofsOverhang(v);
                  }}
                  min={config.minOverhang}
                  max={config.maxOverhang}
                  step={50}
                  suffix="mm"
                />
                <div className="flex flex-wrap gap-1">
                  {COMMON_OVERHANGS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => {
                        setConfig({ defaultOverhang: o.value });
                        setAllRoofsOverhang(o.value);
                      }}
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded border transition-colors",
                        config.defaultOverhang === o.value
                          ? "border-blue-500 bg-blue-500/10 text-blue-500"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ridge Offset */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">
                  Ridge Offset
                </label>
                <NumberField
                  value={0}
                  onChange={(v) => setAllRoofsRidgeOffset(v)}
                  min={-config.maxRidgeOffset}
                  max={config.maxRidgeOffset}
                  step={100}
                  suffix="mm"
                />
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
                      onClick={() => {
                        setConfig({ defaultMaterialId: m.id });
                        setAllRoofsMaterial(m.id);
                      }}
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

          {/* Apply-all */}
          {roofCount > 0 && (
            <div className="pt-2 border-t border-border space-y-2">
              <p className="text-[10px] text-muted-foreground">
                Apply to all roofs:
              </p>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => setAllRoofsType(config.defaultRoofType)}
                  className="text-[10px] px-2 py-1.5 bg-muted rounded hover:bg-muted/80 transition-colors"
                >
                  Set Type
                </button>
                <button
                  onClick={() => setAllRoofsPitch(config.defaultPitchDeg)}
                  className="text-[10px] px-2 py-1.5 bg-muted rounded hover:bg-muted/80 transition-colors"
                >
                  Set Pitch
                </button>
                {is3DView && show3DRoofs && (
                  <>
                    <button
                      onClick={() =>
                        setAllRoofsOverhang(config.defaultOverhang)
                      }
                      className="text-[10px] px-2 py-1.5 bg-muted rounded hover:bg-muted/80 transition-colors"
                    >
                      Set Overhang
                    </button>
                    <button
                      onClick={() =>
                        setAllRoofsMaterial(config.defaultMaterialId)
                      }
                      className="text-[10px] px-2 py-1.5 bg-muted rounded hover:bg-muted/80 transition-colors"
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
