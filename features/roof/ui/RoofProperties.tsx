"use client";

import React from "react";
import { useRoofStore } from "../model/roof.store";
import { useSelectedPlaneData } from "../model/roof.selectors";
import { RoofType } from "@/domain/structure/roofSystem";

const ROOF_TYPES: { value: RoofType; label: string }[] = [
  { value: "flat", label: "Flat" },
  { value: "gable", label: "Gable" },
];

export function RoofProperties() {
  const materials = useRoofStore((s) => s.materials);
  const config = useRoofStore((s) => s.config);
  const updateRoof = useRoofStore((s) => s.updateRoof);

  const { planes, roof } = useSelectedPlaneData();

  if (planes.length === 0 || !roof) return null;

  const totalArea = planes.reduce((sum, p) => sum + p.area, 0);
  const uniqueRoofIds = [...new Set(planes.map((p) => p.roofId))];

  return (
    <div className="flex flex-col gap-3 p-3 text-sm">
      <h4 className="font-semibold text-slate-200">
        Roof Plane Properties
        {planes.length > 1 && (
          <span className="ml-1 text-xs text-slate-400">
            ({planes.length} planes selected)
          </span>
        )}
      </h4>

      {/* ---- statistics ---- */}
      <div className="rounded bg-slate-800 p-2 text-xs text-slate-400 space-y-1">
        {planes.map((p) => (
          <div key={p.planeId} className="flex justify-between">
            <span className="text-slate-300">{p.label}</span>
            <span>{(p.area / 1_000_000).toFixed(2)} m²</span>
          </div>
        ))}
        {planes.length > 1 && (
          <div className="flex justify-between border-t border-slate-700 pt-1 mt-1">
            <span className="text-slate-300 font-medium">Total</span>
            <span>{(totalArea / 1_000_000).toFixed(2)} m²</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Slope</span>
          <span>
            {planes.length === 1
              ? `${planes[0].slopeAngleDeg.toFixed(1)}°`
              : "mixed"}
          </span>
        </div>
      </div>

      {/* ---- editable fields (applied to the parent roof) ---- */}
      <label className="flex flex-col gap-1 text-slate-400">
        Type
        <select
          value={roof.roofType}
          onChange={(e) =>
            uniqueRoofIds.forEach((rid) =>
              updateRoof(rid, { roofType: e.target.value as RoofType }),
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

      <label className="flex flex-col gap-1 text-slate-400">
        Pitch ({roof.pitchDeg}°)
        <input
          type="range"
          min={config.minPitchDeg}
          max={config.maxPitchDeg}
          step={1}
          value={roof.pitchDeg}
          onChange={(e) =>
            uniqueRoofIds.forEach((rid) =>
              updateRoof(rid, { pitchDeg: Number(e.target.value) }),
            )
          }
          className="accent-blue-500"
        />
      </label>

      <label className="flex flex-col gap-1 text-slate-400">
        Overhang ({roof.overhang} mm)
        <input
          type="range"
          min={config.minOverhang}
          max={config.maxOverhang}
          step={50}
          value={roof.overhang}
          onChange={(e) =>
            uniqueRoofIds.forEach((rid) =>
              updateRoof(rid, { overhang: Number(e.target.value) }),
            )
          }
          className="accent-blue-500"
        />
      </label>

      <label className="flex flex-col gap-1 text-slate-400">
        Material
        <select
          value={roof.materialId}
          onChange={(e) =>
            uniqueRoofIds.forEach((rid) =>
              updateRoof(rid, { materialId: e.target.value }),
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
        Base Z: {roof.baseZ.toFixed(0)} mm · Face: {roof.faceId}
      </div>
    </div>
  );
}
