"use client";

import React from "react";
import { useRoofStore, Roof } from "../model/roof.store";
import { RoofType } from "@/domain/structure/roofSystem";

const ROOF_TYPES: { value: RoofType; label: string }[] = [
  { value: "flat", label: "Flat" },
  { value: "gable", label: "Gable" },
];

export function RoofProperties() {
  const roofs = useRoofStore((s) => s.roofs);
  const selection = useRoofStore((s) => s.selection);
  const materials = useRoofStore((s) => s.materials);
  const config = useRoofStore((s) => s.config);
  const updateRoof = useRoofStore((s) => s.updateRoof);

  const selectedRoofs: Roof[] = selection.roofIds
    .map((id) => roofs[id])
    .filter(Boolean) as Roof[];

  if (selectedRoofs.length === 0) return null;

  const primary = selection.primary
    ? roofs[selection.primary]
    : selectedRoofs[0];
  if (!primary) return null;

  return (
    <div className="flex flex-col gap-3 p-3 text-sm">
      <h4 className="font-semibold text-slate-200">
        Roof Properties
        {selectedRoofs.length > 1 && (
          <span className="ml-1 text-xs text-slate-400">
            ({selectedRoofs.length} selected)
          </span>
        )}
      </h4>

      {/* type */}
      <label className="flex flex-col gap-1 text-slate-400">
        Type
        <select
          value={primary.roofType}
          onChange={(e) =>
            selectedRoofs.forEach((r) =>
              updateRoof(r.id, { roofType: e.target.value as RoofType }),
            )
          }
          className="rounded bg-slate-700 px-2 py-1 text-slate-200"
        >
          {ROOF_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      {/* pitch */}
      <label className="flex flex-col gap-1 text-slate-400">
        Pitch ({primary.pitchDeg}°)
        <input
          type="range"
          min={config.minPitchDeg}
          max={config.maxPitchDeg}
          step={1}
          value={primary.pitchDeg}
          onChange={(e) =>
            selectedRoofs.forEach((r) =>
              updateRoof(r.id, { pitchDeg: Number(e.target.value) }),
            )
          }
          className="accent-blue-500"
        />
      </label>

      {/* overhang */}
      <label className="flex flex-col gap-1 text-slate-400">
        Overhang ({primary.overhang} mm)
        <input
          type="range"
          min={config.minOverhang}
          max={config.maxOverhang}
          step={50}
          value={primary.overhang}
          onChange={(e) =>
            selectedRoofs.forEach((r) =>
              updateRoof(r.id, { overhang: Number(e.target.value) }),
            )
          }
          className="accent-blue-500"
        />
      </label>

      {/* material */}
      <label className="flex flex-col gap-1 text-slate-400">
        Material
        <select
          value={primary.materialId}
          onChange={(e) =>
            selectedRoofs.forEach((r) =>
              updateRoof(r.id, { materialId: e.target.value }),
            )
          }
          className="rounded bg-slate-700 px-2 py-1 text-slate-200"
        >
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>

      {/* metadata */}
      <div className="mt-1 text-xs text-slate-500">
        Base Z: {primary.baseZ.toFixed(0)} mm · Face: {primary.faceId}
      </div>
    </div>
  );
}
