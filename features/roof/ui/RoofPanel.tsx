"use client";

import React from "react";
import { useRoofStore } from "../model/roof.store";
import { useRoofStats } from "../model/roof.selectors";
import { RoofType } from "@/domain/structure/roofSystem";

const ROOF_TYPES: { value: RoofType; label: string }[] = [
  { value: "flat", label: "Flat" },
  { value: "gable", label: "Gable" },
];

export function RoofPanel() {
  const show3DRoofs = useRoofStore((s) => s.show3DRoofs);
  const setShow3DRoofs = useRoofStore((s) => s.setShow3DRoofs);
  const config = useRoofStore((s) => s.config);
  const materials = useRoofStore((s) => s.materials);
  const setAllRoofsType = useRoofStore((s) => s.setAllRoofsType);
  const setAllRoofsPitch = useRoofStore((s) => s.setAllRoofsPitch);
  const setAllRoofsOverhang = useRoofStore((s) => s.setAllRoofsOverhang);
  const setAllRoofsMaterial = useRoofStore((s) => s.setAllRoofsMaterial);
  const stats = useRoofStats();

  return (
    <div className="flex flex-col gap-3 p-3 text-sm">
      <h3 className="font-semibold text-slate-200">Roof</h3>

      {/* visibility */}
      <label className="flex items-center gap-2 text-slate-300">
        <input
          type="checkbox"
          checked={show3DRoofs}
          onChange={(e) => setShow3DRoofs(e.target.checked)}
          className="accent-blue-500"
        />
        Show 3D Roofs
      </label>

      {/* type */}
      <label className="flex flex-col gap-1 text-slate-400">
        Type
        <select
          value={config.defaultRoofType}
          onChange={(e) => setAllRoofsType(e.target.value as RoofType)}
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
        Pitch ({config.defaultPitchDeg}°)
        <input
          type="range"
          min={config.minPitchDeg}
          max={config.maxPitchDeg}
          step={1}
          value={config.defaultPitchDeg}
          onChange={(e) => setAllRoofsPitch(Number(e.target.value))}
          className="accent-blue-500"
        />
      </label>

      {/* overhang */}
      <label className="flex flex-col gap-1 text-slate-400">
        Overhang ({config.defaultOverhang} mm)
        <input
          type="range"
          min={config.minOverhang}
          max={config.maxOverhang}
          step={50}
          value={config.defaultOverhang}
          onChange={(e) => setAllRoofsOverhang(Number(e.target.value))}
          className="accent-blue-500"
        />
      </label>

      {/* material */}
      <label className="flex flex-col gap-1 text-slate-400">
        Material
        <select
          value={config.defaultMaterialId}
          onChange={(e) => setAllRoofsMaterial(e.target.value)}
          className="rounded bg-slate-700 px-2 py-1 text-slate-200"
        >
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>

      {/* stats */}
      <div className="mt-2 rounded bg-slate-800 p-2 text-xs text-slate-400">
        <div>Roof faces: {stats.count}</div>
        <div>Avg pitch: {stats.averagePitch.toFixed(1)}°</div>
      </div>
    </div>
  );
}
